import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  id: string;
  username: string;
  password: string;
}

const users: User[] = [
  { id: '1', username: 'user1', password: 'pass1' },
  { id: '2', username: 'user2', password: 'pass2' },
];

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    async function loadCurrentUser() {
      const userId = await AsyncStorage.getItem('currentUserId');
      if (userId) {
        const user = users.find(u => u.id === userId);
        if (user) {
          setCurrentUser(user);
        }
      }
    }
    loadCurrentUser();
  }, []);

  const login = async (username: string, password: string) => {
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      await AsyncStorage.setItem('currentUserId', user.id);
      setCurrentUser(user);
      return true;
    }
    return false;
  };

  const logout = async () => {
    await AsyncStorage.removeItem('currentUserId');
    setCurrentUser(null);
  };

  return { currentUser, login, logout, users };
}