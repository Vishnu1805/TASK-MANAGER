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
        console.log('Token:', token);
        if (token) {
          const response = await axios.get(`${API_URL}/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          console.log('User response:', response.data);
          setCurrentUser(response.data.user);
        }
      } catch (error) {
        console.error('Failed to load user:', error);
        if (axios.isAxiosError(error)) {
          console.error('Error details:', error.response?.status, error.response?.data);
          if (error.response?.status === 404) {
            console.error('Endpoint /me not found. Check Server_Url:', API_URL);
          } else if (error.response?.status === 401) {
            await AsyncStorage.removeItem('token');
            console.log('Token removed due to 401');
          }
        }
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
      await AsyncStorage.setItem('token', token);
      setCurrentUser(user);
      console.log('Registered user:', user);
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
      await AsyncStorage.setItem('token', token);
      setCurrentUser(user);
      console.log('Logged in user:', user);
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
      setCurrentUser(null);
      console.log('Logged out');
    } catch (error) {
      console.error('Failed to logout:', error);
      throw new Error('Could not complete logout');
    }
  };

  return { currentUser, loading, register, login, logout };
}