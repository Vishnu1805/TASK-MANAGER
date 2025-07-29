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
      try {
        const token = await AsyncStorage.getItem('token');
        const userJson = await AsyncStorage.getItem('user');

        if (token && userJson) {
          const user: User = JSON.parse(userJson);
          setCurrentUser(user);
        }

        // Optional: validate token with /me endpoint
        // If not needed, you can skip this call entirely
      } catch (error) {
        console.error('Failed to load user from storage:', error);
      } finally {
        setLoading(false);
      }
    }

    loadCurrentUser();
  }, []);

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await axios.post(`${API_URL}/register`, { name, email, password });
      const { token, user } = response.data;

      // Save both token and user
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));

      setCurrentUser(user);
      console.log('✅ Registered and saved user:', user);
      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Registration error:', error.response?.data);
        throw new Error(error.response?.data.error || 'Registration failed');
      }
      throw new Error('An unexpected error occurred during registration');
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post(`${API_URL}/login`, { email, password });
      const { token, user } = response.data;

      // Save both token and user
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));

      setCurrentUser(user);
      console.log('✅ Logged in and saved user:', user);
      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Login error:', error.response?.data);
        throw new Error(error.response?.data.error || 'Login failed');
      }
      throw new Error('An unexpected error occurred during login');
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user'); // ✅ also remove user info
      setCurrentUser(null);
      console.log('👋 Logged out');
    } catch (error) {
      console.error('Failed to logout:', error);
      throw new Error('Could not complete logout');
    }
  };

  return { currentUser, loading, register, login, logout };
}
