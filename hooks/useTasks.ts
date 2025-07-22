// hooks/useTasks.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

export interface Task {
  id: string;
  title: string;
  done: boolean;
  assigneeId: string;
}

const TASKS_KEY = 'TASKS';

// 🔁 Global reactive cache
let sharedTasks: Task[] = [];
let listeners: ((tasks: Task[]) => void)[] = [];

function notifyAll() {
  for (const listener of listeners) {
    listener([...sharedTasks]); // clone to force reactivity
  }
}

async function loadInitialTasks() {
  try {
    const stored = await AsyncStorage.getItem(TASKS_KEY);
    if (stored) {
      sharedTasks = JSON.parse(stored);
      notifyAll();
    }
  } catch (error) {
    console.error('Error loading tasks:', error);
  }
}

async function saveTasks(updatedTasks: Task[]) {
  try {
    sharedTasks = [...updatedTasks]; // ✅ ensure new array reference
    await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(sharedTasks));
    notifyAll();
  } catch (error) {
    console.error('Error saving tasks:', error);
  }
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(sharedTasks);

  useEffect(() => {
    if (sharedTasks.length === 0) {
      loadInitialTasks();
    }

    const listener = (updated: Task[]) => setTasks([...updated]);
    listeners.push(listener);

    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  const addTask = (title: string, assigneeId: string) => {
    const newTask: Task = {
      id: Date.now().toString(),
      title,
      done: false,
      assigneeId,
    };
    saveTasks([...sharedTasks, newTask]);
  };

  const toggleTask = (id: string) => {
    const updated = sharedTasks.map((t) =>
      t.id === id ? { ...t, done: !t.done } : t
    );
    saveTasks(updated);
  };

  const deleteTask = (id: string) => {
    const updated = sharedTasks.filter((t) => t.id !== id);
    console.log(`Deleting task ${id}, remaining: ${updated.map(t => t.id)}`); // ✅ log
    saveTasks(updated);
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    const updated = sharedTasks.map((t) =>
      t.id === id ? { ...t, ...updates } : t
    );
    saveTasks(updated);
  };

  return { tasks, addTask, toggleTask, deleteTask, updateTask };
}
