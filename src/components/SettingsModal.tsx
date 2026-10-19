import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Globe, 
  Sun, 
  Moon, 
  Monitor, 
  X, 
  Layers, 
  ShieldCheck, 
  Sparkles,
  Keyboard,
  Camera,
  Mic,
  FileText,
  CheckCircle2,
  Volume2,
  GraduationCap
} from 'lucide-react';
import { ExplanationStyle, EducationLevel, Language } from '../types/math.ts';
import { useLocalization } from '../localization/LocalizationContext.tsx';
import { useTheme, Theme } from '../theme/ThemeContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import {
  getActivePreferences,
  saveGuestPreferences,
  saveUserPreferences,
  broadcastPreferences,
} from '../utils/preferencesManager.ts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: Language;
  onLanguageChange?: (lang: Language) => void;
  defaultStyle: ExplanationStyle;
  onStyleChange: (style: ExplanationStyle) => void;
  defaultLevel: EducationLevel;
  onLevelChange: (level: EducationLevel) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  language: propLanguage,
  onLanguageChange,
  defaultStyle,
  onStyleChange,
  defaultLevel,
  onLevelChange,
}) => {
  const { user } = useAuth();
  const { language: ctxLang, setLanguage, t, isRTL } = useLocalization();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const activeLang = propLanguage || ctxLang;

  // Dedicated draft state - uncommitted until user clicks "Save Settings"
  const [draftLang, setDraftLang] = useState<Language>(activeLang);
  const [draftTheme, setDraftTheme] = useState<Theme>(theme);
  const [draftLevel, setDraftLevel] = useState<EducationLevel>(defaultLevel);
  const [draftStyle, setDraftStyle] = useState<ExplanationStyle>(defaultStyle);
  const [draftSpeechRate, setDraftSpeechRate] = useState<number>(() => getActivePreferences().speechRate ?? 0.9);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync draft state with incoming active props on modal open
  useEffect(() => {
    if (isOpen) {
      setDraftLang(activeLang);
      setDraftTheme(theme);
      setDraftLevel(defaultLevel);
      setDraftStyle(defaultStyle);
      setDraftSpeechRate(getActivePreferences().speechRate ?? 0.9);
      setSavedSuccess(false);
    }
  }, [isOpen, activeLang, theme, defaultLevel, defaultStyle]);

  if (!isOpen) return null;

  const currentSavedRate = getActivePreferences().speechRate ?? 0.9;
  const hasDraftChanges =
    draftLang !== activeLang ||
    draftTheme !== theme ||
    draftLevel !== defaultLevel ||
    draftStyle !== defaultStyle ||
    Math.abs(draftSpeechRate - currentSavedRate) > 0.01;

  const handleSaveSettings = () => {
    // 1. Apply Language
    if (draftLang !== activeLang) {
      if (onLanguageChange) onLanguageChange(draftLang);
      setLanguage(draftLang);
    }

    // 2. Apply Theme
    if (draftTheme !== theme) {
      setTheme(draftTheme);
    }

    // 3. Apply Level
    if (draftLevel !== defaultLevel) {
      onLevelChange(draftLevel);
    }

    // 4. Apply Style
    if (draftStyle !== defaultStyle) {
      onStyleChange(draftStyle);
    }

    // 5. Apply Speech Rate
    if (Math.abs(draftSpeechRate - currentSavedRate) > 0.01) {
      if (user?.id) {
        saveUserPreferences(user.id, { speechRate: draftSpeechRate });
      } else {
        saveGuestPreferences({ speechRate: draftSpeechRate });
      }
      broadcastPreferences(getActivePreferences(), user?.id || null);
    }

    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 700);
  };

  const handleCancel = () => {
    // Revert draft changes and close
    setDraftLang(activeLang);
    setDraftTheme(theme);
    setDraftLevel(defaultLevel);
    setDraftStyle(defaultStyle);
    setDraftSpeechRate(currentSavedRate);
    setSavedSuccess(false);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-dialog-title"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 transition-opacity animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-4 sm:p-6 shadow-2xl space-y-5 text-slate-800 dark:text-slate-100 max-h-[92vh] overflow-y-auto transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <span className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/60 dark:border-indigo-800/60">
              <Settings className="w-5 h-5" />
            </span>
            <h3 id="settings-dialog-title" className="font-bold text-base text-slate-900 dark:text-slate-100">
              {t('settings.title')}
            </h3>
          </div>
          <button
            onClick={handleCancel}
            aria-label={t('settings.cancel')}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* State Banner */}
        {savedSuccess ? (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-600/70 rounded-2xl text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between shadow-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{t('settings.savedSuccess')}</span>
            </div>
            <span className="text-[10px] font-mono opacity-80">LocalStorage</span>
          </div>
        ) : (
          <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-900/50 rounded-2xl text-[11px] sm:text-xs text-indigo-900 dark:text-indigo-300 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>{t('settings.autoSaveNotice')}</span>
            </div>
            {hasDraftChanges && (
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800 shrink-0">
                {isRTL ? 'تعديلات قيد المراجعة' : 'Draft Modified'}
              </span>
            )}
          </div>
        )}

        {/* SECTION 1: THEME & APPEARANCE */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {t('settings.appearanceTitle')}
          </h4>
          <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {t('settings.themeLabel')}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {draftTheme === 'system'
                  ? (isRTL ? `حسب الجهاز (${resolvedTheme === 'dark' ? 'داكن' : 'فاتح'})` : `System (${resolvedTheme})`)
                  : t(`settings.theme${draftTheme.charAt(0).toUpperCase() + draftTheme.slice(1)}`)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'light', label: t('settings.themeLight'), icon: Sun },
                { id: 'dark', label: t('settings.themeDark'), icon: Moon },
                { id: 'system', label: t('settings.themeSystem'), icon: Monitor },
              ].map((th) => {
                const IconComponent = th.icon;
                const isSelected = draftTheme === th.id;
                return (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => setDraftTheme(th.id as Theme)}
                    className={`p-2.5 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition min-h-[42px] cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5 shrink-0" />
                    <span>{th.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* SECTION 2: LANGUAGE */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {t('settings.languageTitle')}
          </h4>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 gap-2.5">
            <div className="flex items-center gap-2.5">
              <Globe className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  {t('settings.langLabel')}
                </span>
                <span className="text-[11px] text-slate-500">
                  {t('settings.langDesc')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex shrink-0">
              <button
                type="button"
                onClick={() => setDraftLang('ar')}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl border transition min-h-[38px] ${
                  draftLang === 'ar'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                العربية (RTL)
              </button>
              <button
                type="button"
                onClick={() => setDraftLang('en')}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl border transition min-h-[38px] ${
                  draftLang === 'en'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                English (LTR)
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 3: LEARNING PREFERENCES */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {t('settings.learningTitle')}
          </h4>

          {/* Education Level */}
          <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                {t('settings.levelLabel')}
              </span>
              <span className="text-[11px] text-slate-500 block">
                {t('settings.levelDesc')}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'beginner', label: t('levels.beginner') },
                { id: 'intermediate', label: t('levels.intermediate') },
                { id: 'advanced', label: t('levels.advanced') },
              ].map((lv) => (
                <button
                  key={lv.id}
                  type="button"
                  onClick={() => setDraftLevel(lv.id as EducationLevel)}
                  className={`p-2.5 text-xs font-bold rounded-xl border text-center transition min-h-[40px] cursor-pointer ${
                    draftLevel === lv.id
                      ? 'bg-sky-600 text-white border-sky-500 shadow-sm'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  {lv.label}
                </button>
              ))}
            </div>
          </div>

          {/* Explanation Style */}
          <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                {t('settings.styleLabel')}
              </span>
              <span className="text-[11px] text-slate-500 block">
                {t('settings.styleDesc')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'quick', label: t('styles.quick') },
                { id: 'step-by-step', label: t('styles.step-by-step') },
                { id: 'concept', label: t('styles.concept') },
                { id: 'exam', label: t('styles.exam') },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setDraftStyle(st.id as ExplanationStyle)}
                  className={`p-2.5 text-xs font-bold rounded-xl border text-center transition min-h-[40px] cursor-pointer ${
                    draftStyle === st.id
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* SECTION 4: EDUCATOR AUDIO EXPLANATION */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-indigo-500" />
              <span>{t('settings.audioTitle')}</span>
            </h4>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              {isRTL ? 'مجاني 100%' : 'Free Feature'}
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2.5">
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {t('settings.audioDesc')}
            </p>

            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                {t('settings.audioRateLabel')}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {[
                  { rate: 0.75, labelAr: '0.75x هادئ', labelEn: '0.75x Slow' },
                  { rate: 0.9, labelAr: '0.9x أستاذ', labelEn: '0.9x Teacher' },
                  { rate: 1.0, labelAr: '1.0x طبيعي', labelEn: '1.0x Normal' },
                  { rate: 1.15, labelAr: '1.15x مذيع', labelEn: '1.15x Radio' },
                  { rate: 1.25, labelAr: '1.25x سريع', labelEn: '1.25x Fast' },
                ].map((opt) => (
                  <button
                    key={opt.rate}
                    type="button"
                    onClick={() => setDraftSpeechRate(opt.rate)}
                    className={`py-1.5 px-2 text-xs font-semibold rounded-xl border text-center transition cursor-pointer ${
                      Math.abs(draftSpeechRate - opt.rate) < 0.05
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-2xs'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:text-slate-900'
                    }`}
                  >
                    {isRTL ? opt.labelAr : opt.labelEn}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 5: MULTIMODAL INPUT METHODS */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
            <span>{t('settings.inputMethodsTitle')}</span>
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-center space-y-1">
              <Keyboard className="w-4 h-4 mx-auto text-indigo-600 dark:text-indigo-400" />
              <span className="text-[11px] font-bold block text-slate-800 dark:text-slate-200">
                {isRTL ? 'لوحة المفاتيح' : 'Math Keyboard'}
              </span>
            </div>
            <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-center space-y-1">
              <Camera className="w-4 h-4 mx-auto text-sky-600 dark:text-sky-400" />
              <span className="text-[11px] font-bold block text-slate-800 dark:text-slate-200">
                {isRTL ? 'الكاميرا OCR' : 'Camera OCR'}
              </span>
            </div>
            <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-center space-y-1">
              <Mic className="w-4 h-4 mx-auto text-amber-600 dark:text-amber-400" />
              <span className="text-[11px] font-bold block text-slate-800 dark:text-slate-200">
                {isRTL ? 'الصوت والكلام' : 'Voice Input'}
              </span>
            </div>
            <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-center space-y-1">
              <FileText className="w-4 h-4 mx-auto text-emerald-600 dark:text-emerald-400" />
              <span className="text-[11px] font-bold block text-slate-800 dark:text-slate-200">
                {isRTL ? 'ملفات PDF' : 'PDF Documents'}
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 5: LOCAL DATA & PRIVACY */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{t('settings.storageTitle')}</span>
          </h4>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-600 dark:text-slate-400 leading-relaxed space-y-2">
            <p>{t('settings.dataPrivacyNotice')}</p>
            <div className="flex items-center gap-2 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{isRTL ? 'التخزين المحلي لجهازك (LocalStorage)' : 'Local Device Storage (LocalStorage)'}</span>
            </div>
          </div>
        </div>

        {/* Actions: Save Settings & Cancel */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200/80 dark:border-slate-800">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition min-h-[38px] cursor-pointer"
          >
            {t('settings.cancel')}
          </button>

          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={savedSuccess}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-75 text-white rounded-xl text-xs font-bold transition shadow-sm hover:shadow min-h-[38px] flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{t('settings.saveSettings')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
