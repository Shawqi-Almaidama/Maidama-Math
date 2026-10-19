import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';

interface TutorVoiceRecorderProps {
  onTranscribed: (text: string) => void;
  language: 'ar' | 'en';
}

export const TutorVoiceRecorder: React.FC<TutorVoiceRecorderProps> = ({ onTranscribed, language }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const isAr = language === 'ar';

  useEffect(() => {
    return () => {
      stopAll();
    };
  }, []);

  const stopAll = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      } catch {}
      mediaRecorderRef.current = null;
    }
    setIsRecording(false);
    setIsProcessing(false);
  };

  const startVoiceInput = async () => {
    setFeedback(null);

    // 1. Try SpeechRecognition (browser native, immediate response)
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.lang = isAr ? 'ar-SA' : 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          setIsRecording(true);
        };

        recognition.onresult = (event: any) => {
          const transcript = event.results[0]?.[0]?.transcript;
          if (transcript) {
            onTranscribed(transcript);
          }
          setIsRecording(false);
        };

        recognition.onerror = (event: any) => {
          console.warn('SpeechRecognition error:', event.error);
          setIsRecording(false);
          // Fallback to MediaRecorder
          startMediaRecorderFallback();
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognition.start();
        return;
      } catch (err) {
        console.warn('SpeechRecognition start failed, trying MediaRecorder fallback:', err);
      }
    }

    // 2. Fallback to MediaRecorder & /api/transcribe-voice
    startMediaRecorderFallback();
  };

  const startMediaRecorderFallback = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsProcessing(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());

        try {
          const reader = new FileReader();
          reader.onloadend = async () => {
            try {
              const base64Audio = (reader.result as string).split(',')[1];
              const res = await fetch('/api/transcribe-voice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  audioBase64: base64Audio,
                  mimeType: 'audio/webm',
                  language: isAr ? 'ar' : 'en',
                }),
              });
              const data = await res.json();
              const recognizedText = data?.transcribedText || data?.text;

              if (res.ok && typeof recognizedText === 'string' && recognizedText.trim().length > 0) {
                onTranscribed(recognizedText.trim());
                setFeedback(null);
              } else {
                const message = data?.error || (isAr ? 'لم يتم التعرف على الصوت بوضوح.' : 'Could not transcribe audio clearly.');
                setFeedback(message);
                setTimeout(() => setFeedback(null), 4000);
              }
            } catch {
              setFeedback(isAr ? 'حدث خطأ في الاتصال بخدمة التفريغ الصوتي.' : 'Network error during voice transcription.');
              setTimeout(() => setFeedback(null), 4000);
            } finally {
              setIsProcessing(false);
            }
          };
          reader.readAsDataURL(audioBlob);
        } catch {
          setFeedback(isAr ? 'حدث خطأ أثناء معالجة الملف الصوتي.' : 'Error reading recorded audio.');
          setTimeout(() => setFeedback(null), 4000);
          setIsProcessing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      setFeedback(isAr ? 'تعذر الوصول إلى الميكروفون. يرجى التحقق من الأذونات.' : 'Microphone access denied. Please verify permissions.');
      setTimeout(() => setFeedback(null), 4000);
      setIsRecording(false);
      setIsProcessing(false);
    }
  };

  const handleToggle = () => {
    if (isRecording) {
      stopAll();
    } else {
      startVoiceInput();
    }
  };

  return (
    <div className="relative flex items-center">
      <button
        type="button"
        onClick={handleToggle}
        disabled={isProcessing}
        className={`p-2.5 rounded-xl border transition flex items-center justify-center min-w-[44px] min-h-[44px] cursor-pointer ${
          isRecording
            ? 'bg-rose-500 text-white border-rose-600 animate-pulse shadow-md'
            : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
        }`}
        title={
          isRecording
            ? (isAr ? 'إيقاف التسجيل' : 'Stop recording')
            : (isAr ? 'تسجيل سؤالك صوتياً' : 'Voice input for tutor question')
        }
        aria-label={isAr ? 'التسجيل الصوتي لسؤال المعلم' : 'Voice input for tutor question'}
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
        ) : isRecording ? (
          <Square className="w-4 h-4 fill-current" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </button>

      {feedback && (
        <span className="absolute -top-7 rtl:right-0 ltr:left-0 whitespace-nowrap bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded shadow">
          {feedback}
        </span>
      )}
    </div>
  );
};
