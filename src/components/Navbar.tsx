import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  LineChart, 
  BookOpen, 
  History, 
  Settings, 
  Globe,
  Sun,
  Moon,
  Info,
  Menu,
  X,
  Sparkles,
  Monitor,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { useLocalization } from '../localization/LocalizationContext.tsx';
import { useTheme } from '../theme/ThemeContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';

export type NavTab = 'home' | 'solve' | 'graphing' | 'topics' | 'history' | 'about';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenSettings: () => void;
  onOpenAuth?: () => void;
  hasActiveSolution?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenSettings,
  onOpenAuth,
  hasActiveSolution = false,
}) => {
  const { user } = useAuth();
  const { language, setLanguage, toggleLanguage, t, isRTL } = useLocalization();
  const { theme, setTheme, isDark, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu on Escape key press and prevent body scroll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  const handleTabClick = (tab: NavTab) => {
    setIsMobileMenuOpen(false);
    // Canonical single input rule: if user taps Solve Problem without an active solution,
    // take them to the canonical input on Home and focus it
    if (tab === 'solve' && !hasActiveSolution) {
      onSelectTab('home');
      setTimeout(() => {
        const textarea = document.querySelector('textarea[aria-label="Mathematical Problem Input"]') as HTMLTextAreaElement | null;
        if (textarea) textarea.focus();
      }, 50);
      return;
    }
    onSelectTab(tab);
  };

  const handleOpenSettingsFromMenu = () => {
    setIsMobileMenuOpen(false);
    onOpenSettings();
  };

  // Group 1: Main navigation items in required order:
  // 1. الرئيسية (Home)
  // 2. حل مسألة (Solve Problem)
  // 3. الفروع الرياضية (Topics)
  // 4. الرسم البياني (Graphing)
  // 5. السجل والمفضلة (History & Favorites)
  // 6. عن المنصة (About Platform)
  const navItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: t('nav.home'), icon: <Sparkles className="w-4 h-4 shrink-0" /> },
    { id: 'solve', label: t('nav.solve'), icon: <Calculator className="w-4 h-4 shrink-0" /> },
    { id: 'topics', label: t('nav.topics'), icon: <BookOpen className="w-4 h-4 shrink-0" /> },
    { id: 'graphing', label: t('nav.graphing'), icon: <LineChart className="w-4 h-4 shrink-0" /> },
    { id: 'history', label: t('nav.history'), icon: <History className="w-4 h-4 shrink-0" /> },
    { id: 'about', label: t('nav.about'), icon: <Info className="w-4 h-4 shrink-0" /> },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 transition-colors w-full">
        <div className="max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-2">
            {/* Brand Logo & Name */}
            <div
              onClick={() => handleTabClick('home')}
              className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group shrink min-w-0"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleTabClick('home')}
              aria-label="Go to Maidama Math Home"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform shrink-0">
                <span className="font-serif font-black text-xs sm:text-base tracking-tighter" dir="ltr">∫dx</span>
              </div>
              <div className="min-w-0">
                <span className="font-extrabold text-sm sm:text-base md:text-lg tracking-tight bg-gradient-to-r from-slate-900 via-indigo-900 to-indigo-600 dark:from-white dark:via-slate-100 dark:to-indigo-200 bg-clip-text text-transparent truncate block">
                  {language === 'ar' ? 'ميدمة ماث' : 'Maidama Math'}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 hidden lg:block font-medium truncate max-w-[220px]">
                  {t('nav.tagline')}
                </span>
              </div>
            </div>

            {/* Desktop Center Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 bg-slate-100/90 dark:bg-slate-900/90 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shrink-0">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTabClick(item.id)}
                  className={`px-2.5 lg:px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap min-h-[32px] ${
                    currentTab === item.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/80 dark:hover:bg-slate-800'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>

            {/* Action Buttons: Language, Theme, Settings, and Menu */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Language Switcher - ALWAYS visible on all screens (mobile & desktop) */}
              <button
                type="button"
                onClick={toggleLanguage}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition min-h-[36px] shrink-0"
                title={t('nav.switchLangTooltip')}
                aria-label={t('nav.switchLangTooltip')}
              >
                <Globe className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>{language === 'ar' ? 'English' : 'العربية'}</span>
              </button>

              {/* Theme Toggle Button */}
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 rounded-xl transition min-w-[36px] min-h-[36px] flex items-center justify-center shrink-0"
                title={t('nav.themeTooltip')}
                aria-label={t('nav.themeTooltip')}
              >
                {isDark ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-600" />
                )}
              </button>

              {/* User Account & Sync Trigger */}
              {onOpenAuth && (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition min-h-[36px] shrink-0 cursor-pointer"
                  title={user ? user.name : (language === 'ar' ? 'الحساب والمزامنة' : 'Account & Sync')}
                  aria-label={user ? user.name : (language === 'ar' ? 'الحساب والمزامنة' : 'Account & Sync')}
                >
                  {user ? (
                    <>
                      <div className="w-5 h-5 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="hidden lg:inline font-bold max-w-[80px] truncate">{user.name.split(' ')[0]}</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span className="hidden sm:inline font-bold">{language === 'ar' ? 'دخول' : 'Sign In'}</span>
                    </>
                  )}
                </button>
              )}

              {/* Settings Trigger (Desktop Only) */}
              <button
                type="button"
                onClick={onOpenSettings}
                className="hidden md:flex p-2 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 rounded-xl transition min-w-[36px] min-h-[36px] items-center justify-center shrink-0"
                title={t('nav.settingsTooltip')}
                aria-label={t('nav.settingsTooltip')}
              >
                <Settings className="w-4 h-4" />
              </button>

              {/* Mobile Menu Button (< md) */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                className="flex md:hidden p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl transition min-w-[36px] min-h-[36px] items-center justify-center shrink-0"
                title={isMobileMenuOpen ? t('nav.closeMenu') : t('nav.menu')}
                aria-label={isMobileMenuOpen ? t('nav.closeMenu') : t('nav.menu')}
                aria-expanded={isMobileMenuOpen}
              >
                {isMobileMenuOpen ? <X className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* REDESIGNED MOBILE NAVIGATION DRAWER & BACKDROP (< md) */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={t('nav.menu')}
        >
          {/* Semi-transparent Backdrop for easy dismiss */}
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel Container */}
          <div className="fixed top-0 inset-x-0 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shadow-2xl max-h-[92vh] overflow-y-auto rounded-b-3xl flex flex-col transition-transform animate-in slide-in-from-top duration-200">
            {/* Drawer Header: Brand + Close Button */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-slate-850">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-400 flex items-center justify-center text-white shadow-xs">
                  <span className="font-serif font-black text-xs" dir="ltr">∫dx</span>
                </div>
                <div>
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {t('nav.brandName')}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                    {t('nav.brandNameAr')}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl transition min-w-[40px] min-h-[40px] flex items-center justify-center"
                aria-label={t('nav.closeMenu')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu Body Organized into Two Distinct Groups */}
            <div className="p-4 space-y-4">
              {/* GROUP 1: MAIN NAVIGATION */}
              <div className="space-y-1.5">
                <div className="px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {t('nav.mainNavGroup')}
                </div>

                <div className="flex flex-col gap-1">
                  {navItems.map((item) => {
                    const isActive = currentTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleTabClick(item.id)}
                        className={`w-full min-h-[48px] px-3.5 py-2.5 rounded-2xl text-sm font-semibold flex items-center justify-between transition ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-900/80 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-850'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`p-1.5 rounded-xl ${isActive ? 'bg-indigo-700 text-white' : 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'}`}>
                            {item.icon}
                          </span>
                          <span>{item.label}</span>
                        </div>

                        <ChevronRight className={`w-4 h-4 rtl:rotate-180 ${isActive ? 'text-white/80' : 'text-slate-400'}`} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* VISUAL DIVIDER */}
              <div className="border-t border-slate-200/80 dark:border-slate-800" />

              {/* GROUP 2: PREFERENCES AND SETTINGS */}
              <div className="space-y-2.5">
                <div className="px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {t('nav.preferencesGroup')}
                </div>

                {/* 1. Language Selection Row */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl flex items-center justify-between gap-2 min-h-[48px]">
                  <div className="flex items-center gap-2.5">
                    <span className="p-1.5 rounded-xl bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs">
                      <Globe className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {isRTL ? 'لغة الواجهة (Language)' : 'Language (اللغة)'}
                    </span>
                  </div>

                  <div className="inline-flex p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setLanguage('ar')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition min-h-[30px] ${
                        language === 'ar'
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      العربية
                    </button>
                    <button
                      type="button"
                      onClick={() => setLanguage('en')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition min-h-[30px] ${
                        language === 'en'
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      English
                    </button>
                  </div>
                </div>

                {/* 2. Theme Selection Row */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {t('settings.themeLabel')}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {theme === 'system' ? t('settings.themeSystem') : theme === 'dark' ? t('settings.themeDark') : t('settings.themeLight')}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setTheme('light')}
                      className={`py-2 px-2 text-xs rounded-xl font-bold flex items-center justify-center gap-1.5 transition min-h-[38px] ${
                        theme === 'light'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80'
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5" />
                      <span>{t('settings.themeLight')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme('dark')}
                      className={`py-2 px-2 text-xs rounded-xl font-bold flex items-center justify-center gap-1.5 transition min-h-[38px] ${
                        theme === 'dark'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80'
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5" />
                      <span>{t('settings.themeDark')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme('system')}
                      className={`py-2 px-2 text-xs rounded-xl font-bold flex items-center justify-center gap-1.5 transition min-h-[38px] ${
                        theme === 'system'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80'
                      }`}
                    >
                      <Monitor className="w-3.5 h-3.5" />
                      <span>{t('settings.themeSystem')}</span>
                    </button>
                  </div>
                </div>

                {/* User Account Row in Mobile Menu */}
                {onOpenAuth && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenAuth();
                    }}
                    className="w-full min-h-[48px] p-3 bg-slate-50 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-850 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl flex items-center justify-between transition text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="p-1.5 rounded-xl bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs">
                        <UserCheck className="w-4 h-4" />
                      </span>
                      <div className="text-start">
                        <span className="text-xs font-bold block">
                          {user ? user.name : (language === 'ar' ? 'تسجيل الدخول / إنشاء حساب' : 'Sign In / Register')}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {user ? (language === 'ar' ? 'المزامنة السحابية نشطة' : 'Cloud sync active') : (language === 'ar' ? 'حفظ السجل والمفضلة' : 'Sync history & favorites')}
                        </span>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-400 rtl:rotate-180" />
                  </button>
                )}

                {/* 3. Settings Trigger Row */}
                <button
                  type="button"
                  onClick={handleOpenSettingsFromMenu}
                  className="w-full min-h-[48px] p-3 bg-slate-50 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-850 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl flex items-center justify-between transition text-slate-800 dark:text-slate-200"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="p-1.5 rounded-xl bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs">
                      <Settings className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-bold">
                      {t('settings.title')}
                    </span>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-400 rtl:rotate-180" />
                </button>
              </div>

              {/* Developer Badge in Drawer Footer */}
              <div 
                onClick={() => handleTabClick('about')}
                className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition font-medium"
              >
                <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                <span>{t('footer.developerCredit')}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
