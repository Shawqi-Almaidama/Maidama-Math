import React, { useMemo } from 'react';
import katex from 'katex';

interface MathViewProps {
  math: string;
  block?: boolean;
  className?: string;
}

export const MathView: React.FC<MathViewProps> = ({ math, block = false, className = '' }) => {
  const html = useMemo(() => {
    if (!math) return '';

    // Clean any accidentally enclosed dollar signs
    let cleaned = math.trim();
    if (cleaned.startsWith('$$') && cleaned.endsWith('$$')) {
      cleaned = cleaned.slice(2, -2).trim();
    } else if (cleaned.startsWith('$') && cleaned.endsWith('$')) {
      cleaned = cleaned.slice(1, -1).trim();
    }

    try {
      return katex.renderToString(cleaned, {
        displayMode: block,
        throwOnError: false,
        output: 'html',
      });
    } catch (err) {
      console.warn('KaTeX render error:', err);
      return `<span class="text-rose-400 font-mono">${cleaned}</span>`;
    }
  }, [math, block]);

  if (!math) return null;

  return (
    <span
      dir="ltr"
      className={`${block ? 'math-display block my-2 text-indigo-900 dark:text-indigo-200 overflow-x-auto py-1 font-serif text-base sm:text-lg' : 'math-inline mx-1 text-indigo-900 dark:text-indigo-200 font-medium'} ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

/**
 * Text renderer that automatically detects inline $...$ or block $$...$$ math notation
 */
export const MixedMathText: React.FC<{ text: string; className?: string }> = ({ text, className = '' }) => {
  if (!text) return null;

  // Split by $$...$$ or $...$
  const parts = useMemo(() => {
    const tokens: Array<{ type: 'text' | 'inline-math' | 'block-math'; content: string }> = [];
    const blockRegex = /\$\$([\s\S]+?)\$\$/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    // Handle block math first
    const intermediate: Array<{ text: string; math?: string }> = [];
    while ((match = blockRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        intermediate.push({ text: text.slice(lastIndex, match.index) });
      }
      intermediate.push({ text: '', math: match[1] });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      intermediate.push({ text: text.slice(lastIndex) });
    }

    // Now handle inline math in text chunks
    intermediate.forEach((chunk) => {
      if (chunk.math !== undefined) {
        tokens.push({ type: 'block-math', content: chunk.math });
      } else {
        const inlineRegex = /\$([^$]+?)\$/g;
        let inlineLast = 0;
        let inMatch: RegExpExecArray | null;
        while ((inMatch = inlineRegex.exec(chunk.text)) !== null) {
          if (inMatch.index > inlineLast) {
            tokens.push({ type: 'text', content: chunk.text.slice(inlineLast, inMatch.index) });
          }
          tokens.push({ type: 'inline-math', content: inMatch[1] });
          inlineLast = inMatch.index + inMatch[0].length;
        }
        if (inlineLast < chunk.text.length) {
          tokens.push({ type: 'text', content: chunk.text.slice(inlineLast) });
        }
      }
    });

    return tokens;
  }, [text]);

  return (
    <span className={`leading-relaxed ${className}`}>
      {parts.map((p, idx) => {
        if (p.type === 'block-math') {
          return <MathView key={idx} math={p.content} block />;
        }
        if (p.type === 'inline-math') {
          return <MathView key={idx} math={p.content} block={false} />;
        }
        return <span key={idx}>{p.content}</span>;
      })}
    </span>
  );
};
