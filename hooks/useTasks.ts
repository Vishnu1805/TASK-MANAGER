import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useEffect, useState } from 'react';

export interface Task {
  _id: string;
  title: string;
  description?: string;
  status: string;
  dueDate?: string;
  userId: string;
}

const API_URL = 'http://localhost:3000/api/tasks'; // Adjust to your backend URL

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTasks() {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        try {
          const response = await axios.get(API_URL, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setTasks(response.data);
        } catch (error) {
          console.error('Failed to load tasks:', error);
        }
      }
      setLoading(false);
    }
    loadTasks();
  }, []);

  const addTask = async (title: string, description: string, status: string, dueDate: string) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      try {
        const response = await axios.post(
          API_URL,
          { title, description, status, dueDate },
          { headers: { Authorization: `Bearer ${token}` } }
        );
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

  return { tasks, loading, addTask, toggleTask, deleteTask, updateTask };
}