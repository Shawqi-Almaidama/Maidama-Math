import { MathSolution, VerificationResult, SolutionStep } from '../types/math.ts';
import {
  formatArabicMathForDisplay,
  formatEnglishMathForDisplay,
  toArabicDigits,
  toWesternDigits,
} from './mathNormalizer.ts';

/**
 * Bidirectional phrase and term dictionaries for mathematical solution display.
 * Maps between English and Arabic while preserving all LaTeX formulas, variables, and numerical values.
 */

const CATEGORY_MAP: Record<string, { ar: string; en: string }> = {
  'Algebra': { ar: 'الجبر والمعادلات', en: 'Algebra' },
  'Algebra & Equations': { ar: 'الجبر والمعادلات', en: 'Algebra & Equations' },
  'Linear Algebra': { ar: 'الجبر الخطي والمصفوفات', en: 'Linear Algebra' },
  'Linear Algebra & Matrices': { ar: 'الجبر الخطي والمصفوفات', en: 'Linear Algebra & Matrices' },
  'Calculus': { ar: 'التفاضل والتكامل', en: 'Calculus' },
  'Calculus & Analysis': { ar: 'التفاضل والتكامل والتحليل', en: 'Calculus & Analysis' },
  'Geometry': { ar: 'الهندسة والقياس', en: 'Geometry' },
  'Trigonometry': { ar: 'حساب المثلثات', en: 'Trigonometry' },
  'Statistics': { ar: 'الإحصاء والاحتمالات', en: 'Statistics' },
  'Statistics & Probability': { ar: 'الإحصاء والاحتمالات', en: 'Statistics & Probability' },
  'Arithmetic': { ar: 'الحساب والأعداد', en: 'Arithmetic' },
  'Word Problem': { ar: 'المسائل اللفظية والتطبيقية', en: 'Word Problem' },
  'Mathematics': { ar: 'الرياضيات العامة', en: 'Mathematics' },
  'General Math': { ar: 'الرياضيات العامة', en: 'General Math' },
  'Computational Mathematics': { ar: 'الرياضيات الحسابية', en: 'Computational Mathematics' },
};

const TOPIC_MAP: Record<string, { ar: string; en: string }> = {
  'Matrix Operations': { ar: 'عمليات المصفوفات', en: 'Matrix Operations' },
  'Matrix Addition': { ar: 'جمع وطرح المصفوفات', en: 'Matrix Addition' },
  'Matrix Inversion': { ar: 'معكوس ومحدد المصفوفات', en: 'Matrix Inversion' },
  'Determinant': { ar: 'حساب المحددات', en: 'Determinants' },
  'Linear Systems': { ar: 'أنظمة المعادلات الخطية', en: 'Linear Systems' },
  'Quadratic Equations': { ar: 'المعادلات التربيعية', en: 'Quadratic Equations' },
  'Linear Equations': { ar: 'المعادلات الخطية', en: 'Linear Equations' },
  'Equation Solving': { ar: 'حل المعادلات', en: 'Equation Solving' },
  'Differentiation': { ar: 'الاشتقاق وقواعد التفاضل', en: 'Differentiation' },
  'Derivatives': { ar: 'المشتقات الرياضية', en: 'Derivatives' },
  'Integration': { ar: 'التكامل', en: 'Integration' },
  'Definite Integrals': { ar: 'التكامل المحدود', en: 'Definite Integrals' },
  'Descriptive Statistics': { ar: 'الإحصاء الوصفي', en: 'Descriptive Statistics' },
  'Polynomial Simplification': { ar: 'تبسيط كثيرات الحدود', en: 'Polynomial Simplification' },
  'Exact Arithmetic Evaluation': { ar: 'التقييم الحسابي الدقيق', en: 'Exact Arithmetic Evaluation' },
};

const EXACT_PHRASES: Array<{ en: string; ar: string }> = [
  // Matrix and Linear Algebra phrases
  {
    en: 'Matrices A and B must have identical dimensions to be added.',
    ar: 'يجب أن تكون المصفوفتان A و B من الرتبة ذاتها لتصح عملية الجمع.',
  },
  {
    en: 'Matrices A and B must have identical dimensions (3x3) to be added.',
    ar: 'يجب أن تكون المصفوفتان A و B من الرتبة ذاتها (3×3) لتصح عملية الجمع.',
  },
  {
    en: 'Scalar multiplication applies to each element within the matrix individually.',
    ar: 'يطبق الضرب في عدد ثابت على كل عنصر في المصفوفة بشكل فردي.',
  },
  {
    en: 'Scalar multiplication of matrix A',
    ar: 'الضرب القياسي في المصفوفة A',
  },
  {
    en: 'Scalar multiplication of matrix B',
    ar: 'الضرب القياسي في المصفوفة B',
  },
  {
    en: 'Multiply every element in matrix A by the scalar 2.',
    ar: 'ضرب جميع عناصر المصفوفة A في العدد القياسي 2.',
  },
  {
    en: 'Multiply every element in matrix B by the scalar 3.',
    ar: 'ضرب جميع عناصر المصفوفة B في العدد القياسي 3.',
  },
  {
    en: 'Multiply every element in matrix A by scalar 2, and every element in matrix B by scalar 3.',
    ar: 'ضرب جميع عناصر المصفوفة A في العدد 2، وضرب جميع عناصر المصفوفة B في العدد 3.',
  },
  {
    en: 'Matrix Addition',
    ar: 'جمع المصفوفات',
  },
  {
    en: 'Matrix Subtraction',
    ar: 'طرح المصفوفات',
  },
  {
    en: 'Matrix Multiplication',
    ar: 'ضرب المصفوفات',
  },
  {
    en: 'Add the corresponding elements of the matrices calculated in steps 1 and 2.',
    ar: 'جمع العناصر المتناظرة في المصفوفتين المحسوبتين في الخطوتين 1 و 2.',
  },
  {
    en: 'Add the corresponding elements of both matrices.',
    ar: 'جمع العناصر المتناظرة في كلا المصفوفتين.',
  },
  {
    en: 'Multiply each element of the matrix by its respective scalar coefficient.',
    ar: 'ضرب كل عنصر من عناصر المصفوفة في العدد القياسي المقابل له.',
  },
  {
    en: 'Multiply each element of the matrix by the scalar.',
    ar: 'ضرب كل عنصر من عناصر المصفوفة في العدد القياسي.',
  },
  {
    en: 'Identify Given Matrices & Verify Dimensions',
    ar: 'تحديد المصفوفات المعطاة والتحقق من الرتبة',
  },
  {
    en: 'Perform Scalar Multiplication on Matrices',
    ar: 'إجراء الضرب القياسي في كل مصفوفة',
  },
  {
    en: 'Matrix Addition of Corresponding Elements',
    ar: 'جمع العناصر المتناظرة وحساب الناتج النهائي',
  },
  {
    en: 'Matrix Dimensions & Determinant',
    ar: 'فحص أبعاد المصفوفة والمحدد',
  },
  {
    en: 'Determinant and Inversion Result',
    ar: 'حساب المحدد والمعكوس',
  },
  {
    en: 'Checked matrix dimensions and computed determinant for invertibility.',
    ar: 'تم فحص رتبة المصفوفة وحساب المحدد للتحقق من قابليتها للعكس.',
  },

  // Verification phrases
  {
    en: 'Independently verified by symbolic computation engine and residual analysis.',
    ar: 'تم التحقق المستقل بواسطة محرك الحوسبة الرمزية وفحص المتبقي الرياضي.',
  },
  {
    en: 'Independently verified by exact element-wise matrix arithmetic (residual = 0).',
    ar: 'تم التحقق الدقيق بواسطة محرك الحوسبة الرمزية من صحة جميع عناصر المصفوفة (المتبقي = 0).',
  },
  {
    en: 'Independently verified by exact matrix arithmetic computation and element-wise validation (residual = 0).',
    ar: 'تم التحقق الدقيق من صحة ناتج جمع وضرب عناصر المصفوفات ومطابقتها التامة بدون أي خطأ حسابي (المتبقي = 0).',
  },
  {
    en: 'Exact element-wise matrix arithmetic verification',
    ar: 'التحقق الحسابي الدقيق لجمع وضرب المصفوفات',
  },
  {
    en: 'Matrix identity residual',
    ar: 'متبقي مصفوفة الوحدة',
  },
  {
    en: 'Singular matrix verified (det = 0)',
    ar: 'تم التحقق من أن المصفوفة منفردة (المحدد = 0)',
  },
  {
    en: 'Exact numerical evaluation via MathJS parser',
    ar: 'تقييم عددي دقيق عبر محرك التحليل الرياضي',
  },
  {
    en: 'Symbolic algebraic equivalence rules via MathJS',
    ar: 'قواعد التكافؤ الجبري الرمزي عبر محرك الحوسبة',
  },
  {
    en: 'Derived using rigorous deductive mathematical logic.',
    ar: 'مستنتج باستخدام المنطق الرياضي الاستنباطي الدقيق.',
  },

  // Equation and Calculus phrases
  {
    en: 'Formulate Equation and Coefficients',
    ar: 'صياغة المعادلة وتحديد المعاملات',
  },
  {
    en: 'Apply Quadratic / Linear Theorem',
    ar: 'تطبيق قانون حل المعادلات',
  },
  {
    en: 'Apply Quadratic Formula',
    ar: 'تطبيق القانون العام للمعادلة التربيعية',
  },
  {
    en: 'Mathematical Substitution Verification',
    ar: 'التحقق الرياضي من الحل بالتعويض',
  },
  {
    en: 'Identify Function and Variable',
    ar: 'تحديد الدالة والمتغير المستقل',
  },
  {
    en: 'Symbolic Differentiation',
    ar: 'إجراء الاشتقاق الرمزي',
  },
  {
    en: 'Numerical Quotient Verification',
    ar: 'التحقق العددي من المشتقة بنهاية الفرق',
  },
  {
    en: 'Statistical Moments',
    ar: 'حساب العزوم الإحصائية',
  },
  {
    en: 'Summary Statistics',
    ar: 'القيم والنتائج الإحصائية',
  },
  {
    en: 'Exact Arithmetic Evaluation',
    ar: 'التبسيط والتقييم الحسابي',
  },
  {
    en: 'Final Computed Value',
    ar: 'النتيجة النهائية المؤكدة',
  },
  {
    en: 'Scalar Multiplication and Addition of Matrices',
    ar: 'قاعدة الضرب القياسي والجمع للمصفوفات',
  },
  {
    en: 'Scalar Multiplication and Addition of Matrices: k · A + m · B = [k · aᵢⱼ + m · bᵢⱼ]',
    ar: 'قاعدة الضرب القياسي والجمع للمصفوفات: k · A + m · B = [k · aᵢⱼ + m · bᵢⱼ]',
  },
  {
    en: 'Fundamental Theorem of Calculus',
    ar: 'النظرية الأساسية في التفاضل والتكامل',
  },
  {
    en: 'Exact Algebraic Transformation',
    ar: 'التحويلات الجبرية المعيارية',
  },
  {
    en: 'Subtract 4 from both sides',
    ar: 'طرح ٤ من الطرفين',
  },
  {
    en: 'Simplification',
    ar: 'التبسيط',
  },
  {
    en: 'Divide both sides by 2',
    ar: 'قسمة الطرفين على ٢',
  },
  {
    en: 'Subtract 6 from both sides',
    ar: 'طرح ٦ من كلا الطرفين',
  },
  {
    en: 'Divide by coefficient 2',
    ar: 'القسمة على المعامل ٢',
  },
  {
    en: 'Divide both sides by coefficient',
    ar: 'قسمة الطرفين على المعامل',
  },
  {
    en: 'Properties of equality for linear isolation: if ax + b = c then x = (c - b) / a',
    ar: 'خاصية الجمع والضرب للمساواة لعزل المتغير: إذا كان أ س + ب = جـ فإن س = (جـ - ب) ÷ أ',
  },
  {
    en: 'Direct substitution in original linear equation',
    ar: 'التحقق بالتعويض المباشر في المعادلة الأصلية',
  },
  {
    en: 'Linear equation residual: 0',
    ar: 'متبقي المعادلة الخطية: ٠',
  },
];

/**
 * Localize a category name
 */
export function localizeCategory(category: string, targetLang: 'ar' | 'en'): string {
  if (!category) return category;
  const trimmed = category.trim();

  for (const [key, val] of Object.entries(CATEGORY_MAP)) {
    if (trimmed.toLowerCase() === key.toLowerCase() || trimmed === val.ar || trimmed === val.en) {
      return targetLang === 'ar' ? val.ar : val.en;
    }
  }

  return trimmed;
}

/**
 * Localize a topic name
 */
export function localizeTopic(topic: string, targetLang: 'ar' | 'en'): string {
  if (!topic) return topic;
  const trimmed = topic.trim();

  for (const [key, val] of Object.entries(TOPIC_MAP)) {
    if (trimmed.toLowerCase() === key.toLowerCase() || trimmed === val.ar || trimmed === val.en) {
      return targetLang === 'ar' ? val.ar : val.en;
    }
  }

  // Also check exact phrase table
  for (const item of EXACT_PHRASES) {
    if (trimmed.toLowerCase() === item.en.toLowerCase() || trimmed === item.ar) {
      return targetLang === 'ar' ? item.ar : item.en;
    }
  }

  return trimmed;
}

/**
 * Localize an arbitrary mathematical explanation string without corrupting equations or numbers
 */
export function localizeText(text: string, targetLang: 'ar' | 'en'): string {
  if (!text) return text;
  let result = text;

  // Replace matched known phrases
  for (const item of EXACT_PHRASES) {
    const fromStr = targetLang === 'ar' ? item.en : item.ar;
    const toStr = targetLang === 'ar' ? item.ar : item.en;

    if (result.includes(fromStr)) {
      result = result.split(fromStr).join(toStr);
    }
  }

  // Additional regex transformations for common dynamic patterns
  if (targetLang === 'ar') {
    // Dynamic: "Multiply every element in matrix [A-Za-z] by (the scalar)? [0-9]+"
    result = result.replace(
      /Multiply every element in matrix\s+([A-Za-z])\s+by\s+(?:the scalar\s+)?(\d+)\.?/gi,
      (_, mat, scalar) => `ضرب جميع عناصر المصفوفة ${mat} في العدد القياسي ${scalar}.`
    );

    // Dynamic: "Scalar multiplication of matrix [A-Za-z]"
    result = result.replace(
      /Scalar multiplication of matrix\s+([A-Za-z])/gi,
      (_, mat) => `الضرب القياسي في المصفوفة ${mat}`
    );

    // Dynamic: "Computed exact roots: ..."
    result = result.replace(
      /Computed exact roots:\s*(.+)/gi,
      (_, val) => `تم حساب الجذور الدقيقة: ${val}`
    );

    // Dynamic: "Matrix identity residual ||A \* A\^-1 - I|| = ([0-9.e+-]+)"
    result = result.replace(
      /Matrix identity residual \|\|A \* A\^-1 - I\|\| =\s*([0-9.e+-]+)/gi,
      (_, val) => `متبقي مصفوفة الوحدة ||A · A⁻¹ - I|| = ${val}`
    );

    // Dynamic: "Direct substitution residual ||A\*x - b|| = ([0-9.e+-]+)"
    result = result.replace(
      /Direct substitution residual \|\|A\*x - b\|\| =\s*([0-9.e+-]+)/gi,
      (_, val) => `متبقي التعويض المباشر ||A·x - b|| = ${val}`
    );

    // Dynamic: "Subtract [0-9]+ from both sides"
    result = result.replace(
      /Subtract\s+(\d+)\s+from\s+(?:both\s+sides|all\s+sides)/gi,
      (_, num) => `طرح ${toArabicDigits(num)} من الطرفين`
    );

    // Dynamic: "Divide both sides by [0-9]+"
    result = result.replace(
      /Divide\s+both\s+sides\s+by\s+(\d+)/gi,
      (_, num) => `قسمة الطرفين على ${toArabicDigits(num)}`
    );

    // Dynamic: "Divide by coefficient [0-9]+"
    result = result.replace(
      /Divide\s+(?:both\s+sides\s+)?by\s+coefficient\s+(\d+)/gi,
      (_, num) => `القسمة على المعامل ${toArabicDigits(num)}`
    );
  } else {
    // Reverse dynamic patterns
    result = result.replace(
      /طرح\s+([٠-٩0-9]+)\s+من\s+(?:الطرفين|كلا الطرفين)/gi,
      (_, num) => `Subtract ${toWesternDigits(num)} from both sides`
    );
    result = result.replace(
      /قسمة\s+الطرفين\s+على\s+([٠-٩0-9]+)/gi,
      (_, num) => `Divide both sides by ${toWesternDigits(num)}`
    );
    result = result.replace(
      /القسمة\s+على\s+المعامل\s+([٠-٩0-9]+)/gi,
      (_, num) => `Divide by coefficient ${toWesternDigits(num)}`
    );
    result = result.replace(
      /ضرب جميع عناصر المصفوفة\s+([A-Za-z])\s+في العدد القياسي\s+(\d+)\.?/gi,
      (_, mat, scalar) => `Multiply every element in matrix ${mat} by scalar ${scalar}.`
    );
    result = result.replace(
      /الضرب القياسي في المصفوفة\s+([A-Za-z])/gi,
      (_, mat) => `Scalar multiplication of matrix ${mat}`
    );
  }

  return result;
}

/**
 * Localize verification object
 */
export function localizeVerification(
  verif: VerificationResult,
  targetLang: 'ar' | 'en'
): VerificationResult {
  if (!verif) return verif;

  // Format residual cleanly (hide 2.7755575615628914e-16 noise)
  let cleanResidual = verif.residual;
  if (typeof cleanResidual === 'number' && Math.abs(cleanResidual) < 1e-12) {
    cleanResidual = 0;
  }

  return {
    ...verif,
    method: localizeText(verif.method, targetLang),
    explanation: localizeText(verif.explanation, targetLang),
    residual: cleanResidual,
  };
}

/**
 * Safely localize "Did You Know" educational insights, preventing untranslated leaks
 */
export function localizeDidYouKnow(
  text: string | undefined,
  topic: string,
  targetLang: 'ar' | 'en'
): string | undefined {
  if (!text) return undefined;
  const localized = localizeText(text, targetLang);

  if (targetLang === 'ar') {
    // If it still consists purely of Latin letters and lacks Arabic text
    const hasArabic = /[\u0600-\u06FF]/.test(localized);
    const hasEnglishWords = /[a-zA-Z]{4,}/.test(localized);

    if (!hasArabic && hasEnglishWords) {
      const lowerTopic = (topic || '').toLowerCase();
      if (lowerTopic.includes('matrix') || lowerTopic.includes('مصفوف') || lowerTopic.includes('linear')) {
        return 'طُوّرت نظرية المصفوفات بصورتها الحديثة في منتصف القرن التاسع عشر على يد آرثر كايلي وجيمس سيلفستر، وتُعد حجر الأساس للرسوم الحاسوبية ثلاثية الأبعاد وخوارزميات تعلم الآلة والفيزياء الكمية.';
      }
      if (lowerTopic.includes('calculus') || lowerTopic.includes('deriv') || lowerTopic.includes('تفاضل') || lowerTopic.includes('اشتقاق') || lowerTopic.includes('تكامل') || lowerTopic.includes('integral')) {
        return 'يُعد حساب التفاضل والتكامل أحد أعظم الإنجازات الرياضية في تاريخ العلوم، طُوّر بشكل مستقل في القرن السابع عشر بواسطة إسحاق نيوتن وغوتفريد لايبنتز لدراسة الحركة ومعدلات التغير المستمرة.';
      }
      if (lowerTopic.includes('quadratic') || lowerTopic.includes('تربيع') || lowerTopic.includes('algebra') || lowerTopic.includes('جبر') || lowerTopic.includes('equation') || lowerTopic.includes('معادل')) {
        return 'يرجع الفضل في تأسيس القواعد المنهجية العامة لحل المعادلات الجبرية والتربيعية إلى عالم الرياضيات المسلم محمد بن موسى الخوارزمي في القرن التاسع الميلادي في كتابه الشهير (الجبر والمقابلة).';
      }
      if (lowerTopic.includes('stat') || lowerTopic.includes('إحصاء') || lowerTopic.includes('prob') || lowerTopic.includes('احتمال')) {
        return 'تأسست مبادئ نظرية الاحتمالات والإحصاء الرياضي في القرن السابع عشر عبر مراسلات بيير دي فيرما وبلايز باسكال، وتُستخدم اليوم كعماد لتحليل البيانات والذكاء الاصطناعي.';
      }
      if (lowerTopic.includes('trig') || lowerTopic.includes('مثلث') || lowerTopic.includes('geom') || lowerTopic.includes('هندس')) {
        return 'نشأ علم المثلثات كفرع تطبيقي متصل بعلم الفلك والهندسة المعمارية، وساهم علماء مثل البتاني ونصير الدين الطوسي في جعله علماً رياضياً مستقلاً ذا قواعد دقيقة.';
      }
      return 'تُمثّل الرياضيات لغة العلوم الدقيقة المشتركة، وتُبنى جميع فروعها على مبادئ المنطق الاستنتاجي المتماسك لتفسير الظواهر الطبيعية وحل المسائل الهندسية.';
    }
  } else {
    // English mode
    const hasArabic = /[\u0600-\u06FF]/.test(localized);
    const hasEnglish = /[a-zA-Z]{3,}/.test(localized);
    if (hasArabic && !hasEnglish) {
      const lowerTopic = (topic || '').toLowerCase();
      if (lowerTopic.includes('matrix') || lowerTopic.includes('مصفوف') || lowerTopic.includes('linear')) {
        return 'Matrix theory was formalized in the 19th century by Arthur Cayley and James Sylvester, forming the mathematical foundation for modern 3D computer graphics and machine learning.';
      }
      if (lowerTopic.includes('calculus') || lowerTopic.includes('deriv') || lowerTopic.includes('تفاضل') || lowerTopic.includes('اشتقاق') || lowerTopic.includes('تكامل') || lowerTopic.includes('integral')) {
        return 'Calculus was independently developed in the 17th century by Isaac Newton and Gottfried Wilhelm Leibniz to model continuous rates of change and motion.';
      }
      if (lowerTopic.includes('quadratic') || lowerTopic.includes('تربيع') || lowerTopic.includes('algebra') || lowerTopic.includes('جبر') || lowerTopic.includes('equation') || lowerTopic.includes('معادل')) {
        return 'The systematic methods for solving quadratic and algebraic equations were pioneered by Persian mathematician Muhammad ibn Musa al-Khwarizmi in his 9th-century treatise "The Compendious Book on Calculation by Completion and Balancing".';
      }
      return 'Mathematics serves as the universal language of science, providing rigorous deductive frameworks to describe the physical universe.';
    }
  }

  return localized;
}

/**
 * Safely localize the Primary Theorem / Formula Used, preserving standard math symbols
 */
export function localizeFormulaUsed(
  formula: string | undefined,
  topic: string,
  targetLang: 'ar' | 'en'
): string | undefined {
  if (!formula) return undefined;
  const trimmed = formula.trim();

  // Matrix scalar multiplication & addition rule: k · A + m · B = [k · aᵢⱼ + m · bᵢⱼ]
  const isMatrixScalarAdd =
    /k\s*[·*]\s*A\s*\+\s*m\s*[·*]\s*B/i.test(trimmed) ||
    /kA\s*\+\s*mB/i.test(trimmed) ||
    /a_{?ij}?/i.test(trimmed) ||
    /aᵢⱼ/.test(trimmed) ||
    /scalar multiplication and addition of matrices/i.test(trimmed) ||
    /الضرب في عدد ثابت وجمع العناصر المتناظرة/.test(trimmed) ||
    /قاعدة الضرب القياسي والجمع للمصفوفات/.test(trimmed);

  if (isMatrixScalarAdd) {
    const equationPart = 'k · A + m · B = [k · aᵢⱼ + m · bᵢⱼ]';
    if (targetLang === 'ar') {
      return `قاعدة الضرب القياسي والجمع للمصفوفات: ${equationPart}`;
    } else {
      return `Scalar Multiplication and Addition of Matrices: ${equationPart}`;
    }
  }

  // Quadratic formula: x = (-b ± sqrt(b^2 - 4ac)) / (2a)
  const isQuadraticFormula =
    /b\^2\s*-\s*4ac/i.test(trimmed) ||
    /القانون العام للمعادلة التربيعية/.test(trimmed) ||
    /Quadratic Formula/i.test(trimmed);

  if (isQuadraticFormula) {
    const eq = 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}';
    if (targetLang === 'ar') {
      return `القانون العام للمعادلة التربيعية: $${eq}$`;
    } else {
      return `Quadratic Formula: $${eq}$`;
    }
  }

  // Calculus derivative limit definition
  const isDerivativeLimit =
    /\\lim_{?h\s*\\to\s*0}?/i.test(trimmed) ||
    /\\frac{d}{dx}/i.test(trimmed) ||
    /قواعد الاشتقاق/.test(trimmed) ||
    /Differentiation Rules/i.test(trimmed);

  if (isDerivativeLimit) {
    const eq = '\\frac{d}{dx}[f(x)] = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}';
    if (targetLang === 'ar') {
      return `قواعد الاشتقاق وتفاضل الدوال: $${eq}$`;
    } else {
      return `Differentiation Rules: $${eq}$`;
    }
  }

  // Definite integral
  const isIntegral =
    /\\int/i.test(trimmed) ||
    /Fundamental Theorem of Calculus/i.test(trimmed) ||
    /النظرية الأساسية في التفاضل والتكامل/.test(trimmed);

  if (isIntegral) {
    const eq = '\\int_a^b f(x) dx = F(b) - F(a)';
    if (targetLang === 'ar') {
      return `النظرية الأساسية في التفاضل والتكامل: $${eq}$`;
    } else {
      return `Fundamental Theorem of Calculus: $${eq}$`;
    }
  }

  return localizeText(trimmed, targetLang);
}

/**
 * Safely localizes and formats prose text that might contain embedded $...$ or $$...$$ formulas.
 * Leaves normal prose words (Arabic or English) completely intact without letter corruption.
 */
function formatProseMath(rawText: string, targetLang: 'ar' | 'en'): string {
  if (!rawText) return '';
  const localized = localizeText(rawText, targetLang);
  const isAr = targetLang === 'ar';

  // If text contains $...$ or $$...$$, format the math expressions inside them
  if (localized.includes('$')) {
    return localized.replace(/(\$\$[\s\S]+?\$\$|\$[^$]+?\$)/g, (mathMatch) => {
      const isBlock = mathMatch.startsWith('$$');
      const inner = isBlock ? mathMatch.slice(2, -2) : mathMatch.slice(1, -1);
      const formatted = isAr
        ? formatArabicMathForDisplay(inner)
        : formatEnglishMathForDisplay(inner);
      return isBlock ? `$$${formatted}$$` : `$${formatted}$`;
    });
  }

  // Pure natural text: keep intact without variable or letter substitution!
  return localized;
}

/**
 * Localize an entire MathSolution object at display time.
 * Leaves mathematical LaTeX, numbers, and answers completely intact while preserving natural prose.
 */
export function localizeSolution(
  solution: MathSolution,
  targetLang: 'ar' | 'en'
): MathSolution {
  if (!solution) return solution;

  const isAr = targetLang === 'ar';
  const localizedCategory = localizeCategory(solution.category, targetLang);
  const localizedTopic = localizeTopic(solution.topic, targetLang);

  const localizedAssumptions = solution.assumptions?.map((ass) => {
    return formatProseMath(ass, targetLang);
  });

  const rawFormula = solution.formulaUsed
    ? localizeFormulaUsed(solution.formulaUsed, solution.topic || solution.category, targetLang)
    : solution.formulaUsed;
  const localizedFormula = rawFormula
    ? isAr
      ? formatArabicMathForDisplay(rawFormula)
      : formatEnglishMathForDisplay(rawFormula)
    : rawFormula;

  const localizedSteps: SolutionStep[] = solution.steps.map((step) => {
    const title = formatProseMath(step.title, targetLang);
    const explanation = formatProseMath(step.explanation, targetLang);
    let latex = step.latex;

    if (latex) {
      latex = isAr ? formatArabicMathForDisplay(latex) : formatEnglishMathForDisplay(latex);
    }

    return {
      ...step,
      title,
      latex,
      explanation,
      subSteps: step.subSteps?.map((sub) => formatProseMath(sub, targetLang)),
    };
  });

  const localizedVerification = localizeVerification(solution.verification, targetLang);
  if (localizedVerification) {
    localizedVerification.method = localizeText(localizedVerification.method, targetLang);
    localizedVerification.explanation = formatProseMath(localizedVerification.explanation, targetLang);
  }

  const finalAnswer = isAr
    ? formatArabicMathForDisplay(solution.finalAnswer)
    : formatEnglishMathForDisplay(solution.finalAnswer);

  const plainAnswer = isAr
    ? formatArabicMathForDisplay(solution.plainAnswer)
    : formatEnglishMathForDisplay(solution.plainAnswer);

  let interpretedLatex = solution.interpretedLatex;
  if (interpretedLatex) {
    interpretedLatex = isAr
      ? formatArabicMathForDisplay(interpretedLatex)
      : formatEnglishMathForDisplay(interpretedLatex);
  }

  let interpretedProblem = solution.interpretedProblem;
  if (interpretedProblem) {
    interpretedProblem = formatProseMath(interpretedProblem, targetLang);
  }

  const localizedAlternative = solution.alternativeMethod
    ? {
        ...solution.alternativeMethod,
        title: formatProseMath(solution.alternativeMethod.title, targetLang),
        summary: formatProseMath(solution.alternativeMethod.summary, targetLang),
        latex: solution.alternativeMethod.latex
          ? isAr
            ? formatArabicMathForDisplay(solution.alternativeMethod.latex)
            : formatEnglishMathForDisplay(solution.alternativeMethod.latex)
          : solution.alternativeMethod.latex,
      }
    : undefined;

  const localizedDidYouKnow = localizeDidYouKnow(
    solution.didYouKnow,
    solution.topic || solution.category,
    targetLang
  );

  const localizedAmbiguities = solution.ambiguities?.map((amb) =>
    formatProseMath(amb, targetLang)
  );

  let plotConfig = solution.plotConfig;
  if (plotConfig && plotConfig.functionLatex) {
    plotConfig = {
      ...plotConfig,
      functionLatex: isAr
        ? formatArabicMathForDisplay(plotConfig.functionLatex)
        : formatEnglishMathForDisplay(plotConfig.functionLatex),
    };
  }

  return {
    ...solution,
    interpretedProblem,
    interpretedLatex,
    category: localizedCategory,
    topic: localizedTopic,
    assumptions: localizedAssumptions,
    formulaUsed: localizedFormula,
    steps: localizedSteps,
    finalAnswer,
    plainAnswer,
    verification: localizedVerification,
    alternativeMethod: localizedAlternative,
    didYouKnow: localizedDidYouKnow,
    ambiguities: localizedAmbiguities,
    plotConfig,
  };
}

