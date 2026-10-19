import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  Sparkles, 
  History as HistoryIcon, 
  AlertCircle, 
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Plus
} from 'lucide-react';
import { Navbar, NavTab } from './components/Navbar.tsx';
import { CanonicalMathInput } from './components/CanonicalMathInput.tsx';
import { SolutionViewer } from './components/SolutionViewer.tsx';
import { GraphingCalculator } from './components/GraphingCalculator.tsx';
import { TopicsBrowser } from './components/TopicsBrowser.tsx';
import { HistoryView } from './components/HistoryView.tsx';
import { AboutView } from './components/AboutView.tsx';
import { VoiceModal } from './components/VoiceModal.tsx';
import { CameraModal } from './components/CameraModal.tsx';
import { FileModal } from './components/FileModal.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { useLocalization } from './localization/LocalizationContext.tsx';
import { useEducationLevel } from './localization/EducationLevelContext.tsx';
import { useAuth } from './context/AuthContext.tsx';
import { localizeCategory } from './utils/solutionLocalizer.ts';
import { 
  MathSolution, 
  ExplanationStyle, 
  EducationLevel, 
  CalculationHistoryItem, 
  MathCategory 
} from './types/math.ts';
import {
  getActivePreferences,
  getGuestPreferences,
  getUserPreferences,
  saveGuestPreferences,
  saveUserPreferences,
  subscribePreferences,
  broadcastPreferences,
  sanitizePreferences,
  DEFAULT_USER_PREFERENCES,
} from './utils/preferencesManager.ts';

const STORAGE_KEY_HISTORY = 'maidama_math_history_v1';

// Bounded single retry for transient network connection drops during server startup
async function postSolveRequest(payload: any): Promise<Response> {
  const options: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  };

  try {
    return await fetch('/api/solve', options);
  } catch (err: any) {
    // Only perform a single bounded retry if the error is a transient network disconnect
    if (err?.name === 'TypeError' || err?.message?.includes('fetch')) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      return await fetch('/api/solve', options);
    }
    throw err;
  }
}

export default function App() {
  const { language, setLanguage, isRTL, t } = useLocalization();
  const { level, setLevel, isBeginner } = useEducationLevel();
  const { user, syncUserData, fetchUserData } = useAuth();

  // Navigation & View
  const [currentTab, setCurrentTab] = useState<NavTab>('home');
  const [previousTab, setPreviousTab] = useState<NavTab | null>(null);
  const [returnTarget, setReturnTarget] = useState<{
    tab: NavTab;
    label: string;
    filterFav?: boolean;
    topicCategory?: string;
  } | null>(null);
  const [historyFilterFav, setHistoryFilterFav] = useState(false);
  const [selectedTopicCategory, setSelectedTopicCategory] = useState<string | undefined>(undefined);

  // Pedagogical Preferences
  const [style, setStyle] = useState<ExplanationStyle>(() => getActivePreferences().style);
  const prevUserIdRef = React.useRef<string | null>(user?.id || null);

  // Sync style state whenever active user identity changes (login, logout, switch account)
  useEffect(() => {
    const prevUserId = prevUserIdRef.current;
    const newUserId = user?.id || null;
    prevUserIdRef.current = newUserId;

    if (prevUserId !== newUserId) {
      if (newUserId) {
        const userPrefs = getUserPreferences(newUserId);
        setStyle(userPrefs?.style || DEFAULT_USER_PREFERENCES.style);
      } else {
        const guestPrefs = getGuestPreferences();
        setStyle(guestPrefs.style);
      }
    }
  }, [user]);

  // Subscribe to external preference broadcast events
  useEffect(() => {
    const unsubscribe = subscribePreferences((prefs) => {
      setStyle(prefs.style);
    });
    return unsubscribe;
  }, []);

  const handleStyleChange = (newStyle: ExplanationStyle) => {
    setStyle(newStyle);
    if (user?.id) {
      saveUserPreferences(user.id, { style: newStyle });
      syncUserData({ settings: { style: newStyle } });
    } else {
      saveGuestPreferences({ style: newStyle });
    }
  };

  // Unified Mathematical Input state
  const [problemInput, setProblemInput] = useState('');
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const [solveError, setSolveError] = useState<string | null>(null);

  // Active solution & History
  const [currentSolution, setCurrentSolution] = useState<MathSolution | null>(null);
  const [hasStaleSolution, setHasStaleSolution] = useState(false);
  const [history, setHistory] = useState<CalculationHistoryItem[]>([]);
  const [categories, setCategories] = useState<MathCategory[]>([]);

  // Modals
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isFileOpen, setIsFileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Clear active solution and input to start fresh problem cleanly
  const handleStartNewProblem = () => {
    setCurrentSolution(null);
    setProblemInput('');
    setSolveError(null);
    setHasStaleSolution(false);
    setReturnTarget(null);
    setCurrentTab('home');
  };

  // Cloud sync when authenticated user logs in
  useEffect(() => {
    if (!user) return;
    fetchUserData().then((cloudData) => {
      if (cloudData && Array.isArray(cloudData.history) && cloudData.history.length > 0) {
        setHistory((localPrev) => {
          const existingIds = new Set(localPrev.map((h) => h.id));
          const merged = [...localPrev];
          for (const item of cloudData.history) {
            if (!existingIds.has(item.id)) {
              merged.push(item);
              existingIds.add(item.id);
            }
          }
          try {
            localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }
      if (cloudData && cloudData.settings) {
        const sanitized = sanitizePreferences(cloudData.settings, DEFAULT_USER_PREFERENCES);
        saveUserPreferences(user.id, sanitized);
        broadcastPreferences(sanitized, user.id);
      }
    });
  }, [user, fetchUserData]);

  // Sync history updates to cloud
  useEffect(() => {
    if (user && history.length > 0) {
      syncUserData({
        history,
        favorites: history.filter((h) => h.isFavorite),
      });
    }
  }, [user, history, syncUserData]);

  // Load history on initial mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (e) {
      console.warn('Failed to load local storage:', e);
    }

    // Fetch curriculum categories
    fetch('/api/categories')
      .then((r) => r.json())
      .then((d) => {
        if (d.categories) setCategories(d.categories);
      })
      .catch((err) => console.warn('Categories load error:', err));
  }, []);

  // Save history
  const saveToHistory = (sol: MathSolution) => {
    const newItem: CalculationHistoryItem = {
      id: sol.id,
      timestamp: sol.timestamp,
      problem: sol.originalQuestion,
      finalAnswer: sol.plainAnswer || sol.finalAnswer,
      category: sol.category,
      topic: sol.topic,
      verificationStatus: sol.verification.status,
      inputMethod: sol.inputMethod,
      isFavorite: false,
      solution: sol,
    };

    setHistory((prev) => {
      const updated = [newItem, ...prev.filter((i) => i.id !== newItem.id)].slice(0, 100);
      try {
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
      } catch (err) {
        console.warn('History storage failed:', err);
      }
      return updated;
    });
  };

  const toggleFavorite = (id: string) => {
    setHistory((prev) => {
      const updated = prev.map((item) =>
        item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
      );
      try {
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
      } catch (err) {
        console.warn('History storage update failed:', err);
      }
      return updated;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY_HISTORY);
    } catch (err) {
      console.warn('Clear history failed:', err);
    }
  };

  // Virtual keyboard symbol insertion
  const handleInsertSymbol = (symbol: string) => {
    setProblemInput((prev) => prev + symbol);
  };

  // Main Solve handler
  const handleSolve = async (
    overrideProblem?: string,
    media?: {
      imageBase64?: string;
      imageMimeType?: string;
      fileBase64?: string;
      fileMimeType?: string;
      fileName?: string;
      inputMethod?: 'text' | 'voice' | 'camera' | 'file';
    }
  ) => {
    if (isSolving) {
      setSolveError(t('solver.alreadySolving'));
      return;
    }

    const q = overrideProblem !== undefined ? overrideProblem : problemInput;
    if (!q.trim() && !media?.imageBase64 && !media?.fileBase64) return;

    setIsSolving(true);
    setSolveError(null);
    setCurrentTab('solve');

    try {
      const res = await postSolveRequest({
        problem: q.trim(),
        style,
        level,
        language,
        imageBase64: media?.imageBase64,
        imageMimeType: media?.imageMimeType,
        fileBase64: media?.fileBase64,
        fileMimeType: media?.fileMimeType,
        fileName: media?.fileName,
        inputMethod:
          media?.inputMethod ||
          (media?.imageBase64 ? 'camera' : media?.fileBase64 ? 'file' : 'text'),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        throw new Error(
          language === 'ar'
            ? 'استجابة غير صالحة من الخادم. يرجى المحاولة مرة أخرى.'
            : 'Invalid server response. Please try again.'
        );
      }

      if (res.ok && data?.success && data?.solution) {
        setHasStaleSolution(false);
        setCurrentSolution(data.solution);
        saveToHistory(data.solution);
      } else {
        if (currentSolution) {
          setHasStaleSolution(true);
        }
        const rawError = String(data?.error || '');
        let errorMsg = '';
        if (res.status === 503 || rawError.includes('503') || rawError.includes('UNAVAILABLE') || rawError.includes('high demand') || rawError.includes('overloaded')) {
          errorMsg = t('solver.serviceUnavailable');
        } else if (res.status === 429 || rawError.includes('429') || rawError.includes('RESOURCE_EXHAUSTED') || rawError.includes('quota')) {
          errorMsg = t('solver.quotaExceeded');
        } else if (res.status === 400) {
          errorMsg = language === 'ar' ? 'يرجى إدخال مسألة رياضية صالحة للحل.' : 'Please enter a valid mathematical problem.';
        } else {
          errorMsg = language === 'ar' ? 'حدث خطأ أثناء معالجة المسألة الرياضية. يرجى النقر على "إعادة المحاولة".' : 'An error occurred while processing the math problem. Please click "Retry".';
        }
        setSolveError(errorMsg);
      }
    } catch (err: any) {
      if (currentSolution) {
        setHasStaleSolution(true);
      }
      const isNetworkError =
        err?.name === 'TypeError' ||
        err?.message?.includes('Failed to fetch') ||
        err?.message?.includes('NetworkError');

      const userFriendlyMsg = isNetworkError
        ? (language === 'ar'
            ? 'تعذر الاتصال بخادم الحسابات الرياضية. يرجى التحقق من اتصالك بالإنترنت ثم النقر على "إعادة المحاولة".'
            : 'Unable to reach the calculation server. Please check your network connection and click "Retry".')
        : (language === 'ar' ? 'حدث خطأ أثناء معالجة المسألة الرياضية.' : 'An error occurred while processing the math problem.');

      setSolveError(userFriendlyMsg);
    } finally {
      setIsSolving(false);
    }
  };

  // Handle popstate for browser and mobile device back button
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.tab) {
        setCurrentTab(e.state.tab);
        if (e.state.returnTarget !== undefined) {
          setReturnTarget(e.state.returnTarget);
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Preset example click
  const handleSelectExample = (
    exampleQuery: string, 
    sourceTab: 'home' | 'topics' = 'home',
    topicCategory?: string
  ) => {
    setProblemInput(exampleQuery);
    if (topicCategory) {
      setSelectedTopicCategory(topicCategory);
    }
    setReturnTarget({
      tab: sourceTab,
      label: sourceTab === 'topics' ? t('nav.backToTopics') : t('nav.backToHome'),
      topicCategory,
    });
    handleSolve(exampleQuery);
  };

  const handleTabChange = (newTab: NavTab) => {
    if (newTab !== currentTab) {
      setPreviousTab(currentTab);
      try {
        window.history.pushState({ tab: newTab }, '', '');
      } catch {}
    }
    // If deliberately navigating to a root section, clear returnTarget unless going to solve
    if (newTab !== 'solve') {
      setReturnTarget(null);
    }
    // Canonical single input rule: if user taps Solve Problem with no problem loaded,
    // route to home and focus the canonical input
    if (newTab === 'solve' && !currentSolution) {
      setCurrentTab('home');
      setTimeout(() => {
        const textarea = document.querySelector('textarea[aria-label="Mathematical Problem Input"]') as HTMLTextAreaElement | null;
        if (textarea) textarea.focus();
      }, 50);
      return;
    }
    setCurrentTab(newTab);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white transition-colors duration-150">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={handleTabChange}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        hasActiveSolution={Boolean(currentSolution)}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-6">
        {/* TAB 1: HOME VIEW */}
        {currentTab === 'home' && (
          <div className="space-y-8">
            {/* Hero Banner */}
            <div className="text-center max-w-3xl mx-auto space-y-3 pt-2 sm:pt-6">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-400">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                <span>{t('home.badge')}</span>
              </div>

              <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {t('home.heroTitlePrefix')}
                <span className="bg-gradient-to-r from-indigo-600 via-sky-600 to-indigo-700 dark:from-indigo-400 dark:via-sky-300 dark:to-indigo-300 bg-clip-text text-transparent">
                  {t('home.heroTitleGradient')}
                </span>
              </h1>

              <p className="text-xs sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
                {t('home.heroSubtitle')}
              </p>
            </div>

            {/* Beginner Quick Guide if Beginner level is selected */}
            {isBeginner && (
              <div className="max-w-3xl mx-auto bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-4 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-3 shadow-xs">
                <span className="text-xl shrink-0">🌱</span>
                <div className="space-y-1">
                  <span className="font-bold text-emerald-800 dark:text-emerald-300 block">
                    {isRTL ? 'وضع المبتدئين مفعّل:' : 'Beginner Mode Active:'}
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 text-[11px] sm:text-xs leading-relaxed">
                    {isRTL
                      ? 'تم تبسيط الواجهة والشروح لتناسب المبتدئين. يمكنك كتابة أي مسألة بسيطة (كسور، جذور، معادلات من الدرجة الأولى) وسيقوم المعلم بتفصيل كل خطوة بدقة مع تعريف المصطلحات.'
                      : 'The interface and derivations are simplified for beginners. Enter any problem (fractions, roots, linear equations) and the tutor will break down every operation step by step.'}
                  </p>
                </div>
              </div>
            )}

            {/* Primary Problem Input Card - Canonical Component */}
            <div className="max-w-3xl mx-auto">
              <CanonicalMathInput
                value={problemInput}
                onChange={setProblemInput}
                onSolve={() => handleSolve()}
                isSolving={isSolving}
                style={style}
                onStyleChange={setStyle}
                level={level}
                onLevelChange={setLevel}
                onOpenVoice={() => setIsVoiceOpen(true)}
                onOpenCamera={() => setIsCameraOpen(true)}
                onOpenFile={() => setIsFileOpen(true)}
                isKeyboardOpen={isKeyboardOpen}
                onToggleKeyboard={() => setIsKeyboardOpen((v) => !v)}
                onInsertSymbol={handleInsertSymbol}
              />
            </div>

            {/* Quick Math Categories Shortcuts */}
            <div className="max-w-4xl mx-auto space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-300">
                  {t('home.disciplinesHeader')}
                </h3>
                <button
                  type="button"
                  onClick={() => setCurrentTab('topics')}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 font-semibold"
                >
                  <span>{t('home.viewAllTopics')}</span>
                  <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {(isBeginner
                  ? [
                      { name: isRTL ? 'الكسور والعمليات' : 'Fractions & Arithmetic', query: isRTL ? '٣/٤ + ١/٢' : '3/4 + 1/2', icon: '➗' },
                      { name: isRTL ? 'المعادلات الخطية' : 'Linear Equations', query: isRTL ? '٢س + ٤ = ١٠' : '2x + 4 = 10', icon: '📐' },
                      { name: isRTL ? 'الجذور والأسس' : 'Roots & Powers', query: isRTL ? 'جذر(٢٥) + ٣^٢' : 'sqrt(25) + 3^2', icon: '🔢' },
                      { name: isRTL ? 'أولويات العمليات' : 'Order of Operations', query: isRTL ? '(١٢ - ٤) × ٣' : '(12 - 4) * 3', icon: '🧮' },
                      { name: isRTL ? 'النسبة المئوية' : 'Percentages', query: isRTL ? '١٥٪ من ٢٠٠' : '15% of 200', icon: '📊' },
                      { name: isRTL ? 'مسألة تناسب لفظية' : 'Simple Word Problem', query: isRTL ? 'إذا كان ثمن ٣ أقلام ٦ ريالات، فما ثمن ٥ أقلام؟' : 'If 3 pens cost $6, what is the cost of 5 pens?', icon: '💡' },
                    ]
                  : [
                      { name: isRTL ? 'الجبر والمعادلات' : 'Algebra & Equations', query: isRTL ? '٢س^٢ - ٧س + ٣ = ٠' : '2x^2 - 7x + 3 = 0', icon: '📐' },
                      { name: isRTL ? 'التفاضل والتكامل' : 'Calculus & Derivatives', query: isRTL ? 'مشتقة س^٣ × جا(س)' : 'd/dx of x^3 * sin(x)', icon: '📈' },
                      { name: isRTL ? 'المصفوفات والمتجهات' : 'Linear Algebra', query: isRTL ? 'محدد المصفوفة [[٢, ١], [٥, ٣]]' : 'det([[2, 1], [5, 3]])', icon: '🔢' },
                      { name: isRTL ? 'حساب المثلثات' : 'Trigonometry', query: isRTL ? 'جا^٢(س) + جتا^٢(س) = ١' : 'sin^2(x) + cos^2(x) = 1', icon: '📐' },
                      { name: isRTL ? 'الإحصاء والاحتمالات' : 'Statistics', query: isRTL ? 'احسب المتوسط والوسيط: ١٠، ٢٠، ٣٠، ٤٠، ٥٠' : 'mean, median of: 10, 20, 30, 40, 50', icon: '📊' },
                      { name: isRTL ? 'المسائل اللفظية' : 'Word Problems', query: isRTL ? 'قطاران ينطلقان في اتجاهين متعاكسين بسرعة 60 و 90 كم/س بعد كم ساعة تصبح المسافة 450 كم؟' : 'Two trains leave stations 450 km apart at speeds 60 and 90 km/h. When do they meet?', icon: '💡' },
                    ]
                ).map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectExample(item.query)}
                    className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600/60 rounded-2xl text-left rtl:text-right transition hover:bg-slate-50 dark:hover:bg-slate-850 group flex flex-col justify-between shadow-xs min-h-[88px]"
                  >
                    <div>
                      <span className="text-xl block mb-1">{item.icon}</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition block">
                        {item.name}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono truncate block mt-1.5" dir={isRTL && /[ء-ي]/.test(item.query) ? 'rtl' : 'ltr'}>
                      {item.query}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Calculations quick strip if available */}
            {history.length > 0 && (
              <div className="max-w-4xl mx-auto pt-2 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <HistoryIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    {t('home.recentHeader')}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setCurrentTab('history')}
                    className="text-xs text-indigo-600 dark:text-slate-400 hover:text-indigo-700 dark:hover:text-slate-200 font-medium"
                  >
                    {t('home.viewFullHistory')}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {history.slice(0, 4).map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setReturnTarget({
                          tab: 'home',
                          label: t('nav.backToHome'),
                        });
                        if (item.solution?.level) {
                          setLevel(item.solution.level);
                        }
                        if (item.solution?.style) {
                          setStyle(item.solution.style);
                        }
                        setHasStaleSolution(false);
                        setSolveError(null);
                        setCurrentSolution(item.solution);
                        setProblemInput(item.problem);
                        setCurrentTab('solve');
                      }}
                      className="p-2.5 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-slate-700 rounded-xl cursor-pointer transition flex items-center justify-between gap-2 shadow-xs"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setReturnTarget({
                            tab: 'home',
                            label: t('nav.backToHome'),
                          });
                          if (item.solution?.level) {
                            setLevel(item.solution.level);
                          }
                          if (item.solution?.style) {
                            setStyle(item.solution.style);
                          }
                          setHasStaleSolution(false);
                          setSolveError(null);
                          setCurrentSolution(item.solution);
                          setProblemInput(item.problem);
                          setCurrentTab('solve');
                        }
                      }}
                    >
                      <div className="overflow-hidden">
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate" dir="auto">
                          {item.problem}
                        </div>
                        <div className="text-[10px] font-mono text-indigo-700 dark:text-indigo-300 truncate" dir="ltr">
                          = {item.finalAnswer}
                        </div>
                      </div>
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded shrink-0">
                        {localizeCategory(item.category, language)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SOLVE & SOLUTION VIEWER */}
        {currentTab === 'solve' && (
          <div className="max-w-4xl mx-auto space-y-5">
            {/* Contextual Back Navigation Button */}
            {returnTarget && (
              <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 px-3.5 shadow-xs transition-colors">
                <button
                  type="button"
                  onClick={() => {
                    const dest = returnTarget.tab;
                    if (returnTarget.filterFav !== undefined) {
                      setHistoryFilterFav(returnTarget.filterFav);
                    }
                    if (returnTarget.topicCategory) {
                      setSelectedTopicCategory(returnTarget.topicCategory);
                    }
                    setReturnTarget(null);
                    setCurrentTab(dest);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
                >
                  {isRTL ? <ArrowRight className="w-4 h-4 shrink-0" /> : <ArrowLeft className="w-4 h-4 shrink-0" />}
                  <span>{returnTarget.label}</span>
                </button>

                <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                  {isRTL ? 'الاحتفاظ بنص المسألة والحل وسياق التنقل عند الرجوع' : 'Problem, solution, and navigation context preserved'}
                </span>
              </div>
            )}

            {/* Unified Canonical Input Component in Compact Header Mode */}
            <CanonicalMathInput
              value={problemInput}
              onChange={setProblemInput}
              onSolve={() => handleSolve()}
              isSolving={isSolving}
              style={style}
              onStyleChange={setStyle}
              level={level}
              onLevelChange={setLevel}
              onOpenVoice={() => setIsVoiceOpen(true)}
              onOpenCamera={() => setIsCameraOpen(true)}
              onOpenFile={() => setIsFileOpen(true)}
              isKeyboardOpen={isKeyboardOpen}
              onToggleKeyboard={() => setIsKeyboardOpen((v) => !v)}
              onInsertSymbol={handleInsertSymbol}
              compact
              placeholder={t('solver.reSolvePlaceholder')}
            />

            {/* Error Message if Solve Failed */}
            {solveError && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-800 dark:text-rose-300 text-xs flex items-center gap-3 shadow-xs">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
                <div className="flex-1">
                  <span className="font-bold block mb-0.5">{t('solver.errorTitle')}</span>
                  <span>{solveError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSolve()}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{t('solver.retryAction')}</span>
                </button>
              </div>
            )}

            {/* Loading Skeleton */}
            {isSolving && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-sm">
                <div className="w-12 h-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin mx-auto" />
                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {t('solver.loadingTitle')}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  {t('solver.loadingSubtitle')}
                </p>
              </div>
            )}

            {/* Render SolutionViewer when ready */}
            {!isSolving && currentSolution && (
              <div className="space-y-4">
                {hasStaleSolution && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 rounded-2xl text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2.5 shadow-2xs">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>{t('solver.staleSolutionWarning')}</span>
                  </div>
                )}
                <SolutionViewer
                  solution={currentSolution}
                  onToggleFavorite={toggleFavorite}
                  isFavorite={history.some((h) => h.id === currentSolution.id && h.isFavorite)}
                />
              </div>
            )}

            {/* Empty State when no problem is currently loaded */}
            {!isSolving && !currentSolution && !solveError && (
              <div className="text-center py-14 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-slate-500 space-y-2 shadow-xs">
                <Calculator className="w-12 h-12 mx-auto text-indigo-600 dark:text-indigo-400 opacity-40 mb-2" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-300">
                  {t('solver.noProblemTitle')}
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  {t('solver.noProblemSubtitle')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: GRAPHING CALCULATOR */}
        {currentTab === 'graphing' && (
          <div className="max-w-4xl mx-auto">
            <GraphingCalculator
              initialExpr={currentSolution?.plotConfig?.functionExpr || 'x^2 - 4'}
            />
          </div>
        )}

        {/* TAB 4: MATHEMATICS TOPICS BROWSER */}
        {currentTab === 'topics' && (
          <div className="max-w-4xl mx-auto">
            <TopicsBrowser
              categories={categories}
              initialCategoryId={selectedTopicCategory}
              onSelectExample={(q, catId) => handleSelectExample(q, 'topics', catId)}
              onBack={() => setCurrentTab('home')}
            />
          </div>
        )}

        {/* TAB 5: HISTORY & FAVORITES */}
        {currentTab === 'history' && (
          <div className="max-w-4xl mx-auto">
            <HistoryView
              history={history}
              initialFilterFavOnly={historyFilterFav}
              onBack={() => setCurrentTab('home')}
              onSelectHistoryItem={(item, isFromFavorites) => {
                const isFav = Boolean(isFromFavorites || item.isFavorite);
                setHistoryFilterFav(isFav);
                setReturnTarget({
                  tab: 'history',
                  label: isFav ? t('nav.backToFavorites') : t('nav.backToHistory'),
                  filterFav: isFav,
                });
                if (item.solution?.level) {
                  setLevel(item.solution.level);
                }
                if (item.solution?.style) {
                  setStyle(item.solution.style);
                }
                setHasStaleSolution(false);
                setSolveError(null);
                setCurrentSolution(item.solution);
                setProblemInput(item.problem);
                setCurrentTab('solve');
              }}
              onToggleFavorite={toggleFavorite}
              onClearHistory={clearHistory}
            />
          </div>
        )}

        {/* TAB 6: ABOUT PAGE */}
        {currentTab === 'about' && (
          <AboutView
            onBack={previousTab ? () => {
              const target = previousTab;
              setPreviousTab(null);
              setCurrentTab(target);
            } : undefined}
          />
        )}
      </main>

      {/* Voice Input Modal */}
      <VoiceModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        onConfirmText={(text) => {
          setProblemInput(text);
          handleSolve(text, { inputMethod: 'voice' });
        }}
      />

      {/* Camera & Image Input Modal */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onConfirmSolve={({ problem, imageBase64, mimeType }) => {
          setProblemInput(problem);
          handleSolve(problem, {
            imageBase64,
            imageMimeType: mimeType,
            inputMethod: 'camera',
          });
        }}
      />

      {/* File & Document Modal */}
      <FileModal
        isOpen={isFileOpen}
        onClose={() => setIsFileOpen(false)}
        onConfirmSolve={({ problem, fileBase64, mimeType, fileName }) => {
          setProblemInput(problem);
          handleSolve(problem, {
            fileBase64,
            fileMimeType: mimeType,
            fileName,
            inputMethod: 'file',
          });
        }}
      />

      {/* Settings & Architecture Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        defaultStyle={style}
        onStyleChange={handleStyleChange}
        defaultLevel={level}
        onLevelChange={setLevel}
      />

      {/* User Account & Profile Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-950 py-6 text-center text-xs text-slate-500 dark:text-slate-400 transition-colors">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
            <span className="font-bold text-slate-800 dark:text-slate-200">{t('footer.title')}</span>
            <span>—</span>
            <span className="max-w-xs sm:max-w-md truncate">{t('footer.desc')}</span>
            <span className="hidden md:inline">·</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-medium">
              {t('footer.developerCreditFull')}
            </span>
          </div>
          <div className="flex items-center gap-3.5 text-[11px] text-slate-500 flex-wrap justify-center">
            <button
              type="button"
              onClick={() => handleTabChange('about')}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition cursor-pointer"
            >
              {t('nav.about')}
            </button>
            <span>·</span>
            <span dir="ltr">{t('footer.copyright')}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
