import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as math from 'mathjs';
import { ZoomIn, ZoomOut, RotateCcw, Plus, Trash2, Crosshair } from 'lucide-react';
import { useLocalization } from '../localization/LocalizationContext.tsx';
import { useTheme } from '../theme/ThemeContext.tsx';

interface Curve {
  id: string;
  expr: string;
  color: string;
  visible: boolean;
}

const DEFAULT_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6'];

interface GraphingCalculatorProps {
  initialExpr?: string;
  language?: 'ar' | 'en';
}

export const GraphingCalculator: React.FC<GraphingCalculatorProps> = ({
  initialExpr = 'x^2 - 4',
  language: propLanguage,
}) => {
  const { language: ctxLang, t } = useLocalization();
  const { isDark } = useTheme();
  const lang = propLanguage || ctxLang;
  const isAr = lang === 'ar';

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [curves, setCurves] = useState<Curve[]>([
    { id: '1', expr: initialExpr, color: DEFAULT_COLORS[0], visible: true },
  ]);

  const [newExprInput, setNewExprInput] = useState('');
  const [xRange, setXRange] = useState<[number, number]>([-8, 8]);
  const [yRange, setYRange] = useState<[number, number]>([-6, 6]);
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);
  const [showKeyPoints, setShowKeyPoints] = useState(true);

  // Drag state for panning
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; initialXRange: [number, number]; initialYRange: [number, number] } | null>(null);

  // Quick preset functions localized
  const presets = isAr
    ? [
        { label: 'دالة تربيعية: س² - 4', expr: 'x^2 - 4' },
        { label: 'دالة مثلثية: جا(س)', expr: 'sin(x)' },
        { label: 'دالة تكعيبية: س³ - 3س', expr: 'x^3 - 3*x' },
        { label: 'دالة كسرية: 1 / س', expr: '1 / x' },
        { label: 'دالة أسية: هـ^(-س²)', expr: 'exp(-x^2)' },
        { label: 'دالة القيمة المطلقة: |س| - 2', expr: 'abs(x) - 2' },
      ]
    : [
        { label: 'Quadratic: x² - 4', expr: 'x^2 - 4' },
        { label: 'Trig: sin(x)', expr: 'sin(x)' },
        { label: 'Cubic: x³ - 3x', expr: 'x^3 - 3*x' },
        { label: 'Rational: 1 / x', expr: '1 / x' },
        { label: 'Gaussian: exp(-x²)', expr: 'exp(-x^2)' },
        { label: 'Absolute: |x| - 2', expr: 'abs(x) - 2' },
      ];

  const addCurve = () => {
    if (!newExprInput.trim()) return;
    const nextColor = DEFAULT_COLORS[curves.length % DEFAULT_COLORS.length];
    setCurves((prev) => [
      ...prev,
      { id: Date.now().toString(), expr: newExprInput.trim(), color: nextColor, visible: true },
    ]);
    setNewExprInput('');
  };

  const removeCurve = (id: string) => {
    setCurves((prev) => prev.filter((c) => c.id !== id));
  };

  const toggleCurve = (id: string) => {
    setCurves((prev) =>
      prev.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c))
    );
  };

  const zoom = (factor: number) => {
    setXRange(([xMin, xMax]) => {
      const mid = (xMin + xMax) / 2;
      const span = (xMax - xMin) * factor;
      return [mid - span / 2, mid + span / 2];
    });
    setYRange(([yMin, yMax]) => {
      const mid = (yMin + yMax) / 2;
      const span = (yMax - yMin) * factor;
      return [mid - span / 2, mid + span / 2];
    });
  };

  const resetView = () => {
    setXRange([-8, 8]);
    setYRange([-6, 6]);
  };

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const [xMin, xMax] = xRange;
    const [yMin, yMax] = yRange;

    // Coordinate conversion helpers
    const toCanvasX = (x: number) => ((x - xMin) / (xMax - xMin)) * width;
    const toCanvasY = (y: number) => height - ((y - yMin) / (yMax - yMin)) * height;

    // Clear background
    ctx.fillStyle = isDark ? '#090d16' : '#f8fafc';
    ctx.fillRect(0, 0, width, height);

    // Grid calculation
    const xSpan = xMax - xMin;
    let step = 1;
    if (xSpan > 40) step = 10;
    else if (xSpan > 20) step = 5;
    else if (xSpan > 10) step = 2;
    else if (xSpan < 3) step = 0.5;
    else if (xSpan < 1) step = 0.2;

    const gridColorMinor = isDark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(226, 232, 240, 0.9)';
    const gridColorAxis = isDark ? '#475569' : '#94a3b8';
    const tickTextColor = isDark ? '#64748b' : '#64748b';

    // Vertical grid lines & X ticks
    const firstX = Math.floor(xMin / step) * step;
    ctx.font = '10px monospace';
    ctx.fillStyle = tickTextColor;
    ctx.textAlign = 'center';

    for (let x = firstX; x <= xMax; x += step) {
      const cx = toCanvasX(x);
      ctx.beginPath();
      ctx.strokeStyle = Math.abs(x) < 1e-6 ? gridColorAxis : gridColorMinor;
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, height);
      ctx.stroke();

      if (Math.abs(x) > 1e-6) {
        ctx.fillText(Number(x.toFixed(2)).toString(), cx, toCanvasY(0) + 14);
      }
    }

    // Horizontal grid lines & Y ticks
    const firstY = Math.floor(yMin / step) * step;
    ctx.textAlign = 'right';

    for (let y = firstY; y <= yMax; y += step) {
      const cy = toCanvasY(y);
      ctx.beginPath();
      ctx.strokeStyle = Math.abs(y) < 1e-6 ? gridColorAxis : gridColorMinor;
      ctx.moveTo(0, cy);
      ctx.lineTo(width, cy);
      ctx.stroke();

      if (Math.abs(y) > 1e-6) {
        ctx.fillText(Number(y.toFixed(2)).toString(), toCanvasX(0) - 6, cy + 3);
      }
    }

    // Main Axes (X & Y)
    ctx.lineWidth = 2;
    ctx.strokeStyle = isDark ? '#94a3b8' : '#475569';

    // X Axis
    const originY = toCanvasY(0);
    ctx.beginPath();
    ctx.moveTo(0, originY);
    ctx.lineTo(width, originY);
    ctx.stroke();

    // Y Axis
    const originX = toCanvasX(0);
    ctx.beginPath();
    ctx.moveTo(originX, 0);
    ctx.lineTo(originX, height);
    ctx.stroke();

    // Axis End Labels
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = isDark ? '#38bdf8' : '#0284c7';
    ctx.textAlign = 'right';
    ctx.fillText(isAr ? 'محور س' : 'x-axis', width - 10, originY - 8);

    ctx.textAlign = 'left';
    ctx.fillText(isAr ? 'محور ص' : 'y-axis', originX + 8, 16);

    // Plot Curves
    curves.forEach((curve) => {
      if (!curve.visible || !curve.expr.trim()) return;

      let compiled: any;
      try {
        compiled = math.compile(curve.expr);
      } catch {
        return;
      }

      ctx.beginPath();
      ctx.strokeStyle = curve.color;
      ctx.lineWidth = 2.5;

      const numPoints = width;
      let isFirst = true;
      let prevYVal: number | null = null;
      let prevCy: number | null = null;

      for (let i = 0; i <= numPoints; i++) {
        const x = xMin + (i / numPoints) * (xMax - xMin);
        try {
          const y = compiled.evaluate({ x, Math });
          if (typeof y === 'number' && !isNaN(y) && isFinite(y)) {
            const cx = toCanvasX(x);
            const cy = toCanvasY(y);

            // Skip huge jumps across vertical asymptotes
            if (prevYVal !== null && prevCy !== null) {
              const yDiff = Math.abs(y - prevYVal);
              const cyDiff = Math.abs(cy - prevCy);
              if (yDiff > (yMax - yMin) * 2 || cyDiff > height * 1.5) {
                isFirst = true;
              }
            }

            if (isFirst) {
              ctx.moveTo(cx, cy);
              isFirst = false;
            } else {
              ctx.lineTo(cx, cy);
            }

            prevYVal = y;
            prevCy = cy;
          } else {
            isFirst = true;
            prevYVal = null;
            prevCy = null;
          }
        } catch {
          isFirst = true;
          prevYVal = null;
          prevCy = null;
        }
      }
      ctx.stroke();

      // Find and plot roots / key points if enabled
      if (showKeyPoints) {
        const sampleStep = (xMax - xMin) / 150;
        let prevY: number | null = null;
        let prevX: number = xMin;

        for (let x = xMin; x <= xMax; x += sampleStep) {
          try {
            const y = compiled.evaluate({ x, Math });
            if (typeof y === 'number' && isFinite(y)) {
              // Sign change implies a root!
              if (prevY !== null && prevY * y <= 0 && Math.abs(y - prevY) < 5) {
                // Approximate root via linear interpolation
                const rootX = prevX + (-prevY / (y - prevY)) * (x - prevX);
                const rcx = toCanvasX(rootX);
                const rcy = toCanvasY(0);

                ctx.fillStyle = '#ef4444'; // Red dot for root
                ctx.beginPath();
                ctx.arc(rcx, rcy, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = isDark ? '#ffffff' : '#0f172a';
                ctx.lineWidth = 1.5;
                ctx.stroke();

                ctx.fillStyle = isDark ? '#fca5a5' : '#b91c1c';
                ctx.font = 'bold 10px monospace';
                ctx.textAlign = 'center';
                const rootLabel = isAr ? `جذر: ${rootX.toFixed(2)}` : `(${rootX.toFixed(2)}, 0)`;
                ctx.fillText(rootLabel, rcx, rcy - 8);
              }
              prevY = y;
              prevX = x;
            } else {
              prevY = null;
            }
          } catch {
            prevY = null;
          }
        }

        // Y-intercept
        try {
          const y0 = compiled.evaluate({ x: 0, Math });
          if (typeof y0 === 'number' && isFinite(y0)) {
            const icx = toCanvasX(0);
            const icy = toCanvasY(y0);
            ctx.fillStyle = '#38bdf8'; // Blue dot for y-intercept
            ctx.beginPath();
            ctx.arc(icx, icy, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = isDark ? '#ffffff' : '#0f172a';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        } catch {
          // ignore
        }
      }
    });

    // Crosshair and hover coordinate inspector
    if (hoverCoord) {
      const hcx = toCanvasX(hoverCoord.x);
      const hcy = toCanvasY(hoverCoord.y);

      ctx.strokeStyle = isDark ? 'rgba(244, 63, 94, 0.7)' : 'rgba(225, 29, 72, 0.7)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.2;

      ctx.beginPath();
      ctx.moveTo(hcx, 0);
      ctx.lineTo(hcx, height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, hcy);
      ctx.lineTo(width, hcy);
      ctx.stroke();

      ctx.setLineDash([]);
    }
  }, [curves, xRange, yRange, hoverCoord, showKeyPoints, isAr, isDark]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas && canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = 420;
        renderCanvas();
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderCanvas]);

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      initialXRange: [...xRange],
      initialYRange: [...yRange],
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseCanvasX = e.clientX - rect.left;
    const mouseCanvasY = e.clientY - rect.top;

    const [xMin, xMax] = xRange;
    const [yMin, yMax] = yRange;

    const mathX = xMin + (mouseCanvasX / canvas.width) * (xMax - xMin);
    const mathY = yMax - (mouseCanvasY / canvas.height) * (yMax - yMin);

    setHoverCoord({ x: mathX, y: mathY });

    if (isDraggingRef.current && dragStartRef.current) {
      const dxPixels = e.clientX - dragStartRef.current.mouseX;
      const dyPixels = e.clientY - dragStartRef.current.mouseY;

      const spanX = dragStartRef.current.initialXRange[1] - dragStartRef.current.initialXRange[0];
      const spanY = dragStartRef.current.initialYRange[1] - dragStartRef.current.initialYRange[0];

      const dxMath = (dxPixels / canvas.width) * spanX;
      const dyMath = (dyPixels / canvas.height) * spanY;

      setXRange([
        dragStartRef.current.initialXRange[0] - dxMath,
        dragStartRef.current.initialXRange[1] - dxMath,
      ]);
      setYRange([
        dragStartRef.current.initialYRange[0] + dyMath,
        dragStartRef.current.initialYRange[1] + dyMath,
      ]);
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    dragStartRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 0.9 : 1.1;
    zoom(zoomFactor);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4 transition-colors">
      {/* Top Header & Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>📈</span>
            {t('graph.title')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t('graph.subtitle')}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => zoom(0.8)}
            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 transition min-w-[36px] min-h-[36px] flex items-center justify-center"
            title={t('graph.zoomIn')}
            aria-label={t('graph.zoomIn')}
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => zoom(1.25)}
            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 transition min-w-[36px] min-h-[36px] flex items-center justify-center"
            title={t('graph.zoomOut')}
            aria-label={t('graph.zoomOut')}
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={resetView}
            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 transition min-w-[36px] min-h-[36px] flex items-center justify-center"
            title={t('graph.resetView')}
            aria-label={t('graph.resetView')}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowKeyPoints((v) => !v)}
            className={`px-3 py-2 text-xs rounded-xl border transition font-medium flex items-center gap-1.5 min-h-[36px] ${
              showKeyPoints
                ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-600 text-rose-700 dark:text-rose-300'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>{t('graph.rootsAndIntercepts')}</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 cursor-crosshair shadow-inner bg-slate-50 dark:bg-slate-950">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            handleMouseUp();
            setHoverCoord(null);
          }}
          onWheel={handleWheel}
          className="graphing-calculator-canvas w-full h-[420px] block"
        />

        {/* Coordinate Tooltip in bottom */}
        {hoverCoord && (
          <div className="absolute bottom-3 rtl:left-3 ltr:left-3 bg-white/95 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono text-xs px-3 py-1.5 rounded-xl shadow-lg pointer-events-none backdrop-blur-sm">
            <span>{t('graph.coordX')}: {hoverCoord.x.toFixed(3)}</span>
            <span className="mx-2 text-slate-300 dark:text-slate-600">|</span>
            <span>{t('graph.coordY')}: {hoverCoord.y.toFixed(3)}</span>
          </div>
        )}
      </div>

      {/* Preset Functions */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          {t('graph.quickPresets')}
        </span>
        {presets.map((p, idx) => (
          <button
            key={idx}
            onClick={() => {
              setCurves([{ id: '1', expr: p.expr, color: DEFAULT_COLORS[0], visible: true }]);
            }}
            className="text-xs bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-200 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/60 transition font-sans"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Curves Management List */}
      <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-3">
        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {t('graph.activeCurves')}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {curves.map((curve) => (
            <div
              key={curve.id}
              className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl px-3 py-2"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: curve.color }}
                />
                <span className="font-mono text-xs text-slate-800 dark:text-slate-200 truncate" dir="ltr">
                  f(x) = {curve.expr}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => toggleCurve(curve.id)}
                  className={`text-xs px-2.5 py-1 rounded-lg transition font-medium ${
                    curve.visible
                      ? 'bg-indigo-100 dark:bg-indigo-600/30 text-indigo-700 dark:text-indigo-300'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                  }`}
                >
                  {curve.visible ? t('graph.hideCurve') : t('graph.showCurve')}
                </button>
                {curves.length > 1 && (
                  <button
                    onClick={() => removeCurve(curve.id)}
                    className="text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    aria-label="Remove curve"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add Another Function Input */}
        <div className="flex gap-2 mt-2">
          <input
            type="text"
            value={newExprInput}
            onChange={(e) => setNewExprInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCurve()}
            placeholder={t('graph.addCurvePlaceholder')}
            className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            dir="ltr"
          />
          <button
            onClick={addCurve}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-4 py-2 rounded-xl flex items-center gap-1.5 transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('graph.addCurveButton')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
