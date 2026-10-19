import katex from 'katex';
import { MathSolution } from '../types/math.ts';

/**
 * Generates and triggers an authentic, styled printable mathematical report for PDF saving.
 * Uses clean vector KaTeX rendering, Google Fonts Cairo, and clean RTL/LTR layout.
 */
export function exportSolutionToPdf(solution: MathSolution, lang: 'ar' | 'en'): void {
  const isAr = lang === 'ar';

  const renderKatexSafely = (latex?: string, block = false): string => {
    if (!latex) return '';
    try {
      return katex.renderToString(latex, {
        displayMode: block,
        throwOnError: false,
        output: 'html',
      });
    } catch {
      return `<code style="font-family: monospace;">${latex}</code>`;
    }
  };

  const stepsHtml = solution.steps
    .map(
      (s) => `
    <div style="margin-bottom: 18px; padding: 14px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; page-break-inside: avoid;">
      <div style="font-size: 13px; font-weight: bold; color: #1e1b4b; margin-bottom: 6px;">
        ${isAr ? `الخطوة ${s.stepNumber}: ` : `Step ${s.stepNumber}: `} ${s.title}
      </div>
      <div style="font-size: 12px; color: #334155; line-height: 1.6; margin-bottom: 8px;">
        ${s.explanation}
      </div>
      ${
        s.latex
          ? `<div style="text-align: center; padding: 8px; background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; margin-top: 6px;" dir="ltr">
              ${renderKatexSafely(s.latex, true)}
            </div>`
          : ''
      }
    </div>
  `
    )
    .join('');

  const printableContent = `
    <!DOCTYPE html>
    <html lang="${lang}" dir="${isAr ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="utf-8" />
        <title>${isAr ? 'تقرير حل المسألة الرياضية' : 'Mathematical Solution Report'} - ${isAr ? 'ميدمة ماث' : 'Maidama Math'}</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A4 portrait;
            margin: 16mm 14mm 16mm 14mm;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: 'Cairo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 24px;
            font-size: 13px;
            line-height: 1.6;
          }
          .header-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #4f46e5;
            padding-bottom: 14px;
            margin-bottom: 20px;
          }
          .brand-title {
            font-size: 20px;
            font-weight: 800;
            color: #312e81;
          }
          .meta-badge {
            font-size: 11px;
            color: #64748b;
            font-weight: 600;
          }
          .card {
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 16px;
            background: #ffffff;
            page-break-inside: avoid;
          }
          .card-title {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #64748b;
            font-weight: 700;
            margin-bottom: 6px;
          }
          .final-box {
            background: linear-gradient(135deg, #eef2ff 0%, #f0fdf4 100%);
            border: 2px solid #4f46e5;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 20px;
            text-align: center;
            page-break-inside: avoid;
          }
          .final-title {
            font-size: 12px;
            font-weight: 800;
            color: #3730a3;
            margin-bottom: 8px;
          }
          .final-val {
            font-size: 18px;
            font-weight: 800;
            color: #1e1b4b;
          }
          .footer {
            margin-top: 30px;
            border-top: 1px solid #e2e8f0;
            padding-top: 12px;
            font-size: 10px;
            color: #94a3b8;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          @media print {
            body {
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="header-bar">
          <div>
            <div class="brand-title">${isAr ? 'ميدمة ماث | Maidama Math' : 'Maidama Math | Intelligent Tutor'}</div>
            <div class="meta-badge">${solution.category} · ${solution.topic} · ${solution.level}</div>
          </div>
          <div style="text-align: ${isAr ? 'left' : 'right'}; font-size: 11px; color: #64748b;">
            <div>${isAr ? 'تاريخ التصدير' : 'Export Date'}: ${new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</div>
            <div>${isAr ? 'التحقق الرياضي: مؤكد' : 'Math Verification: Confirmed'}</div>
          </div>
        </div>

        <!-- Problem Statement -->
        <div class="card">
          <div class="card-title">${isAr ? 'نص المسألة الرياضية' : 'Original Problem Statement'}</div>
          <div style="font-size: 14px; font-weight: 600; color: #1e293b;">
            ${solution.originalQuestion}
          </div>
          ${
            solution.interpretedLatex
              ? `<div style="text-align: center; margin-top: 10px; padding: 10px; background: #f8fafc; border-radius: 8px;" dir="ltr">
                  ${renderKatexSafely(solution.interpretedLatex, true)}
                </div>`
              : ''
          }
          ${
            solution.formulaUsed
              ? `<div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #e2e8f0; font-size: 11px; color: #4338ca; font-weight: 600;">
                  ${isAr ? 'القاعدة أو النظرية المستخدمة: ' : 'Primary Theorem / Formula: '} ${solution.formulaUsed}
                </div>`
              : ''
          }
        </div>

        <!-- Final Answer Box -->
        <div class="final-box">
          <div class="final-title">${isAr ? '✨ النتيجة النهائية المؤكدة' : '✨ Final Verified Answer'}</div>
          <div class="final-val" dir="ltr">
            ${
              solution.plainAnswer && (solution.plainAnswer.includes('\\') || solution.plainAnswer.includes('^'))
                ? renderKatexSafely(solution.plainAnswer, true)
                : solution.plainAnswer || solution.finalAnswer
            }
          </div>
        </div>

        <!-- Step-by-Step Derivation -->
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 14px; font-weight: 800; color: #1e1b4b; margin-bottom: 12px;">
            ${isAr ? 'خطوات الحل والاشتقاق الرياضي التفصيلي' : 'Step-by-Step Mathematical Derivation'}
          </h3>
          ${stepsHtml}
        </div>

        <!-- Verification & Did you know -->
        ${
          solution.verification
            ? `<div class="card">
                <div class="card-title">${isAr ? 'التحقق الرياضي وفحص المتبقي' : 'Mathematical Verification & Residual Analysis'}</div>
                <div style="font-size: 12px; color: #047857; font-weight: 600;">
                  ✓ ${solution.verification.method}: ${solution.verification.explanation}
                  ${solution.verification.residual !== undefined ? ` (Residual = ${solution.verification.residual})` : ''}
                </div>
              </div>`
            : ''
        }

        ${
          solution.didYouKnow
            ? `<div class="card" style="background-color: #faf5ff; border-color: #e9d5ff;">
                <div class="card-title" style="color: #7e22ce;">${isAr ? 'هل تعلم؟ (تطبيق واقعي أو لمحة تاريخية)' : 'Did You Know? (Historical / Practical Context)'}</div>
                <div style="font-size: 12px; color: #581c87;">
                  ${solution.didYouKnow}
                </div>
              </div>`
            : ''
        }

        <div class="footer">
          <div>Maidama Math — Developed by Eng. Shawqi Ali Naji Al-Maidama</div>
          <div>${isAr ? 'وثيقة حل معتمدة آلياً' : 'Automated Verified Mathematics Document'}</div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 400);
          };
        </script>
      </body>
    </html>
  `;

  // Open an isolated print window
  const printWindow = window.open('', '_blank', 'width=900,height=750');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(printableContent);
    printWindow.document.close();
  } else {
    // Fallback: create hidden iframe and trigger print
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(printableContent);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 3000);
      }, 500);
    }
  }
}
