import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  Bookmark, 
  BookmarkCheck, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Send, 
  Lightbulb, 
  AlertTriangle, 
  BookOpen, 
  LineChart, 
  MessageSquare, 
  ShieldCheck,
  Download,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { MathSolution, ChatMessage } from '../types/math.ts';
import { MathView, MixedMathText } from './MathView.tsx';
import { GraphingCalculator } from './GraphingCalculator.tsx';
import { useLocalization } from '../localization/LocalizationContext.tsx';
import { localizeSolution } from '../utils/solutionLocalizer.ts';
import { exportSolutionToPdf, generatePrintableHtml, downloadHtmlReport } from '../utils/pdfExport.ts';
import { PdfExportModal } from './PdfExportModal.tsx';
import { AudioExplanationPlayer } from './AudioExplanationPlayer.tsx';
import { StructuredTutorMessage } from './StructuredTutorMessage.tsx';
import { TutorVoiceRecorder } from './TutorVoiceRecorder.tsx';

interface SolutionViewerProps {
  solution: MathSolution;
  onToggleFavorite: (id: string) => void;
  isFavorite: boolean;
  language?: 'ar' | 'en';
}

export const SolutionViewer: React.FC<SolutionViewerProps> = ({
  solution,
  onToggleFavorite,
  isFavorite,
  language: propLanguage,
}) => {
  const { language: ctxLang, t } = useLocalization();
  const lang = propLanguage || ctxLang;

  // Seamless bidirectional localization for both fresh and previously stored solutions
  const displaySolution = useMemo(() => {
    return localizeSolution(solution, lang);
  }, [solution, lang]);

  const [copied, setCopied] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({
    0: true,
    1: true,
    2: true,
    3: true,
    4: true,
    5: true,
    6: true,
    7: true,
  });
  const [showGraph, setShowGraph] = useState(Boolean(displaySolution.plotConfig));

  // Follow-up chat state with initial pedagogical welcome greeting introducing Maidama Math
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => [
    {
      id: `welcome-${solution.id}`,
      sender: 'assistant',
      text:
        lang === 'ar'
          ? 'أهلًا بك! أنا معلمك ومساعدك في Maidama Math، وسأرافقك خطوة بخطوة لفهم المسألة والوصول إلى الحل الصحيح. هل لديك أي استفسار أو ترغب في توضيح أي خطوة أو قاعدة رياضية بالتفصيل؟'
          : 'Welcome! I am your teacher and assistant at Maidama Math, and I will accompany you step-by-step to understand the problem and reach the correct solution. Feel free to ask me about any step, formula, or concept!',
      timestamp: Date.now(),
    },
  ]);

  // Synchronize initial welcome greeting when solution or language changes
  React.useEffect(() => {
    setChatMessages([
      {
        id: `welcome-${solution.id}`,
        sender: 'assistant',
        text:
          lang === 'ar'
            ? 'أهلًا بك! أنا معلمك ومساعدك في Maidama Math، وسأرافقك خطوة بخطوة لفهم المسألة والوصول إلى الحل الصحيح. هل لديك أي استفسار أو ترغب في توضيح أي خطوة أو قاعدة رياضية بالتفصيل؟'
            : 'Welcome! I am your teacher and assistant at Maidama Math, and I will accompany you step-by-step to understand the problem and reach the correct solution. Feel free to ask me about any step, formula, or concept!',
        timestamp: Date.now(),
      },
    ]);
  }, [solution.id, lang]);

  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  const toggleStep = (idx: number) => {
    setExpandedSteps((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // PDF Export States & Robust Multi-Tier Handler
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfModalHtml, setPdfModalHtml] = useState('');
  const [exportNotification, setExportNotification] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
  } | null>(null);

  const handleExportPdf = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    setExportNotification(null);

    // Extract active graphing calculator canvas snapshot from DOM if visible
    let activeGraphDataUrl: string | undefined;
    try {
      const canvasEl = document.querySelector('.graphing-calculator-canvas, canvas') as HTMLCanvasElement | null;
      if (canvasEl && canvasEl.width > 0 && canvasEl.height > 0) {
        activeGraphDataUrl = canvasEl.toDataURL('image/png');
      }
    } catch (e) {
      console.warn('Canvas snapshot acquisition failed:', e);
    }

    try {
      const result = await exportSolutionToPdf(displaySolution, lang, activeGraphDataUrl);

      if (result.success && result.method === 'popup') {
        setExportNotification({
          type: 'success',
          message: t('solution.exportPdfSuccess'),
        });
      } else {
        // Fallback: If popup was blocked or opened in modal mode
        const html = result.htmlContent || generatePrintableHtml(displaySolution, lang, activeGraphDataUrl);
        setPdfModalHtml(html);
        setShowPdfModal(true);
        if (result.reason === 'popup_blocked') {
          setExportNotification({
            type: 'warning',
            message: t('solution.exportPdfBlockedNotice'),
          });
        }
      }
    } catch (err: any) {
      console.error('Failed to export solution:', err);
      try {
        const fallbackHtml = generatePrintableHtml(displaySolution, lang, activeGraphDataUrl);
        setPdfModalHtml(fallbackHtml);
        setShowPdfModal(true);
      } catch {}
      setExportNotification({
        type: 'error',
        message: `${t('solution.exportPdfError')}: ${err?.message || ''}`,
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: chatInput.trim(),
      timestamp: Date.now(),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const response = await fetch('/api/chat-followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          solution,
          userQuery: userMsg.text,
          language: lang,
          history: chatMessages.map((m) => ({ sender: m.sender, text: m.text })),
        }),
      });

      const data = await response.json();
      if (data.success && data.answer) {
        const assistantMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: data.answer,
          timestamp: Date.now(),
        };
        setChatMessages((prev) => [...prev, assistantMsg]);
      } else {
        throw new Error(data.error || 'Failed to get answer');
      }
    } catch {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: t('solution.errorFollowup'),
        timestamp: Date.now(),
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const verificationBadge = {
    verified: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-500/80 text-emerald-900 dark:text-emerald-300',
      icon: <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
      label: t('verification.verifiedLabel'),
    },
    numerical_approximation: {
      bg: 'bg-cyan-50 dark:bg-cyan-950/70 border-cyan-300 dark:border-cyan-500/80 text-cyan-900 dark:text-cyan-300',
      icon: <CheckCircle2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />,
      label: t('verification.numericalApproxLabel'),
    },
    ai_reasoned: {
      bg: 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-300 dark:border-indigo-500/80 text-indigo-900 dark:text-indigo-300',
      icon: <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
      label: t('verification.aiReasonedLabel'),
    },
    unsupported: {
      bg: 'bg-amber-50 dark:bg-amber-950/70 border-amber-300 dark:border-amber-500/80 text-amber-900 dark:text-amber-300',
      icon: <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
      label: t('verification.unsupportedLabel'),
    },
  }[displaySolution.verification?.status || 'ai_reasoned'];

  return (
    <div className="space-y-6">
      {/* Top Meta Bar - Zero-Pill clean typography */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm transition-colors">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-indigo-600 dark:text-indigo-400">
            {displaySolution.category}
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {displaySolution.topic}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {t(`levels.${displaySolution.level}`) || displaySolution.level}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleFavorite(displaySolution.id)}
            className={`p-2 rounded-xl border transition flex items-center gap-1.5 text-xs font-medium min-h-[36px] ${
              isFavorite
                ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-500 text-amber-700 dark:text-amber-300'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {isFavorite ? <BookmarkCheck className="w-4 h-4 text-amber-500 dark:text-amber-400" /> : <Bookmark className="w-4 h-4" />}
            <span>{t('solution.favorite')}</span>
          </button>

          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition flex items-center gap-1.5 text-xs font-medium min-h-[36px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title={lang === 'ar' ? 'تصدير الحل إلى ملف PDF' : 'Export Solution to PDF'}
          >
            {isExportingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
            ) : (
              <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            )}
            <span>
              {isExportingPdf
                ? t('solution.exportingPdf')
                : (t('solution.exportPdf') || (lang === 'ar' ? 'تصدير PDF' : 'Export PDF'))}
            </span>
          </button>
        </div>
      </div>

      {/* Export Notification Banner */}
      {exportNotification && (
        <div
          className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 shadow-xs transition-colors ${
            exportNotification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : exportNotification.type === 'warning'
              ? 'bg-amber-50 dark:bg-amber-950/70 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
              : 'bg-rose-50 dark:bg-rose-950/70 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {exportNotification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            )}
            <span>{exportNotification.message}</span>
          </div>
          <button
            onClick={() => setExportNotification(null)}
            className="text-xs opacity-70 hover:opacity-100 p-1 rounded-md cursor-pointer"
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      )}

      {/* Audio Spoken Explanation Player */}
      <AudioExplanationPlayer solution={displaySolution} language={lang} />

      {/* Problem Statement Card */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-indigo-900/40 rounded-2xl p-5 shadow-sm transition-colors">
        <h4 className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold mb-2">
          {t('solution.problemStatement')}
        </h4>
        <div className="text-base text-slate-900 dark:text-slate-100 leading-relaxed font-medium mb-3" dir="auto">
          {displaySolution.originalQuestion}
        </div>

        {displaySolution.interpretedLatex && (
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 my-2 text-center overflow-x-auto">
            <MathView math={displaySolution.interpretedLatex} block />
          </div>
        )}

        {/* Assumptions & Formula */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
          {displaySolution.assumptions && displaySolution.assumptions.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5 mb-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                {t('solution.assumptions')}
              </span>
              <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1 list-disc list-inside">
                {displaySolution.assumptions.map((ass, i) => (
                  <li key={i}>{ass}</li>
                ))}
              </ul>
            </div>
          )}

          {displaySolution.formulaUsed && (
            <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5 mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                {t('solution.formulaUsed')}
              </span>
              <div className="text-xs text-indigo-700 dark:text-indigo-200 font-medium">
                <MixedMathText text={displaySolution.formulaUsed} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Visually Distinct Final Answer Box */}
      <div className="bg-gradient-to-r from-indigo-50/80 via-white to-sky-50/80 dark:from-indigo-950/90 dark:via-slate-900 dark:to-indigo-950/90 border-2 border-indigo-500 rounded-2xl p-6 shadow-md dark:shadow-2xl relative overflow-hidden transition-colors">
        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-indigo-500 via-sky-400 to-indigo-500" />
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
            <span>✨</span>
            {t('solution.finalAnswerHeader')}
          </span>
          <button
            onClick={() => copyToClipboard(displaySolution.plainAnswer || displaySolution.finalAnswer)}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white p-1.5 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg transition"
            title={t('solution.copyAnswer')}
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>

        <div className="my-2 py-2">
          {displaySolution.finalAnswer ? (
            <div className="text-center overflow-x-auto">
              <MathView math={displaySolution.finalAnswer} block className="text-2xl sm:text-3xl font-bold text-indigo-950 dark:text-white drop-shadow-sm" />
            </div>
          ) : null}
          <div className="text-center text-sm font-semibold text-slate-800 dark:text-slate-200 mt-2" dir="auto">
            {displaySolution.plainAnswer}
          </div>
        </div>
      </div>

      {/* Independent Verification Box */}
      <div className={`border rounded-2xl p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm ${verificationBadge.bg}`}>
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/60 shadow-xs shrink-0">
            {verificationBadge.icon}
          </div>
          <div>
            <h5 className="text-sm font-bold flex items-center gap-2 flex-wrap">
              <span>{verificationBadge.label}</span>
              {displaySolution.verification.residual !== undefined && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/80 dark:bg-slate-900/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {t('verification.residualPrefix')}{displaySolution.verification.residual === 0 ? '0' : displaySolution.verification.residual}
                </span>
              )}
            </h5>
            <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">
              {displaySolution.verification.explanation}
            </p>
          </div>
        </div>
      </div>

      {/* Step-by-Step Derivation Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm transition-colors">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>📚</span>
            {t('solution.derivationHeader')}
          </h3>
          <span className="text-xs text-indigo-700 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-xl border border-indigo-200 dark:border-indigo-900/70">
            {displaySolution.steps.length} {t('solution.stepsCount')}
          </span>
        </div>

        <div className="space-y-4">
          {displaySolution.steps.map((step, idx) => {
            const isExpanded = expandedSteps[idx] ?? true;
            return (
              <div
                key={idx}
                className="border border-slate-200 dark:border-slate-800/90 bg-slate-50/70 dark:bg-slate-950/60 rounded-2xl overflow-hidden transition-all duration-200"
              >
                {/* Step Header */}
                <button
                  onClick={() => toggleStep(idx)}
                  className="w-full flex items-center justify-between p-3.5 text-left rtl:text-right bg-slate-100/60 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800/70 transition min-h-[44px]"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                      <bdi>{step.stepNumber || idx + 1}</bdi>
                    </span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200" dir="auto">
                      <MixedMathText text={step.title} />
                    </span>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500 dark:text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-400" />}
                </button>

                {/* Step Body */}
                {isExpanded && (
                  <div className="p-4 space-y-3 border-t border-slate-200 dark:border-slate-800/80">
                    {/* LaTeX formula if present */}
                    {step.latex && (
                      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-indigo-900/30 rounded-xl p-3 text-center my-1 overflow-x-auto">
                        <MathView math={step.latex} block />
                      </div>
                    )}

                    {/* Pedagogical Explanation */}
                    <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed" dir="auto">
                      <MixedMathText text={step.explanation} />
                    </div>

                    {/* Intermediate sub-steps */}
                    {step.subSteps && step.subSteps.length > 0 && (
                      <div className="bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-3 mt-2 space-y-1">
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                          {t('solution.intermediateAlgebra')}
                        </span>
                        <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1 list-disc list-inside">
                          {step.subSteps.map((sub, sIdx) => (
                            <li key={sIdx}>
                              <MixedMathText text={sub} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Alternative Method if available */}
      {displaySolution.alternativeMethod && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4.5 shadow-sm">
          <h4 className="text-sm font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            {t('solution.alternativeMethodTitle')}: {displaySolution.alternativeMethod.title}
          </h4>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed" dir="auto">
            <MixedMathText text={displaySolution.alternativeMethod.summary} />
          </p>
          {displaySolution.alternativeMethod.latex && (
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 mt-2 text-center overflow-x-auto">
              <MathView math={displaySolution.alternativeMethod.latex} block />
            </div>
          )}
        </div>
      )}

      {/* Did You Know / Real-world math insight */}
      {displaySolution.didYouKnow && (
        <div className="bg-amber-50/70 dark:bg-slate-900/70 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-4 text-xs text-amber-900 dark:text-amber-200/90 flex items-start gap-3 shadow-xs">
          <span className="text-lg">💡</span>
          <div>
            <span className="font-bold block text-amber-800 dark:text-amber-300 mb-0.5">
              {t('solution.didYouKnowTitle')}
            </span>
            <MixedMathText text={displaySolution.didYouKnow} />
          </div>
        </div>
      )}

      {/* Ambiguity notice */}
      {displaySolution.ambiguities && displaySolution.ambiguities.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl p-4 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div>
            <span className="font-bold block mb-1">
              {t('solution.ambiguitiesTitle')}
            </span>
            <ul className="list-disc list-inside space-y-0.5">
              {displaySolution.ambiguities.map((amb, i) => (
                <li key={i}>{amb}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Graphing Visualization Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm transition-colors">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <LineChart className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            {t('solution.graphSectionTitle')}
          </h3>
          <button
            onClick={() => setShowGraph((v) => !v)}
            className="text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 transition min-h-[36px]"
          >
            {showGraph ? t('solution.hideGraph') : t('solution.showGraph')}
          </button>
        </div>

        {showGraph && (
          <div className="mt-2">
            <GraphingCalculator
              initialExpr={displaySolution.plotConfig?.functionExpr || 'x^2 - 4'}
              language={lang}
            />
          </div>
        )}
      </div>

      {/* Interactive Step Follow-up Chat Q&A */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-indigo-900/50 rounded-2xl p-5 shadow-sm transition-colors">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
          <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {t('solution.tutorChatTitle')}
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {t('solution.tutorChatSubtitle')}
          </span>
        </div>

        {/* Chat message stream */}
        <div className="space-y-3 max-h-64 overflow-y-auto pr-1 mb-4">
          {chatMessages.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500">
              {t('solution.tutorEmptyChat')}
            </div>
          ) : (
            chatMessages.map((msg) => (
              <StructuredTutorMessage
                key={msg.id}
                text={msg.text}
                isUser={msg.sender === 'user'}
                language={lang}
              />
            ))
          )}
          {isChatLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs rounded-2xl px-4 py-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                <span>{t('solution.tutorThinking')}</span>
              </div>
            </div>
          )}
        </div>

        {/* Chat Input form */}
        <form onSubmit={handleSendChat} className="flex items-center gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder={t('solution.tutorPlaceholder')}
            className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
            dir="auto"
          />

          {/* Voice Input Button */}
          <TutorVoiceRecorder
            onTranscribed={(spokenText) => {
              setChatInput((prev) => (prev ? `${prev} ${spokenText}` : spokenText));
            }}
            language={lang}
          />

          <button
            type="submit"
            disabled={!chatInput.trim() || isChatLoading}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm min-h-[44px] cursor-pointer shrink-0"
          >
            <Send className="w-3.5 h-3.5 rtl:rotate-180" />
            <span>{t('solution.sendAction')}</span>
          </button>
        </form>
      </div>

      {/* In-App PDF Export & Preview Modal */}
      <PdfExportModal
        isOpen={showPdfModal}
        onClose={() => setShowPdfModal(false)}
        solution={displaySolution}
        language={lang}
        htmlContent={pdfModalHtml || generatePrintableHtml(displaySolution, lang)}
      />
    </div>
  );
};
