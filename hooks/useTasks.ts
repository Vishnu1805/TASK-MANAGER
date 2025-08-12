// useTasks.ts
import { Server_Url, Task_API_URL, User_API_URL } from '@/constants/Apikeys';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';

const API_URL = Server_Url;
const TASKS_URL = Task_API_URL;
const USERS_URL = User_API_URL;

export type User = {
  _id: string;
  name: string;
  email?: string;
};

export type Task = {
  _id: string;
  title: string;
  description?: string;
  priority?: 'urgent' | 'medium' | 'low';
  dueDate?: string | null;
  assignees: string[]; // array of user _id strings
  status?: 'pending' | 'completed';
};

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('token');
    return { Authorization: token ? `Bearer ${token}` : '' };
  };

  // Normalized fetchTasks
  const fetchTasks = useCallback(async () => {
    try {
      setLoadingTasks(true);
      const headers = await getAuthHeaders();
      const res = await axios.get(TASKS_URL, { headers });

      // Normalize tasks
      const raw = Array.isArray(res.data) ? res.data : [];
      const normalized = raw.map((t: any) => {
        const _id = t._id ?? t.id ?? null;

        let assignees: string[] = [];
        if (Array.isArray(t.assignees)) {
          assignees = t.assignees.map((a: any) => {
            if (typeof a === 'string') return a;
            if (a && (a._id ?? a.id)) return a._id ?? a.id;
            return String(a);
          });
        }

        return {
          ...t,
          _id,
          assignees,
        } as Task;
      });

      console.log('Tasks fetched (normalized):', normalized);
      setTasks(normalized);
    } catch (err) {
      console.error('fetchTasks error', err);
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
      const fetched: User[] = Array.isArray(res.data)
        ? res.data.map((u: any) => ({ ...u, _id: u._id ?? u.id }))
        : [];
      console.log('Users fetched:', fetched);
      setUsers(fetched);
    } catch (err) {
      console.error('fetchUsers error', err);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  // ✅ Add Task with userId
  const addTask = useCallback(
    async (
      title: string,
      description: string,
      priority: 'urgent' | 'medium' | 'low',
      dueDate: string,
      assignees: string[]
    ) => {
      try {
        const headers = await getAuthHeaders();

        // Get logged in user's ID
        const userJson = await AsyncStorage.getItem('user');
        const user = userJson ? JSON.parse(userJson) : null;
        const userId = user?._id;

        if (!userId) {
          throw new Error('User not logged in or missing _id');
        }

        const body = { title, description, priority, dueDate, assignees, userId };
        console.log('Creating task body:', body);

        const res = await axios.post(TASKS_URL, body, { headers });
        await fetchTasks();
        return res.data;
      } catch (err) {
        console.error('addTask error', err);
        throw err;
      }
    },
    [fetchTasks]
  );

  // ✅ Update Task with userId
  const updateTask = useCallback(
    async (taskId: string, updates: Record<string, any>) => {
      try {
        const headers = await getAuthHeaders();

        // Get logged in user's ID
        const userJson = await AsyncStorage.getItem('user');
        const user = userJson ? JSON.parse(userJson) : null;
        const userId = user?._id;

        if (!userId) {
          throw new Error('User not logged in or missing _id');
        }

        const body = { ...updates, userId };
        console.log('Updating task', taskId, body);

        const res = await axios.patch(`${TASKS_URL}/${taskId}`, body, { headers });
        await fetchTasks();
        return res.data;
      } catch (err) {
        console.error('updateTask error', err);
        throw err;
      }
    },
    [fetchTasks]
  );

  const toggleTask = useCallback(
    async (taskId: string, newStatus: 'pending' | 'completed') => {
      try {
        const headers = await getAuthHeaders();
        const res = await axios.patch(
          `${TASKS_URL}/${taskId}`,
          { status: newStatus },
          { headers }
        );
        await fetchTasks();
        return res.data;
      } catch (err) {
        console.error('toggleTask error', err);
        throw err;
      }
    },
    [fetchTasks]
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      try {
        const headers = await getAuthHeaders();
        const res = await axios.delete(`${TASKS_URL}/${taskId}`, { headers });
        await fetchTasks();
        return res.data;
      } catch (err) {
        console.error('deleteTask error', err);
        throw err;
      }
    },
    [fetchTasks]
  );

  useEffect(() => {
    fetchUsers();
    fetchTasks();
  }, [fetchUsers, fetchTasks]);

  return {
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
}
