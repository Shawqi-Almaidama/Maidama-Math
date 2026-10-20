import { MathSolution } from '../types/math.ts';

/**
 * Voice quality categorization metadata for educational broadcaster presentation.
 */
export interface VoiceInfo {
  voice: SpeechSynthesisVoice;
  displayName: string;
  badgeText: string;
  isHighQuality: boolean;
  isLocal: boolean;
}

/**
 * Transforms raw mathematical LaTeX and explanation text into articulate, natural spoken words.
 * Formatted specifically for a calm mathematics educator and educational broadcaster.
 */
export function formatMathForSpeech(rawText: string, lang: 'ar' | 'en'): string {
  if (!rawText) return '';
  let speech = rawText;

  // 1. Clean Markdown markers and code formatting
  speech = speech.replace(/\*\*\*([^*]+)\*\*\*/g, '$1');
  speech = speech.replace(/\*\*([^*]+)\*\*/g, '$1');
  speech = speech.replace(/\*([^*]+)\*/g, '$1');
  speech = speech.replace(/_([^_]+)_/g, '$1');
  speech = speech.replace(/^#{1,6}\s+/gm, '');
  speech = speech.replace(/`([^`]+)`/g, '$1');
  speech = speech.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // links

  // 2. Normalize common mathematical brackets
  speech = speech.replace(/\\left\(/g, '(').replace(/\\right\)/g, ')');
  speech = speech.replace(/\\left\[/g, '[').replace(/\\right\]/g, ']');
  speech = speech.replace(/\\left\\\{/g, '{').replace(/\\right\\\}/g, '}');

  if (lang === 'ar') {
    // --- ARABIC MATHEMATICAL PHRASING (أستاذ رياضيات هادئ ومتقن) ---

    // Calculus: Derivatives & Partial Derivatives (must run before generic \frac)
    speech = speech.replace(/\\frac\{d\}\{dx\}/g, ' المشتقة بالنسبة إلى س ');
    speech = speech.replace(/\\frac\{d\^2\}\{dx\^2\}/g, ' المشتقة الثانية بالنسبة إلى س ');
    speech = speech.replace(/\\frac\{\\partial\}\{\\partial x\}/g, ' المشتقة الجزئية بالنسبة إلى س ');
    speech = speech.replace(/\\frac\{df\}\{dx\}/g, ' مشتقة الدالة إف بالنسبة إلى س ');
    speech = speech.replace(/\\frac\{dy\}\{dx\}/g, ' مشتقة واي بالنسبة إلى س ');
    speech = speech.replace(/\bd\/dx\b/g, ' المشتقة بالنسبة إلى س ');
    speech = speech.replace(/f''\(([^)]+)\)/g, ' المشتقة الثانية للدالة عند $1 ');
    speech = speech.replace(/f'\(([^)]+)\)/g, ' المشتقة الأولى للدالة عند $1 ');

    // Fractions: \frac{a}{b} -> الكسر: a مقسوماً على b
    speech = speech.replace(/\\frac\{1\}\{2\}/g, ' النصف ');
    speech = speech.replace(/\\frac\{1\}\{3\}/g, ' الثلث ');
    speech = speech.replace(/\\frac\{1\}\{4\}/g, ' الربع ');
    speech = speech.replace(/\\frac\{1\}\{([^}]+)\}/g, ' واحد على $1 ');
    speech = speech.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, ' الكسر $1 على $2 ');

    // Roots
    speech = speech.replace(/\\sqrt\[3\]\{([^}]+)\}/g, ' الجذر التكعيبي لـ $1 ');
    speech = speech.replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, ' الجذر النوني $1 لـ $2 ');
    speech = speech.replace(/\\sqrt\{([^}]+)\}/g, ' الجذر التربيعي لـ $1 ');

    // Calculus: Integrals
    speech = speech.replace(/\\int_\{?([^}^_]+)\}?\^\{?([^}]+)\}?/g, ' التكامل المحدود من $1 إلى $2 لـ ');
    speech = speech.replace(/\\int/g, ' التكامل ');

    // Limits
    speech = speech.replace(/\\lim_\{?([a-zA-Z\u0621-\u064A]+)\s*\\to\s*([^}]+)\}?/g, ' نهاية الدالة عندما يقترب $1 من $2 ');
    speech = speech.replace(/\\lim_\{?([^}]+)\}?/g, ' نهاية عندما $1 ');

    // Summation
    speech = speech.replace(/\\sum_\{?([^}^_]+)\}?\^\{?([^}]+)\}?/g, ' مجموع الحدود من $1 إلى $2 ');
    speech = speech.replace(/\\sum/g, ' المجموع ');

    // Trigonometric functions
    speech = speech.replace(/\\sin/g, ' جيب ');
    speech = speech.replace(/\\cos/g, ' جيب تمام ');
    speech = speech.replace(/\\tan/g, ' ظل ');
    speech = speech.replace(/\\cot/g, ' ظل تمام ');
    speech = speech.replace(/\\sec/g, ' قاطع ');
    speech = speech.replace(/\\csc/g, ' قاطع تمام ');
    speech = speech.replace(/\\arcsin/g, ' معكوس الجيب ');
    speech = speech.replace(/\\arccos/g, ' معكوس جيب التمام ');
    speech = speech.replace(/\\arctan/g, ' معكوس الظل ');

    // Logarithms and exponentials
    speech = speech.replace(/\\ln\(([^)]+)\)/g, ' اللوغاريتم الطبيعي لـ $1 ');
    speech = speech.replace(/\\ln/g, ' اللوغاريتم الطبيعي ');
    speech = speech.replace(/\\log_\{?([^}]+)\}?/g, ' لوغاريتم الأساس $1 لـ ');
    speech = speech.replace(/\\log/g, ' اللوغاريتم ');
    speech = speech.replace(/e\^\{?([^}]+)\}?/g, ' هاء مرفوعة للأس $1 ');

    // Powers & Exponents
    speech = speech.replace(/([a-zA-Z\u0621-\u064A0-9])\^2\b/g, '$1 تربيع');
    speech = speech.replace(/([a-zA-Z\u0621-\u064A0-9])\^3\b/g, '$1 تكعيب');
    speech = speech.replace(/([a-zA-Z\u0621-\u064A0-9])\^\{?([^}]+)\}?/g, '$1 أس $2');

    // Matrix and vectors
    speech = speech.replace(/\\begin\{[bpvV]?matrix\}([\s\S]*?)\\end\{[bpvV]?matrix\}/g, ' مصفوفة من العناصر المحددة ');
    speech = speech.replace(/\\det/g, ' محدد المصفوفة ');
    speech = speech.replace(/\\vec\{([^}]+)\}/g, ' المتجه $1 ');

    // Mathematical symbols and relations
    speech = speech.replace(/\\cdot|\\times|\*/g, ' ضرب ');
    speech = speech.replace(/\\div/g, ' مقسوماً على ');
    speech = speech.replace(/\\pm/g, ' زائد أو ناقص ');
    speech = speech.replace(/\\mp/g, ' ناقص أو زائد ');
    speech = speech.replace(/\\leq|\\le/g, ' أصغر من أو يساوي ');
    speech = speech.replace(/\\geq|\\ge/g, ' أكبر من أو يساوي ');
    speech = speech.replace(/\\neq/g, ' لا يساوي ');
    speech = speech.replace(/\\approx/g, ' يساوي تقريباً ');
    speech = speech.replace(/\\equiv/g, ' يتطابق مع ');
    speech = speech.replace(/=/g, ' يساوي ');
    speech = speech.replace(/</g, ' أصغر من ');
    speech = speech.replace(/>/g, ' أكبر من ');
    speech = speech.replace(/\+/g, ' زائد ');
    speech = speech.replace(/-/g, ' ناقص ');
    speech = speech.replace(/\//g, ' على ');

    // Greek letters & constants
    speech = speech.replace(/\\pi/g, ' باي ');
    speech = speech.replace(/\\theta/g, ' ثيتا ');
    speech = speech.replace(/\\alpha/g, ' ألفا ');
    speech = speech.replace(/\\beta/g, ' بيتا ');
    speech = speech.replace(/\\gamma/g, ' غاما ');
    speech = speech.replace(/\\Delta|\\delta/g, ' دلتا ');
    speech = speech.replace(/\\lambda/g, ' لامدا ');
    speech = speech.replace(/\\sigma/g, ' سيغما ');
    speech = speech.replace(/\\omega/g, ' أوميغا ');
    speech = speech.replace(/\\infty/g, ' ما لا نهاية ');

    // Logic and sets
    speech = speech.replace(/\\in/g, ' ينتمي إلى ');
    speech = speech.replace(/\\notin/g, ' لا ينتمي إلى ');
    speech = speech.replace(/\\subset/g, ' مجموعة جزئية من ');
    speech = speech.replace(/\\cup/g, ' اتحاد ');
    speech = speech.replace(/\\cap/g, ' تقاطع ');
    speech = speech.replace(/\\forall/g, ' لكل ');
    speech = speech.replace(/\\exists/g, ' يوجد ');

    // Remove remaining LaTeX commands and formatting artifacts
    speech = speech.replace(/\\text\{([^}]+)\}/g, ' $1 ');
    speech = speech.replace(/\\mathrm\{([^}]+)\}/g, ' $1 ');
    speech = speech.replace(/\\mathbf\{([^}]+)\}/g, ' $1 ');
    speech = speech.replace(/\\[a-zA-Z]+/g, ' ');
    speech = speech.replace(/[{}]/g, ' ');
    speech = speech.replace(/\$+/g, ' ');

  } else {
    // --- ENGLISH MATHEMATICAL PHRASING (Clear Educational Broadcaster) ---

    // Calculus: Derivatives & Partial Derivatives (must run before generic \frac)
    speech = speech.replace(/\\frac\{d\}\{dx\}/g, ' the derivative with respect to x ');
    speech = speech.replace(/\\frac\{d\^2\}\{dx\^2\}/g, ' the second derivative with respect to x ');
    speech = speech.replace(/\\frac\{\\partial\}\{\\partial x\}/g, ' the partial derivative with respect to x ');
    speech = speech.replace(/\\frac\{df\}\{dx\}/g, ' the derivative of f with respect to x ');
    speech = speech.replace(/\\frac\{dy\}\{dx\}/g, ' the derivative of y with respect to x ');
    speech = speech.replace(/\bd\/dx\b/g, ' the derivative with respect to x ');
    speech = speech.replace(/f''\(([^)]+)\)/g, ' second derivative of f at $1 ');
    speech = speech.replace(/f'\(([^)]+)\)/g, ' first derivative of f at $1 ');

    // Fractions
    speech = speech.replace(/\\frac\{1\}\{2\}/g, ' one half ');
    speech = speech.replace(/\\frac\{1\}\{3\}/g, ' one third ');
    speech = speech.replace(/\\frac\{1\}\{4\}/g, ' one fourth ');
    speech = speech.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, ' $1 over $2 ');

    // Roots
    speech = speech.replace(/\\sqrt\[3\]\{([^}]+)\}/g, ' the cube root of $1 ');
    speech = speech.replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, ' the $1th root of $2 ');
    speech = speech.replace(/\\sqrt\{([^}]+)\}/g, ' the square root of $1 ');

    // Integrals & Limits
    speech = speech.replace(/\\int_\{?([^}^_]+)\}?\^\{?([^}]+)\}?/g, ' the definite integral from $1 to $2 of ');
    speech = speech.replace(/\\int/g, ' the integral of ');
    speech = speech.replace(/\\lim_\{?([a-zA-Z]+)\s*\\to\s*([^}]+)\}?/g, ' the limit as $1 approaches $2 of ');
    speech = speech.replace(/\\lim_\{?([^}]+)\}?/g, ' the limit as $1 of ');

    // Summations
    speech = speech.replace(/\\sum_\{?([^}^_]+)\}?\^\{?([^}]+)\}?/g, ' the sum from $1 to $2 of ');
    speech = speech.replace(/\\sum/g, ' the sum ');

    // Trigonometric functions
    speech = speech.replace(/\\sin/g, ' sine of ');
    speech = speech.replace(/\\cos/g, ' cosine of ');
    speech = speech.replace(/\\tan/g, ' tangent of ');
    speech = speech.replace(/\\cot/g, ' cotangent of ');
    speech = speech.replace(/\\sec/g, ' secant of ');
    speech = speech.replace(/\\csc/g, ' cosecant of ');
    speech = speech.replace(/\\arcsin/g, ' arcsine of ');
    speech = speech.replace(/\\arccos/g, ' arccosine of ');
    speech = speech.replace(/\\arctan/g, ' arctangent of ');

    // Logarithms
    speech = speech.replace(/\\ln\(([^)]+)\)/g, ' natural log of $1 ');
    speech = speech.replace(/\\ln/g, ' natural log of ');
    speech = speech.replace(/\\log_\{?([^}]+)\}?/g, ' log base $1 of ');
    speech = speech.replace(/\\log/g, ' log of ');
    speech = speech.replace(/e\^\{?([^}]+)\}?/g, ' e to the power of $1 ');

    // Powers
    speech = speech.replace(/([a-zA-Z0-9])\^2\b/g, '$1 squared');
    speech = speech.replace(/([a-zA-Z0-9])\^3\b/g, '$1 cubed');
    speech = speech.replace(/([a-zA-Z0-9])\^\{?([^}]+)\}?/g, '$1 to the power of $2');

    // Matrix
    speech = speech.replace(/\\begin\{[bpvV]?matrix\}([\s\S]*?)\\end\{[bpvV]?matrix\}/g, ' matrix elements ');
    speech = speech.replace(/\\det/g, ' determinant of ');
    speech = speech.replace(/\\vec\{([^}]+)\}/g, ' vector $1 ');

    // Operators & Relations
    speech = speech.replace(/\\cdot|\\times|\*/g, ' times ');
    speech = speech.replace(/\\div/g, ' divided by ');
    speech = speech.replace(/\\pm/g, ' plus or minus ');
    speech = speech.replace(/\\mp/g, ' minus or plus ');
    speech = speech.replace(/\\leq|\\le/g, ' less than or equal to ');
    speech = speech.replace(/\\geq|\\ge/g, ' greater than or equal to ');
    speech = speech.replace(/\\neq/g, ' is not equal to ');
    speech = speech.replace(/\\approx/g, ' is approximately ');
    speech = speech.replace(/=/g, ' equals ');
    speech = speech.replace(/</g, ' is less than ');
    speech = speech.replace(/>/g, ' is greater than ');
    speech = speech.replace(/\+/g, ' plus ');
    speech = speech.replace(/-/g, ' minus ');
    speech = speech.replace(/\//g, ' divided by ');

    // Greek & constants
    speech = speech.replace(/\\pi/g, ' pi ');
    speech = speech.replace(/\\theta/g, ' theta ');
    speech = speech.replace(/\\alpha/g, ' alpha ');
    speech = speech.replace(/\\beta/g, ' beta ');
    speech = speech.replace(/\\gamma/g, ' gamma ');
    speech = speech.replace(/\\Delta|\\delta/g, ' delta ');
    speech = speech.replace(/\\lambda/g, ' lambda ');
    speech = speech.replace(/\\infty/g, ' infinity ');

    // Clean remaining LaTeX
    speech = speech.replace(/\\text\{([^}]+)\}/g, ' $1 ');
    speech = speech.replace(/\\mathrm\{([^}]+)\}/g, ' $1 ');
    speech = speech.replace(/\\mathbf\{([^}]+)\}/g, ' $1 ');
    speech = speech.replace(/\\[a-zA-Z]+/g, ' ');
    speech = speech.replace(/[{}]/g, ' ');
    speech = speech.replace(/\$+/g, ' ');
  }

  // Normalize excessive spaces and clean punctuation
  speech = speech.replace(/\s+/g, ' ').trim();
  // Ensure appropriate sentence pauses
  speech = speech.replace(/([.!?])\s*/g, '$1 ');

  return speech;
}

/**
 * Generates an inspiring, calm pedagogical introduction tailored specifically
 * to the mathematical domain of the problem, avoiding robotic repetition.
 */
export function getPedagogicalIntro(solution: MathSolution, lang: 'ar' | 'en'): string {
  const categoryLower = (solution.category || '').toLowerCase();
  const questionLower = (solution.originalQuestion || '').toLowerCase();

  const isCalculus =
    categoryLower.includes('calculus') ||
    categoryLower.includes('تفاضل') ||
    categoryLower.includes('تكامل') ||
    questionLower.includes('derive') ||
    questionLower.includes('integral') ||
    questionLower.includes('d/dx') ||
    questionLower.includes('مشتق');

  const isLinearAlgebra =
    categoryLower.includes('linear') ||
    categoryLower.includes('matrix') ||
    categoryLower.includes('مصفوف') ||
    categoryLower.includes('جبر خطي') ||
    questionLower.includes('matrix') ||
    questionLower.includes('det');

  const isAlgebra =
    categoryLower.includes('algebra') ||
    categoryLower.includes('جبر') ||
    categoryLower.includes('معادل') ||
    questionLower.includes('solve') ||
    questionLower.includes('حل');

  const isGeometry =
    categoryLower.includes('geometry') ||
    categoryLower.includes('trigonometry') ||
    categoryLower.includes('هندس') ||
    categoryLower.includes('مثلث');

  const isStatistics =
    categoryLower.includes('statistics') ||
    categoryLower.includes('إحصاء') ||
    categoryLower.includes('احتمال');

  if (lang === 'ar') {
    if (isCalculus) {
      return 'أهلاً بك! في هذه المسألة سنتناول قواعد التفاضل والتكامل بهدوء وتركيز. سنبدأ بفحص بنية الدالة، ثم نطبق قواعد الاشتقاق أو التكامل المناسبة خطوة بخطوة، ونراجع النتيجة المؤكدة.';
    }
    if (isLinearAlgebra) {
      return 'أهلاً بك! لدينا مسألة في الجبر الخطي والمصفوفات. سنقوم معاً بتتبع العمليات المصفوفية وحساب المحددات بمنهجية رياضية دقيقة حتى نصل للإجابة النهائية.';
    }
    if (isGeometry) {
      return 'مرحباً بك! سنستعرض معاً معطيات هذه المسألة الهندسية ونحدد النظريات والمتطابقات المثلثية اللازمة للحل بدقة ووضوح.';
    }
    if (isStatistics) {
      return 'أهلاً بك! سنحلل هذه البيانات الإحصائية خطوة بخطوة، ونحسب المؤشرات المطلوبة بهدوء وتنظيم حتى نتحقق من النتائج.';
    }
    if (isAlgebra) {
      return 'أهلاً بك! دعنا نحل هذه المسألة الجبرية معاً خطوة بخطوة. سنبدأ بفهم المعطيات، ثم نحدد القاعدة الرياضية المناسبة، ونبسط الأطراف لنصل إلى الحل الدقيق.';
    }
    return 'أهلاً بك! دعنا نحل هذه المسألة معاً خطوة بخطوة. سنبدأ بفهم المعطيات، ثم نحدد القاعدة الرياضية المناسبة، وبعدها نطبقها ونراجع النتيجة النهائية.';
  } else {
    if (isCalculus) {
      return 'Welcome! In this problem, we will explore calculus concepts with calm and precision. We will examine the function structure, apply the appropriate differentiation or integration rules step-by-step, and verify the final result.';
    }
    if (isLinearAlgebra) {
      return 'Welcome! We have a linear algebra and matrix calculation before us. We will proceed methodically through the matrix operations to reach our exact solution.';
    }
    if (isGeometry) {
      return 'Welcome! Let us examine this geometry and trigonometry problem, identifying the relevant theorems and identities to find the precise solution.';
    }
    if (isStatistics) {
      return 'Welcome! We will analyze these statistical data points together, calculating the required metrics with clarity and structure.';
    }
    if (isAlgebra) {
      return 'Hello and welcome! Let us solve this algebra problem step-by-step. We will isolate the variables, apply algebraic properties, and find the exact value.';
    }
    return 'Welcome! Let us solve this math problem together step by step. We will begin by analyzing the givens, identify the appropriate mathematical formula, apply it, and verify the final answer.';
  }
}

export interface SpeechSegment {
  id: string;
  label: string;
  text: string;
  kind: 'intro' | 'problem' | 'formula' | 'assumptions' | 'step' | 'final';
  stepIndex?: number;
}

/**
 * Builds the complete spoken sequence of a solution:
 * 1. Warm teacher & broadcaster introduction
 * 2. Problem statement formulation
 * 3. Applied mathematical theorem / formula
 * 4. Step-by-step derivation with natural transitional phrasing
 * 5. Final verified conclusion
 */
export function buildSolutionSpeechScript(solution: MathSolution, lang: 'ar' | 'en'): SpeechSegment[] {
  const script: SpeechSegment[] = [];

  // 1. Dynamic Pedagogical Broadcaster Introduction
  const introLabel = lang === 'ar' ? 'المقدمة التعليمية' : 'Teacher Introduction';
  const introText = getPedagogicalIntro(solution, lang);
  script.push({
    id: 'intro',
    label: introLabel,
    text: introText,
    kind: 'intro',
  });

  // 2. Problem Statement
  const problemLabel = lang === 'ar' ? 'نص المسألة' : 'Problem Statement';
  const formattedProblem = formatMathForSpeech(solution.originalQuestion, lang);
  const problemText = lang === 'ar'
    ? `نص المسألة المطلوب حلها هو: ${formattedProblem}.`
    : `The problem statement is: ${formattedProblem}.`;
  script.push({
    id: 'problem',
    label: problemLabel,
    text: problemText,
    kind: 'problem',
  });

  // 3. Mathematical Formula / Rule (if defined)
  if (solution.formulaUsed && solution.formulaUsed.trim()) {
    const formulaLabel = lang === 'ar' ? 'القاعدة الرياضية' : 'Formula Used';
    const formattedFormula = formatMathForSpeech(solution.formulaUsed, lang);
    const formulaText = lang === 'ar'
      ? `القاعدة الرياضية الأساسية التي نعتمد عليها هي: ${formattedFormula}.`
      : `The primary mathematical formula we will apply is: ${formattedFormula}.`;
    script.push({
      id: 'formula',
      label: formulaLabel,
      text: formulaText,
      kind: 'formula',
    });
  }

  // 4. Assumptions and Domain (if defined and meaningful)
  if (solution.assumptions && solution.assumptions.length > 0) {
    const assumptionsLabel = lang === 'ar' ? 'شروط ومجال التعريف' : 'Assumptions & Domain';
    const cleanAssumptions = solution.assumptions.map((a) => formatMathForSpeech(a, lang)).join('، ');
    const assumptionsText = lang === 'ar'
      ? `مع مراعاة شروط ومجال الحل: ${cleanAssumptions}.`
      : `Considering the domain conditions: ${cleanAssumptions}.`;
    script.push({
      id: 'assumptions',
      label: assumptionsLabel,
      text: assumptionsText,
      kind: 'assumptions',
    });
  }

  // 5. Steps with Smooth Pedagogical Connectors
  const totalSteps = solution.steps ? solution.steps.length : 0;
  if (solution.steps && solution.steps.length > 0) {
    solution.steps.forEach((step, idx) => {
      const stepNumber = step.stepNumber || idx + 1;
      const stepLabel = lang === 'ar' ? `الخطوة ${stepNumber}` : `Step ${stepNumber}`;
      const stepTitleSpoken = formatMathForSpeech(step.title, lang);
      const stepExpSpoken = formatMathForSpeech(step.explanation, lang);

      let stepSpoken = '';
      if (lang === 'ar') {
        if (totalSteps === 1) {
          stepSpoken = `خطوة الحل: ${stepTitleSpoken}. ${stepExpSpoken}.`;
        } else if (idx === 0) {
          stepSpoken = `نبدأ بالخطوة الأولى: ${stepTitleSpoken}. ${stepExpSpoken}.`;
        } else if (idx === 1) {
          stepSpoken = `والآن ننتقل إلى الخطوة الثانية: ${stepTitleSpoken}. ${stepExpSpoken}.`;
        } else if (idx === totalSteps - 1) {
          stepSpoken = `وأخيراً في خطوتنا الأخيرة، الخطوة ${stepNumber}: ${stepTitleSpoken}. ${stepExpSpoken}.`;
        } else {
          stepSpoken = `في الخطوة ${stepNumber}: ${stepTitleSpoken}. ${stepExpSpoken}.`;
        }
      } else {
        if (totalSteps === 1) {
          stepSpoken = `Solution step: ${stepTitleSpoken}. ${stepExpSpoken}.`;
        } else if (idx === 0) {
          stepSpoken = `We begin with step one: ${stepTitleSpoken}. ${stepExpSpoken}.`;
        } else if (idx === 1) {
          stepSpoken = `Now moving on to step two: ${stepTitleSpoken}. ${stepExpSpoken}.`;
        } else if (idx === totalSteps - 1) {
          stepSpoken = `And finally, in our concluding step ${stepNumber}: ${stepTitleSpoken}. ${stepExpSpoken}.`;
        } else {
          stepSpoken = `In step ${stepNumber}: ${stepTitleSpoken}. ${stepExpSpoken}.`;
        }
      }

      script.push({
        id: `step-${stepNumber}`,
        label: stepLabel,
        text: stepSpoken,
        kind: 'step',
        stepIndex: idx,
      });
    });
  }

  // 6. Final Verified Answer
  const finalLabel = lang === 'ar' ? 'النتيجة النهائية' : 'Final Answer';
  const answerRaw = solution.plainAnswer || solution.finalAnswer;
  const formattedAnswer = formatMathForSpeech(answerRaw, lang);
  const finalText = lang === 'ar'
    ? `وبذلك نصل إلى النتيجة النهائية المؤكدة لمسألتنا، وهي: ${formattedAnswer}. أحسنت المتابعة والتركيز!`
    : `And with that, our verified final answer is: ${formattedAnswer}. Excellent work following through!`;

  script.push({
    id: 'final',
    label: finalLabel,
    text: finalText,
    kind: 'final',
  });

  return script;
}

/**
 * Discovers and filters voices matching the active language.
 */
export function getAvailableVoicesForLanguage(lang: 'ar' | 'en'): VoiceInfo[] {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return [];
  }

  const allVoices = window.speechSynthesis.getVoices();
  const targetPrefix = lang === 'ar' ? 'ar' : 'en';

  const matched = allVoices.filter((v) => {
    const voiceLang = (v.lang || '').toLowerCase().replace('_', '-');
    return voiceLang.startsWith(targetPrefix);
  });

  return matched.map((v) => {
    const nameLower = (v.name || '').toLowerCase();
    const isNatural =
      nameLower.includes('natural') ||
      nameLower.includes('neural') ||
      nameLower.includes('online') ||
      nameLower.includes('google') ||
      nameLower.includes('microsoft') ||
      nameLower.includes('siri') ||
      nameLower.includes('premium') ||
      v.localService === false;

    const isLocal = v.localService === true;

    let badgeText = '';
    if (isNatural) {
      badgeText = lang === 'ar' ? 'فائق الجودة (طبيعي)' : 'High Quality (Natural)';
    } else if (isLocal) {
      badgeText = lang === 'ar' ? 'محلي (دون إنترنت)' : 'Device Local';
    } else {
      badgeText = lang === 'ar' ? 'صوت قياسي' : 'Standard Voice';
    }

    return {
      voice: v,
      displayName: v.name,
      badgeText,
      isHighQuality: isNatural,
      isLocal,
    };
  });
}

/**
 * Selects the optimal voice matching the user's language and stored preference.
 */
export function getBestVoiceForLanguage(
  lang: 'ar' | 'en',
  preferredVoiceURI?: string
): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices();
  const targetPrefix = lang === 'ar' ? 'ar' : 'en';

  const matchedVoices = voices.filter((v) => {
    const voiceLang = (v.lang || '').toLowerCase().replace('_', '-');
    return voiceLang.startsWith(targetPrefix);
  });

  if (matchedVoices.length === 0) {
    return null;
  }

  // 1. If preferred voice URI matches an existing voice in the target language
  if (preferredVoiceURI) {
    const pref = matchedVoices.find((v) => v.voiceURI === preferredVoiceURI);
    if (pref) return pref;
  }

  // 2. Prefer high-quality / natural / online voices (e.g. Edge Natural, Chrome Google voices, macOS Siri)
  const naturalVoice = matchedVoices.find((v) => {
    const n = (v.name || '').toLowerCase();
    return (
      n.includes('natural') ||
      n.includes('neural') ||
      n.includes('online') ||
      n.includes('google') ||
      n.includes('microsoft') ||
      n.includes('siri') ||
      v.localService === false
    );
  });

  if (naturalVoice) return naturalVoice;

  // 3. Prefer matching specific dialect (e.g. ar-SA, en-US)
  const defaultDialect = lang === 'ar' ? 'ar-sa' : 'en-us';
  const dialectMatch = matchedVoices.find((v) =>
    (v.lang || '').toLowerCase().replace('_', '-').startsWith(defaultDialect)
  );
  if (dialectMatch) return dialectMatch;

  // 4. Return the first matching voice
  return matchedVoices[0];
}
