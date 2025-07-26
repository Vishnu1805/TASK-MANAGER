import { Task_API_URL } from '@/constants/Apikeys';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useEffect, useState } from 'react';

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

const API_URL = Task_API_URL;

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadInitialData() {
      const token = await AsyncStorage.getItem('token');
      console.log('Initial token:', token);
      if (token) {
        try {
          await Promise.all([fetchTasks(token), fetchUsers(token)]);
        } catch (error) {
          console.error('Failed to load initial data:', error);
          if (axios.isAxiosError(error)) {
            console.error('Error details:', error.response?.status, error.response?.data);
            if (error.response?.status === 404) {
              console.error('Endpoint not found. Check API_URL:', API_URL);
            }
          }
        }
      }
      setLoading(false);
    }
    loadInitialData();
  }, []);

  const fetchTasks = async (token: string) => {
    const response = await axios.get(API_URL, { headers: { Authorization: `Bearer ${token}` } });
    console.log('Fetched tasks:', response.data);
    setTasks(response.data);
  };

  const fetchUsers = async (token: string) => {
    const response = await axios.get('http://localhost:3000/api/users', { headers: { Authorization: `Bearer ${token}` } });
    // console.log('Fetched users:', response.data);
    setUsers(response.data);
  };

  const addTask = async (
    title: string,
    description: string,
    priority: 'urgent' | 'medium' | 'low',
    dueDate: string,
    assignees: string[]
  ) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      try {
        const response = await axios.post(
          API_URL,
          { title, description, status: 'pending', priority, dueDate, assignees },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log('Added task:', response.data);
        setTasks([...tasks, response.data]);
      } catch (error) {
        console.error('Failed to add task:', error);
      }
    }
  };

  const toggleTask = async (id: string) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      try {
        const task = tasks.find(t => t._id === id);
        if (task) {
          const updatedStatus = task.status === 'completed' ? 'pending' : 'completed';
          const response = await axios.put(
            `${API_URL}/${id}`,
            { status: updatedStatus },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setTasks(tasks.map(t => (t._id === id ? response.data : t)));
        }
      } catch (error) {
        console.error('Failed to toggle task:', error);
      }
    }
  };

  const deleteTask = async (id: string) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      try {
        await axios.delete(`${API_URL}/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTasks(tasks.filter(t => t._id !== id));
      } catch (error) {
        console.error('Failed to delete task:', error);
      }
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      try {
        const response = await axios.put(
          `${API_URL}/${id}`,
          updates,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setTasks(tasks.map(t => (t._id === id ? response.data : t)));
      } catch (error) {
        console.error('Failed to update task:', error);
      }
    }
  };

  return { tasks, users, loading, addTask, toggleTask, deleteTask, updateTask, fetchUsers };
}