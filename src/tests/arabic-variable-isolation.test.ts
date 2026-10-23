import {
  formatEnglishMathForDisplay,
  formatArabicMathForDisplay,
} from '../utils/mathNormalizer.ts';
import { localizeSolution } from '../utils/solutionLocalizer.ts';
import { generatePlotImage } from '../utils/pdfExport.ts';
import { MathSolution, PlotConfig } from '../types/math.ts';

console.log('🧪 Starting Arabic Variable Isolation & Graph In PDF Test Suite...\n');

let passed = 0;
let failed = 0;

function assert(condition: boolean, desc: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${desc}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${desc}`);
    failed++;
  }
}

// ==========================================
// 1. Arabic Words Preservation (No letter corruption)
// ==========================================
console.log('--- 1. Arabic Words Preservation & Isolation ---');

const arabicWords = [
  { word: 'التبسيط', check: (res: string) => !res.includes('x') && res.includes('التبسيط') },
  { word: 'نعوض', check: (res: string) => !res.includes('y') && !res.includes('z') && res.includes('نعوض') },
  { word: 'صحيح', check: (res: string) => !res.includes('y') && res.includes('صحيح') },
  { word: 'معادلة', check: (res: string) => !res.includes('z') && res.includes('معادلة') },
  { word: 'عنصر', check: (res: string) => !res.includes('z') && res.includes('عنصر') },
  { word: 'خاص', check: (res: string) => !res.includes('y') && res.includes('خاص') },
  { word: 'طرح ٤ من الطرفين', check: (res: string) => res.includes('طرح') && res.includes('الطرفين') },
];

for (const item of arabicWords) {
  const result = formatEnglishMathForDisplay(item.word);
  assert(item.check(result), `Word "${item.word}" not corrupted: "${result}"`);
}

// ==========================================
// 2. Real Math Formulas Conversion
// ==========================================
console.log('\n--- 2. Mathematical Formula Conversion ---');

const mathTests = [
  { input: '٢س + ٤ = ١٠', expected: '2x + 4 = 10' },
  { input: 'س = 3', expected: 'x = 3' },
  { input: '2س = 6', expected: '2x = 6' },
  { input: 'س^2 - 4', expected: 'x^2 - 4' },
  { input: '\\frac{س}{2}', expected: '\\frac{x}{2}' },
  { input: '\\text{التبسيط: } 2س = 6', expected: '\\text{التبسيط: } 2x = 6' },
];

for (const t of mathTests) {
  const res = formatEnglishMathForDisplay(t.input);
  assert(res === t.expected, `Formula "${t.input}" -> "${res}" (expected "${t.expected}")`);
}

// ==========================================
// 3. Solution Localizer Prose vs Formula Isolation
// ==========================================
console.log('\n--- 3. Solution Localizer Full Object Test ---');

const dummySolution: MathSolution = {
  id: 'test-1',
  originalQuestion: '٢س + ٤ = ١٠',
  interpretedProblem: 'حل المعادلة الخطية ٢س + ٤ = ١٠',
  category: 'Algebra',
  topic: 'Linear Equations',
  level: 'intermediate',
  style: 'step-by-step',
  language: 'ar',
  assumptions: [],
  timestamp: Date.now(),
  inputMethod: 'text',
  steps: [
    {
      stepNumber: 1,
      title: 'طرح ٤ من الطرفين',
      explanation: 'نطرح العدد ٤ من كلا الطرفين لعزل المتغير س',
      latex: '٢س + ٤ - ٤ = ١٠ - ٤',
    },
    {
      stepNumber: 2,
      title: 'التبسيط',
      explanation: 'التبسيط وإيجاد ناتج الجمع والطرح بدقة',
      latex: '٢س = ٦',
    },
    {
      stepNumber: 3,
      title: 'قسمة الطرفين على ٢',
      explanation: 'نعوض ونقسم الطرفين على معامل س',
      latex: '٢س \\div ٢ = ٦ \\div ٢',
    },
  ],
  finalAnswer: 'س = ٣',
  plainAnswer: 'س = ٣',
  verification: {
    status: 'verified',
    method: 'التعويض المباشر',
    explanation: 'الحل صحيح تماماً لأن ٢(٣) + ٤ = ١٠',
    residual: 0,
  },
};

const localizedEn = localizeSolution(dummySolution, 'en');
assert(localizedEn.steps[0].title === 'Subtract 4 from both sides', 'Step 1 title localized to English');
assert(localizedEn.steps[0].latex === '2x + 4 - 4 = 10 - 4', 'Step 1 LaTeX converted to Western digits & variable x');
assert(localizedEn.steps[1].title === 'Simplification', 'Step 2 title localized to English Simplification');
assert(localizedEn.steps[1].latex === '2x = 6', 'Step 2 LaTeX is 2x = 6');
assert(localizedEn.finalAnswer === 'x = 3', 'Final answer is x = 3');

// If prose has untranslated Arabic text, letters like س, ص, ع must NOT be corrupted:
const customSolution: MathSolution = {
  ...dummySolution,
  steps: [
    {
      stepNumber: 1,
      title: 'دراسة سلوك الدالة وسرعة التغير بدقة',
      explanation: 'نعوض في المعادلة ونتأكد أن الناتج صحيح وعادل',
      latex: 'س = ٥',
    },
  ],
};
const localizedCustom = localizeSolution(customSolution, 'en');
assert(localizedCustom.steps[0].title.includes('دراسة') && localizedCustom.steps[0].title.includes('سلوك'), 'Arabic words with س (دراسة, سلوك) preserved without corruption');
assert(!localizedCustom.steps[0].title.includes('x'), 'Letter x does not leak into Arabic title words');
assert(localizedCustom.steps[0].explanation.includes('نعوض'), 'Arabic word نعوض preserved in custom explanation');
assert(localizedCustom.steps[0].explanation.includes('صحيح'), 'Arabic word صحيح preserved in custom explanation');

// Verify Arabic localization retains Arabic words and variables
const localizedAr = localizeSolution(dummySolution, 'ar');
assert(localizedAr.steps[1].title === 'التبسيط', 'Step 2 title in Arabic is التبسيط without corruption');
assert(localizedAr.finalAnswer === 'س = ٣', 'Final answer in Arabic is س = ٣');

// ==========================================
// 4. Graph Generation for PDF Printing
// ==========================================
console.log('\n--- 4. Graph Generation for PDF Printing ---');

const plot1: PlotConfig = {
  functionLatex: 'f(x) = \\sin(x)',
  functionExpr: 'Math.sin(x)',
  xDomain: [-6, 6],
};
const img1 = generatePlotImage(plot1, 'ar');
assert(img1 !== null && img1.startsWith('data:image/'), 'Math.sin(x) graph generated as data URL');

const plot2: PlotConfig = {
  functionLatex: 'y = x^2 - 4',
  functionExpr: 'x^2 - 4',
  xDomain: [-5, 5],
};
const img2 = generatePlotImage(plot2, 'ar');
assert(img2 !== null && img2.startsWith('data:image/'), 'x^2 - 4 graph generated as data URL');

const plot3: PlotConfig = {
  functionLatex: 'y = 2x + 1',
  functionExpr: 'y = 2*x + 1',
  xDomain: [-10, 10],
};
const img3 = generatePlotImage(plot3, 'en');
assert(img3 !== null && img3.startsWith('data:image/'), 'y = 2*x + 1 graph generated as data URL');

const plotEmpty: PlotConfig = {
  functionLatex: '',
  functionExpr: '',
};
const imgEmpty = generatePlotImage(plotEmpty, 'ar');
assert(imgEmpty === null, 'Empty plotConfig returns null (no blank graph box in PDF)');

console.log(`\n======================================================`);
console.log(`🎉 ALL TESTS COMPLETED: ${passed} Passed, ${failed} Failed`);
console.log(`======================================================`);

if (failed > 0) {
  process.exit(1);
}
