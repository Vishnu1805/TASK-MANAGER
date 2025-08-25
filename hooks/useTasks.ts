// app/hooks/useTasks.ts
import { Task_API_URL, User_API_URL } from '@/constants/Apikeys';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const TASKS_URL = Task_API_URL;
const USERS_URL = User_API_URL;

type Priority = 'urgent' | 'medium' | 'low';
type Status = 'pending' | 'completed' | 'in-progress';

export type User = {
  _id: string;
  name?: string;
  email?: string;
  [k: string]: any;
};

export type Task = {
  modifiedAt: any;
  updatedAt: any;  
  id: string;
  userId: string;
  user: User;
  _id: string;
  title: string;
  description?: string;
  priority?: Priority;
  dueDate?: string | null;
  assignees: string[];
  status?: string;
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

// force consistent _id and assignee array as strings
const normalizeTask = (t: any): Task => {
  const _id = t._id ?? t.id ?? null;
  const assignees: string[] = Array.isArray(t.assignees)
    ? t.assignees
        .map((a: any) => {
          if (typeof a === 'string') return a;
          if (a && typeof a === 'object' && (a._id || a.id)) return a._id ?? a.id;
          // if it's an object like { id, name } or { _id, name }
          if (a && typeof a === 'object' && (a.id || a._id)) return a._id ?? a.id;
          console.warn('Invalid assignee format, skipping:', a);
          return null;
        })
        .filter((id: string | null) => Boolean(id) && id !== 'undefined' && id !== 'null') as string[]
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

// Try to make an axios request using several common endpoint shapes (fallbacks)
async function tryFallbackRequest(tryList: { method: 'delete' | 'patch' | 'post' | 'put'; url: string; data?: any; config?: any }[]) {
  let lastErr: any = null;
  for (const attempt of tryList) {
    try {
      if (attempt.method === 'delete') {
        const cfg = { ...(attempt.config || {}) };
        if (attempt.data) cfg.data = attempt.data;
        await axios.delete(attempt.url, cfg);
      } else {
        await axios.request({ method: attempt.method, url: attempt.url, data: attempt.data, ...(attempt.config || {}) });
      }
      return; // success
    } catch (err) {
      lastErr = err;
      console.warn(`Fallback attempt failed: ${attempt.method.toUpperCase()} ${attempt.url}`,);
    }
  }
  throw lastErr;
}

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
      console.log('Fetched tasks:', normalized.map(t => ({ id: t._id, assignees: t.assignees, raw: t.assignees })));
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
        const filteredAssignees = assignees.filter(id => id && id !== userId && id !== 'undefined' && id !== 'null');
        if (!filteredAssignees.length) {
          filteredAssignees.push(userId);
        }
        const body = { title: title.trim(), description: description?.trim() ?? '', priority, dueDate, assignees: filteredAssignees, userId };
        console.log('Sending addTask request with body:', body);
        const res = await axios.post(TASKS_URL, body, { headers });
        const created = normalizeTask(res.data);
        console.log('Task created response:', created);
        setTasks(prev => [created, ...prev]);
        await fetchTasks();
        return created;
      } catch (e: any) {
        console.warn('Failed to add task:', e.message, e.response?.data);
        throw new Error(e.response?.data?.error || e.response?.data?.message || e.message || 'Failed to create task');
      }
    },
    []
  );

  const updateTask = useCallback(async (taskId: string, updates: Record<string, any>) => {
    try {
      const headers = await getAuthHeaders();
      const body = { ...updates };
      if (updates.assignees) {
        body.assignees = updates.assignees.filter((id: string) => id && id !== 'undefined' && id !== 'null');
      }
      console.log('Sending updateTask request for taskId:', taskId, 'with body:', body);
      const res = await axios.patch(`${TASKS_URL}/${taskId}`, body, { headers });
      const updated = normalizeTask(res.data);
      console.log('Task updated response:', updated);
      setTasks(prev => prev.map(t => (t._id === taskId ? updated : t)));
      await fetchTasks();
      return updated;
    } catch (e: any) {
      console.warn('Failed to update task:', e.message, e.response?.data);
      throw new Error(e.response?.data?.error || e.response?.data?.message || e.message || 'Failed to update task');
    }
  }, []);

  /**
   * toggleTask updated behavior:
   * - verify current user from AsyncStorage
   * - find the task locally; if not found, refetch once
   * - only send PATCH to /api/tasks/:id when current user is the owner (server expects that)
   * - otherwise throw a clear error so UI can show "Only owner can change status"
   */
  const toggleTask = useCallback(async (taskId: string, newStatus: Status) => {
    try {
      // get current user id
      let currentUserId: string | null = null;
      try {
        const userJson = await AsyncStorage.getItem('user');
        const user = userJson ? JSON.parse(userJson) : null;
        currentUserId = user?._id ?? user?.id ?? null;
      } catch (e) {
        console.warn('toggleTask: failed to read user from storage', e);
      }

      // find local task
      let localTask = tasks.find(t => String(t._id) === String(taskId));
      if (!localTask) {
        // attempt once to refresh tasks
        console.warn('toggleTask: local task not found, refetching tasks and retrying');
        await fetchTasks();
        localTask = tasks.find(t => String(t._id) === String(taskId));
      }

      if (!localTask) {
        throw new Error('Task not found locally');
      }

      // server's current rules: only owner can update -> enforce same on client
      const ownerId = localTask.userId ?? (localTask.user && (localTask.user._id ?? localTask.user.id)) ?? null;
      if (!ownerId) {
        console.warn('toggleTask: could not determine task owner; aborting to avoid 404');
        throw new Error('Unable to determine task owner');
      }

      if (String(ownerId) !== String(currentUserId)) {
        // Owner-only server: do not attempt request that will 404; inform UI instead
        throw new Error('Only the task owner can change status');
      }

      // owner => perform patch
      const headers = await getAuthHeaders();
      const res = await axios.patch(`${TASKS_URL}/${taskId}`, { status: newStatus }, { headers });
      const updated = normalizeTask(res.data);
      console.log('Task toggled response:', updated);
      setTasks(prev => prev.map(t => (t._id === taskId ? updated : t)));
      await fetchTasks();
      return updated;
    } catch (e) {
      console.warn('Failed to toggle task:', e);
      // bubble up the error so UI (Task.tsx) can show a message
      throw e;
    }
  }, [tasks, fetchTasks]);

  const deleteTask = useCallback(async (taskId: string) => {
    try {
      const headers = await getAuthHeaders();

      // Look up the task locally to sanity-check id & ownership
      const local = tasks.find(t => t._id === taskId);
      if (!local) {
        // try refetching if local copy missing
        console.warn('deleteTask: local task not found, refetching tasks before delete attempt');
        await fetchTasks();
      }

      console.log('Deleting task with ID:', taskId);
      // Primary delete attempt
      try {
        await axios.delete(`${TASKS_URL}/${taskId}`, { headers });
        // Update local state
        setTasks(prev => prev.filter(t => t._id !== taskId));
        await fetchTasks();
        return;
      } catch (err) {
        // If 404/403 comes back, try fallback shapes before failing
        console.warn('Primary delete failed, attempting fallbacks:', err);

        const tryList = [
          { method: 'delete' as const, url: `${TASKS_URL}/${taskId}`, config: { headers } },
          { method: 'delete' as const, url: `${TASKS_URL.replace('/tasks', '/task')}/${taskId}`, config: { headers } },
          { method: 'delete' as const, url: `${TASKS_URL}?id=${taskId}`, config: { headers } },
          { method: 'delete' as const, url: `${TASKS_URL.replace('/tasks', '/task')}?id=${taskId}`, config: { headers } },
          // some APIs accept DELETE with JSON body
          { method: 'delete' as const, url: `${TASKS_URL}`, data: { id: taskId }, config: { headers } },
        ];

        try {
          await tryFallbackRequest(tryList);
          // if fallback succeeded, refresh list
          setTasks(prev => prev.filter(t => t._id !== taskId));
          await fetchTasks();
          return;
        } catch (failErr: any) {
          const status = failErr?.response?.status;
          const serverMsg = failErr?.response?.data?.error || failErr?.response?.data?.message;
          console.warn('All delete attempts failed:', status, serverMsg || failErr?.message);

          if (status === 404) {
            throw new Error(serverMsg || 'Task not found or you are not allowed to delete it');
          }
          if (status === 403) {
            throw new Error(serverMsg || 'Forbidden: you are not allowed to delete this task');
          }
          throw failErr;
        }
      }
    } catch (e) {
      console.warn('Failed to delete task:', e);
      throw e;
    }
  }, [tasks, fetchTasks]);

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
