import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, RotateCw, Check, ArrowRight, Loader2, Image as ImageIcon } from 'lucide-react';
import { MathView } from './MathView.tsx';
import { useLocalization } from '../localization/LocalizationContext.tsx';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSolve: (options: { problem: string; imageBase64?: string; mimeType?: string }) => void;
  language?: 'ar' | 'en';
}

export const CameraModal: React.FC<CameraModalProps> = ({
  isOpen,
  onClose,
  onConfirmSolve,
  language: propLanguage,
}) => {
  const { language: ctxLang, t } = useLocalization();
  const lang = propLanguage || ctxLang;
  const isAr = lang === 'ar';

  const [mode, setMode] = useState<'upload' | 'camera'>('camera');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('image/jpeg');
  const [isExtracting, setIsExtracting] = useState(false);
  const [recognizedLatex, setRecognizedLatex] = useState<string>('');
  const [recognizedText, setRecognizedText] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0);
  const [rotation, setRotation] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const startCamera = async () => {
    stopCamera();
    setError(null);
    setMode('camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch {
      setError(t('camera.cameraError'));
      setMode('upload');
    }
  };

  useEffect(() => {
    if (isOpen) {
      setMode('camera');
      startCamera();
    } else {
      stopCamera();
      setImageBase64(null);
      setRecognizedLatex('');
      setRecognizedText('');
      setError(null);
    }
  }, [isOpen]);

  // Ensure stream is bound to video element whenever video element is mounted
  useEffect(() => {
    if (mode === 'camera' && videoRef.current && mediaStreamRef.current) {
      videoRef.current.srcObject = mediaStreamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [mode]);

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    stopCamera();

    const base64 = dataUrl.split(',')[1];
    setImageBase64(base64);
    setImageMimeType('image/jpeg');
    setMode('upload');
    extractMath(base64, 'image/jpeg');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      setImageBase64(base64);
      setImageMimeType(file.type || 'image/jpeg');
      extractMath(base64, file.type || 'image/jpeg');
    };
    reader.readAsDataURL(file);
  };

  const rotateImage = () => {
    setRotation((r) => (r + 90) % 360);
  };

  const extractMath = async (base64: string, mime: string) => {
    setIsExtracting(true);
    setError(null);
    try {
      const res = await fetch('/api/extract-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: mime,
          language: lang,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setRecognizedLatex(data.latex || '');
        setRecognizedText(data.recognizedText || '');
        setConfidence(data.confidence || 0.9);
      } else {
        throw new Error(data.error);
      }
    } catch {
      setError(t('camera.ocrError'));
    } finally {
      setIsExtracting(false);
    }
  };

  const handleConfirm = () => {
    onConfirmSolve({
      problem: recognizedText || recognizedLatex || (isAr ? 'حل المسألة المرفقة بالصورة' : 'Solve the math problem in this image'),
      imageBase64: imageBase64 || undefined,
      mimeType: imageMimeType,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="camera-modal-title"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto transition-colors"
      >
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <h3 id="camera-modal-title" className="font-bold text-base flex items-center gap-2 text-indigo-600 dark:text-indigo-300">
            <Camera className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            {t('camera.title')}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close camera modal"
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-sm p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Tab Controls: Upload vs Camera */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              stopCamera();
              setMode('upload');
            }}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 transition min-h-[40px] ${
              mode === 'upload'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{t('camera.uploadTab')}</span>
          </button>
          <button
            onClick={startCamera}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 transition min-h-[40px] ${
              mode === 'camera'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{t('camera.cameraTab')}</span>
          </button>
        </div>

        {/* Camera Video Viewfinder */}
        {mode === 'camera' && (
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-slate-200 dark:border-slate-800 shadow-inner">
            <video
              ref={(el) => {
                videoRef.current = el;
                if (el && mediaStreamRef.current && el.srcObject !== mediaStreamRef.current) {
                  el.srcObject = mediaStreamRef.current;
                  el.play().catch(() => {});
                }
              }}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <button
              onClick={capturePhoto}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-full shadow-2xl flex items-center gap-2 border-2 border-white transition active:scale-95"
            >
              <Camera className="w-4 h-4" />
              <span>{t('camera.snapPhoto')}</span>
            </button>
          </div>
        )}

        {/* File Upload / Image Preview */}
        {mode === 'upload' && !imageBase64 && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-2xl p-8 text-center cursor-pointer transition bg-slate-50 dark:bg-slate-950/60 group"
          >
            <ImageIcon className="w-12 h-12 text-slate-400 group-hover:text-indigo-500 mx-auto mb-3 transition" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t('camera.dropzoneText')}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">{t('camera.fileFormats')}</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        )}

        {/* Captured / Uploaded Image Preview */}
        {imageBase64 && (
          <div className="space-y-3">
            <div className="relative rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 max-h-56 flex items-center justify-center p-2">
              <img
                src={`data:${imageMimeType};base64,${imageBase64}`}
                alt="Math Problem"
                style={{ transform: `rotate(${rotation}deg)` }}
                className="max-h-52 object-contain transition-transform"
              />
              <button
                onClick={rotateImage}
                className="absolute top-2 right-2 rtl:left-2 rtl:right-auto p-1.5 bg-white/90 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs flex items-center gap-1 border border-slate-200 dark:border-slate-700 shadow-sm"
                title={t('camera.rotateTooltip')}
                aria-label={t('camera.rotateTooltip')}
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Extraction Loader */}
            {isExtracting ? (
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-indigo-200 dark:border-indigo-900/50 rounded-xl flex items-center gap-2.5 text-xs text-indigo-700 dark:text-indigo-300">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>
                  {t('camera.recognizing')}
                </span>
              </div>
            ) : recognizedLatex ? (
              <div className="bg-emerald-50 dark:bg-slate-950 border border-emerald-200 dark:border-emerald-900/40 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 dark:text-emerald-400">
                  <span className="flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>{t('camera.recognizedHeader')}</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    {(confidence * 100).toFixed(0)}% {t('camera.confidenceLabel')}
                  </span>
                </div>
                <div className="text-center bg-white dark:bg-slate-900 rounded-lg p-2.5 overflow-x-auto border border-emerald-100 dark:border-transparent">
                  <MathView math={recognizedLatex} block />
                </div>
              </div>
            ) : null}

            {/* Editable recognized text */}
            <div className="space-y-1">
              <label className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                {t('camera.problemTextLabel')}
              </label>
              <textarea
                value={recognizedText}
                onChange={(e) => setRecognizedText(e.target.value)}
                rows={2}
                placeholder={t('camera.problemPlaceholder')}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                dir="auto"
              />
            </div>
          </div>
        )}

        {error && (
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl">
            {error}
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
          {imageBase64 ? (
            <button
              onClick={() => {
                setImageBase64(null);
                setRecognizedLatex('');
                setRecognizedText('');
              }}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 min-h-[36px]"
            >
              {t('camera.chooseAnother')}
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition min-h-[36px]"
            >
              {t('camera.cancel')}
            </button>

            {imageBase64 && (
              <button
                onClick={handleConfirm}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow min-h-[36px]"
              >
                <span>{t('camera.solveMath')}</span>
                <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
