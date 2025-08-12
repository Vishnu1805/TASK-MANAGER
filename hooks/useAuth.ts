// useAuth.ts
import { Server_Url } from '@/constants/Apikeys';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useEffect, useState } from 'react';

const API_URL = Server_Url;

export interface User {
  _id: string | null;
  name?: string;
  email?: string;
  isAdmin?: boolean;
  // allow any other fields returned by server
  [key: string]: any;
}

function normalizeToUnderscoreId(raw: any): User | null {
  if (!raw) return null;
  const _id = raw._id ?? raw.id ?? null;
  const cleaned: any = { ...raw, _id };
  if ('id' in cleaned) delete cleaned.id;
  return cleaned as User;
}

export async function getStoredUser(): Promise<User | null> {
  try {
    const userJson = await AsyncStorage.getItem('user');
    if (!userJson) return null;
    const raw = JSON.parse(userJson);
    return normalizeToUnderscoreId(raw);
  } catch (e) {
    console.warn('getStoredUser failed:', e);
    return null;
  }
}

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCurrentUser() {
      try {
        const token = await AsyncStorage.getItem('token');
        const userJson = await AsyncStorage.getItem('user');

        if (token && userJson) {
          const raw = JSON.parse(userJson);
          const user = normalizeToUnderscoreId(raw);
          setCurrentUser(user);
        } else {
          setCurrentUser(null);
        }
      } catch (error) {
        console.error('Failed to load user from storage:', error);
      } finally {
        setLoading(false);
      }
    }

    loadCurrentUser();
  }, []);

  const saveUserAndToken = async (token: string, rawUser: any) => {
    const user = normalizeToUnderscoreId(rawUser);
    if (!user) throw new Error('Invalid user returned from server');

    await AsyncStorage.setItem('token', token);
    await AsyncStorage.setItem('user', JSON.stringify(user));
    setCurrentUser(user);
    console.log('Saved user to storage:', user);
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await axios.post(`${API_URL}/register`, { name, email, password });
      // backend may return { token, user } or { token, ...userFields }
      const token = response.data?.token;
      const rawUser = response.data?.user ?? response.data;
      if (!token || !rawUser) {
        throw new Error('Invalid registration response from server');
      }

      await saveUserAndToken(token, rawUser);
      return true;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        console.error('Registration error:', error.response?.data);
        throw new Error(error.response?.data?.error || error.response?.data?.message || 'Registration failed');
      }
      throw new Error('An unexpected error occurred during registration');
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post(`${API_URL}/login`, { email, password });
      const token = response.data?.token;
      const rawUser = response.data?.user ?? response.data;
      if (!token || !rawUser) {
        throw new Error('Invalid login response from server');
      }

      await saveUserAndToken(token, rawUser);
      return true;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        console.error('Login error:', error.response?.data);
        throw new Error(error.response?.data?.error || error.response?.data?.message || 'Login failed');
      }
      throw new Error('An unexpected error occurred during login');
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      setCurrentUser(null);
      console.log('👋 Logged out');
    } catch (error) {
      console.error('Failed to logout:', error);
      throw new Error('Could not complete logout');
    }
  };

  return { currentUser, loading, register, login, logout };
}
