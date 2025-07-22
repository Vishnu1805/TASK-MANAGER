import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Task {
  id: string;
  title: string;
  done: boolean;
  assigneeId: string;
}

const TASKS_KEY = 'TASKS';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    const stored = await AsyncStorage.getItem(TASKS_KEY);
    if (stored) {
      setTasks(JSON.parse(stored));
    }
  };

  const saveTasks = async (updatedTasks: Task[]) => {
    await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(updatedTasks));
    setTasks(updatedTasks);
  };

  const addTask = (title: string, assigneeId: string) => {
    const newTask: Task = { id: Date.now().toString(), title, done: false, assigneeId };
    const updated = [...tasks, newTask];
    saveTasks(updated);
  };

  const toggleTask = (id: string) => {
    const updated = tasks.map(t =>
      t.id === id ? { ...t, done: !t.done } : t
    );
    saveTasks(updated);
  };

  return { tasks, addTask, toggleTask };
}