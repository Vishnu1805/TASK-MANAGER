import { Server_Url } from '@/constants/Apikeys';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useEffect, useState } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
}

const API_URL = Server_Url;

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCurrentUser() {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        try {
          const response = await axios.get(`${API_URL}/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setCurrentUser(response.data.user);
        } catch (error) {
          console.error('Failed to load user:', error);
          await AsyncStorage.removeItem('token');
        }
      }
      setLoading(false);
    }
    loadCurrentUser();
  }, []);

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await axios.post(`${API_URL}/register`, { name, email, password });
      const { token, user } = response.data;
      await AsyncStorage.setItem('token', token);
      setCurrentUser(user);
      return true;
    } catch (error) {
      console.error('Registration failed:', error);
      return false;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post(`${API_URL}/login`, { email, password });
      const { token, user } = response.data;
      await AsyncStorage.setItem('token', token);
      setCurrentUser(user);
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('token');
    setCurrentUser(null);
  };

  return { currentUser, loading, register, login, logout };
}