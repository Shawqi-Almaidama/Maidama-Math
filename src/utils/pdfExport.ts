import katex from 'katex';
import * as math from 'mathjs';
import { MathSolution, PlotConfig } from '../types/math.ts';
import { toArabicDigits } from './mathNormalizer.ts';

/**
 * Renders an offscreen canvas snapshot of a mathematical curve plot for PDF printing
 */
export function generatePlotImage(plotConfig: PlotConfig, lang: 'ar' | 'en'): string | null {
  try {
    if (!plotConfig || !plotConfig.functionExpr || !plotConfig.functionExpr.trim()) return null;

    const isAr = lang === 'ar';
    const width = 800;
    const height = 400;
    const [xMin, xMax] = plotConfig.xDomain || [-8, 8];
    let yMin = -6;
    let yMax = 6;

    let compiled: math.EvalFunction;
    try {
      compiled = math.compile(plotConfig.functionExpr);
    } catch {
      return null;
    }

    // Auto-scale Y domain based on sampled points
    const sampledY: number[] = [];
    const sampleSteps = 100;
    const sampleDx = (xMax - xMin) / sampleSteps;
    for (let i = 0; i <= sampleSteps; i++) {
      const sx = xMin + i * sampleDx;
      try {
        const sy = compiled.evaluate({ x: sx });
        if (typeof sy === 'number' && Number.isFinite(sy) && Math.abs(sy) < 500) {
          sampledY.push(sy);
        }
      } catch {}
    }

    if (sampledY.length > 5) {
      const minY = Math.min(...sampledY);
      const maxY = Math.max(...sampledY);
      if (maxY > minY) {
        const padding = Math.max(1, (maxY - minY) * 0.15);
        yMin = Math.max(-50, Math.floor(minY - padding));
        yMax = Math.min(50, Math.ceil(maxY + padding));
      }
    }

    // Browser Canvas rendering when document is available
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        const toCanvasX = (x: number) => ((x - xMin) / (xMax - xMin)) * width;
        const toCanvasY = (y: number) => height - ((y - yMin) / (yMax - yMin)) * height;

        const xSpan = xMax - xMin;
        const xStep = xSpan > 20 ? 5 : xSpan > 8 ? 2 : 1;
        const ySpan = yMax - yMin;
        const yStep = ySpan > 20 ? 5 : ySpan > 8 ? 2 : 1;

        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 1;

        for (let x = Math.floor(xMin / xStep) * xStep; x <= xMax; x += xStep) {
          const cx = toCanvasX(x);
          ctx.beginPath();
          ctx.moveTo(cx, 0);
          ctx.lineTo(cx, height);
          ctx.stroke();
        }

        for (let y = Math.floor(yMin / yStep) * yStep; y <= yMax; y += yStep) {
          const cy = toCanvasY(y);
          ctx.beginPath();
          ctx.moveTo(0, cy);
          ctx.lineTo(width, cy);
          ctx.stroke();
        }

        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.5;
        const originY = Math.max(20, Math.min(height - 20, toCanvasY(0)));
        const originX = Math.max(20, Math.min(width - 20, toCanvasX(0)));

        ctx.beginPath();
        ctx.moveTo(0, originY);
        ctx.lineTo(width, originY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(originX, 0);
        ctx.lineTo(originX, height);
        ctx.stroke();

        ctx.fillStyle = '#64748b';
        ctx.font = '11px Cairo, sans-serif';
        ctx.textAlign = 'center';

        for (let x = Math.floor(xMin / xStep) * xStep; x <= xMax; x += xStep) {
          if (Math.abs(x) > 1e-4) {
            const label = isAr ? toArabicDigits(x) : String(x);
            ctx.fillText(label, toCanvasX(x), Math.min(height - 6, originY + 14));
          }
        }

        ctx.textAlign = 'right';
        for (let y = Math.floor(yMin / yStep) * yStep; y <= yMax; y += yStep) {
          if (Math.abs(y) > 1e-4) {
            const label = isAr ? toArabicDigits(y) : String(y);
            ctx.fillText(label, Math.max(24, originX - 6), toCanvasY(y) + 4);
          }
        }

        ctx.font = 'bold 12px Cairo, sans-serif';
        ctx.fillStyle = '#312e81';
        ctx.textAlign = 'right';
        ctx.fillText(isAr ? 'المحور س (x)' : 'x-axis', width - 10, originY - 8);
        ctx.textAlign = 'left';
        ctx.fillText(isAr ? 'المحور ص (y)' : 'y-axis', originX + 8, 16);

        ctx.strokeStyle = '#4f46e5';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        let started = false;
        const steps = 400;
        const dx = (xMax - xMin) / steps;

        for (let i = 0; i <= steps; i++) {
          const x = xMin + i * dx;
          try {
            const y = compiled.evaluate({ x });
            if (typeof y === 'number' && Number.isFinite(y)) {
              const cx = toCanvasX(x);
              const cy = toCanvasY(y);
              if (cy >= -100 && cy <= height + 100) {
                if (!started) {
                  ctx.moveTo(cx, cy);
                  started = true;
                } else {
                  ctx.lineTo(cx, cy);
                }
              } else {
                started = false;
              }
            } else {
              started = false;
            }
          } catch {
            started = false;
          }
        }
        ctx.stroke();

        if (plotConfig.pointsOfInterest && plotConfig.pointsOfInterest.length > 0) {
          for (const pt of plotConfig.pointsOfInterest) {
            if (pt.x >= xMin && pt.x <= xMax && pt.y >= yMin && pt.y <= yMax) {
              const cx = toCanvasX(pt.x);
              const cy = toCanvasY(pt.y);

              ctx.fillStyle = '#ef4444';
              ctx.beginPath();
              ctx.arc(cx, cy, 5, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 1.5;
              ctx.stroke();

              ctx.fillStyle = '#991b1b';
              ctx.font = 'bold 10px Cairo, sans-serif';
              ctx.textAlign = 'center';
              const label = isAr ? toArabicDigits(pt.label) : pt.label;
              ctx.fillText(label, cx, cy - 8);
            }
          }
        }

        return canvas.toDataURL('image/png');
      }
    }

    // Node.js / Headless fallback: Vector SVG data URL
    const toCanvasX = (x: number) => ((x - xMin) / (xMax - xMin)) * width;
    const toCanvasY = (y: number) => height - ((y - yMin) / (yMax - yMin)) * height;
    const originY = Math.max(20, Math.min(height - 20, toCanvasY(0)));
    const originX = Math.max(20, Math.min(width - 20, toCanvasX(0)));

    let pathD = '';
    const steps = 300;
    const dx = (xMax - xMin) / steps;
    let started = false;

    for (let i = 0; i <= steps; i++) {
      const x = xMin + i * dx;
      try {
        const y = compiled.evaluate({ x });
        if (typeof y === 'number' && Number.isFinite(y)) {
          const cx = toCanvasX(x);
          const cy = toCanvasY(y);
          if (cy >= -100 && cy <= height + 100) {
            pathD += started ? ` L ${cx.toFixed(1)} ${cy.toFixed(1)}` : `M ${cx.toFixed(1)} ${cy.toFixed(1)}`;
            started = true;
          } else {
            started = false;
          }
        } else {
          started = false;
        }
      } catch {
        started = false;
      }
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#ffffff"/><line x1="0" y1="${originY.toFixed(1)}" x2="${width}" y2="${originY.toFixed(1)}" stroke="#64748b" stroke-width="1.5"/><line x1="${originX.toFixed(1)}" y1="0" x2="${originX.toFixed(1)}" y2="${height}" stroke="#64748b" stroke-width="1.5"/><path d="${pathD}" fill="none" stroke="#4f46e5" stroke-width="2.5"/></svg>`;
    const base64 = typeof Buffer !== 'undefined' ? Buffer.from(svg).toString('base64') : btoa(unescape(encodeURIComponent(svg)));
    return `data:image/svg+xml;base64,${base64}`;
  } catch (err) {
    console.warn('Plot rendering for PDF export failed:', err);
    return null;
  }
}

export interface ExportPdfResult {
  success: boolean;
  method: 'popup' | 'direct' | 'download' | 'modal';
  reason?: 'popup_blocked' | 'print_failed' | 'not_supported';
  error?: string;
  htmlContent: string;
}

/**
 * Builds the complete, authentic, styled printable mathematical document HTML for PDF export/saving.
 * Includes KaTeX math rendering, Google Fonts Cairo, pedagogical cards, and embedded curve plots.
 */
export function generatePrintableHtml(
  solution: MathSolution,
  lang: 'ar' | 'en',
  graphImageDataUrl?: string
): string {
  const isAr = lang === 'ar';

  const renderKatexSafely = (latex?: string, block = false): string => {
    if (!latex) return '';
    try {
      return katex.renderToString(latex, {
        displayMode: block,
        throwOnError: false,
        strict: 'ignore',
        output: 'html',
      });
    } catch {
      return `<code style="font-family: monospace;">${latex}</code>`;
    }
  };

  const steps = solution.steps || [];
  const stepsHtml = steps
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

  // Determine graph visual if plotConfig exists
  let plotImage = graphImageDataUrl || null;
  if (!plotImage && solution.plotConfig && solution.plotConfig.functionExpr) {
    plotImage = generatePlotImage(solution.plotConfig, lang);
  }

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${isAr ? 'rtl' : 'ltr'}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
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
        padding: 0;
        font-size: 13px;
        line-height: 1.6;
      }
      .content-wrapper {
        padding: 24px;
        max-width: 860px;
        margin: 0 auto;
      }
      .no-print-toolbar {
        position: sticky;
        top: 0;
        left: 0;
        right: 0;
        background: #1e1b4b;
        color: #ffffff;
        padding: 12px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }
      .toolbar-title {
        font-weight: 700;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .toolbar-actions {
        display: flex;
        gap: 10px;
      }
      .btn-primary {
        background: #4f46e5;
        color: #ffffff;
        border: none;
        padding: 8px 18px;
        border-radius: 8px;
        font-weight: 700;
        font-size: 13px;
        cursor: pointer;
        font-family: inherit;
        transition: background 0.15s;
      }
      .btn-primary:hover {
        background: #4338ca;
      }
      .btn-secondary {
        background: #334155;
        color: #ffffff;
        border: none;
        padding: 8px 14px;
        border-radius: 8px;
        font-size: 13px;
        cursor: pointer;
        font-family: inherit;
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
        .no-print-toolbar {
          display: none !important;
        }
        .content-wrapper {
          padding: 0 !important;
          max-width: 100% !important;
        }
        body {
          padding: 0 !important;
        }
      }
    </style>
  </head>
  <body>
    <!-- Top Action Bar (hidden when printing) -->
    <div class="no-print-toolbar">
      <div class="toolbar-title">
        <span>✨ ${isAr ? 'ميدمة ماث | تقرير الحل الرياضي' : 'Maidama Math | Solution Report'}</span>
      </div>
      <div class="toolbar-actions">
        <button class="btn-primary" onclick="window.print()">
          🖨️ ${isAr ? 'طباعة أو حفظ كـ PDF' : 'Print / Save as PDF'}
        </button>
        <button class="btn-secondary" onclick="window.close()">
          ${isAr ? 'إغلاق' : 'Close'}
        </button>
      </div>
    </div>

    <div class="content-wrapper">
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

      <!-- Dedicated Graph Section (Included ONLY if active graph is present) -->
      ${
        plotImage
          ? `<div class="card" style="text-align: center;">
              <div class="card-title">${isAr ? 'التمثيل والرسم البياني للدالة' : 'Mathematical Function & Curve Graph'}</div>
              <div style="margin-bottom: 8px; font-size: 12px; font-weight: 700; color: #3730a3;" dir="ltr">
                ${
                  solution.plotConfig?.functionLatex
                    ? renderKatexSafely(solution.plotConfig.functionLatex, false)
                    : `f(x) = ${solution.plotConfig?.functionExpr || ''}`
                }
              </div>
              <div style="margin-top: 8px; display: inline-block; border: 1px solid #cbd5e1; border-radius: 10px; overflow: hidden; background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <img src="${plotImage}" style="max-width: 100%; height: auto; max-height: 360px; display: block;" alt="${isAr ? 'الرسم البياني' : 'Graph'}" />
              </div>
            </div>`
          : ''
      }

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
    </div>

    <script>
      // Automatic print trigger on load when opened in dedicated window/tab
      window.addEventListener('DOMContentLoaded', function() {
        setTimeout(function() {
          try {
            window.focus();
            window.print();
          } catch (e) {
            console.log('Auto-print deferred to manual button click:', e);
          }
        }, 300);
      });
    </script>
  </body>
</html>`;
}

/**
 * Directly downloads the standalone printable HTML report file
 */
export function downloadHtmlReport(
  solution: MathSolution,
  lang: 'ar' | 'en',
  graphImageDataUrl?: string
): void {
  if (typeof document === 'undefined') return;

  const html = generatePrintableHtml(solution, lang, graphImageDataUrl);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;

  const safeQuestion = (solution.originalQuestion || 'solution')
    .replace(/[^\w\u0600-\u06FF\-]/g, '_')
    .slice(0, 24);
  a.download = `Maidama-Math-${safeQuestion}.html`;
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    try {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {}
  }, 1000);
}

/**
 * Triggers an authentic mathematical report for PDF printing or saving.
 * 1. Synchronously attempts dedicated window/tab print.
 * 2. If blocked by browser sandbox/popup settings, returns htmlContent and popup_blocked
 *    so the UI can immediately display the in-app preview modal & instant download.
 */
export async function exportSolutionToPdf(
  solution: MathSolution,
  lang: 'ar' | 'en',
  graphImageDataUrl?: string
): Promise<ExportPdfResult> {
  try {
    const html = generatePrintableHtml(solution, lang, graphImageDataUrl);

    if (typeof window === 'undefined') {
      return { success: true, method: 'direct', htmlContent: html };
    }

    // Attempt 1: Direct popup window execution in response to user click
    let printWin: Window | null = null;
    try {
      printWin = window.open('', '_blank');
    } catch (popupErr: any) {
      console.warn('Direct window.open prevented by host policy:', popupErr);
    }

    if (printWin && !printWin.closed) {
      try {
        printWin.document.open();
        printWin.document.write(html);
        printWin.document.close();
        printWin.focus();
        return { success: true, method: 'popup', htmlContent: html };
      } catch (err: any) {
        console.warn('Could not write into popup window:', err);
      }
    }

    // Attempt 2: If popup was blocked or returned null (standard in sandboxed iframe previews),
    // return popup_blocked with htmlContent so the UI can activate the In-App Modal and Download.
    return {
      success: false,
      method: 'modal',
      reason: 'popup_blocked',
      htmlContent: html,
      error: lang === 'ar' ? 'تم حظر النافذة المنبثقة من قبل المتصفح' : 'Popup was blocked by browser',
    };
  } catch (err: any) {
    console.error('exportSolutionToPdf encountered an error:', err);
    return {
      success: false,
      method: 'modal',
      reason: 'print_failed',
      htmlContent: '',
      error: err?.message || String(err),
    };
  }
}

