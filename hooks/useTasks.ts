import { Task_API_URL } from '@/constants/Apikeys';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';

export interface Task {
  _id: string;
  title: string;
  description?: string;
  status: 'pending' | 'completed';
  priority: 'urgent' | 'medium' | 'low';
  dueDate?: string;
  assignees: string[];
  userId: string;
}

export interface User {
  id: string;
  name: string;
}

const API_URL = Task_API_URL;
const USERS_URL = 'http://localhost:3000/api/users';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Load tasks and users on component mount
  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        await Promise.all([fetchTasks(), fetchUsers()]);
      } else {
        console.warn('🔒 No token found in AsyncStorage. Skipping fetch.');
      }
      setLoading(false);
    })();
  }, []);

  const fetchTasks = useCallback(async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      console.warn('❌ Cannot fetch tasks — missing token.');
      return;
    }

    try {
      const { data } = await axios.get<Task[]>(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTasks(data);
    } catch (error) {
      console.error('❌ Failed to fetch tasks:', error);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      console.warn('❌ Cannot fetch users — missing token.');
      return;
    }

    try {
      const { data } = await axios.get<User[]>(USERS_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(data);
    } catch (error) {
      console.error('❌ Failed to fetch users:', error);
    }
  }, []);

  const addTask = useCallback(
    async (
      title: string,
      description: string,
      priority: Task['priority'],
      dueDate: string,
      assignees: string[]
    ) => {
      const token = await AsyncStorage.getItem('token');
      const userJson = await AsyncStorage.getItem('user');
      const user = userJson ? JSON.parse(userJson) : null;

      if (!token || !user?.id) {
        console.warn('⚠️ Missing token or user ID');
        console.log('token:', token);
        console.log('user:', user);
        return;
      }

      const payload = {
        title,
        description,
        status: 'pending',
        priority,
        dueDate,
        assignees,
        userId: user.id,
      };

      try {
        console.log('📤 Creating task with payload:', payload);

        await axios.post(API_URL, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });

        await fetchTasks(); // refresh task list
        console.log('✅ Task created and tasks list refreshed');
      } catch (error) {
        console.error('❌ Failed to add task:', error);
      }
    },
    [fetchTasks]
  );

  const toggleTask = useCallback(
    async (taskId: string, newStatus: Task['status']) => {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.warn('❌ Cannot toggle task — missing token.');
        return;
      }

      try {
        await axios.patch(
          `${API_URL}/${taskId}`,
          { status: newStatus },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setTasks(tasks =>
          tasks.map(task =>
            task._id === taskId ? { ...task, status: newStatus } : task
          )
        );
      } catch (error) {
        console.error('❌ Failed to toggle task status:', error);
      }
    },
    []
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.warn('❌ Cannot delete task — missing token.');
        return;
      }

      try {
        await axios.delete(`${API_URL}/${taskId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setTasks(tasks => tasks.filter(task => task._id !== taskId));
      } catch (error) {
        console.error('❌ Failed to delete task:', error);
      }
    },
    []
  );

  const updateTask = useCallback(
    async (taskId: string, updates: Partial<Task>) => {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.warn('❌ Cannot update task — missing token.');
        return;
      }

      try {
        await axios.patch(`${API_URL}/${taskId}`, updates, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setTasks(tasks =>
          tasks.map(task =>
            task._id === taskId ? { ...task, ...updates } : task
          )
        );
      } catch (error) {
        console.error('❌ Failed to update task:', error);
      }
    },
    []
  );

  return {
    tasks,
    users,
    loading,
    fetchTasks,
    fetchUsers,
    addTask,
    toggleTask,
    deleteTask,
    updateTask,
  };
}