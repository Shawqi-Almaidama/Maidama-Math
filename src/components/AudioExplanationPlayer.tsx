import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  GraduationCap,
  Sliders,
  FileText,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { MathSolution } from '../types/math.ts';
import {
  buildSolutionSpeechScript,
  getAvailableVoicesForLanguage,
  getBestVoiceForLanguage,
  SpeechSegment,
  VoiceInfo,
} from '../utils/textToSpeech.ts';
import { useAuth } from '../context/AuthContext.tsx';
import {
  getActivePreferences,
  saveGuestPreferences,
  saveUserPreferences,
} from '../utils/preferencesManager.ts';

interface AudioExplanationPlayerProps {
  solution: MathSolution;
  language: 'ar' | 'en';
}

const SPEED_OPTIONS = [
  { rate: 0.75, labelAr: '0.75x (هادئ جداً)', labelEn: '0.75x (Slow & Calm)' },
  { rate: 0.9, labelAr: '0.9x (أستاذ متأنٍ - موصى به)', labelEn: '0.9x (Calm Teacher - Recommended)' },
  { rate: 1.0, labelAr: '1.0x (معتدل طبيعي)', labelEn: '1.0x (Normal Pace)' },
  { rate: 1.15, labelAr: '1.15x (مذيع تعليمي)', labelEn: '1.15x (Broadcaster)' },
  { rate: 1.25, labelAr: '1.25x (سريع)', labelEn: '1.25x (Brisk)' },
];

export const AudioExplanationPlayer: React.FC<AudioExplanationPlayerProps> = ({ solution, language }) => {
  const { user } = useAuth();
  const isAr = language === 'ar';

  const [isSupported, setIsSupported] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);

  // Load saved preferences
  const initialPrefs = useMemo(() => getActivePreferences(), []);
  const [speechRate, setSpeechRate] = useState<number>(initialPrefs.speechRate ?? 0.9);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>(initialPrefs.speechVoiceURI ?? '');

  // Available voices
  const [availableVoices, setAvailableVoices] = useState<VoiceInfo[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  // Script generated specifically for educational broadcaster persona
  const script: SpeechSegment[] = useMemo(() => {
    return buildSolutionSpeechScript(solution, language);
  }, [solution, language]);

  // Keep references for callbacks and Chromium garbage collection safeguard
  const scriptRef = useRef<SpeechSegment[]>(script);
  scriptRef.current = script;

  const isPlayingRef = useRef(false);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const heartbeatTimerRef = useRef<any>(null);

  // Check Web Speech API support and load available voices
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsSupported(false);
      return;
    }

    const refreshVoices = () => {
      if (!window.speechSynthesis) return;
      const voices = getAvailableVoicesForLanguage(language);
      setAvailableVoices(voices);

      // If user hasn't selected a valid voice, pick the best one
      if (voices.length > 0) {
        const best = getBestVoiceForLanguage(language, selectedVoiceURI);
        if (best) {
          setSelectedVoiceURI(best.voiceURI);
        }
      }
    };

    refreshVoices();

    // Listen to voiceschanged event
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = refreshVoices;
    }
    window.speechSynthesis.addEventListener?.('voiceschanged', refreshVoices);

    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', refreshVoices);
    };
  }, [language]);

  // Stop speech whenever problem or language changes
  useEffect(() => {
    stopSpeech();
    setCurrentSegmentIndex(0);
  }, [solution.originalQuestion, solution.finalAnswer, language]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  // Persist rate & voice settings to the appropriate partition (account or guest)
  const handleRateChange = (newRate: number) => {
    setSpeechRate(newRate);
    if (user?.id) {
      saveUserPreferences(user.id, { speechRate: newRate });
    } else {
      saveGuestPreferences({ speechRate: newRate });
    }

    // If currently speaking, restart current segment with the new rate
    if (isPlayingRef.current) {
      speakSegment(currentSegmentIndex, newRate, selectedVoiceURI);
    }
  };

  const handleVoiceChange = (voiceURI: string) => {
    setSelectedVoiceURI(voiceURI);
    if (user?.id) {
      saveUserPreferences(user.id, { speechVoiceURI: voiceURI });
    } else {
      saveGuestPreferences({ speechVoiceURI: voiceURI });
    }

    // If currently speaking, restart current segment with the new voice
    if (isPlayingRef.current) {
      speakSegment(currentSegmentIndex, speechRate, voiceURI);
    }
  };

  // Chromium Web Speech API safe speak function
  const speakSegment = useCallback(
    (index: number, overrideRate?: number, overrideVoiceURI?: string) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;

      const currentScript = scriptRef.current;
      if (index < 0 || index >= currentScript.length) {
        // Finished script
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentSegmentIndex(0);
        isPlayingRef.current = false;
        clearInterval(heartbeatTimerRef.current);
        return;
      }

      window.speechSynthesis.cancel();
      setCurrentSegmentIndex(index);
      isPlayingRef.current = true;
      setIsPlaying(true);
      setIsPaused(false);

      const segment = currentScript[index];
      const utterance = new SpeechSynthesisUtterance(segment.text);
      currentUtteranceRef.current = utterance;

      const rateToUse = overrideRate ?? speechRate;
      const voiceURIToUse = overrideVoiceURI ?? selectedVoiceURI;

      utterance.rate = rateToUse;
      utterance.pitch = 1.0;
      utterance.volume = isMuted ? 0 : 1.0;
      utterance.lang = language === 'ar' ? 'ar-SA' : 'en-US';

      // Pick chosen voice or best fallback
      const chosenVoice = getBestVoiceForLanguage(language, voiceURIToUse);
      if (chosenVoice) {
        utterance.voice = chosenVoice;
      }

      utterance.onend = () => {
        clearInterval(heartbeatTimerRef.current);
        if (isPlayingRef.current) {
          // Add a calm, natural pedagogical pause between sections (350ms)
          setTimeout(() => {
            if (isPlayingRef.current) {
              speakSegment(index + 1);
            }
          }, 350);
        }
      };

      utterance.onerror = (e) => {
        // Ignore user cancellation errors
        if (e.error === 'canceled' || e.error === 'interrupted') return;
        console.warn('SpeechSynthesis error:', e);
        clearInterval(heartbeatTimerRef.current);
        setIsPlaying(false);
        setIsPaused(false);
        isPlayingRef.current = false;
      };

      // Workaround for Chromium pause/freeze bug on long utterances:
      // Heartbeat pulse to keep the audio engine alive
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = setInterval(() => {
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }, 10000);

      window.speechSynthesis.speak(utterance);
    },
    [isMuted, language, selectedVoiceURI, speechRate]
  );

  const handlePlay = () => {
    if (!isSupported) return;

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      isPlayingRef.current = true;
    } else {
      speakSegment(currentSegmentIndex);
    }
  };

  const handlePause = () => {
    if (!isSupported) return;
    window.speechSynthesis.pause();
    setIsPaused(true);
    setIsPlaying(false);
  };

  const stopSpeech = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    clearInterval(heartbeatTimerRef.current);
    setIsPlaying(false);
    setIsPaused(false);
    isPlayingRef.current = false;
  };

  const handleJumpToSegment = (index: number) => {
    speakSegment(index);
  };

  const handlePreviousSegment = () => {
    if (currentSegmentIndex > 0) {
      speakSegment(currentSegmentIndex - 1);
    }
  };

  const handleNextSegment = () => {
    if (currentSegmentIndex < script.length - 1) {
      speakSegment(currentSegmentIndex + 1);
    }
  };

  const handleReplaySegment = () => {
    speakSegment(currentSegmentIndex);
  };

  const handleTestVoiceSample = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const sampleText = isAr
      ? 'مرحباً بك! أنا أستاذك لشرح الرياضيات بهدوء ووضوح في منصة ميدمة ماث.'
      : 'Hello! I am your math teacher, providing calm and clear step-by-step explanations on Maidama Math.';

    const utterance = new SpeechSynthesisUtterance(sampleText);
    utterance.rate = speechRate;
    utterance.pitch = 1.0;
    utterance.lang = isAr ? 'ar-SA' : 'en-US';

    const chosen = getBestVoiceForLanguage(language, selectedVoiceURI);
    if (chosen) utterance.voice = chosen;

    window.speechSynthesis.speak(utterance);
  };

  if (!isSupported) {
    return null;
  }

  const totalSegments = script.length;
  const currentSegment = script[currentSegmentIndex];
  const progressPercent = totalSegments > 0 ? Math.round(((currentSegmentIndex + 1) / totalSegments) * 100) : 0;

  const activeVoice = availableVoices.find((v) => v.voice.voiceURI === selectedVoiceURI) || availableVoices[0];
  const hasMatchingVoices = availableVoices.length > 0;

  return (
    <div className="bg-gradient-to-r from-indigo-50/90 via-sky-50/60 to-indigo-50/90 dark:from-indigo-950/60 dark:via-slate-900/80 dark:to-indigo-950/60 border border-indigo-200/90 dark:border-indigo-800/70 rounded-2xl p-4 sm:p-5 shadow-xs transition-colors">
      {/* Top Bar: Title, Educator Badge & Action Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
        {/* Left: Identity and current state */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-sky-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            {isPlaying ? (
              <Volume2 className="w-5 h-5 animate-pulse" />
            ) : (
              <GraduationCap className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                {isAr ? 'شرح الأستاذ الصوتي الهادئ' : 'Calm Educator Audio Explanation'}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {isAr ? 'مجاني بالكامل' : '100% Free'}
              </span>
              {isPlaying && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
              )}
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5">
              <span>
                {isPlaying || isPaused
                  ? `${isAr ? 'المقطع الحالي' : 'Active'}: ${currentSegment?.label} (${currentSegmentIndex + 1}/${totalSegments})`
                  : isAr
                  ? 'أسلوب الأستاذ والمذيع التعليمي لصياغة المسائل والمعادلات شفهياً'
                  : 'Teacher & educational broadcaster articulation of math derivation'}
              </span>
              {activeVoice && (
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                  • {activeVoice.displayName}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Quick Playback Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 self-stretch sm:self-center justify-end">
          {/* Previous Step */}
          <button
            type="button"
            onClick={handlePreviousSegment}
            disabled={currentSegmentIndex === 0}
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-40 rounded-xl hover:bg-white/80 dark:hover:bg-slate-800 transition min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
            title={isAr ? 'المقطع السابق' : 'Previous Section'}
            aria-label={isAr ? 'المقطع السابق' : 'Previous Section'}
          >
            {isAr ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Replay current segment */}
          <button
            type="button"
            onClick={handleReplaySegment}
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl hover:bg-white/80 dark:hover:bg-slate-800 transition min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
            title={isAr ? 'إعادة المقطع الحالي' : 'Replay Current Section'}
            aria-label={isAr ? 'إعادة المقطع الحالي' : 'Replay Current Section'}
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Main Play / Pause */}
          {!isPlaying ? (
            <button
              type="button"
              onClick={handlePlay}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow transition cursor-pointer min-h-[36px]"
              title={isAr ? 'تشغيل الشرح الصوتي' : 'Play Explanation'}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isPaused ? (isAr ? 'استكمال' : 'Resume') : (isAr ? 'استماع للشرح' : 'Listen')}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePause}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer min-h-[36px]"
              title={isAr ? 'إيقاف مؤقت' : 'Pause'}
            >
              <Pause className="w-4 h-4 fill-current" />
              <span>{isAr ? 'إيقاف مؤقت' : 'Pause'}</span>
            </button>
          )}

          {/* Stop Button */}
          {(isPlaying || isPaused) && (
            <button
              type="button"
              onClick={stopSpeech}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer min-h-[36px]"
              title={isAr ? 'إنهاء الشرح' : 'Stop'}
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>{isAr ? 'إنهاء' : 'Stop'}</span>
            </button>
          )}

          {/* Next Step */}
          <button
            type="button"
            onClick={handleNextSegment}
            disabled={currentSegmentIndex >= script.length - 1}
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-40 rounded-xl hover:bg-white/80 dark:hover:bg-slate-800 transition min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
            title={isAr ? 'المقطع التالي' : 'Next Section'}
            aria-label={isAr ? 'المقطع التالي' : 'Next Section'}
          >
            {isAr ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          {/* Mute Toggle */}
          <button
            type="button"
            onClick={() => setIsMuted((prev) => !prev)}
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl hover:bg-white/80 dark:hover:bg-slate-800 transition min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
            title={isMuted ? (isAr ? 'إلغاء الكتم' : 'Unmute') : (isAr ? 'كتم الصوت' : 'Mute')}
            aria-label={isMuted ? (isAr ? 'إلغاء الكتم' : 'Unmute') : (isAr ? 'كتم الصوت' : 'Mute')}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Toggle Voice & Speed Settings */}
          <button
            type="button"
            onClick={() => setShowSettings((prev) => !prev)}
            className={`p-2 rounded-xl transition min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer ${
              showSettings
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800'
            }`}
            title={isAr ? 'إعدادات نبرة الصوت وسرعة الأستاذ' : 'Educator voice & rate settings'}
            aria-label={isAr ? 'إعدادات نبرة الصوت وسرعة الأستاذ' : 'Educator voice & rate settings'}
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Toggle Transcript View */}
          <button
            type="button"
            onClick={() => setShowTranscript((prev) => !prev)}
            className={`p-2 rounded-xl transition min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer ${
              showTranscript
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800'
            }`}
            title={isAr ? 'عرض النص المقروء للأستاذ' : 'View Spoken Script'}
            aria-label={isAr ? 'عرض النص المقروء للأستاذ' : 'View Spoken Script'}
          >
            <FileText className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Interactive Step Navigator Pills */}
      <div className="mt-3.5 pt-3 border-t border-indigo-200/60 dark:border-indigo-900/40">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-thin">
          {script.map((seg, idx) => {
            const isCurrent = idx === currentSegmentIndex;
            return (
              <button
                key={seg.id}
                type="button"
                onClick={() => handleJumpToSegment(idx)}
                className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition cursor-pointer text-[11px] ${
                  isCurrent
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 hover:bg-indigo-100 dark:hover:bg-indigo-950/60'
                }`}
              >
                {seg.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-2.5">
        <div className="w-full bg-slate-200/80 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-indigo-600 to-sky-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Current Spoken Segment Display Preview */}
      <div className="mt-3 p-3 bg-white/80 dark:bg-slate-900/90 border border-indigo-100 dark:border-indigo-900/40 rounded-xl">
        <div className="flex items-center justify-between text-[11px] text-indigo-700 dark:text-indigo-300 font-bold mb-1">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>{currentSegment?.label}</span>
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            {currentSegmentIndex + 1} / {totalSegments}
          </span>
        </div>
        <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-normal" dir="auto">
          {currentSegment?.text}
        </p>
      </div>

      {/* Collapsible Transcript Drawer */}
      {showTranscript && (
        <div className="mt-3 p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2.5 max-h-60 overflow-y-auto animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              <span>{isAr ? 'النص الكامل لشرح الأستاذ' : 'Full Educational Broadcast Script'}</span>
            </span>
            <span className="text-[10px] text-slate-500">
              {isAr ? 'اضغط على أي فقرة للاستماع إليها مباشرة' : 'Click any section to listen'}
            </span>
          </div>
          <div className="space-y-2 text-xs">
            {script.map((seg, idx) => (
              <div
                key={seg.id}
                onClick={() => handleJumpToSegment(idx)}
                className={`p-2.5 rounded-lg border transition cursor-pointer text-start ${
                  idx === currentSegmentIndex
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-950 dark:text-indigo-200 font-medium'
                    : 'bg-slate-50/50 dark:bg-slate-950/40 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mb-0.5">
                  {seg.label}
                </div>
                <div className="leading-relaxed" dir="auto">
                  {seg.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Collapsible Educator & Voice Settings Panel */}
      {showSettings && (
        <div className="mt-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-600" />
              <span>{isAr ? 'تخصيص نبرة وصوت الأستاذ' : 'Educator Voice & Speed Settings'}</span>
            </span>
            <button
              type="button"
              onClick={handleTestVoiceSample}
              className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>{isAr ? 'تجربة الصوت الآن' : 'Test Voice Sample'}</span>
            </button>
          </div>

          {/* Voice Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              {isAr ? 'اختيار الصوت المفضل من أصوات الجهاز والمتصفح:' : 'Select Educator Voice:'}
            </label>

            {hasMatchingVoices ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableVoices.map((v) => {
                  const isSelected = v.voice.voiceURI === selectedVoiceURI;
                  return (
                    <button
                      key={v.voice.voiceURI}
                      type="button"
                      onClick={() => handleVoiceChange(v.voice.voiceURI)}
                      className={`p-2.5 rounded-xl border text-start transition cursor-pointer flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-400 dark:border-indigo-600 text-indigo-950 dark:text-indigo-200 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="truncate">
                        <div className="text-xs font-bold truncate">{v.displayName}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          {v.voice.lang} • {v.badgeText}
                        </div>
                      </div>
                      {v.isHighQuality && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 shrink-0 font-medium">
                          {isAr ? 'عالي الدقة' : 'Natural'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">
                    {isAr
                      ? 'لم يتم اكتشاف صوت عربي مخصص في متصفحك حالياً.'
                      : 'No specialized voice for this language detected in your browser.'}
                  </p>
                  <p className="text-[11px] mt-1 opacity-90">
                    {isAr
                      ? 'يستخدم التطبيق أصوات نظام التشغيل والمتصفح المجانية. يمكنك تثبيت حزمة الصوت العربي من إعدادات Windows أو Mac أو Android، أو الاستماع بالصوت الافتراضي.'
                      : 'The app uses your free operating system voices. You can install extra language voices in your OS settings.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Speed / Pace Selector */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              {isAr ? 'سرعة إلقاء الأستاذ:' : 'Educator Pace & Rate:'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {SPEED_OPTIONS.map((opt) => (
                <button
                  key={opt.rate}
                  type="button"
                  onClick={() => handleRateChange(opt.rate)}
                  className={`px-2 py-1.5 rounded-lg text-xs font-semibold border transition text-center cursor-pointer ${
                    Math.abs(speechRate - opt.rate) < 0.05
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {isAr ? opt.labelAr : opt.labelEn}
                </button>
              ))}
            </div>
          </div>

          <div className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
            {isAr
              ? '💡 ميزة مجانية 100%: تُحفظ تفضيلات سرعة وصوت الأستاذ في حسابك أو ضمن إعدادات الضيف بشكل مستقل وتلقائي.'
              : '💡 100% Free: Your preferred speed and voice choices are saved automatically to your account or guest session.'}
          </div>
        </div>
      )}
    </div>
  );
};
