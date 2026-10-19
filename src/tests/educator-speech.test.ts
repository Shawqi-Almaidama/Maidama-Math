import {
  formatMathForSpeech,
  getPedagogicalIntro,
  buildSolutionSpeechScript,
} from '../utils/textToSpeech.ts';
import { MathSolution } from '../types/math.ts';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${msg}`);
    process.exit(1);
  } else {
    console.log(`  ✅ [PASS] ${msg}`);
  }
}

console.log('🧪 Starting Educator Text-to-Speech & Voice Explanation Test Suite...');

// --- 1. Arabic Mathematical Formulations & Speech Formatting ---
console.log('\n--- 1. Arabic Mathematical Speech Formatting ---');

const arFractions = formatMathForSpeech('\\frac{3}{4} + \\frac{1}{2}', 'ar');
assert(arFractions.includes('الكسر 3 على 4') || arFractions.includes('3 على 4'), 'Arabic fraction format');
assert(arFractions.includes('النصف'), 'Arabic 1/2 converted to النصف');

const arRoots = formatMathForSpeech('\\sqrt{x^2 + 9}', 'ar');
assert(arRoots.includes('الجذر التربيعي لـ'), 'Arabic square root converted');
assert(arRoots.includes('تربيع'), 'Arabic power 2 converted to تربيع');

const arCalculus = formatMathForSpeech('\\frac{d}{dx} \\sin(x) = \\cos(x)', 'ar');
assert(arCalculus.includes('المشتقة بالنسبة إلى س'), 'Arabic derivative pronunciation');
assert(arCalculus.includes('جيب'), 'Arabic sin pronunciation');
assert(arCalculus.includes('جيب تمام'), 'Arabic cos pronunciation');

const arIntegrals = formatMathForSpeech('\\int_0^2 x^2 dx', 'ar');
assert(arIntegrals.includes('التكامل المحدود من 0 إلى 2'), 'Arabic definite integral pronunciation');

const arLimits = formatMathForSpeech('\\lim_{x \\to 0} \\frac{\\sin(x)}{x}', 'ar');
assert(arLimits.includes('نهاية الدالة عندما يقترب'), 'Arabic limit pronunciation');

// --- 2. English Mathematical Formulations & Speech Formatting ---
console.log('\n--- 2. English Mathematical Speech Formatting ---');

const enFractions = formatMathForSpeech('\\frac{3}{4} + \\frac{1}{2}', 'en');
assert(enFractions.includes('3 over 4'), 'English fraction format');
assert(enFractions.includes('one half'), 'English 1/2 converted to one half');

const enRoots = formatMathForSpeech('\\sqrt{x^2 + 9}', 'en');
assert(enRoots.includes('square root of'), 'English square root converted');
assert(enRoots.includes('squared'), 'English power 2 converted to squared');

const enCalculus = formatMathForSpeech('\\frac{d}{dx} \\sin(x) = \\cos(x)', 'en');
assert(enCalculus.includes('derivative with respect to x'), 'English derivative pronunciation');
assert(enCalculus.includes('sine of'), 'English sine pronunciation');
assert(enCalculus.includes('cosine of'), 'English cosine pronunciation');

// --- 3. Pedagogical Introductions (Teacher & Broadcaster) ---
console.log('\n--- 3. Pedagogical Introductions (Category-Aware) ---');

const calculusSolution: MathSolution = {
  id: 'sol-calc-1',
  originalQuestion: 'd/dx of x^3 + 5',
  interpretedLatex: '\\frac{d}{dx}(x^3 + 5)',
  category: 'Calculus',
  topic: 'Derivatives',
  style: 'step-by-step',
  level: 'intermediate',
  language: 'ar',
  assumptions: ['x \\in \\mathbb{R}'],
  formulaUsed: '\\frac{d}{dx}[x^n] = n x^{n-1}',
  steps: [
    {
      stepNumber: 1,
      title: 'تطبيق قاعدة القوة',
      mathLatex: '3x^2',
      explanation: 'نشتق الحد الأول بضرب المعامل بالأس وطرح واحد من الأس.',
    },
    {
      stepNumber: 2,
      title: 'مشتقة الثابت',
      mathLatex: '0',
      explanation: 'مشتقة العدد الثابت خمسة تساوي صفراً.',
    },
  ],
  finalAnswer: '3x^2',
  plainAnswer: '3x^2',
  verification: { status: 'verified', residual: 0 },
  inputMethod: 'text',
};

const introArCalc = getPedagogicalIntro(calculusSolution, 'ar');
assert(introArCalc.includes('التفاضل والتكامل'), 'Arabic calculus intro identifies calculus context');
assert(introArCalc.includes('بهدوء وتركيز') || introArCalc.includes('خطوة بخطوة'), 'Pedagogical calm teacher tone present in Arabic intro');

const introEnCalc = getPedagogicalIntro(calculusSolution, 'en');
assert(introEnCalc.includes('calculus'), 'English calculus intro identifies calculus context');
assert(introEnCalc.includes('calm') || introEnCalc.includes('step-by-step'), 'Pedagogical calm teacher tone present in English intro');

// --- 4. Complete Speech Script Generation ---
console.log('\n--- 4. Complete Educational Broadcaster Speech Script ---');

const arScript = buildSolutionSpeechScript(calculusSolution, 'ar');
assert(arScript.length >= 5, 'Script contains intro, problem, formula, assumptions, steps, final answer');

const introSeg = arScript.find((s) => s.kind === 'intro');
assert(!!introSeg && introSeg.text.length > 20, 'Intro segment created');

const problemSeg = arScript.find((s) => s.kind === 'problem');
assert(!!problemSeg && problemSeg.text.includes('نص المسألة المطلوب حلها'), 'Problem statement segment formatted');

const formulaSeg = arScript.find((s) => s.kind === 'formula');
assert(!!formulaSeg && formulaSeg.text.includes('القاعدة الرياضية الأساسية'), 'Formula segment formatted');

const step1Seg = arScript.find((s) => s.id === 'step-1');
assert(!!step1Seg && step1Seg.text.includes('نبدأ بالخطوة الأولى'), 'Step 1 has pedagogical transitional opener');

const step2Seg = arScript.find((s) => s.id === 'step-2');
assert(!!step2Seg && step2Seg.text.includes('الخطوة الثانية'), 'Step 2 has pedagogical connector');

const finalSeg = arScript.find((s) => s.kind === 'final');
assert(!!finalSeg && finalSeg.text.includes('النتيجة النهائية المؤكدة'), 'Final answer conclusion formulated');
assert(finalSeg!.text.includes('أحسنت المتابعة والتركيز'), 'Encouraging teacher closing remark present');

// --- 5. English Speech Script Verification ---
console.log('\n--- 5. English Speech Script Verification ---');

const enScript = buildSolutionSpeechScript(calculusSolution, 'en');
const enStep1 = enScript.find((s) => s.id === 'step-1');
assert(!!enStep1 && enStep1.text.includes('We begin with step one'), 'English step 1 transitional opener');
const enFinal = enScript.find((s) => s.kind === 'final');
assert(!!enFinal && enFinal.text.includes('verified final answer'), 'English final answer closing');

console.log('\n======================================================');
console.log('🎉 ALL EDUCATOR TEXT-TO-SPEECH TESTS PASSED PERFECTLY!');
console.log('======================================================\n');
