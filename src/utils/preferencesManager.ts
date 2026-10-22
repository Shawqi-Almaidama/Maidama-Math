import { EducationLevel, ExplanationStyle, Language } from '../types/math.ts';
import { Theme } from '../theme/ThemeContext.tsx';

export type SpeechEngineType = 'neural' | 'local';

export interface UserPreferences {
  language: Language;
  theme: Theme;
  level: EducationLevel;
  style: ExplanationStyle;
  speechRate?: number;
  speechVoiceURI?: string;
  speechEngine?: SpeechEngineType;
  speechNeuralVoice?: string;
}

export const GUEST_PREFS_KEY = 'maidama_math_guest_prefs_v1';
export const USER_PREFS_PREFIX = 'maidama_math_user_prefs_';
export const LEGACY_THEME_KEY = 'maidama_math_theme_v1';
export const LEGACY_LANG_KEY = 'maidama_math_lang_v1';
export const LEGACY_LEVEL_KEY = 'maidama_math_user_level_v2';
export const LEGACY_PREFS_KEY = 'maidama_math_prefs_v1';
export const AUTH_USER_KEY = 'maidama_math_auth_user_v1';
export const AUTH_TOKEN_KEY = 'maidama_math_auth_token_v1';

export const DEFAULT_GUEST_PREFERENCES: UserPreferences = {
  language: 'ar',
  theme: 'system',
  level: 'intermediate',
  style: 'step-by-step',
  speechRate: 0.9,
  speechVoiceURI: '',
  speechEngine: 'neural',
  speechNeuralVoice: 'Charon',
};

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  language: 'ar',
  theme: 'system',
  level: 'intermediate',
  style: 'step-by-step',
  speechRate: 0.9,
  speechVoiceURI: '',
  speechEngine: 'neural',
  speechNeuralVoice: 'Charon',
};

export function normalizeLanguage(lang: any): Language {
  return lang === 'en' ? 'en' : 'ar';
}

export function normalizeTheme(th: any): Theme {
  return th === 'light' || th === 'dark' || th === 'system' ? th : 'system';
}

export function normalizeLevel(lvl: any): EducationLevel {
  if (lvl === 'beginner') return 'beginner';
  if (lvl === 'advanced' || lvl === 'university') return 'advanced';
  return 'intermediate';
}

export function normalizeStyle(st: any): ExplanationStyle {
  if (st === 'quick' || st === 'step-by-step' || st === 'concept' || st === 'exam') return st;
  return 'step-by-step';
}

export function normalizeSpeechRate(rate: any): number {
  const num = typeof rate === 'number' ? rate : parseFloat(rate);
  if (isNaN(num) || num < 0.5 || num > 1.5) return 0.9;
  return num;
}

export function sanitizePreferences(raw: any, fallback: UserPreferences): UserPreferences {
  if (!raw || typeof raw !== 'object') return { ...fallback };
  return {
    language: raw.language ? normalizeLanguage(raw.language) : fallback.language,
    theme: raw.theme ? normalizeTheme(raw.theme) : fallback.theme,
    level: raw.level ? normalizeLevel(raw.level) : fallback.level,
    style: raw.style ? normalizeStyle(raw.style) : fallback.style,
    speechRate: raw.speechRate !== undefined ? normalizeSpeechRate(raw.speechRate) : (fallback.speechRate ?? 0.9),
    speechVoiceURI: typeof raw.speechVoiceURI === 'string' ? raw.speechVoiceURI : (fallback.speechVoiceURI ?? ''),
    speechEngine: raw.speechEngine === 'local' ? 'local' : 'neural',
    speechNeuralVoice: typeof raw.speechNeuralVoice === 'string' && raw.speechNeuralVoice ? raw.speechNeuralVoice : (fallback.speechNeuralVoice ?? 'Charon'),
  };
}

export function getActiveUserId(): string | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (raw) {
      const u = JSON.parse(raw);
      if (u && typeof u.id === 'string' && u.id.trim()) {
        return u.id.trim();
      }
    }
  } catch {}
  return null;
}

export function getGuestPreferences(): UserPreferences {
  try {
    const raw = localStorage.getItem(GUEST_PREFS_KEY);
    if (raw) {
      return sanitizePreferences(JSON.parse(raw), DEFAULT_GUEST_PREFERENCES);
    }
    // Backward compatibility with legacy storage keys if guest prefs not yet created
    const legacyLang = localStorage.getItem(LEGACY_LANG_KEY);
    const legacyTheme = localStorage.getItem(LEGACY_THEME_KEY);
    const legacyLevel = localStorage.getItem(LEGACY_LEVEL_KEY);
    const legacyPrefsRaw = localStorage.getItem(LEGACY_PREFS_KEY);
    const legacyPrefs = legacyPrefsRaw ? JSON.parse(legacyPrefsRaw) : {};

    const fallback: UserPreferences = {
      language: legacyLang === 'en' || legacyLang === 'ar' ? legacyLang : DEFAULT_GUEST_PREFERENCES.language,
      theme: legacyTheme === 'light' || legacyTheme === 'dark' || legacyTheme === 'system' ? legacyTheme : DEFAULT_GUEST_PREFERENCES.theme,
      level: legacyLevel ? normalizeLevel(legacyLevel) : legacyPrefs.level ? normalizeLevel(legacyPrefs.level) : DEFAULT_GUEST_PREFERENCES.level,
      style: legacyPrefs.style ? normalizeStyle(legacyPrefs.style) : DEFAULT_GUEST_PREFERENCES.style,
    };
    return fallback;
  } catch {
    return { ...DEFAULT_GUEST_PREFERENCES };
  }
}

export function getUserPreferences(userId: string): UserPreferences | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(`${USER_PREFS_PREFIX}${userId}`);
    if (raw) {
      return sanitizePreferences(JSON.parse(raw), DEFAULT_USER_PREFERENCES);
    }
  } catch {}
  return null;
}

export function getActivePreferences(): UserPreferences {
  const userId = getActiveUserId();
  if (userId) {
    const userPrefs = getUserPreferences(userId);
    if (userPrefs) return userPrefs;
    return { ...DEFAULT_USER_PREFERENCES };
  }
  return getGuestPreferences();
}

export function saveGuestPreferences(partial: Partial<UserPreferences>): UserPreferences {
  const current = getGuestPreferences();
  const updated: UserPreferences = {
    ...current,
    ...partial,
  };
  try {
    localStorage.setItem(GUEST_PREFS_KEY, JSON.stringify(updated));
    // Keep legacy keys updated for guest backward compatibility
    if (updated.theme) localStorage.setItem(LEGACY_THEME_KEY, updated.theme);
    if (updated.language) localStorage.setItem(LEGACY_LANG_KEY, updated.language);
    if (updated.level) localStorage.setItem(LEGACY_LEVEL_KEY, updated.level);
    localStorage.setItem(
      LEGACY_PREFS_KEY,
      JSON.stringify({
        language: updated.language,
        style: updated.style,
        level: updated.level,
      })
    );
  } catch (e) {
    console.warn('Failed to save guest preferences:', e);
  }
  return updated;
}

export function saveUserPreferences(userId: string, partial: Partial<UserPreferences>): UserPreferences {
  const current = getUserPreferences(userId) || { ...DEFAULT_USER_PREFERENCES };
  const updated: UserPreferences = {
    ...current,
    ...partial,
  };
  try {
    localStorage.setItem(`${USER_PREFS_PREFIX}${userId}`, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save user preferences:', e);
  }
  return updated;
}

export type PreferencesListener = (prefs: UserPreferences, userId: string | null) => void;
const listeners = new Set<PreferencesListener>();

export function subscribePreferences(listener: PreferencesListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function broadcastPreferences(prefs: UserPreferences, userId: string | null): void {
  for (const listener of listeners) {
    try {
      listener(prefs, userId);
    } catch (err) {
      console.error('Error in preferences listener:', err);
    }
  }
}
