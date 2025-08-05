import { Task_API_URL, User_API_URL } from '@/constants/Apikeys';
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
  _id: string; // Changed from id to _id to match backend
  name: string;
}

const API_URL = Task_API_URL;
const USERS_URL = User_API_URL;

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Load tasks and users on component mount
  useEffect(() => {
    console.log('Initializing useTasks hook...');
    (async () => {
      const token = await AsyncStorage.getItem('token');
      console.log('Token retrieved:', token ? 'Present' : 'Absent');
      if (token) {
        await Promise.all([fetchTasks(), fetchUsers()]);
      } else {
        console.warn('🔒 No token found in AsyncStorage. Skipping fetch.');
      }
      setLoading(false);
    })();
  }, []);

  const fetchTasks = useCallback(async () => {
    console.log('Fetching tasks...');
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      console.warn('❌ Cannot fetch tasks — missing token.');
      return;
    }

    try {
      const { data } = await axios.get<Task[]>(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Tasks fetched:', data);
      setTasks(data);
    } catch (error) {
      console.error('❌ Failed to fetch tasks:', error);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    console.log('Fetching users...');
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      console.warn('❌ Cannot fetch users — missing token.');
      return;
    }

    try {
      const { data } = await axios.get<User[]>(USERS_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Users fetched:', data);
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
      assignees: string[],
      userId: string | null
    ) => {
      console.log('Adding task with payload:', { title, description, priority, dueDate, assignees, userId });
      const token = await AsyncStorage.getItem('token');
      if (!token || !userId) {
        console.warn('⚠️ Missing token or user ID');
        console.log('token:', token);
        console.log('userId:', userId);
        throw new Error('Missing authentication or user ID');
      }

      // Ensure users are loaded before validation
      if (users.length === 0) {
        console.warn('⚠️ Users array is empty, fetching users...');
        await fetchUsers();
        if (users.length === 0) {
          throw new Error('No users available to assign');
        }
      }

      console.log('Current users array:', users);
      // Filter out invalid assignees, explicitly rejecting null or undefined
      const validAssignees = assignees.filter(id => {
        const isValid = id !== null && id !== undefined && users.some(u => u._id === id); // Changed to u._id
        console.log(`Validating assignee ${id}: ${isValid ? 'Valid' : 'Invalid'}`);
        return isValid;
      });
      console.log('Validated assignees:', validAssignees);

      if (!validAssignees.length) {
        console.warn('⚠️ No valid assignees provided');
        throw new Error('No valid assignees provided');
      }

      const payload = {
        title,
        description,
        status: 'pending',
        priority,
        dueDate,
        assignees: validAssignees,
        userId,
      };

      try {
        console.log('Sending POST request to:', API_URL, 'with payload:', payload);
        const response = await axios.post(API_URL, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Task creation response:', response.data);
        await fetchTasks(); // refresh task list
        console.log('✅ Task created and tasks list refreshed');
      } catch (error: any) {
        console.error('❌ Failed to add task:', error.response?.data || error.message);
        throw error;
      }
    },
    [fetchTasks, users]
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