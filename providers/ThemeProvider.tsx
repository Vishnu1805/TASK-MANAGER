// app/providers/ThemeProvider.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { ColorSchemeName, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Theme = 'light' | 'dark';
type ThemeContextType = {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const THEME_KEY = 'TASKMGR_THEME_v1';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const device = useColorScheme();
  const [theme, setThemeState] = useState<Theme>(device === 'dark' ? 'dark' : 'light');

  useEffect(() => {
    (async () => {
      try {
        const t = await AsyncStorage.getItem(THEME_KEY);
        if (t === 'light' || t === 'dark') {
          setThemeState(t);
        }
      } catch (e) {
        console.warn('Failed to load theme', e);
      }
    })();
  }, []);

  const setTheme = async (t: Theme) => {
    setThemeState(t);
    try {
      await AsyncStorage.setItem(THEME_KEY, t);
    } catch (e) {
      console.warn('Failed to persist theme', e);
    }
  };

  const toggle = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
};
