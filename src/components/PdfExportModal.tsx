import React, { useRef, useEffect } from 'react';
import { 
  Printer, 
  Download, 
  X, 
  ExternalLink, 
  FileText, 
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { MathSolution } from '../types/math.ts';
import { downloadHtmlReport } from '../utils/pdfExport.ts';

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  solution: MathSolution;
  language: 'ar' | 'en';
  htmlContent: string;
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  isOpen,
  onClose,
  solution,
  language,
  htmlContent,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isAr = language === 'ar';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrint = () => {
    try {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
        return;
      }
    } catch (err) {
      console.warn('Iframe print failed, falling back to window print or download:', err);
    }

    try {
      window.print();
    } catch {
      handleDownload();
    }
  };

  const handleDownload = () => {
    downloadHtmlReport(solution, language);
  };

  const handleOpenExternal = () => {
    try {
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (!win) {
        handleDownload();
      }
    } catch {
      handleDownload();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      dir={isAr ? 'rtl' : 'ltr'}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative flex flex-col w-full max-w-4xl h-[92vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden transition-colors">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>{isAr ? 'معاينة وتصدير تقرير الحل الرياضي' : 'Solution Report Preview & PDF Export'}</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  {isAr ? 'ميدمة ماث' : 'Maidama Math'}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAr ? 'مستند A4 منسق مع الرسوم البيانية والشروح خطوة بخطوة' : 'Formatted A4 document with curves & pedagogical steps'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title={isAr ? 'إغلاق' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Helpful Tip Banner */}
        <div className="px-6 py-2.5 bg-indigo-50/60 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/30 text-xs text-indigo-900 dark:text-indigo-200 flex items-center gap-2 shrink-0">
          <HelpCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span>
            {isAr
              ? 'لحفظ الملف بصيغة PDF: اضغط على "طباعة أو حفظ كـ PDF" واختر "حفظ بتنسيق PDF" (Save as PDF) كوجهة للطباعة. أو نزّل الملف مباشرة وافتحه في أي وقت.'
              : 'To save as PDF: Click "Print / Save as PDF" and choose "Save as PDF" as the printer destination. Or download the standalone HTML report.'}
          </span>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs hover:shadow transition flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{isAr ? 'طباعة أو حفظ كـ PDF' : 'Print / Save as PDF'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-medium text-xs rounded-xl transition flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span>{isAr ? 'تنزيل ملف التقرير المستقل' : 'Download Standalone Report'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenExternal}
              className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
              title={isAr ? 'فتح في تبويب مستقل' : 'Open in New Tab'}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{isAr ? 'فتح في تبويب مستقل' : 'Open in New Tab'}</span>
            </button>
          </div>
        </div>

        {/* Document Preview Frame */}
        <div className="flex-1 p-3 sm:p-5 bg-slate-100 dark:bg-slate-950 overflow-hidden flex justify-center items-center">
          <div className="w-full h-full max-w-3xl bg-white rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
            <iframe
              ref={iframeRef}
              title="Mathematical Solution Printable Document"
              srcDoc={htmlContent}
              className="w-full h-full border-0 bg-white"
              sandbox="allow-same-origin allow-scripts allow-modals allow-downloads"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
