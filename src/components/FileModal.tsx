import React, { useState, useRef } from 'react';
import { FileText, Upload, ArrowRight, AlertCircle, FileCheck } from 'lucide-react';
import { useLocalization } from '../localization/LocalizationContext.tsx';

interface FileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSolve: (options: { problem: string; fileBase64: string; mimeType: string; fileName: string }) => void;
  language?: 'ar' | 'en';
}

export const FileModal: React.FC<FileModalProps> = ({
  isOpen,
  onClose,
  onConfirmSolve,
  language: propLanguage,
}) => {
  const { language: ctxLang, t } = useLocalization();
  const lang = propLanguage || ctxLang;
  const isAr = lang === 'ar';

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [questionPrompt, setQuestionPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    if (file.size > 25 * 1024 * 1024) {
      setError(t('file.sizeError'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      const base64 = res.split(',')[1];
      setSelectedFile(file);
      setFileBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirm = () => {
    if (!selectedFile || !fileBase64) return;
    onConfirmSolve({
      problem: questionPrompt.trim() || (isAr ? `حل المسائل الرياضية في مستند (${selectedFile.name})` : `Solve mathematical problems in document (${selectedFile.name})`),
      fileBase64,
      mimeType: selectedFile.type || 'application/pdf',
      fileName: selectedFile.name,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="file-modal-title"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-900 dark:text-slate-100 transition-colors"
      >
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <h3 id="file-modal-title" className="font-bold text-base flex items-center gap-2 text-indigo-600 dark:text-indigo-300">
            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            {t('file.title')}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close file modal"
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-sm p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          {t('file.desc')}
        </p>

        {/* Drop zone */}
        {!selectedFile ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-2xl p-7 text-center cursor-pointer transition bg-slate-50 dark:bg-slate-950/60 group"
          >
            <Upload className="w-10 h-10 text-slate-400 group-hover:text-indigo-500 mx-auto mb-2 transition" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t('file.dropzoneText')}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">{t('file.formatsText')}</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        ) : (
          <div className="bg-slate-50 dark:bg-slate-950 border border-indigo-200 dark:border-indigo-900/50 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-200 truncate max-w-[200px]">
                    {selectedFile.name}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setFileBase64(null);
                }}
                className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 p-1"
              >
                {t('file.changeFile')}
              </button>
            </div>

            <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
              <label className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                {t('file.questionPromptLabel')}
              </label>
              <input
                type="text"
                value={questionPrompt}
                onChange={(e) => setQuestionPrompt(e.target.value)}
                placeholder={t('file.questionPromptPlaceholder')}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                dir="auto"
              />
            </div>
          </div>
        )}

        {error && (
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition min-h-[36px]"
          >
            {t('file.cancel')}
          </button>

          {selectedFile && (
            <button
              onClick={handleConfirm}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow min-h-[36px]"
            >
              <span>{t('file.processAndSolve')}</span>
              <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
