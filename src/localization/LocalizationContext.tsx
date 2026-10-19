import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef, ReactNode } from 'react';
import { arTranslations, enTranslations } from './translations.ts';
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

export type Language = 'ar' | 'en';

interface LocalizationContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  dir: 'rtl' | 'ltr';
  isRTL: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

export const LocalizationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, syncUserData } = useAuth();
  const [language, setLanguageState] = useState<Language>(() => getActivePreferences().language);
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
        const targetLang = userPrefs?.language || DEFAULT_USER_PREFERENCES.language;
        setLanguageState(targetLang);
      } else {
        // Guest user active
        const guestPrefs = getGuestPreferences();
        setLanguageState(guestPrefs.language);
      }
    }
  }, [user]);

  // Subscribe to external preference broadcast events
  useEffect(() => {
    const unsubscribe = subscribePreferences((prefs: UserPreferences) => {
      setLanguageState(prefs.language);
    });
    return unsubscribe;
  }, []);

  const dir: 'rtl' | 'ltr' = language === 'ar' ? 'rtl' : 'ltr';
  const isRTL = language === 'ar';

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
  }, [language, dir]);

  const setLanguage = useCallback(
    (newLang: Language) => {
      setLanguageState(newLang);
      if (user?.id) {
        saveUserPreferences(user.id, { language: newLang });
        syncUserData({ settings: { language: newLang } });
      } else {
        saveGuestPreferences({ language: newLang });
      }
    },
    [user, syncUserData]
  );

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  }, [language, setLanguage]);

  const currentDict = useMemo(() => {
    return language === 'ar' ? arTranslations : enTranslations;
  }, [language]);

  const fallbackDict = useMemo(() => {
    return language === 'ar' ? enTranslations : arTranslations;
  }, [language]);

  const t = useCallback(
    (path: string, params?: Record<string, string | number>): string => {
      const keys = path.split('.');
      let value: any = currentDict;

      for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
          value = value[key];
        } else {
          value = undefined;
          break;
        }
      }

      // Fallback if key missing
      if (value === undefined) {
        let fb: any = fallbackDict;
        for (const key of keys) {
          if (fb && typeof fb === 'object' && key in fb) {
            fb = fb[key];
          } else {
            fb = undefined;
            break;
          }
        }
        value = fb !== undefined ? fb : path;
      }

      if (typeof value !== 'string') {
        return path;
      }

      if (params) {
        let result = value;
        for (const [pKey, pVal] of Object.entries(params)) {
          result = result.replace(new RegExp(`{${pKey}}`, 'g'), String(pVal));
        }
        return result;
      }

      return value;
    },
    [currentDict, fallbackDict]
  );

  return (
    <LocalizationContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        dir,
        isRTL,
        t,
      }}
    >
      {children}
    </LocalizationContext.Provider>
  );
};

export const useLocalization = (): LocalizationContextType => {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
};
