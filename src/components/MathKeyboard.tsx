import React, { useState } from 'react';
import { MathView } from './MathView.tsx';
import { useLocalization } from '../localization/LocalizationContext.tsx';

interface MathKeyboardProps {
  onInsert: (symbol: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'basic' | 'calculus' | 'symbols' | 'matrices';

export const MathKeyboard: React.FC<MathKeyboardProps> = ({
  onInsert,
  isOpen,
  onClose,
}) => {
  const { language, t } = useLocalization();
  const [activeTab, setActiveTab] = useState<TabType>('basic');

  if (!isOpen) return null;

  const isAr = language === 'ar';

  const tabs: Array<{ id: TabType; name: string }> = [
    { id: 'basic', name: t('keyboard.tabs.basic') },
    { id: 'calculus', name: t('keyboard.tabs.calculus') },
    { id: 'symbols', name: t('keyboard.tabs.symbols') },
    { id: 'matrices', name: t('keyboard.tabs.matrices') },
  ];

  // Basic keys: include Arabic variable keys in Arabic mode
  const basicKeys = isAr
    ? [
        { label: '+', insert: ' + ' },
        { label: '-', insert: ' - ' },
        { label: '×', insert: ' * ' },
        { label: '÷', insert: ' / ' },
        { label: '=', insert: ' = ' },
        { label: 'س', insert: 'س' },
        { label: 'ص', insert: 'ص' },
        { label: 'ع', insert: 'ع' },
        { label: 'ن', insert: 'ن' },
        { label: 'x', insert: 'x' },
        { label: 'y', insert: 'y' },
        { latex: 'x^2', insert: '^2' },
        { latex: 'x^n', insert: '^{' },
        { latex: '\\sqrt{x}', insert: 'sqrt(' },
        { latex: '\\frac{a}{b}', insert: '/' },
        { latex: '(', insert: '(' },
        { latex: ')', insert: ')' },
        { latex: '|x|', insert: 'abs(' },
        { latex: '\\pi', insert: 'pi' },
        { latex: 'e', insert: 'e' },
        { label: '%', insert: '%' },
        { label: '0', insert: '0' },
        { label: '1', insert: '1' },
        { label: '2', insert: '2' },
        { label: '3', insert: '3' },
        { label: '4', insert: '4' },
        { label: '5', insert: '5' },
        { label: '6', insert: '6' },
        { label: '7', insert: '7' },
        { label: '8', insert: '8' },
        { label: '9', insert: '9' },
        { label: '.', insert: '.' },
      ]
    : [
        { label: '+', insert: ' + ' },
        { label: '-', insert: ' - ' },
        { label: '×', insert: ' * ' },
        { label: '÷', insert: ' / ' },
        { label: '=', insert: ' = ' },
        { label: 'x', insert: 'x' },
        { label: 'y', insert: 'y' },
        { label: 'z', insert: 'z' },
        { label: 'n', insert: 'n' },
        { latex: 'x^2', insert: '^2' },
        { latex: 'x^n', insert: '^{' },
        { latex: '\\sqrt{x}', insert: 'sqrt(' },
        { latex: '\\frac{a}{b}', insert: '/' },
        { latex: '(', insert: '(' },
        { latex: ')', insert: ')' },
        { latex: '|x|', insert: 'abs(' },
        { latex: '\\pi', insert: 'pi' },
        { latex: 'e', insert: 'e' },
        { label: '%', insert: '%' },
        { label: '0', insert: '0' },
        { label: '1', insert: '1' },
        { label: '2', insert: '2' },
        { label: '3', insert: '3' },
        { label: '4', insert: '4' },
        { label: '5', insert: '5' },
        { label: '6', insert: '6' },
        { label: '7', insert: '7' },
        { label: '8', insert: '8' },
        { label: '9', insert: '9' },
        { label: '.', insert: '.' },
        { label: ',', insert: ', ' },
      ];

  const calculusKeys = isAr
    ? [
        { latex: '\\frac{d}{dx}', insert: 'مشتقة ' },
        { latex: '\\int', insert: 'تكامل ' },
        { latex: '\\int_a^b', insert: 'تكامل س^2 من 0 إلى 2' },
        { latex: '\\lim_{x\\to a}', insert: 'نهاية عندما س -> 0 ' },
        { latex: '\\sum', insert: 'مجموع ' },
        { label: 'جا(س)', latex: '\\sin(x)', insert: 'جا(' },
        { label: 'جتا(س)', latex: '\\cos(x)', insert: 'جتا(' },
        { label: 'ظا(س)', latex: '\\tan(x)', insert: 'ظا(' },
        { latex: '\\ln(x)', insert: 'ln(' },
        { latex: '\\log_{10}', insert: 'log10(' },
        { latex: 'e^x', insert: 'exp(' },
        { latex: '\\arcsin', insert: 'asin(' },
        { latex: '\\arccos', insert: 'acos(' },
        { latex: '\\arctan', insert: 'atan(' },
        { latex: 'f\'(x)', insert: '\' ' },
        { latex: '\\infty', insert: '∞' },
      ]
    : [
        { latex: '\\frac{d}{dx}', insert: 'd/dx of ' },
        { latex: '\\int', insert: 'integrate ' },
        { latex: '\\int_a^b', insert: 'integrate f(x) from a to b' },
        { latex: '\\lim_{x\\to a}', insert: 'lim as x -> ' },
        { latex: '\\sum', insert: 'sum of ' },
        { latex: '\\sin(x)', insert: 'sin(' },
        { latex: '\\cos(x)', insert: 'cos(' },
        { latex: '\\tan(x)', insert: 'tan(' },
        { latex: '\\ln(x)', insert: 'ln(' },
        { latex: '\\log_{10}', insert: 'log10(' },
        { latex: 'e^x', insert: 'exp(' },
        { latex: '\\arcsin', insert: 'asin(' },
        { latex: '\\arccos', insert: 'acos(' },
        { latex: '\\arctan', insert: 'atan(' },
        { latex: 'f\'(x)', insert: '\' ' },
        { latex: '\\infty', insert: 'infinity' },
      ];

  const symbolKeys = [
    { latex: '<', insert: ' < ' },
    { latex: '>', insert: ' > ' },
    { latex: '\\le', insert: ' <= ' },
    { latex: '\\ge', insert: ' >= ' },
    { latex: '\\ne', insert: ' != ' },
    { latex: '\\approx', insert: ' ~= ' },
    { latex: '\\pm', insert: ' +/- ' },
    { latex: '\\theta', insert: 'theta' },
    { latex: '\\alpha', insert: 'alpha' },
    { latex: '\\beta', insert: 'beta' },
    { latex: '\\Delta', insert: 'Delta' },
    { latex: '\\lambda', insert: 'lambda' },
    { latex: '\\in', insert: ' in ' },
    { latex: '\\subset', insert: ' subset ' },
    { latex: '[', insert: '[' },
    { latex: ']', insert: ']' },
  ];

  const matrixKeys = [
    {
      latex: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}',
      insert: '[[a, b], [c, d]]',
      labelDesc: t('keyboard.matrix2x2'),
    },
    {
      latex: '\\begin{bmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{bmatrix}',
      insert: '[[1, 0, 0], [0, 1, 0], [0, 0, 1]]',
      labelDesc: t('keyboard.matrix3x3'),
    },
    { latex: '\\det(A)', insert: isAr ? 'محدد [[2, 1], [5, 3]]' : 'det([[2, 1], [5, 3]])' },
    { latex: 'A^{-1}', insert: isAr ? 'معكوس [[2, 1], [5, 3]]' : 'inv([[2, 1], [5, 3]])' },
    { latex: '\\vec{v}', insert: '[x, y, z]' },
    { latex: 'A \\times B', insert: isAr ? 'ضرب مصفوفات: [[1, 2], [3, 4]] * [[5, 6], [7, 8]]' : 'multiply: [[1, 2], [3, 4]] * [[5, 6], [7, 8]]' },
  ];

  const currentKeys = {
    basic: basicKeys,
    calculus: calculusKeys,
    symbols: symbolKeys,
    matrices: matrixKeys,
  }[activeTab];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-indigo-900/60 rounded-2xl p-3 shadow-lg dark:shadow-2xl transition-all duration-200 mt-2">
      {/* Keyboard Header & Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 mb-3">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-xl transition whitespace-nowrap min-h-[36px] ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-xs px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl transition min-w-[32px] min-h-[32px] flex items-center justify-center"
          title={t('keyboard.closeTooltip')}
          aria-label={t('keyboard.closeTooltip')}
        >
          ✕
        </button>
      </div>

      {/* Keys Grid */}
      <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-1.5 max-h-56 overflow-y-auto p-1">
        {currentKeys.map((key, i) => (
          <button
            key={i}
            onClick={() => onInsert(key.insert)}
            className="flex items-center justify-center p-2 min-h-[42px] bg-slate-100 hover:bg-indigo-600 active:scale-95 text-slate-800 hover:text-white dark:bg-slate-800 dark:hover:bg-indigo-600/70 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-700/60 hover:border-indigo-500 transition-all text-sm font-medium shadow-xs group"
          >
            {key.latex ? (
              <MathView math={key.latex} className="text-sm group-hover:text-white dark:group-hover:text-white" />
            ) : (
              <span className="font-mono text-sm">{'label' in key ? (key as any).label : ''}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
