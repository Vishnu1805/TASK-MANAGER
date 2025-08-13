import { Task_API_URL, User_API_URL } from '@/constants/Apikeys';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const TASKS_URL = Task_API_URL;
const USERS_URL = User_API_URL;

type Priority = 'urgent' | 'medium' | 'low';
type Status = 'pending' | 'completed';

export type User = {
  _id: string;
  name?: string;
  email?: string;
  [k: string]: any;
};

export type Task = {
  _id: string;
  title: string;
  description?: string;
  priority?: Priority;
  dueDate?: string | null;
  assignees: string[];
  status?: Status;
};

type TasksContextShape = {
  tasks: Task[];
  users: User[];
  loadingTasks: boolean;
  loadingUsers: boolean;
  fetchTasks: () => Promise<void>;
  fetchUsers: () => Promise<void>;
  addTask: (
    title: string,
    description: string,
    priority: Priority,
    dueDate: string | null,
    assignees: string[]
  ) => Promise<Task>;
  updateTask: (taskId: string, updates: Record<string, any>) => Promise<Task>;
  toggleTask: (taskId: string, newStatus: Status) => Promise<Task>;
  deleteTask: (taskId: string) => Promise<void>;
};

const TasksContext = createContext<TasksContextShape | undefined>(undefined);

const normalizeTask = (t: any): Task => {
  const _id = t._id ?? t.id ?? null;
  const assignees: string[] = Array.isArray(t.assignees)
    ? t.assignees
        .map((a: any) => typeof a === 'string' ? a : a?._id ?? String(a))
        .filter((id: string) => id && id !== 'undefined' && id !== 'null')
    : [];
  return { ...t, _id, assignees } as Task;
};

const getAuthHeaders = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  } catch (e) {
    console.warn('Failed to get auth headers:', e);
    return { 'Content-Type': 'application/json' };
  }
};

export const TasksProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      setLoadingTasks(true);
      const headers = await getAuthHeaders();
      const res = await axios.get(TASKS_URL, { headers });
      const raw = Array.isArray(res.data) ? res.data : [];
      const normalized = raw.map(normalizeTask);
      console.log('Fetched tasks:', normalized.map(t => ({ id: t._id, assignees: t.assignees })));
      setTasks(normalized);
    } catch (e) {
      console.warn('Failed to fetch tasks:', e);
      setTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const headers = await getAuthHeaders();
      const res = await axios.get(USERS_URL, { headers });
      const raw = Array.isArray(res.data) ? res.data : [];
      const normalized = raw.map((u: any) => ({ ...u, _id: u._id ?? u.id }));
      console.log('Fetched users:', normalized.map(u => ({ id: u._id, name: u.name })));
      setUsers(normalized);
    } catch (e) {
      console.warn('Failed to fetch users:', e);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const addTask = useCallback(
    async (title: string, description: string, priority: Priority, dueDate: string | null, assignees: string[]) => {
      if (!title?.trim()) throw new Error('Title is required');
      if (!['urgent', 'medium', 'low'].includes(priority)) throw new Error('Invalid priority');
      if (!assignees.length) throw new Error('At least one assignee required');

      let userId: string | null = null;
      try {
        const userJson = await AsyncStorage.getItem('user');
        const user = userJson ? JSON.parse(userJson) : null;
        userId = user?._id ?? user?.id ?? null;
        if (!userId) throw new Error('User not logged in');
      } catch (e) {
        console.warn('Failed to get user from AsyncStorage:', e);
        throw new Error('User not logged in');
      }

      try {
        const headers = await getAuthHeaders();
        const filteredAssignees = assignees.filter(id => id && id !== userId);
        const body = { title: title.trim(), description: description?.trim() ?? '', priority, dueDate, assignees: filteredAssignees, userId };
        console.log('Creating task:', body);
        const res = await axios.post(TASKS_URL, body, { headers });
        const created = normalizeTask(res.data);
        setTasks(prev => [created, ...prev]);
        return created;
      } catch (e: any) {
        console.warn('Failed to add task:', e.message, e.response?.data);
        throw new Error(e.response?.data?.message || e.message || 'Failed to create task');
      }
    },
    []
  );

  const updateTask = useCallback(async (taskId: string, updates: Record<string, any>) => {
    let userId: string | null = null;
    try {
      const userJson = await AsyncStorage.getItem('user');
      const user = userJson ? JSON.parse(userJson) : null;
      userId = user?._id ?? user?.id ?? null;
      if (!userId) throw new Error('User not logged in');
    } catch (e) {
      console.warn('Failed to get user from AsyncStorage:', e);
      throw new Error('User not logged in');
    }

    try {
      const headers = await getAuthHeaders();
      const body = { ...updates };
      console.log('Updating task:', taskId, body);
      const res = await axios.patch(`${TASKS_URL}/${taskId}`, body, { headers });
      const updated = normalizeTask(res.data);
      setTasks(prev => prev.map(t => t._id === taskId ? updated : t));
      return updated;
    } catch (e: any) {
      console.warn('Failed to update task:', e.message);
      throw new Error(e.response?.data?.message || e.message || 'Failed to update task');
    }
  }, []);

  const toggleTask = useCallback(async (taskId: string, newStatus: Status) => {
    try {
      const headers = await getAuthHeaders();
      const res = await axios.patch(`${TASKS_URL}/${taskId}`, { status: newStatus }, { headers });
      const updated = normalizeTask(res.data);
      setTasks(prev => prev.map(t => t._id === taskId ? updated : t));
      return updated;
    } catch (e) {
      console.warn('Failed to toggle task:', e);
      throw e;
    }
  }, []);

  const deleteTask = useCallback(async (taskId: string) => {
    try {
      const headers = await getAuthHeaders();
      await axios.delete(`${TASKS_URL}/${taskId}`, { headers });
      setTasks(prev => prev.filter(t => t._id !== taskId));
    } catch (e) {
      console.warn('Failed to delete task:', e);
      throw e;
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchTasks();
  }, [fetchUsers, fetchTasks]);

  const ctx: TasksContextShape = {
    tasks,
    users,
    loadingTasks,
    loadingUsers,
    fetchTasks,
    fetchUsers,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
  };

  return React.createElement(TasksContext.Provider, { value: ctx }, children);
};

export function useTasks() {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error('useTasks must be used within a TasksProvider');
  return ctx;
}