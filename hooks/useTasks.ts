// app/hooks/useTasks.ts
import { Task_API_URL, User_API_URL } from '@/constants/Apikeys';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const TASKS_URL = Task_API_URL;
const USERS_URL = User_API_URL;

// --- types (same as your file) ---
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

// normalize helper (kept as in your file)
const normalizeTask = (t: any): Task => {
  const _id = t._id ?? t.id ?? null;
  const assignees: string[] = Array.isArray(t.assignees)
    ? t.assignees
        .map((a: any) => {
          if (typeof a === 'string') return a;
          if (a && typeof a === 'object' && (a._id || a.id)) return a._id ?? a.id;
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

// Fallback HTTP attempts helper kept from your file (not shown fully here for brevity)
// ... (keep tryFallbackRequest implementation from your original file) ...

export const TasksProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Socket related
  const [socket, setSocket] = useState<Socket | null>(null);
  // Polling fallback timer id
  const [pollerId, setPollerId] = useState<NodeJS.Timeout | null>(null);

  // Derive a base URL for socket connection. If you have a dedicated SOCKET_URL env var, use that.
  const SOCKET_BASE = (global as any).__DEV__ ? (process.env.SOCKET_URL ?? TASKS_URL.replace(/\/api\/.*$/, '')) : (process.env.SOCKET_URL ?? TASKS_URL.replace(/\/api\/.*$/, ''));

  // --- fetchTasks / fetchUsers implementations (mostly same as your original) ---
  const fetchTasks = useCallback(async () => {
    setLoadingTasks(true);
    try {
      const headers = await getAuthHeaders();
      const res = await axios.get(TASKS_URL, { headers });
      const arr = Array.isArray(res.data) ? res.data : (res.data?.tasks ?? []);
      const normalized = arr.map(normalizeTask);
      setTasks(normalized);
    } catch (e) {
      console.warn('Failed to fetch tasks:', e);
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const headers = await getAuthHeaders();
      const res = await axios.get(USERS_URL, { headers });
      const arr = Array.isArray(res.data) ? res.data : (res.data?.users ?? []);
      setUsers(arr.map((u: any) => ({ _id: u._id ?? u.id, ...u })));
    } catch (e) {
      console.warn('Failed to fetch users:', e);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  // --- addTask: FIXED the local update spread bug and keep fetchTasks to reconcile ---
  const addTask = useCallback(
    async (title: string, description: string, priority: Priority, dueDate: string | null, assignees: string[]) => {
      try {
        const headers = await getAuthHeaders();
        const body: any = { title, description, priority, assignees };
        if (dueDate) body.dueDate = dueDate;
        console.log('Sending addTask request with body:', body);
        const res = await axios.post(TASKS_URL, body, { headers });
        const created = normalizeTask(res.data);
        console.log('Task created response:', created);

        // Insert into local state immediately (fixed spread)
        setTasks(prev => [created, ...prev]);

        // Keep a reconcile fetch (helps if server mutates shape)
        await fetchTasks();
        return created;
      } catch (e: any) {
        console.warn('Failed to add task:', e.message, e.response?.data);
        throw new Error(e.response?.data?.error || e.response?.data?.message || e.message || 'Failed to create task');
      }
    },
    [fetchTasks]
  );

  // --- updateTask implementation (same as yours but using normalizeTask and setTasks) ---
  const updateTask = useCallback(
    async (taskId: string, updates: Record<string, any>) => {
      try {
        const headers = await getAuthHeaders();
        const body: any = { ...updates };
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
    },
    [fetchTasks]
  );

  // --- toggleTask and deleteTask: keep your logic intact (use your existing implementations) ---
  // For brevity include the same functions from your original file (toggleTask, deleteTask).
  // Make sure they call setTasks appropriately after server responses.
  // (Use the implementations in your current file — no change required here other than using normalizeTask when updating local state.)

  // --- socket setup & handlers ---
  useEffect(() => {
    // connect socket once
    try {
      const s = io(SOCKET_BASE, {
        transports: ['websocket'],
        // optionally send token for auth (server may expect it)
        auth: async (cb: (arg: any) => void) => {
          const token = await AsyncStorage.getItem('token');
          cb({ token });
        },
      });

      s.on('connect', () => {
        console.log('Tasks socket connected, id:', s.id);
        // If we had a poller running, stop it when socket connects
        if (pollerId) {
          clearInterval(pollerId);
          setPollerId(null);
        }
      });

      s.on('connect_error', (err: any) => {
        console.warn('Tasks socket connect_error:', err?.message || err);
      });

      // Server should emit these events when tasks change
      s.on('task:created', (payload: any) => {
        const t = normalizeTask(payload);
        setTasks(prev => {
          // avoid duplicates
          if (prev.some(p => p._id === t._id)) return prev;
          return [t, ...prev];
        });
      });

      s.on('task:updated', (payload: any) => {
        const t = normalizeTask(payload);
        setTasks(prev => prev.map(p => (p._id === t._id ? t : p)));
      });

      s.on('task:deleted', (payload: any) => {
        // server may send id or object
        const id = typeof payload === 'string' ? payload : payload?._id ?? payload?.id;
        if (!id) return;
        setTasks(prev => prev.filter(p => p._id !== id));
      });

      setSocket(s);

      // cleanup on unmount
      return () => {
        try {
          s.removeAllListeners();
          s.disconnect();
          setSocket(null);
        } catch (e) {
          /* ignore */
        }
      };
    } catch (err) {
      console.warn('Failed to init task socket:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

  // --- Polling fallback: if socket doesn't connect after a short time, poll every N seconds ---
  useEffect(() => {
    let fallbackTimer: ReturnType<typeof setInterval> | null = null;
    // if socket is null or disconnected, start a poller
    if (!socket) {
      // start only if not already started
      if (!pollerId) {
        const id = setInterval(() => {
          fetchTasks().catch(e => console.warn('Polling fetchTasks failed:', e));
        }, 10000); // every 10s
        setPollerId(id as unknown as NodeJS.Timeout);
        fallbackTimer = id;
      }
    } else {
      // socket present -> ensure poller stopped
      if (pollerId) {
        clearInterval(pollerId);
        setPollerId(null);
      }
    }
    return () => {
      if (fallbackTimer) clearInterval(fallbackTimer);
    };
  }, [socket, pollerId, fetchTasks]);

  // initial load
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
    toggleTask: async (taskId: string, newStatus: Status) => {
      // Use original implementation; here we call updateTask
      return updateTask(taskId, { status: newStatus });
    },
    deleteTask: async (taskId: string) => {
      // Keep your original deleteTask implementation: for brevity call axios delete then refresh
      const headers = await getAuthHeaders();
      try {
        await axios.delete(`${TASKS_URL}/${taskId}`, { headers });
        setTasks(prev => prev.filter(t => t._id !== taskId));
      } catch (err) {
        // fallback attempts (keep original tryFallbackRequest logic if necessary)
        console.warn('deleteTask failed (client):', err);
        throw err;
      }
    },
  };

  return React.createElement(TasksContext.Provider, { value: ctx }, children);
};

export function useTasks() {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error('useTasks must be used within a TasksProvider');
  return ctx;
}
