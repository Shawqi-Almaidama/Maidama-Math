import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { EducationLevel } from '../types/math.ts';
import { useLocalization } from './LocalizationContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import {
  getActivePreferences,
  getGuestPreferences,
  getUserPreferences,
  saveGuestPreferences,
  saveUserPreferences,
  subscribePreferences,
  normalizeLevel,
  DEFAULT_USER_PREFERENCES,
  UserPreferences,
} from '../utils/preferencesManager.ts';

export type UserLevel = EducationLevel;

interface EducationLevelContextType {
  level: EducationLevel;
  setLevel: (level: EducationLevel) => void;
  isBeginner: boolean;
  isIntermediate: boolean;
  isAdvanced: boolean;
  levelLabel: string;
  levelDescription: string;
  levelBadgeClass: string;
}

const EducationLevelContext = createContext<EducationLevelContextType | undefined>(undefined);

export const EducationLevelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { language } = useLocalization();
  const { user, syncUserData } = useAuth();
  const isAr = language === 'ar';

  const [level, setLevelState] = useState<EducationLevel>(() => getActivePreferences().level);
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
        const targetLevel = userPrefs?.level || DEFAULT_USER_PREFERENCES.level;
        setLevelState(targetLevel);
      } else {
        // Guest user active
        const guestPrefs = getGuestPreferences();
        setLevelState(guestPrefs.level);
      }
    }
  }, [user]);

  // Subscribe to external preference broadcast events
  useEffect(() => {
    const unsubscribe = subscribePreferences((prefs: UserPreferences) => {
      setLevelState(prefs.level);
    });
    return unsubscribe;
  }, []);

  const setLevel = useCallback(
    (newLevel: EducationLevel) => {
      const normalized = normalizeLevel(newLevel);
      setLevelState(normalized);
      if (user?.id) {
        saveUserPreferences(user.id, { level: normalized });
        syncUserData({ settings: { level: normalized } });
      } else {
        saveGuestPreferences({ level: normalized });
      }
    },
    [user, syncUserData]
  );

  const isBeginner = level === 'beginner';
  const isIntermediate = level === 'intermediate' || level === 'school';
  const isAdvanced = level === 'advanced' || level === 'university';

  const levelLabel = isAr
    ? isBeginner
      ? 'مبتدئ'
      : isIntermediate
        ? 'متوسط'
        : 'متقدم / جامعي'
    : isBeginner
      ? 'Beginner'
      : isIntermediate
        ? 'Intermediate'
        : 'Advanced / University';

  const levelDescription = isAr
    ? isBeginner
      ? 'واجهة مبسطة، تعريف بالمصطلحات والرموز، تفصيل لكل عملية حسابية، وإرشادات واضحة.'
      : isIntermediate
        ? 'خطوات الحل المعيارية، القواعد الرياضية المستخدمة، وتطبيق مباشر على المناهج.'
        : 'تدوين رياضي أكاديمي صارم، دراسة مجال التعريف والفرضيات، وخيارات حوسبة رمزية متقدمة.'
    : isBeginner
      ? 'Simplified interface, symbol definitions, step-by-step arithmetic details, and clear hints.'
      : isIntermediate
        ? 'Standard curriculum solution steps, mathematical rules stated, and balanced explanations.'
        : 'Rigorous academic notation, domain analysis, formal hypotheses, and advanced symbolic tools.';

  const levelBadgeClass =
    isBeginner
      ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
      : isIntermediate
        ? 'bg-indigo-950/70 border-indigo-800 text-indigo-300'
        : 'bg-purple-950/70 border-purple-800 text-purple-300';

  return (
    <EducationLevelContext.Provider
      value={{
        level,
        setLevel,
        isBeginner,
        isIntermediate,
        isAdvanced,
        levelLabel,
        levelDescription,
        levelBadgeClass,
      }}
    >
      {children}
    </EducationLevelContext.Provider>
  );
};

export const useEducationLevel = (): EducationLevelContextType => {
  const context = useContext(EducationLevelContext);
  if (!context) {
    throw new Error('useEducationLevel must be used within an EducationLevelProvider');
  }
  return context;
};

export default EducationLevelProvider;
