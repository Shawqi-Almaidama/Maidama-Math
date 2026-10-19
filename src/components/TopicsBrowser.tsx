import React, { useState } from 'react';
import { 
  Calculator, 
  Variable, 
  TrendingUp, 
  Shapes, 
  Grid, 
  BarChart2, 
  HelpCircle, 
  ArrowUpRight, 
  CheckCircle,
  Search,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { MathCategory } from '../types/math.ts';
import { useLocalization } from '../localization/LocalizationContext.tsx';

interface TopicsBrowserProps {
  categories: MathCategory[];
  onSelectExample: (query: string, categoryId?: string) => void;
  language?: 'ar' | 'en';
  initialCategoryId?: string;
  onBack?: () => void;
}

export const TopicsBrowser: React.FC<TopicsBrowserProps> = ({
  categories,
  onSelectExample,
  language: propLanguage,
  initialCategoryId,
  onBack,
}) => {
  const { language: ctxLang, t } = useLocalization();
  const lang = propLanguage || ctxLang;
  const isAr = lang === 'ar';

  const [searchFilter, setSearchFilter] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<string>(initialCategoryId || 'all');

  React.useEffect(() => {
    if (initialCategoryId) {
      setSelectedCatId(initialCategoryId);
    }
  }, [initialCategoryId]);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Calculator': return <Calculator className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />;
      case 'Variable': return <Variable className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case 'TrendingUp': return <TrendingUp className="w-5 h-5 text-sky-600 dark:text-sky-400" />;
      case 'Shapes': return <Shapes className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      case 'Grid': return <Grid className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
      case 'BarChart2': return <BarChart2 className="w-5 h-5 text-pink-600 dark:text-pink-400" />;
      case 'HelpCircle': return <HelpCircle className="w-5 h-5 text-teal-600 dark:text-teal-400" />;
      default: return <Calculator className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />;
    }
  };

  const filteredCategories = categories.filter((cat) => {
    const matchesFilter = selectedCatId === 'all' || cat.id === selectedCatId;
    const matchesSearch =
      cat.nameAr.toLowerCase().includes(searchFilter.toLowerCase()) ||
      cat.nameEn.toLowerCase().includes(searchFilter.toLowerCase()) ||
      cat.descriptionAr.toLowerCase().includes(searchFilter.toLowerCase()) ||
      cat.descriptionEn.toLowerCase().includes(searchFilter.toLowerCase()) ||
      cat.examples.some((ex) =>
        ex.titleAr.toLowerCase().includes(searchFilter.toLowerCase()) ||
        ex.titleEn.toLowerCase().includes(searchFilter.toLowerCase()) ||
        ex.query.toLowerCase().includes(searchFilter.toLowerCase())
      );
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-5">
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

      {/* Search & Topic filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm transition-colors">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 rtl:right-3.5 ltr:left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder={t('topics.searchPlaceholder')}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-9 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Filter controls */}
        <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 items-center">
          <button
            onClick={() => setSelectedCatId('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-xl transition whitespace-nowrap min-h-[36px] flex items-center ${
              selectedCatId === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {t('topics.allTopics')}
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCatId(c.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-xl transition whitespace-nowrap min-h-[36px] flex items-center ${
                selectedCatId === c.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {isAr ? c.nameAr : c.nameEn}
            </button>
          ))}
        </div>
      </div>

      {/* Category Drilldown Back Banner */}
      {selectedCatId !== 'all' && (
        <div className="flex items-center justify-between bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 rounded-2xl p-3 px-4 shadow-xs transition-all">
          <div className="flex items-center gap-2 text-xs text-indigo-950 dark:text-indigo-200">
            <span className="font-bold text-slate-600 dark:text-slate-400">
              {isAr ? 'الفرع الرياضي المعروض:' : 'Selected Discipline:'}
            </span>
            <span className="font-bold text-indigo-700 dark:text-indigo-300">
              {isAr ? categories.find((c) => c.id === selectedCatId)?.nameAr : categories.find((c) => c.id === selectedCatId)?.nameEn}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setSelectedCatId('all')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 transition shadow-2xs"
          >
            {isAr ? <ArrowRight className="w-3.5 h-3.5 shrink-0" /> : <ArrowLeft className="w-3.5 h-3.5 shrink-0" />}
            <span>{t('nav.backToAllTopics')}</span>
          </button>
        </div>
      )}

      {/* Categories Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCategories.map((cat) => (
          <div
            key={cat.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-900/60 rounded-2xl p-5 shadow-sm hover:shadow-md flex flex-col justify-between transition-all"
          >
            <div>
              {/* Category Header */}
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm">
                    {getIcon(cat.icon)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {isAr ? cat.nameAr : cat.nameEn}
                    </h4>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {isAr ? cat.nameEn : cat.nameAr}
                    </span>
                  </div>
                </div>

                {/* Quiet unboxed metadata per Zero-Pill discipline */}
                <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{t('topics.supportedBadge')}</span>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                {isAr ? cat.descriptionAr : cat.descriptionEn}
              </p>
            </div>

            {/* Curated Example Items */}
            <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                {t('topics.exampleProblemsHeader')}
              </span>
              <div className="flex flex-col gap-1.5">
                {cat.examples.map((ex, i) => {
                  const exampleQuery = isAr ? (ex.queryAr || ex.query) : (ex.queryEn || ex.query);
                  const isArabicText = isAr && /[ء-ي]/.test(exampleQuery);
                  return (
                    <button
                      key={i}
                      onClick={() => onSelectExample(exampleQuery, cat.id)}
                      className="flex items-center justify-between text-left rtl:text-right p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50/70 dark:bg-slate-950/70 dark:hover:bg-indigo-950/40 border border-slate-200/80 hover:border-indigo-300 dark:border-slate-800/80 dark:hover:border-indigo-700/60 text-xs transition group"
                    >
                      <div className="flex flex-col min-w-0 flex-1 pr-2 rtl:pr-0 rtl:pl-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition">
                          {isAr ? ex.titleAr : ex.titleEn}
                        </span>
                        <span
                          className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5"
                          dir={isArabicText ? 'rtl' : 'ltr'}
                        >
                          {exampleQuery}
                        </span>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition shrink-0 rtl:rotate-90" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
