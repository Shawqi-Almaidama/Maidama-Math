import React, { useState } from 'react';
import { 
  History, 
  Bookmark, 
  BookmarkCheck, 
  Trash2, 
  Download, 
  Search, 
  ArrowUpRight, 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles,
  Calendar,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { CalculationHistoryItem } from '../types/math.ts';
import { useLocalization } from '../localization/LocalizationContext.tsx';
import { localizeCategory } from '../utils/solutionLocalizer.ts';

interface HistoryViewProps {
  history: CalculationHistoryItem[];
  onSelectHistoryItem: (item: CalculationHistoryItem, isFromFavorites?: boolean) => void;
  onToggleFavorite: (id: string) => void;
  onClearHistory: () => void;
  language?: 'ar' | 'en';
  initialFilterFavOnly?: boolean;
  onBack?: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  history,
  onSelectHistoryItem,
  onToggleFavorite,
  onClearHistory,
  language: propLanguage,
  initialFilterFavOnly = false,
  onBack,
}) => {
  const { language: ctxLang, t } = useLocalization();
  const lang = propLanguage || ctxLang;
  const isAr = lang === 'ar';

  const [filterFavOnly, setFilterFavOnly] = useState(initialFilterFavOnly);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  React.useEffect(() => {
    setFilterFavOnly(initialFilterFavOnly);
  }, [initialFilterFavOnly]);

  const filteredHistory = history.filter((item) => {
    const matchesFav = !filterFavOnly || item.isFavorite;
    const localizedCat = localizeCategory(item.category, lang);
    const matchesSearch =
      item.problem.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.finalAnswer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      localizedCat.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFav && matchesSearch;
  });

  const exportHistory = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(history, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `maidama_math_history_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
      case 'numerical_approximation':
        return <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Contextual Back Navigation Button */}
      {onBack && (
        <div className="flex items-center justify-start">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-850 transition shadow-xs cursor-pointer"
          >
            {isAr ? <ArrowRight className="w-4 h-4 shrink-0" /> : <ArrowLeft className="w-4 h-4 shrink-0" />}
            <span>{t('nav.backToHome')}</span>
          </button>
        </div>
      )}

      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm transition-colors">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
            {t('history.title')}
          </h3>
          <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-lg font-mono">
            {history.length}
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Favorites filter toggle */}
          <button
            onClick={() => setFilterFavOnly((v) => !v)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition min-h-[36px] ${
              filterFavOnly
                ? 'bg-amber-50 dark:bg-amber-950/70 border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-300 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>{t('history.favoritesOnly')}</span>
          </button>

          {/* Export button */}
          <button
            onClick={exportHistory}
            disabled={history.length === 0}
            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-40 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition text-xs flex items-center justify-center min-w-[36px] min-h-[36px]"
            title={t('history.exportTooltip')}
            aria-label={t('history.exportTooltip')}
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Clear history button */}
          {history.length > 0 && (
            confirmClear ? (
              <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-700 rounded-xl px-2.5 py-1 text-xs">
                <span className="text-rose-700 dark:text-rose-200 text-[11px] font-medium">{t('history.clearConfirm')}</span>
                <button
                  onClick={() => {
                    onClearHistory();
                    setConfirmClear(false);
                  }}
                  className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-[11px] transition shadow"
                  title="Confirm"
                >
                  ✓
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] transition"
                  title="Cancel"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                className="p-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 rounded-xl transition text-xs min-w-[36px] min-h-[36px] flex items-center justify-center"
                title={t('history.clearTooltip')}
                aria-label={t('history.clearTooltip')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute right-3.5 rtl:right-3.5 ltr:left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t('history.searchPlaceholder')}
          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-9 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
        />
      </div>

      {/* History Items List */}
      {filteredHistory.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-slate-400">
          <History className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="text-xs font-medium">
            {t('history.emptyState')}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredHistory.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-900/70 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group"
            >
              <div
                onClick={() => onSelectHistoryItem(item, filterFavOnly)}
                className="flex-1 cursor-pointer space-y-1.5 overflow-hidden w-full"
              >
                {/* Zero-pill metadata with typographic separators */}
                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    {localizeCategory(item.category, lang)}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="flex items-center gap-1 font-mono">
                    <Calendar className="w-3 h-3" />
                    {new Date(item.timestamp).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="flex items-center gap-1">
                    {getStatusIcon(item.verificationStatus)}
                  </span>
                </div>

                <div className="text-xs font-semibold text-slate-900 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition truncate" dir="auto">
                  {item.problem}
                </div>

                <div className="text-xs text-indigo-900 dark:text-indigo-300 font-mono bg-slate-50 dark:bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800/80 inline-block max-w-full truncate" dir="ltr">
                  {t('history.resultPrefix')} {item.finalAnswer}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onToggleFavorite(item.id)}
                  className={`p-2 rounded-xl border transition min-w-[36px] min-h-[36px] flex items-center justify-center ${
                    item.isFavorite
                      ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-600 text-amber-600 dark:text-amber-300'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title={t('solution.favorite')}
                  aria-label={t('solution.favorite')}
                >
                  {item.isFavorite ? <BookmarkCheck className="w-4 h-4 text-amber-500 dark:text-amber-400" /> : <Bookmark className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => onSelectHistoryItem(item, filterFavOnly)}
                  className="px-3.5 py-2 bg-indigo-50 dark:bg-indigo-600/20 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 text-indigo-700 dark:text-indigo-300 rounded-xl border border-indigo-200 dark:border-indigo-600/40 text-xs font-medium flex items-center gap-1.5 transition min-h-[36px]"
                >
                  <span>{t('history.viewSolution')}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 rtl:rotate-90" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
