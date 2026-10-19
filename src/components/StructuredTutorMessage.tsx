import React, { useState, useMemo } from 'react';
import { Copy, Check, Sparkles } from 'lucide-react';
import { MathView } from './MathView.tsx';

interface StructuredTutorMessageProps {
  text: string;
  isUser: boolean;
  language?: 'ar' | 'en';
}

/**
 * Strips raw markdown formatting asterisks and tags for clean clipboard copying
 */
export function cleanTextForCopy(rawText: string): string {
  let cleaned = rawText;
  // Remove bold/italic markers
  cleaned = cleaned.replace(/\*\*\*([^*]+)\*\*\*/g, '$1');
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
  cleaned = cleaned.replace(/_([^_]+)_/g, '$1');
  // Clean markdown headings
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');
  // Format math delimiters cleanly for plain text reading
  cleaned = cleaned.replace(/\$\$([\s\S]+?)\$\$/g, '\n[$1]\n');
  cleaned = cleaned.replace(/\$([^\$\n]+?)\$/g, '$1');
  return cleaned.trim();
}

/**
 * Renders an inline text segment, parsing bold, italic, and math ($...$)
 */
const InlineFormattedText: React.FC<{ text: string }> = ({ text }) => {
  const parts = useMemo(() => {
    // Regex matches inline math $...$
    const mathRegex = /\$([^\$\n]+?)\$/g;
    const segments: Array<{ type: 'text' | 'math'; content: string }> = [];
    let lastIdx = 0;
    let match: RegExpExecArray | null;

    while ((match = mathRegex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        segments.push({ type: 'text', content: text.slice(lastIdx, match.index) });
      }
      segments.push({ type: 'math', content: match[1] });
      lastIdx = mathRegex.lastIndex;
    }
    if (lastIdx < text.length) {
      segments.push({ type: 'text', content: text.slice(lastIdx) });
    }
    return segments;
  }, [text]);

  return (
    <>
      {parts.map((seg, idx) => {
        if (seg.type === 'math') {
          return <MathView key={idx} math={seg.content} block={false} />;
        }

        // Parse bold **...** and italic *...* in text segment
        const boldRegex = /\*\*([^*]+)\*\*/g;
        const subParts: React.ReactNode[] = [];
        let subLast = 0;
        let bMatch: RegExpExecArray | null;

        while ((bMatch = boldRegex.exec(seg.content)) !== null) {
          if (bMatch.index > subLast) {
            subParts.push(seg.content.slice(subLast, bMatch.index));
          }
          subParts.push(
            <strong key={`b-${bMatch.index}`} className="font-bold text-indigo-950 dark:text-indigo-200">
              {bMatch[1]}
            </strong>
          );
          subLast = boldRegex.lastIndex;
        }
        if (subLast < seg.content.length) {
          subParts.push(seg.content.slice(subLast));
        }

        return <span key={idx}>{subParts}</span>;
      })}
    </>
  );
};

export const StructuredTutorMessage: React.FC<StructuredTutorMessageProps> = ({
  text,
  isUser,
  language = 'ar',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      const clean = cleanTextForCopy(text);
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(clean);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.warn('Clipboard copy failed:', err);
    }
  };

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed bg-indigo-600 text-white rounded-br-none shadow-sm"
          dir="auto"
        >
          {text}
        </div>
      </div>
    );
  }

  // Assistant tutor response formatting: parse blocks (headers, lists, block math, paragraphs)
  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;

  const flushList = (keyPrefix: number) => {
    if (!currentList) return;
    const ListTag = currentList.type;
    blocks.push(
      <ListTag
        key={`list-${keyPrefix}`}
        className={`my-2 space-y-1 text-xs text-slate-800 dark:text-slate-200 ${
          currentList.type === 'ol' ? 'list-decimal rtl:pr-5 ltr:pl-5' : 'list-disc rtl:pr-5 ltr:pl-5'
        }`}
      >
        {currentList.items.map((item, itemIdx) => (
          <li key={itemIdx} className="leading-relaxed">
            <InlineFormattedText text={item} />
          </li>
        ))}
      </ListTag>
    );
    currentList = null;
  };

  let i = 0;
  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Empty line flushes active list
    if (!trimmed) {
      flushList(i);
      i++;
      continue;
    }

    // Block math $$...$$
    if (trimmed.startsWith('$$')) {
      flushList(i);
      let mathContent = trimmed;
      if (!trimmed.endsWith('$$') || trimmed === '$$') {
        // Multi-line block math
        const mathLines: string[] = [trimmed.replace(/^\$\$/, '')];
        i++;
        while (i < lines.length && !lines[i].includes('$$')) {
          mathLines.push(lines[i]);
          i++;
        }
        if (i < lines.length) {
          mathLines.push(lines[i].replace(/\$\$/, ''));
        }
        mathContent = mathLines.join('\n');
      } else {
        mathContent = trimmed.slice(2, -2);
      }

      blocks.push(
        <div
          key={`math-block-${i}`}
          className="my-2.5 p-2 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-center overflow-x-auto"
        >
          <MathView math={mathContent} block />
        </div>
      );
      i++;
      continue;
    }

    // Markdown Heading 3 (###) or Heading 2 (##) or Heading 1 (#)
    if (trimmed.startsWith('### ')) {
      flushList(i);
      blocks.push(
        <h4
          key={`h3-${i}`}
          className="font-bold text-xs sm:text-sm text-indigo-900 dark:text-indigo-300 mt-3 mb-1.5 flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <InlineFormattedText text={trimmed.slice(4)} />
        </h4>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
      flushList(i);
      const title = trimmed.replace(/^#+\s*/, '');
      blocks.push(
        <h3
          key={`h2-${i}`}
          className="font-extrabold text-sm text-slate-900 dark:text-slate-100 mt-3 mb-1.5"
        >
          <InlineFormattedText text={title} />
        </h3>
      );
      i++;
      continue;
    }

    // Numbered list item (e.g. "1. ", "2. ", "١. ")
    const numMatch = trimmed.match(/^([0-9١-٩]+)[\.\)]\s+(.+)$/);
    if (numMatch) {
      if (!currentList || currentList.type !== 'ol') {
        flushList(i);
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(numMatch[2]);
      i++;
      continue;
    }

    // Bullet list item (e.g. "- ", "* ", "• ")
    const bulletMatch = trimmed.match(/^[\*\-•]\s+(.+)$/);
    if (bulletMatch) {
      if (!currentList || currentList.type !== 'ul') {
        flushList(i);
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(bulletMatch[1]);
      i++;
      continue;
    }

    // Regular paragraph
    flushList(i);
    blocks.push(
      <p key={`p-${i}`} className="my-1.5 text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
        <InlineFormattedText text={trimmed} />
      </p>
    );
    i++;
  }

  flushList(lines.length);

  return (
    <div className="flex justify-start group">
      <div className="max-w-[92%] sm:max-w-[85%] rounded-2xl p-4 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 rounded-bl-none shadow-xs space-y-1 relative transition-colors">
        {/* Copy Button */}
        <div className="flex items-center justify-end pb-1 border-b border-slate-200/60 dark:border-slate-700/60 mb-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition cursor-pointer"
            title={language === 'ar' ? 'نسخ الإجابة' : 'Copy explanation'}
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-600 dark:text-emerald-400">
                  {language === 'ar' ? 'تم النسخ' : 'Copied'}
                </span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>{language === 'ar' ? 'نسخ الإجابة' : 'Copy'}</span>
              </>
            )}
          </button>
        </div>

        {/* Formatted Content */}
        <div className="overflow-x-auto" dir="auto">
          {blocks}
        </div>
      </div>
    </div>
  );
};
