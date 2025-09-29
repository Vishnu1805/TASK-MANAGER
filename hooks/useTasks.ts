// app/hooks/useTasks.ts
import { Task_API_URL, User_API_URL } from '@/constants/Apikeys';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError } from 'axios';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const TASKS_URL = Task_API_URL;
const USERS_URL = User_API_URL;
const UPLOAD_URL = `${TASKS_URL.replace('/tasks', '/upload')}`; // Derive from TASKS_URL, e.g., /api/upload

// --- types (refined to match backend exactly) ---
type Priority = 'urgent' | 'medium' | 'low';
type Status = 'pending' | 'in-progress' | 'completed'; // ✅ Matches backend enum

export type User = {
  _id: string;
  name?: string;
  email?: string;
  [k: string]: any;
};

export type Attachment = {
  name: string;
  objectName?: string; // MinIO object key
  url?: string; // Presigned GET URL from backend
  size?: number;
  contentType?: string;
  [k: string]: any;
};

export type Assignee = {
  _id: any; id: string; name: string 
}; // ✅ Backend returns assignees as { id, name }

export type Task = {
  updatedAt?: string; // ISO string from backend timestamps
  createdAt?: string;
  _id: string;
  title: string;
  description?: string;
  priority?: Priority;
  dueDate?: string | null; // ISO string
  assignees: Assignee[]; // ✅ Array of { id, name } from backend
  status?: Status;
  user?: User; // Backend resolves owner as { id, name }
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
    assignees: string[], // IDs; backend resolves names
    attachments?: Attachment[] // Optional; populate after upload
  ) => Promise<Task>;
  updateTask: (taskId: string, updates: Record<string, any>) => Promise<Task>;
  toggleTask: (taskId: string, newStatus: Status) => Promise<Task>;
  deleteTask: (taskId: string) => Promise<void>;
  // 🔹 NEW: Upload attachment (presigned flow)
  uploadAttachment: (file: { uri: string; name: string; type: string; size: number }) => Promise<Attachment>;
};

const TasksContext = createContext<TasksContextShape | undefined>(undefined);

// normalize helper (enhanced for backend assignee/user shape)
const normalizeTask = (t: any): Task => {
  if (!t) throw new Error('normalizeTask: task is falsy');

  const _id = t._id ?? t.id ?? String(t._id ?? t.id ?? '');

  // ✅ Handle backend's { id, name } shape for assignees
  const assignees: Assignee[] = Array.isArray(t.assignees)
    ? t.assignees
        .map((a: any) => {
          if (!a) return null;
          if (typeof a === 'string') return { id: a, name: a }; // Fallback
          if (a && typeof a === 'object') return { id: a._id ?? a.id ?? a, name: a.name ?? a };
          return null;
        })
        .filter((a: Assignee | null) => Boolean(a?.id)) as Assignee[]
    : [];

  const attachments: Attachment[] = Array.isArray(t.attachments)
    ? t.attachments.map((a: any) => {
        // support different shapes from backend
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
    // ✅ Ensure dates are strings
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

// 🔹 NEW: Helper for presigned attachment upload
const uploadAttachmentToMinIO = async (presignData: { uploadUrl: string; objectName: string }, file: { uri: string; name: string; type: string; size: number }) => {
  // Step 1: PUT file to presigned URL
  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    type: file.type,
    name: file.name,
  } as any);

  await axios.put(presignData.uploadUrl, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  // Step 2: Get signed download URL
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

  // Socket related
  const [socket, setSocket] = useState<Socket | null>(null);
  // Polling fallback timer id
  const [pollerId, setPollerId] = useState<number | null>(null);

  // Derive a base URL for socket connection.
  const SOCKET_BASE = (process.env.SOCKET_URL ?? TASKS_URL.replace(/\/api\/.*$/, ''));

  // --- fetchTasks / fetchUsers implementations ---
  const fetchTasks = useCallback(async () => {
    setLoadingTasks(true);
    try {
      const headers = await getAuthHeaders();
      const res = await axios.get(TASKS_URL, { headers });
      const arr = Array.isArray(res.data) ? res.data : (res.data?.tasks ?? []);
      const normalized = arr.map(normalizeTask);
      setTasks(normalized);
    } catch (e: any) {
      console.warn('Failed to fetch tasks:', e);
      // 🔹 NEW: Handle auth errors (e.g., refresh token or logout)
      if (e.response?.status === 401) {
        await AsyncStorage.removeItem('token');
        // Optionally: Trigger login flow
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
      const arr = Array.isArray(res.data) ? res.data : (res.data?.users ?? []);
      setUsers(arr.map((u: any) => ({ _id: u._id ?? u.id, ...u })));
    } catch (e) {
      console.warn('Failed to fetch users:', e);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  // --- addTask: accepts optional attachments and keeps local state consistent ---
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
          attachments // ✅ Backend saves metadata; URLs added on fetch
        };
        if (dueDate) body.dueDate = new Date(dueDate).toISOString(); // ✅ Format as ISO
        console.log('Sending addTask request with body:', body);
        const res = await axios.post(TASKS_URL, body, { headers });
        const created = normalizeTask(res.data);
        console.log('Task created response:', created);

        // Insert into local state immediately, avoid duplicates
        setTasks(prev => {
          if (prev.some(t => t._id === created._id)) return prev;
          return [created, ...prev];
        });

        // Reconcile (optional) to ensure server canonical state
        try {
          await fetchTasks();
        } catch (e) {
          // ignore fetch error but keep created in local state
        }

        return created;
      } catch (e: any) {
        console.warn('Failed to add task:', e?.message, e?.response?.data);
        throw new Error(e?.response?.data?.error || e?.response?.data?.message || e?.message || 'Failed to create task');
      }
    },
    [fetchTasks]
  );

  // --- updateTask implementation ---
  const updateTask = useCallback(
    async (taskId: string, updates: Record<string, any>) => {
      try {
        const headers = await getAuthHeaders();
        const body: any = { ...updates };
        if (updates.assignees) {
          body.assignees = updates.assignees.filter((id: string) => id && id !== 'undefined' && id !== 'null');
        }
        // ✅ Format dates if present
        if (updates.dueDate) body.dueDate = new Date(updates.dueDate).toISOString();
        console.log('Sending updateTask request for taskId:', taskId, 'with body:', body);
        const res = await axios.patch(`${TASKS_URL}/${taskId}`, body, { headers });
        const updated = normalizeTask(res.data);
        console.log('Task updated response:', updated);
        setTasks(prev => prev.map(t => (t._id === taskId ? updated : t)));
        try {
          await fetchTasks();
        } catch (e) {
          // ignore
        }
        return updated;
      } catch (e: any) {
        console.warn('Failed to update task:', e?.message, e?.response?.data);
        throw new Error(e?.response?.data?.error || e?.response?.data?.message || e?.message || 'Failed to update task');
      }
    },
    [fetchTasks]
  );

  // --- deleteTask implementation ---
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

  // 🔹 NEW: Upload single attachment via presigned URL
  const uploadAttachment = useCallback(async (file: { uri: string; name: string; type: string; size: number }) => {
    try {
      const headers = await getAuthHeaders();

      // Step 1: Get presigned PUT URL
      const { data: presignData } = await axios.get(`${UPLOAD_URL}/sign?filename=${encodeURIComponent(file.name)}`, { headers });

      // Step 2: Upload to MinIO
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
    (async () => {
      try {
        // get token before connecting so we can pass it in auth
        const token = await AsyncStorage.getItem('token');

        const s = io(SOCKET_BASE, {
          transports: ['websocket'],
          auth: { token },
        });

        s.on('connect', () => {
          console.log('Tasks socket connected, id:', s.id);
          // stop poller if running
          if (mounted) {
            if (pollerId) {
              clearInterval(pollerId);
              setPollerId(null);
            }
          }
        });

        s.on('connect_error', (err: any) => {
          console.warn('Tasks socket connect_error:', err?.message || err);
        });

        s.on('task:created', (payload: any) => {
          const t = normalizeTask(payload);
          setTasks(prev => {
            if (prev.some(p => p._id === t._id)) return prev;
            return [t, ...prev];
          });
        });

        s.on('task:updated', (payload: any) => {
          const t = normalizeTask(payload);
          setTasks(prev => prev.map(p => (p._id === t._id ? t : p)));
        });

        s.on('task:deleted', (payload: any) => {
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
          } catch (e) {
            /* ignore */
          }
        };
      } catch (err) {
        console.warn('Failed to init task socket:', err);
      }
    })();

    return () => {
      // set mounted false so we don't try to update state after unmount
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

  // --- Polling fallback: if socket doesn't connect, poll every N seconds ---
  useEffect(() => {
    // start poller only if socket is null and no poller is running
    if (!socket && !pollerId) {
      const id = setInterval(() => {
        fetchTasks().catch(e => console.warn('Polling fetchTasks failed:', e));
      }, 10000); // every 10s
      setPollerId(Number(id));
    }

    // if socket becomes available, clear poller
    if (socket && pollerId) {
      clearInterval(pollerId);
      setPollerId(null);
    }

    return () => {
      if (pollerId) {
        clearInterval(pollerId);
        setPollerId(null);
      }
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
      return updateTask(taskId, { status: newStatus });
    },
    deleteTask: async (taskId: string) => {
      return deleteTask(taskId);
    },
    uploadAttachment, // 🔹 NEW: Exposed for components
  };

  return React.createElement(TasksContext.Provider, { value: ctx }, children);
};

export function useTasks() {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error('useTasks must be used within a TasksProvider');
  return ctx;
}