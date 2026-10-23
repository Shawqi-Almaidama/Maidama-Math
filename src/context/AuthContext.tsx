import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  DEFAULT_USER_PREFERENCES,
  getGuestPreferences,
  getUserPreferences,
  saveUserPreferences,
  broadcastPreferences,
  sanitizePreferences,
} from '../utils/preferencesManager.ts';
import { getApiUrl } from '../utils/apiConfig.ts';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  createdAt: number;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  syncUserData: (data: { history?: any[]; favorites?: any[]; settings?: any }) => Promise<boolean>;
  fetchUserData: () => Promise<any | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(AUTH_TOKEN_KEY);
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const stored = localStorage.getItem(AUTH_USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(false);

  // Validate session token with server on initial load
  useEffect(() => {
    if (!token) return;

    let mounted = true;
    fetch(getApiUrl('/api/auth/me'), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return;
        if (data.success && data.user) {
          setUser(data.user);
          localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));

          // Fetch cloud preferences to ensure client is in sync with latest remote state
          fetch(getApiUrl('/api/user/data'), {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((r) => r.json())
            .then((userData) => {
              if (mounted && userData.success && userData.data?.settings) {
                const cloudPrefs = sanitizePreferences(userData.data.settings, DEFAULT_USER_PREFERENCES);
                saveUserPreferences(data.user.id, cloudPrefs);
                broadcastPreferences(cloudPrefs, data.user.id);
              }
            })
            .catch(() => {});
        } else {
          // Token expired or invalid
          setToken(null);
          setUser(null);
          localStorage.removeItem(AUTH_TOKEN_KEY);
          localStorage.removeItem(AUTH_USER_KEY);
          // Restore guest preferences
          const guestPrefs = getGuestPreferences();
          broadcastPreferences(guestPrefs, null);
        }
      })
      .catch((err) => {
        console.warn('Auth validation failed (network offline or server error):', err);
      });

    return () => {
      mounted = false;
    };
  }, [token]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.token && data.user) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem(AUTH_TOKEN_KEY, data.token);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));

        // Immediately apply this specific user's cached preferences (prevent flashing other users' or guest's prefs)
        const localUserPrefs = getUserPreferences(data.user.id);
        if (localUserPrefs) {
          broadcastPreferences(localUserPrefs, data.user.id);
        } else {
          // First time on this device for this user
          broadcastPreferences(DEFAULT_USER_PREFERENCES, data.user.id);
        }

        // Asynchronously check cloud data for latest user settings
        fetch(getApiUrl('/api/user/data'), {
          headers: { Authorization: `Bearer ${data.token}` },
        })
          .then((r) => r.json())
          .then((cloudRes) => {
            if (cloudRes.success && cloudRes.data?.settings) {
              const cloudPrefs = sanitizePreferences(cloudRes.data.settings, DEFAULT_USER_PREFERENCES);
              saveUserPreferences(data.user.id, cloudPrefs);
              broadcastPreferences(cloudPrefs, data.user.id);
            }
          })
          .catch(() => {});

        return { success: true };
      }
      return { success: false, error: data.error || 'Failed to login' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during login' };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.token && data.user) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem(AUTH_TOKEN_KEY, data.token);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));

        // Initialize user preferences with defaults (isolated from guest)
        saveUserPreferences(data.user.id, DEFAULT_USER_PREFERENCES);
        broadcastPreferences(DEFAULT_USER_PREFERENCES, data.user.id);

        fetch(getApiUrl('/api/user/sync'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${data.token}`,
          },
          body: JSON.stringify({ settings: DEFAULT_USER_PREFERENCES }),
        }).catch(() => {});

        return { success: true };
      }
      return { success: false, error: data.error || 'Registration failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during registration' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    if (token) {
      try {
        await fetch(getApiUrl('/api/auth/logout'), {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        console.warn('Logout request failed:', err);
      }
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);

    // Immediately restore independent guest preferences
    const guestPrefs = getGuestPreferences();
    broadcastPreferences(guestPrefs, null);
  };

  const syncUserData = useCallback(async (data: { history?: any[]; favorites?: any[]; settings?: any }) => {
    if (!token) return false;
    try {
      const res = await fetch(getApiUrl('/api/user/sync'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      return Boolean(resData.success);
    } catch (err) {
      console.warn('Data sync failed:', err);
      return false;
    }
  }, [token]);

  const fetchUserData = useCallback(async () => {
    if (!token) return null;
    try {
      const res = await fetch(getApiUrl('/api/user/data'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const resData = await res.json();
      if (resData.success && resData.data) {
        return resData.data;
      }
      return null;
    } catch (err) {
      console.warn('Failed to fetch user data:', err);
      return null;
    }
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        syncUserData,
        fetchUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
