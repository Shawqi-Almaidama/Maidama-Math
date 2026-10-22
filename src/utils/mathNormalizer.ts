/**
 * Mathematical Normalization and Localization Utility
 * Separates internal computation representation from curriculum-specific display notation.
 */

// Mapping of Arabic-Indic digits to Western Arabic digits
const ARABIC_INDIC_DIGITS: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
};

const WESTERN_TO_ARABIC_DIGITS: Record<string, string> = {
  '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤',
  '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩',
};

/**
 * Normalizes user input containing Arabic digits, variable aliases, and functions
 * into a canonical, mathematically sound representation for the computation engine.
 */
export function normalizeMathInput(input: string): string {
  if (!input) return '';

  let normalized = input.trim();

  // 1. Normalize Arabic-Indic digits to standard 0-9
  normalized = normalized.replace(/[٠-٩۰-۹]/g, (digit) => ARABIC_INDIC_DIGITS[digit] || digit);

  // 2. Normalize Eastern separators and symbols
  normalized = normalized
    .replace(/٫/g, '.')      // Arabic decimal comma to dot
    .replace(/٬/g, '')       // Arabic thousands separator stripped
    .replace(/×/g, '*')      // Eastern multiplication sign
    .replace(/÷/g, '/')      // Eastern division sign
    .replace(/−/g, '-')      // Unicode minus sign (\u2212)
    .replace(/٪/g, '%')      // Arabic percent sign
    .replace(/ـ/g, '')       // Arabic tatweel stripped
    .replace(/؟/g, '');      // Arabic question mark stripped

  // 3. Normalize Arabic function names
  // Use boundary-safe replacements
  normalized = normalized
    .replace(/(?:د\/دس|مشتقة|اشتقاق)\s*(?:لـ)?/gi, 'd/dx of ')
    .replace(/(?:تكامل)\s+/gi, 'integrate ')
    .replace(/(?:نها|نهاية)\s+/gi, 'lim ')
    .replace(/(?:مجموع)\s+/gi, 'sum ')
    .replace(/\bجتا\b/g, 'cos')
    .replace(/\bجا\b/g, 'sin')
    .replace(/\bظا\b/g, 'tan')
    .replace(/\bظتا\b/g, 'cot')
    .replace(/\bقا\b/g, 'sec')
    .replace(/\bقتا\b/g, 'csc')
    .replace(/\bجذر\b/g, 'sqrt')
    .replace(/\bلوغ?\b/g, 'log')
    .replace(/\bلن\b/g, 'ln')
    .replace(/\bطا\b|\bط\b/g, 'pi')
    .replace(/\bهـ\b/g, 'e')
    .replace(/\s+(?:من)\s+/g, ' from ')
    .replace(/\s+(?:إلى|الي)\s+/g, ' to ');

  // 4. Normalize Arabic school variables safely
  // Handle implicit multiplication with Arabic variables:
  // e.g. "٢س" -> "2*س", "5س" -> "5*x"
  normalized = normalized
    .replace(/(\d)\s*([سصعنمك])/g, '$1*$2')
    .replace(/([سصعنمك])\s*(\d)/g, '$1^$2');

  // Convert Arabic school variables to canonical Latin variables
  normalized = normalized
    .replace(/س/g, 'x')
    .replace(/ص/g, 'y')
    .replace(/ع/g, 'z')
    .replace(/ن/g, 'n')
    .replace(/م/g, 'm')
    .replace(/ك/g, 'k');

  // 5. Clean up implicit multiplication between parentheses and variables
  // e.g. "3(x+1)" -> "3*(x+1)", "(x-1)(x+2)" -> "(x-1)*(x+2)"
  normalized = normalized
    .replace(/(\d)\s*\(/g, '$1*(')
    .replace(/\)\s*\(/g, ')*(')
    .replace(/\)\s*([a-zA-Z])/g, ')*$1')
    .replace(/([a-zA-Z])\s*\(/g, '$1*(')
    // Avoid breaking function calls like sin*(x) -> restore sin(x), cos(x), etc.
    .replace(/\b(sin|cos|tan|cot|sec|csc|sqrt|log|ln|exp|abs)\s*\*\s*\(/gi, '$1(');

  return normalized.trim();
}

/**
 * Converts numbers or expressions into Arabic-Indic digits for Arabic presentation
 */
export function toArabicDigits(str: string | number): string {
  return String(str).replace(/\d/g, (d) => WESTERN_TO_ARABIC_DIGITS[d] || d);
}

/**
 * Converts Arabic-Indic digits to Western digits 0-9
 */
export function toWesternDigits(str: string | number): string {
  return String(str).replace(/[٠-٩۰-۹]/g, (d) => ARABIC_INDIC_DIGITS[d] || d);
}

/**
 * Transforms a mathematical formula safely into Arabic presentation format:
 * - Converts algebraic variables x -> س, y -> ص, z -> ع without breaking LaTeX macros (\frac, \text, \pmatrix, etc.)
 * - Converts Western digits 0-9 to Arabic-Indic digits ٠-٩ outside LaTeX command names
 * - Preserves matrix structures, signs, and KaTeX compatibility
 */
export function formatArabicMathForDisplay(latex: string): string {
  if (!latex) return '';

  const protectedTokens: string[] = [];
  // Match LaTeX macros like \frac, \sqrt, \begin{pmatrix}, \end{pmatrix}, \text{...}, or standard functions
  const tokenized = latex.replace(
    /\\(?:begin|end)\{[a-zA-Z*]+\}|\\[a-zA-Z]+|\b(?:sin|cos|tan|cot|sec|csc|exp|log|ln|det|inv|min|max|lim|gcd|lcm)\b/g,
    (match) => {
      const idx = protectedTokens.length;
      protectedTokens.push(match);
      return `__PROT_${idx}__`;
    }
  );

  // Replace variable letters x, y, z when not part of identifiers
  // Handle cases like 2x, x+4, (x), x=3, x^2, x_1
  const withArabicVars = tokenized
    .replace(/(^|[^a-zA-Z_])x(?![a-zA-Z_])/g, '$1س')
    .replace(/(^|[^a-zA-Z_])y(?![a-zA-Z_])/g, '$1ص')
    .replace(/(^|[^a-zA-Z_])z(?![a-zA-Z_])/g, '$1ع');

  // Split by protected tokens so we only convert digits in mathematical literals
  const parts = withArabicVars.split(/(__PROT_\d+__)/g);
  const converted = parts.map((part) => {
    const match = part.match(/^__PROT_(\d+)__$/);
    if (match) {
      return protectedTokens[parseInt(match[1], 10)];
    }
    // Convert 0-9 to Arabic-Indic digits ٠-٩
    return part.replace(/\d/g, (d) => WESTERN_TO_ARABIC_DIGITS[d] || d);
  }).join('');

  return converted;
}

/**
 * Transforms an Arabic mathematical formula safely into English / Western presentation format
 */
export function formatEnglishMathForDisplay(latex: string): string {
  if (!latex) return '';

  return latex
    .replace(/[٠-٩]/g, (d) => ARABIC_INDIC_DIGITS[d] || d)
    .replace(/س/g, 'x')
    .replace(/ص/g, 'y')
    .replace(/ع/g, 'z');
}

/**
 * Formats mathematical variables for Arabic presentation
 */
export function formatArabicMathVariables(latexOrText: string): string {
  return formatArabicMathForDisplay(latexOrText);
}
