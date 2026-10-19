import React, { useRef, useEffect } from 'react';
import { 
  Keyboard as KeyboardIcon, 
  Mic, 
  Camera, 
  Upload, 
  Send, 
  Loader2, 
  Sparkles 
} from 'lucide-react';
import { ExplanationStyle, EducationLevel } from '../types/math.ts';
import { MathKeyboard } from './MathKeyboard.tsx';
import { MathView } from './MathView.tsx';
import { useLocalization } from '../localization/LocalizationContext.tsx';

export interface CanonicalMathInputProps {
  value: string;
  onChange: (val: string) => void;
  onSolve: (overrideProblem?: string) => void;
  isSolving: boolean;
  style: ExplanationStyle;
  onStyleChange: (style: ExplanationStyle) => void;
  level: EducationLevel;
  onLevelChange: (level: EducationLevel) => void;
  onOpenVoice: () => void;
  onOpenCamera: () => void;
  onOpenFile: () => void;
  isKeyboardOpen: boolean;
  onToggleKeyboard: () => void;
  onInsertSymbol: (symbol: string) => void;
  compact?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
}

export const CanonicalMathInput: React.FC<CanonicalMathInputProps> = ({
  value,
  onChange,
  onSolve,
  isSolving,
  style,
  onStyleChange,
  level,
  onLevelChange,
  onOpenVoice,
  onOpenCamera,
  onOpenFile,
  isKeyboardOpen,
  onToggleKeyboard,
  onInsertSymbol,
  compact = false,
  autoFocus = false,
  placeholder,
}) => {
  const { t, isRTL } = useLocalization();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const hasMathSyntax = value.trim() && /[+*/^=\\_{}()\-]|sqrt|sin|cos|tan|lim|int|[٠-٩سصع]/i.test(value);

  return (
    <div className={`w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-indigo-950/80 hover:border-indigo-300 dark:hover:border-indigo-800/60 transition-all rounded-3xl shadow-sm ${compact ? 'p-3 sm:p-4' : 'p-4 sm:p-6'}`}>
      {/* Controls Bar: Style & Level Selectors */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3 border-b border-slate-100 dark:border-slate-800/80 pb-3">
        {/* Style Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-0.5">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">
            {t('home.styleLabel')}
          </span>
          {[
            { id: 'quick', label: t('styles.quick') },
            { id: 'step-by-step', label: t('styles.step-by-step') },
            { id: 'concept', label: t('styles.concept') },
            { id: 'exam', label: t('styles.exam') },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onStyleChange(s.id as ExplanationStyle)}
              className={`px-2.5 py-1 text-xs rounded-xl font-medium transition whitespace-nowrap min-h-[32px] ${
                style === s.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Level Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-0.5">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">
            {t('home.levelLabel')}
          </span>
          {[
            { id: 'beginner', label: t('levels.beginner') },
            { id: 'intermediate', label: t('levels.intermediate') },
            { id: 'advanced', label: t('levels.advanced') },
          ].map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => onLevelChange(l.id as any)}
              className={`px-2.5 py-1 text-xs rounded-xl font-medium transition whitespace-nowrap min-h-[32px] ${
                level === l.id
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSolve();
            }
          }}
          rows={compact ? 2 : 3}
          placeholder={placeholder || t('home.inputPlaceholder')}
          className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors leading-relaxed font-sans resize-none"
          dir="auto"
          aria-label="Mathematical Problem Input"
        />
      </div>

      {/* Live KaTeX Preview if containing math syntax */}
      {hasMathSyntax && (
        <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-indigo-900/40 rounded-xl p-2.5 my-2.5 text-center overflow-x-auto">
          <span className="text-[10px] text-slate-500 block mb-1">
            {t('home.livePreviewLabel')}
          </span>
          <MathView math={value} block />
        </div>
      )}

      {/* Virtual Keyboard (Toggled) */}
      <MathKeyboard
        isOpen={isKeyboardOpen}
        onClose={onToggleKeyboard}
        onInsert={onInsertSymbol}
      />

      {/* Unified Input Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Virtual Keyboard Toggle */}
          <button
            type="button"
            onClick={onToggleKeyboard}
            className={`px-3 py-2 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition min-h-[40px] ${
              isKeyboardOpen
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750'
            }`}
          >
            <KeyboardIcon className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            <span className="hidden xs:inline">{t('home.keyboardButton')}</span>
          </button>

          {/* Voice Input Button */}
          <button
            type="button"
            onClick={onOpenVoice}
            className="px-2.5 sm:px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition min-h-[40px] flex items-center gap-1.5 text-xs font-medium"
            title={t('home.voiceButton')}
            aria-label={t('home.voiceButton')}
          >
            <Mic className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="hidden sm:inline">{t('home.voiceButton')}</span>
          </button>

          {/* Camera / Image OCR Button */}
          <button
            type="button"
            onClick={onOpenCamera}
            className="px-2.5 sm:px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition min-h-[40px] flex items-center gap-1.5 text-xs font-medium"
            title={t('home.cameraButton')}
            aria-label={t('home.cameraButton')}
          >
            <Camera className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
            <span className="hidden sm:inline">{t('home.cameraButton')}</span>
          </button>

          {/* Document / File Upload Button */}
          <button
            type="button"
            onClick={onOpenFile}
            className="px-2.5 sm:px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition min-h-[40px] flex items-center gap-1.5 text-xs font-medium"
            title={t('home.fileButton')}
            aria-label={t('home.fileButton')}
          >
            <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="hidden sm:inline">{t('home.fileButton')}</span>
          </button>
        </div>

        {/* Primary Solve Action Button */}
        <button
          type="button"
          onClick={() => onSolve()}
          disabled={isSolving || !value.trim()}
          className="px-5 sm:px-6 py-2.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 hover:opacity-95 disabled:opacity-50 text-white rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition shadow-md shadow-indigo-600/25 active:scale-95 min-h-[40px] shrink-0"
        >
          {isSolving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{t('home.solvingButton')}</span>
            </>
          ) : (
            <>
              <span>{t('home.solveButton')}</span>
              <Send className="w-4 h-4 rtl:rotate-180" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
