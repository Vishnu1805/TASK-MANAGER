import { Server_Url } from '@/constants/Apikeys';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import React, { createContext, useContext, useEffect, useState } from 'react';

const API_URL = Server_Url;

export interface User {
  _id: string | null;
  name?: string;
  email?: string;
  isAdmin?: boolean;
  [key: string]: any;
}

type AuthContextShape = {
  currentUser: User | null;
  loading: boolean;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextShape | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
          console.log('Loaded user:', user?._id, user?.name);
        } else {
          setCurrentUser(null);
          console.log('No user or token found in AsyncStorage');
        }
      } catch (e) {
        console.warn('Failed to load user:', e);
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    }
    loadCurrentUser();
  }, []);

  const normalizeToUnderscoreId = (raw: any): User | null => {
    if (!raw) return null;
    const _id = raw._id ?? raw.id ?? null;
    const cleaned: any = { ...raw, _id };
    if ('id' in cleaned) delete cleaned.id;
    return cleaned as User;
  };

  const saveUserAndToken = async (token: string, rawUser: any) => {
    const user = normalizeToUnderscoreId(rawUser);
    if (!user) throw new Error('Invalid user data');
    try {
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      setCurrentUser(user);
      console.log('Saved user:', user._id, user.name);
    } catch (e) {
      console.warn('Failed to save user/token:', e);
      throw new Error('Failed to save user data');
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await axios.post(`${API_URL}/register`, { name, email, password });
      const token = response.data?.token;
      const rawUser = response.data?.user ?? response.data;
      if (!token || !rawUser) throw new Error('Invalid registration response');
      await saveUserAndToken(token, rawUser);
      return true;
    } catch (e: any) {
      console.warn('Registration failed:', e.message);
      throw new Error(e.response?.data?.message || e.message || 'Registration failed');
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post(`${API_URL}/login`, { email, password });
      const token = response.data?.token;
      const rawUser = response.data?.user ?? response.data;
      if (!token || !rawUser) throw new Error('Invalid login response');
      await saveUserAndToken(token, rawUser);
      return true;
    } catch (e: any) {
      console.warn('Login failed:', e.message);
      throw new Error(e.response?.data?.message || e.message || 'Login failed');
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      setCurrentUser(null);
      console.log('Logged out');
    } catch (e) {
      console.warn('Logout failed:', e);
      throw new Error('Failed to logout');
    }
  };

  const ctx: AuthContextShape = {
    currentUser,
    loading,
    register,
    login,
    logout,
  };

  return React.createElement(AuthContext.Provider, { value: ctx }, children);
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
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

function normalizeToUnderscoreId(raw: any): User | null {
  if (!raw) return null;
  const _id = raw._id ?? raw.id ?? null;
  const cleaned: any = { ...raw, _id };
  if ('id' in cleaned) delete cleaned.id;
  return cleaned as User;
}
