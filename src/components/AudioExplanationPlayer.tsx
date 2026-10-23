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
  Loader2,
  Check,
} from 'lucide-react';
import { MathSolution } from '../types/math.ts';
import {
  buildSolutionSpeechScript,
  getAvailableVoicesForLanguage,
  getBestVoiceForLanguage,
  fetchNeuralSpeechAudio,
  convertBase64ToBlobUrl,
  SpeechSegment,
  VoiceInfo,
} from '../utils/textToSpeech.ts';
import { useAuth } from '../context/AuthContext.tsx';
import {
  getActivePreferences,
  saveGuestPreferences,
  saveUserPreferences,
  SpeechEngineType,
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

const NEURAL_VOICES = [
  {
    id: 'Charon',
    nameAr: 'شارون (أستاذ وقور وهادئ - موصى به)',
    nameEn: 'Charon (Calm & Authoritative Professor)',
    descAr: 'نبرة عميقة متزنة ومطمئنة تشبه أستاذ الجامعة المتمكن',
    descEn: 'Deep, measured, reassuring academic professor tone',
    gender: 'male',
  },
  {
    id: 'Kore',
    nameAr: 'كوري (أستاذة واضحة ومطمئنة)',
    nameEn: 'Kore (Clear & Gentle Academic)',
    descAr: 'صوت نسائي تربوي هادئ وواضح النطق للخطوات والمعادلات',
    descEn: 'Gentle, clear pedagogical female tone with crisp articulation',
    gender: 'female',
  },
  {
    id: 'Fenrir',
    nameAr: 'فنرير (مذيع تعليمي متزن)',
    nameEn: 'Fenrir (Balanced Educational Broadcaster)',
    descAr: 'إلقاء إذاعي بيداغوجي واضح التمفصل وجميل المخارج',
    descEn: 'Articulate educational broadcaster with expressive transitions',
    gender: 'male',
  },
  {
    id: 'Puck',
    nameAr: 'باك (شرح تفاعلي مشرق)',
    nameEn: 'Puck (Engaging & Lively Tutor)',
    descAr: 'إيقاع مشرق ومحفز للتركيز وحل المسائل الصعبة',
    descEn: 'Bright, motivating pace ideal for engaging step exploration',
    gender: 'male',
  },
  {
    id: 'Zephyr',
    nameAr: 'زفير (شرح صبور ورزين)',
    nameEn: 'Zephyr (Patient & Mild Instructor)',
    descAr: 'نبرة هادئة ورصينة ومريحة للاستماع الطويل',
    descEn: 'Soft, patient delivery suited for extensive study sessions',
    gender: 'female',
  },
];

export const AudioExplanationPlayer: React.FC<AudioExplanationPlayerProps> = ({ solution, language }) => {
  const { user } = useAuth();
  const isAr = language === 'ar';

  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [fallbackActive, setFallbackActive] = useState(false);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);

  // Load saved preferences
  const initialPrefs = useMemo(() => getActivePreferences(), []);
  const [engine, setEngine] = useState<SpeechEngineType>(initialPrefs.speechEngine ?? 'neural');
  const [neuralVoice, setNeuralVoice] = useState<string>(initialPrefs.speechNeuralVoice ?? 'Charon');
  const [speechRate, setSpeechRate] = useState<number>(initialPrefs.speechRate ?? 0.9);
  const [selectedLocalVoiceURI, setSelectedLocalVoiceURI] = useState<string>(initialPrefs.speechVoiceURI ?? '');

  // Local voices for fallback/offline
  const [availableLocalVoices, setAvailableLocalVoices] = useState<VoiceInfo[]>([]);
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
  const playbackSessionIdRef = useRef<number>(0);
  const activeEngineRef = useRef<'neural' | 'local'>('neural');
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const heartbeatTimerRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const audioBlobMapRef = useRef<Map<number, string>>(new Map());

  // Check Web Speech API support and load available local voices
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const refreshLocalVoices = () => {
      if (!window.speechSynthesis) return;
      const voices = getAvailableVoicesForLanguage(language);
      setAvailableLocalVoices(voices);

      if (voices.length > 0 && !selectedLocalVoiceURI) {
        const best = getBestVoiceForLanguage(language, selectedLocalVoiceURI);
        if (best) {
          setSelectedLocalVoiceURI(best.voiceURI);
        }
      }
    };

    refreshLocalVoices();
    if (window.speechSynthesis?.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = refreshLocalVoices;
    }
    window.speechSynthesis?.addEventListener?.('voiceschanged', refreshLocalVoices);

    return () => {
      window.speechSynthesis?.removeEventListener?.('voiceschanged', refreshLocalVoices);
    };
  }, [language, selectedLocalVoiceURI]);

  // Clean up blob URLs when solution or language changes
  useEffect(() => {
    stopAllAudio();
    // Revoke previous blob URLs
    audioBlobMapRef.current.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    audioBlobMapRef.current.clear();
    setCurrentSegmentIndex(0);
    setFallbackActive(false);
    setFallbackNotice(null);
  }, [solution.id, solution.originalQuestion, solution.finalAnswer, language]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllAudio();
      audioBlobMapRef.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      audioBlobMapRef.current.clear();
    };
  }, []);

  // Stop any active audio source cleanly and invalidate in-flight playback sessions
  const stopAllAudio = useCallback(() => {
    playbackSessionIdRef.current++;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.onended = null;
      audioElementRef.current.onerror = null;
      audioElementRef.current.src = '';
      audioElementRef.current = null;
    }

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    clearInterval(heartbeatTimerRef.current);
    setIsPlaying(false);
    setIsPaused(false);
    setIsLoadingAudio(false);
    isPlayingRef.current = false;
  }, []);

  // Save preferences helper
  const persistPreferences = (updates: Partial<{
    speechEngine: SpeechEngineType;
    speechNeuralVoice: string;
    speechRate: number;
    speechVoiceURI: string;
  }>) => {
    if (user?.id) {
      saveUserPreferences(user.id, updates);
    } else {
      saveGuestPreferences(updates);
    }
  };

  const handleRateChange = (newRate: number) => {
    setSpeechRate(newRate);
    persistPreferences({ speechRate: newRate });

    if (audioElementRef.current) {
      audioElementRef.current.playbackRate = newRate;
    }

    if (isPlayingRef.current) {
      speakSegment(currentSegmentIndex, newRate);
    }
  };

  const handleEngineChange = (newEngine: SpeechEngineType) => {
    setEngine(newEngine);
    persistPreferences({ speechEngine: newEngine });
    setFallbackActive(false);
    setFallbackNotice(null);

    if (isPlayingRef.current) {
      speakSegment(currentSegmentIndex, undefined, undefined, newEngine === 'local');
    }
  };

  const handleNeuralVoiceChange = (voiceId: string) => {
    setNeuralVoice(voiceId);
    persistPreferences({ speechNeuralVoice: voiceId });

    // Invalidate blob cache since voice changed
    audioBlobMapRef.current.forEach((url) => URL.revokeObjectURL(url));
    audioBlobMapRef.current.clear();

    if (isPlayingRef.current && engine === 'neural') {
      speakSegment(currentSegmentIndex, undefined, voiceId);
    }
  };

  const handleLocalVoiceChange = (voiceURI: string) => {
    setSelectedLocalVoiceURI(voiceURI);
    persistPreferences({ speechVoiceURI: voiceURI });

    if (isPlayingRef.current && (engine === 'local' || fallbackActive)) {
      speakLocalSegment(currentSegmentIndex, speechRate, voiceURI);
    }
  };

  // Pre-fetch next segment in background to eliminate transition latency
  const prefetchNextSegment = useCallback(
    async (nextIndex: number, voice: string) => {
      const currentScript = scriptRef.current;
      if (nextIndex < 0 || nextIndex >= currentScript.length) return;
      if (audioBlobMapRef.current.has(nextIndex)) return;

      const seg = currentScript[nextIndex];
      try {
        const res = await fetchNeuralSpeechAudio(seg.text, language, voice);
        if (res.success && res.audioBase64) {
          const blobUrl = convertBase64ToBlobUrl(res.audioBase64, res.mimeType || 'audio/wav');
          audioBlobMapRef.current.set(nextIndex, blobUrl);
        }
      } catch {
        // Silently ignore prefetch errors
      }
    },
    [language]
  );

  // Local Web Speech API playback
  const speakLocalSegment = useCallback(
    (index: number, overrideRate?: number, overrideLocalVoiceURI?: string) => {
      const sessionId = ++playbackSessionIdRef.current;
      if (typeof window === 'undefined' || !window.speechSynthesis) return;

      const currentScript = scriptRef.current;
      if (index < 0 || index >= currentScript.length) {
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentSegmentIndex(0);
        isPlayingRef.current = false;
        clearInterval(heartbeatTimerRef.current);
        return;
      }

      // Ensure any neural audio element is halted completely
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.onended = null;
        audioElementRef.current.onerror = null;
        audioElementRef.current.src = '';
        audioElementRef.current = null;
      }

      window.speechSynthesis.cancel();
      activeEngineRef.current = 'local';
      setCurrentSegmentIndex(index);
      isPlayingRef.current = true;
      setIsPlaying(true);
      setIsPaused(false);
      setIsLoadingAudio(false);

      const segment = currentScript[index];
      const utterance = new SpeechSynthesisUtterance(segment.text);
      currentUtteranceRef.current = utterance;

      const rateToUse = overrideRate ?? speechRate;
      const voiceURIToUse = overrideLocalVoiceURI ?? selectedLocalVoiceURI;

      utterance.rate = rateToUse;
      utterance.pitch = 1.0;
      utterance.volume = isMuted ? 0 : 1.0;
      utterance.lang = language === 'ar' ? 'ar-SA' : 'en-US';

      const chosenVoice = getBestVoiceForLanguage(language, voiceURIToUse);
      if (chosenVoice) {
        utterance.voice = chosenVoice;
      }

      utterance.onend = () => {
        clearInterval(heartbeatTimerRef.current);
        if (playbackSessionIdRef.current === sessionId && isPlayingRef.current) {
          // Pedagogical pause between steps
          setTimeout(() => {
            if (playbackSessionIdRef.current === sessionId && isPlayingRef.current) {
              speakSegment(index + 1);
            }
          }, 350);
        }
      };

      utterance.onerror = (e) => {
        if (e.error === 'canceled' || e.error === 'interrupted' || playbackSessionIdRef.current !== sessionId) return;
        console.warn('SpeechSynthesis local error:', e);
        clearInterval(heartbeatTimerRef.current);
        setIsPlaying(false);
        setIsPaused(false);
        isPlayingRef.current = false;
      };

      // Heartbeat pulse for Chromium pause/freeze bug
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = setInterval(() => {
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }, 10000);

      window.speechSynthesis.speak(utterance);
    },
    [isMuted, language, selectedLocalVoiceURI, speechRate]
  );

  // Neural Studio Audio playback
  const playNeuralSegment = useCallback(
    async (index: number, overrideRate?: number, overrideVoice?: string) => {
      const sessionId = ++playbackSessionIdRef.current;
      const currentScript = scriptRef.current;
      if (index < 0 || index >= currentScript.length) {
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentSegmentIndex(0);
        isPlayingRef.current = false;
        return;
      }

      // Hard-stop previous local or neural sound immediately so they never overlap
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.onended = null;
        audioElementRef.current.onerror = null;
        audioElementRef.current.src = '';
        audioElementRef.current = null;
      }

      abortControllerRef.current?.abort();
      const abortCtrl = new AbortController();
      abortControllerRef.current = abortCtrl;

      activeEngineRef.current = 'neural';
      setCurrentSegmentIndex(index);
      isPlayingRef.current = true;
      setIsPlaying(true);
      setIsPaused(false);

      const segment = currentScript[index];
      const rateToUse = overrideRate ?? speechRate;
      const voiceToUse = overrideVoice ?? neuralVoice;

      let blobUrl = audioBlobMapRef.current.get(index);

      if (!blobUrl) {
        setIsLoadingAudio(true);
        try {
          const res = await fetchNeuralSpeechAudio(segment.text, language, voiceToUse, abortCtrl.signal);
          if (playbackSessionIdRef.current !== sessionId) return;

          if (!res.success || !res.audioBase64) {
            setFallbackActive(true);
            setFallbackNotice(
              isAr
                ? 'يتم الشرح الآن بصوت المتصفح الذكي لضمان استمرار الحل بسلاسة وبشكل مجاني'
                : 'Playing with intelligent local browser voice for seamless, free playback'
            );
            speakLocalSegment(index, rateToUse);
            return;
          }

          blobUrl = convertBase64ToBlobUrl(res.audioBase64, res.mimeType || 'audio/wav');
          audioBlobMapRef.current.set(index, blobUrl);
        } catch (fetchErr: any) {
          if (fetchErr?.name === 'AbortError' || playbackSessionIdRef.current !== sessionId) return;
          setFallbackActive(true);
          speakLocalSegment(index, rateToUse);
          return;
        } finally {
          if (playbackSessionIdRef.current === sessionId) {
            setIsLoadingAudio(false);
          }
        }
      }

      if (playbackSessionIdRef.current !== sessionId || !isPlayingRef.current) return;

      const audio = new Audio(blobUrl);
      audioElementRef.current = audio;
      audio.playbackRate = rateToUse;
      audio.volume = isMuted ? 0 : 1.0;

      audio.onended = () => {
        if (playbackSessionIdRef.current !== sessionId || !isPlayingRef.current) return;
        // Pedagogical pause between mathematical steps (400ms)
        setTimeout(() => {
          if (playbackSessionIdRef.current === sessionId && isPlayingRef.current) {
            speakSegment(index + 1);
          }
        }, 400);
      };

      audio.onerror = (e) => {
        if (playbackSessionIdRef.current !== sessionId || !isPlayingRef.current) return;
        console.warn('HTML Audio playback error, falling back to local speech:', e);
        setFallbackActive(true);
        speakLocalSegment(index, rateToUse);
      };

      try {
        await audio.play();
        if (playbackSessionIdRef.current !== sessionId) {
          audio.pause();
          return;
        }
        // Pre-fetch next segment in background
        prefetchNextSegment(index + 1, voiceToUse);
      } catch (playErr: any) {
        // Crucial: Ignore user-initiated pause or superseding playback interruptions
        if (playErr?.name === 'AbortError' || playbackSessionIdRef.current !== sessionId || !isPlayingRef.current) {
          return;
        }
        console.warn('Audio play error, falling back to local speech:', playErr);
        setFallbackActive(true);
        speakLocalSegment(index, rateToUse);
      }
    },
    [isAr, isMuted, language, neuralVoice, prefetchNextSegment, speakLocalSegment, speechRate]
  );

  // Unified dispatcher
  const speakSegment = useCallback(
    (index: number, overrideRate?: number, overrideVoice?: string, forceLocal = false) => {
      const shouldUseLocal = forceLocal || engine === 'local' || fallbackActive;
      if (shouldUseLocal) {
        speakLocalSegment(index, overrideRate);
      } else {
        playNeuralSegment(index, overrideRate, overrideVoice);
      }
    },
    [engine, fallbackActive, playNeuralSegment, speakLocalSegment]
  );

  const handlePlay = () => {
    if (isPlaying || isLoadingAudio) return; // Prevent double trigger
    if (isPaused) {
      if (activeEngineRef.current === 'neural' && audioElementRef.current) {
        audioElementRef.current.play().catch(() => {
          speakSegment(currentSegmentIndex);
        });
      } else if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.resume();
      }
      setIsPaused(false);
      setIsPlaying(true);
      isPlayingRef.current = true;
    } else {
      speakSegment(currentSegmentIndex);
    }
  };

  const handlePause = () => {
    if (activeEngineRef.current === 'neural' && audioElementRef.current) {
      audioElementRef.current.pause();
    } else if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.pause();
    }
    setIsPaused(true);
    setIsPlaying(false);
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

  const handleTestVoiceSample = async () => {
    stopAllAudio();
    const sampleText = isAr
      ? 'مرحباً بك! أنا أستاذك لشرح الرياضيات بهدوء ووضوح في منصة ميدمة ماث، وسنحل المسألة خطوة بخطوة.'
      : 'Hello! I am your math professor on Maidama Math, explaining each step calmly and clearly.';

    if (engine === 'neural' && !fallbackActive) {
      setIsLoadingAudio(true);
      try {
        const res = await fetchNeuralSpeechAudio(sampleText, language, neuralVoice);
        if (res.success && res.audioBase64) {
          const blobUrl = convertBase64ToBlobUrl(res.audioBase64, res.mimeType || 'audio/wav');
          const audio = new Audio(blobUrl);
          audioElementRef.current = audio;
          audio.playbackRate = speechRate;
          audio.volume = isMuted ? 0 : 1.0;
          await audio.play();
        } else {
          throw new Error(res.error || 'Sample error');
        }
      } catch {
        // Fallback to local
        const utt = new SpeechSynthesisUtterance(sampleText);
        utt.lang = isAr ? 'ar-SA' : 'en-US';
        utt.rate = speechRate;
        const chosen = getBestVoiceForLanguage(language, selectedLocalVoiceURI);
        if (chosen) utt.voice = chosen;
        window.speechSynthesis?.speak(utt);
      } finally {
        setIsLoadingAudio(false);
      }
    } else {
      const utt = new SpeechSynthesisUtterance(sampleText);
      utt.lang = isAr ? 'ar-SA' : 'en-US';
      utt.rate = speechRate;
      const chosen = getBestVoiceForLanguage(language, selectedLocalVoiceURI);
      if (chosen) utt.voice = chosen;
      window.speechSynthesis?.speak(utt);
    }
  };

  const totalSegments = script.length;
  const currentSegment = script[currentSegmentIndex];
  const progressPercent = totalSegments > 0 ? Math.round(((currentSegmentIndex + 1) / totalSegments) * 100) : 0;
  const activeNeuralMeta = NEURAL_VOICES.find((v) => v.id === neuralVoice) || NEURAL_VOICES[0];

  return (
    <div className="bg-gradient-to-r from-indigo-50/90 via-sky-50/60 to-indigo-50/90 dark:from-indigo-950/60 dark:via-slate-900/80 dark:to-indigo-950/60 border border-indigo-200/90 dark:border-indigo-800/70 rounded-2xl p-4 sm:p-5 shadow-xs transition-colors">
      {/* Top Bar: Title, Educator Badge & Action Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
        {/* Left: Identity and current state */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-sky-600 text-white flex items-center justify-center shrink-0 shadow-sm relative">
            {isLoadingAudio ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : isPlaying ? (
              <Volume2 className="w-5 h-5 animate-pulse" />
            ) : (
              <GraduationCap className="w-5 h-5" />
            )}
            {engine === 'neural' && !fallbackActive && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                {isAr ? 'شرح الأستاذ الصوتي الهادئ' : 'Calm Educator Audio Explanation'}
              </span>

              {/* Engine Badge */}
              {engine === 'neural' && !fallbackActive ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  <span>{isAr ? 'صوت عصبي طبيعي (HD)' : 'Studio Neural HD'}</span>
                </span>
              ) : (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                  {fallbackActive
                    ? isAr
                      ? 'صوت محلي (احتياطي)'
                      : 'Local (Fallback)'
                    : isAr
                    ? 'صوت المتصفح المحلي'
                    : 'Local Synthesizer'}
                </span>
              )}

              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-100/70 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                {isAr ? 'مجاني 100%' : '100% Free'}
              </span>
            </div>

            <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5">
              <span>
                {isLoadingAudio
                  ? isAr
                    ? 'جاري تحضير صوت الأستاذ فائق الجودة...'
                    : 'Synthesizing studio teacher voice...'
                  : isPlaying || isPaused
                  ? `${isAr ? 'المقطع الحالي' : 'Active'}: ${currentSegment?.label} (${currentSegmentIndex + 1}/${totalSegments})`
                  : isAr
                  ? 'أسلوب الأستاذ والمذيع التعليمي لنطق المعادلات والخطوات'
                  : 'Teacher & broadcaster verbal articulation of derivations'}
              </span>
              {engine === 'neural' && !fallbackActive && (
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                  • {isAr ? activeNeuralMeta.nameAr : activeNeuralMeta.nameEn}
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
              disabled={isLoadingAudio}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow transition cursor-pointer min-h-[36px]"
              title={isAr ? 'تشغيل الشرح الصوتي' : 'Play Explanation'}
            >
              {isLoadingAudio ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
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
              onClick={stopAllAudio}
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
            title={isAr ? 'إعدادات نبرة الصوت والمحرك' : 'Voice engine & pace settings'}
            aria-label={isAr ? 'إعدادات نبرة الصوت والمحرك' : 'Voice engine & pace settings'}
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

      {/* Fallback notification notice if network or model temporarily busy */}
      {fallbackNotice && (
        <div className="mt-2.5 p-2.5 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-xl text-[11px] text-amber-800 dark:text-amber-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>{fallbackNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setFallbackNotice(null)}
            className="text-[10px] underline font-semibold cursor-pointer"
          >
            {isAr ? 'حسناً' : 'Dismiss'}
          </button>
        </div>
      )}

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

      {/* Collapsible Voice & Engine Settings Panel */}
      {showSettings && (
        <div className="mt-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-600" />
              <span>{isAr ? 'تخصيص محرك الصوت ونبرة الأستاذ' : 'Voice Engine & Persona Settings'}</span>
            </span>
            <button
              type="button"
              onClick={handleTestVoiceSample}
              disabled={isLoadingAudio}
              className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              {isLoadingAudio ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
              <span>{isAr ? 'تجربة نبرة الأستاذ الآن' : 'Test Voice Sample'}</span>
            </button>
          </div>

          {/* Engine Selector: Neural HD vs Local */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              {isAr ? 'محرك الصوت المفضل:' : 'Voice Engine:'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleEngineChange('neural')}
                className={`p-3 rounded-xl border text-start transition cursor-pointer flex items-start gap-2.5 ${
                  engine === 'neural' && !fallbackActive
                    ? 'bg-emerald-50/90 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-600 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="grow">
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <span>{isAr ? 'الذكاء العصبي فائق الدقة (HD)' : 'Studio Neural HD (Recommended)'}</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                      {isAr ? 'طبيعي' : 'Natural'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">
                    {isAr
                      ? 'صوت أستاذ ومذيع تعليمي طبيعي بالكامل، بنطق فصيح ووقفات هادئة ودعم العربية والإنجليزية (مجاني)'
                      : 'High-fidelity natural human teacher voice with clear mathematical diction (100% Free)'}
                  </div>
                </div>
                {engine === 'neural' && !fallbackActive && (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
              </button>

              <button
                type="button"
                onClick={() => handleEngineChange('local')}
                className={`p-3 rounded-xl border text-start transition cursor-pointer flex items-start gap-2.5 ${
                  engine === 'local' || fallbackActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-400 dark:border-indigo-600 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <GraduationCap className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div className="grow">
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <span>{isAr ? 'صوت الجهاز المحلي' : 'Local Device Voice'}</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {isAr ? 'سريع / أوفلاين' : 'Offline'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">
                    {isAr
                      ? 'توليد فوري داخل متصفحك دون الحاجة للاتصال بالشبكة، كبديل احتياطي وسريع'
                      : 'Immediate synthesis inside your browser without network calls, ideal as an offline fallback'}
                  </div>
                </div>
                {(engine === 'local' || fallbackActive) && (
                  <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                )}
              </button>
            </div>
          </div>

          {/* Persona selector for Neural engine */}
          {engine === 'neural' && !fallbackActive && (
            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                {isAr ? 'اختيار شخصية ونبرة الأستاذ:' : 'Select Educator Persona & Tone:'}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {NEURAL_VOICES.map((v) => {
                  const isSelected = v.id === neuralVoice;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => handleNeuralVoiceChange(v.id)}
                      className={`p-2.5 rounded-xl border text-start transition cursor-pointer flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-400 dark:border-indigo-600 text-indigo-950 dark:text-indigo-200 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="truncate">
                        <div className="text-xs font-bold truncate">
                          {isAr ? v.nameAr : v.nameEn}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {isAr ? v.descAr : v.descEn}
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Voice Selector for Local engine */}
          {(engine === 'local' || fallbackActive) && (
            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                {isAr ? 'أصوات المتصفح المتوفرة على جهازك:' : 'Available Device Voices:'}
              </label>

              {availableLocalVoices.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {availableLocalVoices.map((v) => {
                    const isSelected = v.voice.voiceURI === selectedLocalVoiceURI;
                    return (
                      <button
                        key={v.voice.voiceURI}
                        type="button"
                        onClick={() => handleLocalVoiceChange(v.voice.voiceURI)}
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
                        {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[11px]">
                    {isAr
                      ? 'يستخدم التطبيق أصوات نظام التشغيل والمتصفح المجانية كبديل احتياطي.'
                      : 'The app uses your free operating system voices as backup.'}
                  </p>
                </div>
              )}
            </div>
          )}

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

          <div className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span>
              {isAr
                ? '💡 حل مجاني 100%: تجمع المنصة بين الصوت العصبي الطبيعي فائق الجودة وصوت المتصفح الاحتياطي التلقائي بدون أي تكلفة.'
                : '💡 100% Free: Combines studio neural HD quality with automatic browser fallback with zero subscription.'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
