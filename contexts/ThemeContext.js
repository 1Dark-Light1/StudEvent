import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'studevent.theme';
const DEFAULT_THEME = 'light';

const ThemeContext = createContext({
  theme: DEFAULT_THEME,
  setTheme: async (_next) => {},
  isDark: false,
  colors: {},
  isReady: false,
});

// Кольори для світлої теми
const lightColors = {
  background: '#eef4ff',
  surface: '#fff',
  primary: '#3b85ff',
  primaryLight: '#8fc5ff',
  text: '#1a2c4f',
  textSecondary: '#99a7c3',
  textMuted: '#b0bbd6',
  border: '#eef1f6',
  cardBackground: '#fff',
  heroGradient: ['#3b85ff', '#8fc5ff'],
  heroGradientSettings: ['#dbe8ff', '#f6f7fb'],
  shadow: '#000',
  error: '#F44336',
  success: '#4caf50',
  avatarBg: '#dfe9ff',
  iconBg: '#f2f4fa',
  todayHighlight: '#d9ecff',
};

// Кольори для темної теми
const darkColors = {
  background: '#0f1419',
  surface: '#1a1f2e',
  primary: '#5a9fff',
  primaryLight: '#7bb3ff',
  text: '#e8ecf0',
  textSecondary: '#a0a8b8',
  textMuted: '#6b7280',
  border: '#2a2f3e',
  cardBackground: '#1f2432',
  heroGradient: ['#2d4a6b', '#1a2f4a'],
  heroGradientSettings: ['#1a2332', '#0f1419'],
  shadow: '#000',
  error: '#ff5252',
  success: '#66bb6a',
  avatarBg: '#2a3441',
  iconBg: '#252a38',
  todayHighlight: '#1e3a5f',
};

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(DEFAULT_THEME);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (mounted && saved) {
          setThemeState(saved);
        }
      } finally {
        if (mounted) setIsReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const setTheme = useCallback(async (nextTheme) => {
    if (!nextTheme || (nextTheme !== 'light' && nextTheme !== 'dark')) return;
    setThemeState(nextTheme);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, nextTheme);
    } catch {
      // storage failures shouldn't block theme changes
    }
  }, []);

  const isDark = theme === 'dark';
  const colors = isDark ? darkColors : lightColors;

  const value = useMemo(
    () => ({ theme, setTheme, isDark, colors, isReady }),
    [theme, setTheme, isDark, colors, isReady]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
