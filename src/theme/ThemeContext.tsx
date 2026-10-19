import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  getActivePreferences,
  getGuestPreferences,
  getUserPreferences,
  saveGuestPreferences,
  saveUserPreferences,
  subscribePreferences,
  DEFAULT_USER_PREFERENCES,
  UserPreferences,
} from '../utils/preferencesManager.ts';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, syncUserData } = useAuth();
  const [theme, setThemeState] = useState<Theme>(() => getActivePreferences().theme);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);
  const currentUserIdRef = useRef<string | null>(user?.id || null);

  // Sync state whenever active user identity changes (login, logout, switch account)
  useEffect(() => {
    const prevUserId = currentUserIdRef.current;
    const newUserId = user?.id || null;
    currentUserIdRef.current = newUserId;

    if (prevUserId !== newUserId) {
      if (newUserId) {
        // Authenticated user active
        const userPrefs = getUserPreferences(newUserId);
        const targetTheme = userPrefs?.theme || DEFAULT_USER_PREFERENCES.theme;
        setThemeState(targetTheme);
      } else {
        // Guest user active
        const guestPrefs = getGuestPreferences();
        setThemeState(guestPrefs.theme);
      }
    }
  }, [user]);

  // Subscribe to external preference broadcast events
  useEffect(() => {
    const unsubscribe = subscribePreferences((prefs: UserPreferences) => {
      setThemeState(prefs.theme);
    });
    return unsubscribe;
  }, []);

  // Listen to system theme changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else if ('addListener' in mediaQuery) {
      (mediaQuery as any).addListener(handler);
      return () => (mediaQuery as any).removeListener(handler);
    }
  }, []);

  const resolvedTheme: ResolvedTheme = useMemo(() => {
    if (theme === 'system') return systemTheme;
    return theme;
  }, [theme, systemTheme]);

  // Apply theme classes to HTML document
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);
    root.setAttribute('data-theme', resolvedTheme);
    root.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  const setTheme = useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme);
      if (user?.id) {
        saveUserPreferences(user.id, { theme: newTheme });
        syncUserData({ settings: { theme: newTheme } });
      } else {
        saveGuestPreferences({ theme: newTheme });
      }
    },
    [user, syncUserData]
  );

  const toggleTheme = useCallback(() => {
    const next: Theme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }, [resolvedTheme, setTheme]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      toggleTheme,
      isDark: resolvedTheme === 'dark',
    }),
    [theme, resolvedTheme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
