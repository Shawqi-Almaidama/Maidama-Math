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
 * Formats mathematical variables for Arabic presentation
 */
export function formatArabicMathVariables(latexOrText: string): string {
  if (!latexOrText) return '';
  // Convert isolated variable identifiers x, y, z to Arabic س, ص, ع
  return latexOrText
    .replace(/\bx\b/g, 'س')
    .replace(/\by\b/g, 'ص')
    .replace(/\bz\b/g, 'ع')
    .replace(/\bsin\b/g, 'جا')
    .replace(/\bcos\b/g, 'جتا')
    .replace(/\btan\b/g, 'ظا');
}
