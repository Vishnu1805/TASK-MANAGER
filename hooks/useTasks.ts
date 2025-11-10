// hooks/useTasks.ts
import { Task_API_URL, User_API_URL } from '@/constants/Apikeys';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';

const TASKS_URL = Task_API_URL;
const USERS_URL = User_API_URL;
const UPLOAD_URL = `${TASKS_URL.replace('/tasks', '/upload')}`;

// --- types ---
type Priority = 'urgent' | 'medium' | 'low';
type Status = 'pending' | 'in-progress' | 'completed';

export type User = {
  _id: string;
  name?: string;
  email?: string;
  [k: string]: any;
};

export type Attachment = {
  name: string;
  objectName?: string;
  url?: string;
  size?: number;
  contentType?: string;
  [k: string]: any;
};

export type Assignee = {
  _id: any;
  id: string;
  name: string;
};

export type Task = {
  updatedAt?: string;
  createdAt?: string;
  _id: string;
  title: string;
  description?: string;
  priority?: Priority;
  dueDate?: string | null;
  assignees: Assignee[];
  status?: Status;
  user?: User;
  attachments?: Attachment[];
  [k: string]: any;
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
    assignees: string[],
    attachments?: Attachment[]
  ) => Promise<Task>;
  updateTask: (taskId: string, updates: Record<string, any>) => Promise<Task>;
  toggleTask: (taskId: string, newStatus: Status) => Promise<Task>;
  deleteTask: (taskId: string) => Promise<void>;
  uploadAttachment: (file: { uri: string; name: string; type: string; size: number }) => Promise<Attachment>;
};

const TasksContext = createContext<TasksContextShape | undefined>(undefined);

const isUserRelevant = (task: Task, currentUserId: string | undefined): boolean => {
  if (!currentUserId) return false;
  const assigneeIds = Array.isArray(task.assignees)
    ? task.assignees
        .map((a: any) => {
          if (typeof a === 'string') return a;
          if (a && typeof a === 'object') return a.id || a._id || String(a);
          return null;
        })
        .filter((id: string | null) => id && id !== 'undefined' && id !== 'null')
    : [];
  return assigneeIds.includes(currentUserId);
};

const normalizeTask = (t: any): Task => {
  if (!t) throw new Error('normalizeTask: task is falsy');

  const _id = t._id ?? t.id ?? String(t._id ?? t.id ?? '');

  const assignees: Assignee[] = Array.isArray(t.assignees)
    ? t.assignees
        .map((a: any) => {
          if (!a) return null;
          if (typeof a === 'string') return { id: a, name: a };
          if (a && typeof a === 'object') return { id: a._id ?? a.id ?? a, name: a.name ?? a };
          return null;
        })
        .filter((a: Assignee | null) => Boolean(a?.id)) as Assignee[]
    : [];

  const attachments: Attachment[] = Array.isArray(t.attachments)
    ? t.attachments.map((a: any) => {
        const name = a.name ?? a.filename ?? a.originalname ?? a.key ?? '';
        const objectName = a.objectName ?? a.key ?? a.object_key ?? a.objectname ?? undefined;
        const url = a.url ?? a.getUrl ?? a.signedUrl ?? undefined;
        const size = a.size ?? a.length ?? undefined;
        const contentType = a.contentType ?? a.mimetype ?? undefined;
        return { name, objectName, url, size, contentType, ...(typeof a === 'object' ? a : {}) } as Attachment;
      })
    : [];

  const base: Task = {
    ...t,
    _id,
    title: t.title ?? t.name ?? '',
    description: t.description ?? t.desc ?? '',
    assignees,
    attachments,
    dueDate: t.dueDate ? new Date(t.dueDate).toISOString() : null,
    updatedAt: t.updatedAt ? new Date(t.updatedAt).toISOString() : undefined,
    createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : undefined,
  };

  return base;
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

const uploadAttachmentToMinIO = async (
  presignData: { uploadUrl: string; objectName: string },
  file: { uri: string; name: string; type: string; size: number }
) => {
  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    type: file.type,
    name: file.name,
  } as any);

  await axios.put(presignData.uploadUrl, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  const { data: { url } } = await axios.get(`${UPLOAD_URL}/sign-get?objectName=${presignData.objectName}`, {
    headers: await getAuthHeaders(),
  });

  return { ...file, objectName: presignData.objectName, url } as Attachment;
};

export const TasksProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const { currentUser } = useAuth();

  const [socket, setSocket] = useState<Socket | null>(null);

  const SOCKET_BASE = process.env.SOCKET_URL ?? TASKS_URL.replace(/\/api\/.*$/, '');

  const fetchTasks = useCallback(async () => {
    setLoadingTasks(true);
    try {
      const headers = await getAuthHeaders();
      const res = await axios.get(TASKS_URL, { headers });
      const arr = Array.isArray(res.data) ? res.data : res.data?.tasks ?? [];
      const normalized = arr.map(normalizeTask);
      setTasks(normalized);
    } catch (e: any) {
      console.warn('Failed to fetch tasks:', e);
      if (e.response?.status === 401) {
        await AsyncStorage.removeItem('token');
      }
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const headers = await getAuthHeaders();
      const res = await axios.get(USERS_URL, { headers });
      const arr = Array.isArray(res.data) ? res.data : res.data?.users ?? [];
      setUsers(arr.map((u: any) => ({ _id: u._id ?? u.id, ...u })));
    } catch (e) {
      console.warn('Failed to fetch users:', e);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const addTask = useCallback(
    async (
      title: string,
      description: string,
      priority: Priority,
      dueDate: string | null,
      assignees: string[],
      attachments: Attachment[] = []
    ) => {
      try {
        const headers = await getAuthHeaders();
        const body: any = {
          title,
          description,
          priority,
          assignees,
          attachments,
        };
        if (dueDate) body.dueDate = new Date(dueDate).toISOString();
        console.log('Sending addTask request with body:', body);
        const res = await axios.post(TASKS_URL, body, { headers });
        const created = normalizeTask(res.data);
        console.log('Task created response:', created);

        if (isUserRelevant(created, currentUser?._id ?? undefined)) {
          setTasks(prev => {
            if (prev.some(t => t._id === created._id)) return prev;
            return [created, ...prev];
          });
        }

        return created;
      } catch (e: any) {
        console.warn('Failed to add task:', e?.message, e?.response?.data);
        throw new Error(e?.response?.data?.error || e?.response?.data?.message || e?.message || 'Failed to create task');
      }
    },
    [currentUser?._id]
  );

  const updateTask = useCallback(
    async (taskId: string, updates: Record<string, any>) => {
      try {
        const headers = await getAuthHeaders();
        const body: any = { ...updates };
        if (updates.assignees) {
          body.assignees = updates.assignees.filter((id: string) => id && id !== 'undefined' && id !== 'null');
        }
        if (updates.dueDate) body.dueDate = new Date(updates.dueDate).toISOString();
        console.log('Sending updateTask request for taskId:', taskId, 'with body:', body);
        const res = await axios.patch(`${TASKS_URL}/${taskId}`, body, { headers });
        const updated = normalizeTask(res.data);
        console.log('Task updated response:', updated);

        setTasks(prev => {
          const newTasks = prev.filter(t => t._id !== taskId);
          if (isUserRelevant(updated, currentUser?._id ?? undefined)) {
            return [...newTasks, updated];
          }
          return newTasks;
        });

        return updated;
      } catch (e: any) {
        console.warn('Failed to update task:', e?.message, e?.response?.data);
        throw new Error(e?.response?.data?.error || e?.response?.data?.message || e?.message || 'Failed to update task');
      }
    },
    [currentUser?._id]
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      const headers = await getAuthHeaders();
      try {
        await axios.delete(`${TASKS_URL}/${taskId}`, { headers });
        setTasks(prev => prev.filter(t => t._id !== taskId));
      } catch (err) {
        console.warn('deleteTask failed (client):', err);
        throw err;
      }
    },
    []
  );

  const uploadAttachment = useCallback(async (file: { uri: string; name: string; type: string; size: number }) => {
    try {
      const headers = await getAuthHeaders();
      const { data: presignData } = await axios.get(`${UPLOAD_URL}/sign?filename=${encodeURIComponent(file.name)}`, { headers });
      const attachment = await uploadAttachmentToMinIO(presignData, file);
      console.log('Attachment uploaded:', attachment);
      return attachment;
    } catch (e: any) {
      console.warn('Failed to upload attachment:', e);
      throw new Error(e?.response?.data?.error || 'Upload failed');
    }
  }, []);

  // --- socket setup & handlers ---
  useEffect(() => {
    let mounted = true;
    let socketInstance: Socket | null = null;

    const setupSocket = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const s = io(SOCKET_BASE, {
          transports: ['websocket'],
          auth: { token },
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
        });

        s.on('connect', () => {
          console.log('Tasks socket connected, id:', s.id);
          if (mounted) {
            fetchTasks().catch(e => console.warn('Fetch tasks on socket connect failed:', e));
          }
        });

        s.on('connect_error', (err: any) => {
          console.warn('Tasks socket connect_error:', err?.message || err);
        });

        s.on('reconnect', (attempt: number) => {
          console.log('Tasks socket reconnected after', attempt, 'attempts');
          if (mounted) {
            fetchTasks().catch(e => console.warn('Fetch tasks on reconnect failed:', e));
          }
        });

        s.on('task:created', (payload: any) => {
          const t = normalizeTask(payload);
          if (!isUserRelevant(t, currentUser?._id ?? undefined)) return;
          setTasks(prev => {
            if (prev.some(p => p._id === t._id)) return prev;
            return [t, ...prev];
          });
        });

        s.on('task:updated', (payload: any) => {
          const t = normalizeTask(payload);
          setTasks(prev => {
            const newTasks = prev.filter(p => p._id !== t._id);
            if (isUserRelevant(t, currentUser?._id ?? undefined)) {
              return [...newTasks, t];
            }
            return newTasks;
          });
        });

        s.on('task:deleted', (payload: any) => {
          const id = typeof payload === 'string' ? payload : payload?._id ?? payload?.id;
          if (!id) return;
          setTasks(prev => prev.filter(p => p._id !== id));
        });

        if (mounted) {
          setSocket(s);
          socketInstance = s;
        }
      } catch (err) {
        console.warn('Failed to init task socket:', err);
      }
    };

    setupSocket();

    return () => {
      mounted = false;
      if (socketInstance) {
        socketInstance.removeAllListeners();
        socketInstance.disconnect();
        console.log('Tasks socket disconnected on cleanup');
      }
    };
  }, [currentUser?._id, fetchTasks]);

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
      return updateTask(taskId, { status: newStatus });
    },
    deleteTask,
    uploadAttachment,
  };

  return React.createElement(TasksContext.Provider, { value: ctx }, children);
};

export function useTasks() {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error('useTasks must be used within a TasksProvider');
  return ctx;
}
