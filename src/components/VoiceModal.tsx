import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, ArrowRight, Loader2 } from 'lucide-react';
import { useLocalization } from '../localization/LocalizationContext.tsx';

interface VoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmText: (text: string) => void;
  language?: 'ar' | 'en';
}

export const VoiceModal: React.FC<VoiceModalProps> = ({
  isOpen,
  onClose,
  onConfirmText,
  language: propLanguage,
}) => {
  const { language: ctxLang, t } = useLocalization();
  const lang = propLanguage || ctxLang;

  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) {
      cleanup();
    }
  }, [isOpen]);

  const cleanup = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setIsRecording(false);
    setRecordingSeconds(0);
    setTranscribedText('');
    setError(null);
  };

  const startRecording = async () => {
    setError(null);
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        // Automatically transcribe after stopping
        transcribeAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch {
      setError(t('voice.micError'));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const transcribeAudio = async (blob: Blob) => {
    setIsTranscribing(true);
    setError(null);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        const res = await fetch('/api/transcribe-voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64: base64Audio,
            mimeType: blob.type || 'audio/webm',
            language: lang,
          }),
        });

        const data = await res.json();
        if (data.success && data.transcribedText) {
          setTranscribedText(data.transcribedText);
        } else {
          throw new Error(data.error || 'Failed to transcribe');
        }
        setIsTranscribing(false);
      };
      reader.readAsDataURL(blob);
    } catch {
      setIsTranscribing(false);
      setError(t('voice.transcriptionError'));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="voice-modal-title"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-slate-900 dark:text-slate-100 transition-colors"
      >
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <h3 id="voice-modal-title" className="font-bold text-base flex items-center gap-2 text-indigo-600 dark:text-indigo-300">
            <Mic className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            {t('voice.title')}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close voice modal"
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-sm p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          {t('voice.desc')}
        </p>

        {/* Audio Recording State & Visualizer */}
        <div className="flex flex-col items-center justify-center py-6 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-4">
          <div className="relative">
            {isRecording && (
              <div className="absolute inset-0 rounded-full bg-rose-500/30 animate-ping" />
            )}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-transform active:scale-95 shadow-xl ${
                isRecording
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
              aria-label={isRecording ? 'Stop recording' : 'Start recording'}
            >
              {isRecording ? <Square className="w-8 h-8 fill-current" /> : <Mic className="w-8 h-8" />}
            </button>
          </div>

          <div className="text-center">
            {isRecording ? (
              <div className="text-rose-600 dark:text-rose-400 text-sm font-bold flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <span>
                  {t('voice.listening')} ({recordingSeconds}s)
                </span>
              </div>
            ) : isTranscribing ? (
              <div className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>
                  {t('voice.normalizing')}
                </span>
              </div>
            ) : (
              <div className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                {t('voice.tapToRecord')}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl">
            {error}
          </div>
        )}

        {/* Transcribed Text preview and confirmation field */}
        {transcribedText && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t('voice.extractedLabel')}
            </label>
            <textarea
              value={transcribedText}
              onChange={(e) => setTranscribedText(e.target.value)}
              rows={3}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-indigo-900/60 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              dir="auto"
            />
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition min-h-[36px]"
          >
            {t('voice.cancel')}
          </button>

          {transcribedText && (
            <button
              onClick={() => {
                onConfirmText(transcribedText);
                onClose();
              }}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow min-h-[36px]"
            >
              <span>{t('voice.submitAndSolve')}</span>
              <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
