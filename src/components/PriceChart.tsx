"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  ComposedChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";
import { LayoutGrid, BarChart2, Settings, Maximize2, X } from "lucide-react";

/* ─── Types ─── */
type Point = {
  date: string;
  close: number;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  sma20?: number | null;
  sma50?: number | null;
  sma200?: number | null;
};

type RangeKey = "1min" | "5min" | "30min" | "1h" | "1mo" | "3mo" | "6mo" | "1y" | "5y" | "10y";
type ChartType = "line" | "candle";
type SmaId = "sma20" | "sma50" | "sma200";

/* ─── Constants ─── */
const INTRADAY_RANGES: RangeKey[] = ["1min", "5min", "30min", "1h"];

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "1min", label: "1分" },
  { key: "5min", label: "5分" },
  { key: "30min",label: "30分" },
  { key: "1h",   label: "1時間" },
  { key: "1mo",  label: "1ヶ月" },
  { key: "3mo",  label: "3ヶ月" },
  { key: "6mo",  label: "6ヶ月" },
  { key: "1y",   label: "1年" },
  { key: "5y",   label: "5年" },
  { key: "10y",  label: "10年" },
];

const SMA_OPTIONS: { id: SmaId; label: string; color: string; periods: number }[] = [
  { id: "sma20",  label: "SMA20",  color: "#f59e0b", periods: 20  },
  { id: "sma50",  label: "SMA50",  color: "#10b981", periods: 50  },
  { id: "sma200", label: "SMA200", color: "#ef4444", periods: 200 },
];

const DEFAULT_PANEL_KEYS: RangeKey[] = ["5min", "1h", "3mo", "1y"];
const PANEL_STORAGE_KEY = "chart-panels-v2";
const ALL_PANELS: { key: RangeKey; label: string }[] = RANGES;

/* ─── Helpers ─── */
function computeSMA(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < period) return out;
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

function fmtLabel(date: string, range: RangeKey): string {
  const d = new Date(date);
  if (range === "1min" || range === "5min" || range === "30min") {
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  }
  if (range === "1h") {
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:00`;
  }
  if (range === "5y" || range === "10y") {
    return `${d.getFullYear()}/${d.getMonth() + 1}`;
  }
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function loadPanelKeys(): RangeKey[] {
  try {
    const stored = localStorage.getItem(PANEL_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as RangeKey[];
      if (Array.isArray(parsed) && parsed.length > 0 && parsed.length <= 4) return parsed;
    }
  } catch { /* ignore */ }
  return DEFAULT_PANEL_KEYS;
}

function savePanelKeys(keys: RangeKey[]) {
  try { localStorage.setItem(PANEL_STORAGE_KEY, JSON.stringify(keys)); } catch { /* ignore */ }
}

/* ─── CandlestickCanvas ─── */
function CandlestickCanvas({ data, width, height, currency, fmt, compact, range }: {
  data: Point[];
  width: number;
  height: number;
  currency?: string | null;
  fmt: (v: number) => string;
  compact?: boolean;
  range?: RangeKey;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (width <= 0 || data.length === 0) return null;

  const margin = compact
    ? { top: 4, right: 4, left: 48, bottom: 20 }
    : { top: 10, right: 16, left: 72, bottom: 28 };
  const plotW = Math.max(width - margin.left - margin.right, 1);
  const plotH = Math.max(height - margin.top - margin.bottom, 1);

  const allVals: number[] = [];
  for (const d of data) {
    allVals.push(d.close);
    if (d.high != null) allVals.push(d.high);
    if (d.low  != null) allVals.push(d.low);
  }
  const domMin = Math.min(...allVals);
  const domMax = Math.max(...allVals);
  const pad    = (domMax - domMin) * 0.1 || domMax * 0.02;
  const vMin   = domMin - pad;
  const vMax   = domMax + pad;
  const vRange = vMax - vMin || 1;

  const xOf  = (i: number) => margin.left + (i + 0.5) * (plotW / data.length);
  const yOf  = (v: number) => margin.top + plotH - ((v - vMin) / vRange) * plotH;
  const cndW = Math.max((plotW / data.length) * 0.72, compact ? 2 : 3);

  const Y_TICKS = compact ? 4 : 5;
  const yTicks = Array.from({ length: Y_TICKS }, (_, i) => vMin + (i / (Y_TICKS - 1)) * vRange);
  const xTickCount = Math.max(2, Math.min(Math.floor(plotW / (compact ? 55 : 70)), data.length));
  const xTickIdxs  = Array.from({ length: xTickCount }, (_, i) =>
    Math.round((i / (xTickCount - 1)) * (data.length - 1))
  );

  // Pointer event handler — maps clientX → candle index
  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const step = plotW / data.length;
    const idx = Math.floor((x - margin.left) / step);
    setHoverIdx(idx >= 0 && idx < data.length ? idx : null);
  }, [plotW, margin.left, data.length]);

  const handlePointerLeave = useCallback(() => setHoverIdx(null), []);

  const hoverD = hoverIdx !== null ? data[hoverIdx] : null;
  const hoverX = hoverIdx !== null ? xOf(hoverIdx) : 0;

  // Tooltip positioning: flip to left if too close to right edge
  const ttW = compact ? 80 : 110;
  const ttH = compact ? 52 : 72;
  const ttOffX = hoverX + ttW + 12 > width - margin.right ? -(ttW + 8) : 8;

  return (
    <svg
      width={width} height={height}
      style={{ overflow: "visible", cursor: "crosshair" }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {/* Grid */}
      {yTicks.map((v, i) => (
        <line key={i}
          x1={margin.left} y1={yOf(v)} x2={margin.left + plotW} y2={yOf(v)}
          stroke="#e5e7eb" strokeDasharray="3 3" strokeWidth={1} opacity={0.6}
        />
      ))}

      {/* Y-axis labels */}
      {yTicks.map((v, i) => (
        <text key={i}
          x={margin.left - 5} y={yOf(v)}
          textAnchor="end" dominantBaseline="middle"
          fontSize={compact ? 9 : 11} fill="#94a3b8"
        >
          {fmt(v)}
        </text>
      ))}

      {/* X-axis labels */}
      {xTickIdxs.map(idx => {
        if (idx >= data.length) return null;
        const label = fmtLabel(data[idx].date, range ?? "1y");
        return (
          <text key={idx}
            x={xOf(idx)} y={margin.top + plotH + (compact ? 13 : 18)}
            textAnchor="middle" fontSize={compact ? 9 : 11} fill="#94a3b8"
          >
            {label}
          </text>
        );
      })}

      {/* Start-price reference line */}
      {data.length > 0 && (() => {
        const y = yOf(data[0].close);
        return (
          <>
            <line x1={margin.left} y1={y} x2={margin.left + plotW} y2={y}
              stroke="#94a3b8" strokeDasharray="4 3" strokeWidth={1}
            />
            {!compact && (
              <text x={margin.left + plotW - 2} y={y - 3} textAnchor="end" fontSize={9} fill="#94a3b8">
                始値
              </text>
            )}
          </>
        );
      })()}

      {/* Candlesticks */}
      {data.map((d, i) => {
        const cx  = xOf(i);
        const isH = i === hoverIdx;
        if (d.open == null || d.high == null || d.low == null) {
          return <circle key={i} cx={cx} cy={yOf(d.close)} r={1} fill="#94a3b8" />;
        }
        const yH   = yOf(d.high);
        const yL   = yOf(d.low);
        const yO   = yOf(d.open);
        const yC   = yOf(d.close);
        const isUp = d.close >= d.open;
        const col  = isUp ? "#10b981" : "#ef4444";
        const bTop = Math.min(yO, yC);
        const bH   = Math.max(Math.abs(yC - yO), 1.5);
        return (
          <g key={i} opacity={hoverIdx !== null && !isH ? 0.55 : 1}>
            {/* Wick */}
            <line x1={cx} y1={yH} x2={cx} y2={yL} stroke={col} strokeWidth={isH ? 1.5 : 1} />
            {/* Body */}
            <rect
              x={cx - cndW / 2} y={bTop} width={cndW} height={bH}
              fill={col}
              stroke={col}
              strokeWidth={1}
              opacity={isUp ? 1 : 0.85}
            />
          </g>
        );
      })}

      {/* Hover crosshair */}
      {hoverD && (
        <>
          <line
            x1={hoverX} y1={margin.top} x2={hoverX} y2={margin.top + plotH}
            stroke="#64748b" strokeWidth={1} strokeDasharray="3 2"
          />
          {/* Tooltip card */}
          <rect
            x={hoverX + ttOffX} y={margin.top + 4}
            width={ttW} height={ttH}
            rx={compact ? 4 : 6}
            fill="white" stroke="#e2e8f0" strokeWidth={1}
            filter="drop-shadow(0 1px 4px rgba(0,0,0,0.12))"
          />
          {hoverD.open != null && (
            <text x={hoverX + ttOffX + 7} y={margin.top + 18} fontSize={compact ? 8.5 : 10.5} fill="#475569">
              O {fmt(hoverD.open)}
            </text>
          )}
          <text x={hoverX + ttOffX + 7} y={margin.top + (compact ? 29 : 32)} fontSize={compact ? 8.5 : 10.5} fill="#10b981" fontWeight="600">
            H {fmt(hoverD.high ?? hoverD.close)}
          </text>
          <text x={hoverX + ttOffX + 7} y={margin.top + (compact ? 40 : 46)} fontSize={compact ? 8.5 : 10.5} fill="#ef4444" fontWeight="600">
            L {fmt(hoverD.low ?? hoverD.close)}
          </text>
          <text x={hoverX + ttOffX + 7} y={margin.top + (compact ? 51 : 60)} fontSize={compact ? 8.5 : 10.5} fill="#0f172a" fontWeight="700">
            C {fmt(hoverD.close)}
          </text>
        </>
      )}
    </svg>
  );
}

/* ─── MiniChart (4分割用) ─── */
function MiniChart({ symbol, range, label, currency }: {
  symbol: string; range: RangeKey; label: string; currency?: string | null;
}) {
  const [raw, setRaw]               = useState<Point[]>([]);
  const [loading, setLoading]       = useState(true);
  const [chartType, setChartType]   = useState<ChartType>("line");
  const [canvasWidth, setCanvasWidth] = useState(0);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true); setRaw([]);
    fetch(`/api/chart?symbol=${encodeURIComponent(symbol)}&range=${range}`, { signal: ctrl.signal })
      .then(r => r.json())
      .then(j => setRaw(j.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [symbol, range]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const obs = new ResizeObserver(e => setCanvasWidth(e[0]?.contentRect.width ?? 0));
    obs.observe(canvasRef.current);
    setCanvasWidth(canvasRef.current.offsetWidth);
    return () => obs.disconnect();
  }, []);

  const isIntraday = INTRADAY_RANGES.includes(range);
  const hasOHLC    = raw.some(d => d.open != null && d.high != null && d.low != null);
  const showCandleToggle = !isIntraday && hasOHLC;

  useEffect(() => { if (isIntraday) setChartType("line"); }, [isIntraday]);

  const fmt = (v: number) => v.toLocaleString("ja-JP", { maximumFractionDigits: 2 });
  const first = raw[0]?.close ?? 0;
  const last  = raw[raw.length - 1]?.close ?? 0;
  const up    = last >= first;
  const pct   = first ? ((last - first) / first) * 100 : 0;
  const color = up ? "#10b981" : "#ef4444";
  const allValues = raw.map(d => d.close).filter(Boolean);
  const min = allValues.length ? Math.min(...allValues) : 0;
  const max = allValues.length ? Math.max(...allValues) : 0;
  const pad = (max - min) * 0.12 || max * 0.02;
  const rangeLabel = RANGES.find(r => r.key === range)?.label ?? range;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col">
      <div className="px-3 py-2 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">{label} ({rangeLabel})</span>
        <div className="flex items-center gap-1.5">
          {showCandleToggle && (
            <div className="flex gap-0.5 p-0.5 bg-slate-200/60 dark:bg-slate-700/60 rounded-md">
              <button onClick={() => setChartType("line")}
                className={`px-1.5 py-0.5 text-[9px] rounded transition-all font-medium ${chartType === "line" ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400"}`}
              >折線</button>
              <button onClick={() => setChartType("candle")}
                className={`px-1.5 py-0.5 text-[9px] rounded transition-all font-medium ${chartType === "candle" ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400"}`}
              >蝋燭</button>
            </div>
          )}
          {raw.length > 1 && (
            <span className={`text-[11px] font-mono font-bold ${up ? "text-emerald-600" : "text-rose-600"}`}>
              {up ? "▲" : "▼"} {Math.abs(pct).toFixed(2)}%
            </span>
          )}
        </div>
      </div>
      <div className="h-36 flex-1 touch-pan-y select-none" ref={canvasRef}>
        {loading ? <div className="skeleton h-full w-full" />
        : raw.length === 0 ? <div className="flex items-center justify-center h-full text-xs text-slate-400">データなし</div>
        : chartType === "candle" ? (
          <CandlestickCanvas data={raw} width={canvasWidth} height={144} currency={currency} fmt={fmt} compact range={range} />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={raw} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <YAxis domain={[min - pad, max + pad]} hide />
              <XAxis dataKey="date" tickFormatter={d => fmtLabel(d, range)} tick={{ fontSize: 9 }} minTickGap={isIntraday ? 60 : 30} interval="preserveStartEnd" />
              {first > 0 && <ReferenceLine y={first} stroke="#94a3b8" strokeDasharray="3 2" strokeWidth={1} />}
              <Tooltip
                formatter={(v) => [`${fmt(Number(v))} ${currency ?? ""}`, "終値"]}
                labelFormatter={d => fmtLabel(String(d), range)}
                contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0" }}
              />
              <Line type="monotone" dataKey="close" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
      {raw.length > 0 && (
        <div className="px-3 py-1 text-[10px] font-mono text-slate-500 border-t border-slate-100 dark:border-slate-800 flex justify-between">
          <span>始 {fmt(first)}</span>
          <span className={up ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>末 {fmt(last)}</span>
        </div>
      )}
    </div>
  );
}

/* ─── Expanded (full-screen) Modal ─── */
function ExpandedModal({
  symbol, currency, data, loading, range, setRange, chartType, setChartType,
  enabledSma, toggleSma, onClose,
}: {
  symbol: string; currency?: string | null;
  data: Point[]; loading: boolean;
  range: RangeKey; setRange: (r: RangeKey) => void;
  chartType: ChartType; setChartType: (t: ChartType) => void;
  enabledSma: Set<SmaId>; toggleSma: (id: SmaId) => void;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(0);

  useEffect(() => {
    if (!canvasRef.current) return;
    const obs = new ResizeObserver(e => setCanvasWidth(e[0]?.contentRect.width ?? 0));
    obs.observe(canvasRef.current);
    setCanvasWidth(canvasRef.current.offsetWidth);
    return () => obs.disconnect();
  }, []);

  // Dismiss on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const isIntraday = INTRADAY_RANGES.includes(range);
  const hasOHLC    = data.some(d => d.open != null && d.high != null && d.low != null);
  const showCandleToggle = !isIntraday && hasOHLC;

  const fmt = (v: number) => v.toLocaleString("ja-JP", { maximumFractionDigits: 2 });

  const allValues = data.flatMap(d => {
    const base = [d.close];
    if (chartType === "candle" && d.high != null && d.low != null) base.push(d.high, d.low);
    return [...base, d.sma20, d.sma50, d.sma200].filter((v): v is number => typeof v === "number");
  });
  const min = allValues.length ? Math.min(...allValues) : 0;
  const max = allValues.length ? Math.max(...allValues) : 0;
  const pad = (max - min) * 0.1 || max * 0.02;
  const first = data[0]?.close ?? 0;
  const last  = data[data.length - 1]?.close ?? 0;
  const up    = last >= first;
  const lineColor = up ? "#10b981" : "#ef4444";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full md:max-w-5xl bg-white dark:bg-slate-900 md:rounded-2xl flex flex-col overflow-hidden shadow-2xl"
        style={{ height: "100dvh", maxHeight: "100dvh" }}
        // On desktop limit height
        // On mobile use full screen
      >
        {/* ── Modal header ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 shrink-0 gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">{symbol}</span>
            <span className={`font-mono text-sm font-bold ${up ? "text-emerald-600" : "text-rose-600"}`}>
              {up ? "▲" : "▼"} {fmt(last)}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Chart type */}
            {showCandleToggle && (
              <div className="flex gap-0.5 p-0.5 bg-slate-200/60 dark:bg-slate-700 rounded-lg">
                <button onClick={() => setChartType("line")}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${chartType === "line" ? "bg-white dark:bg-slate-600 shadow-sm text-slate-900 dark:text-white" : "text-slate-500"}`}>
                  折れ線
                </button>
                <button onClick={() => setChartType("candle")}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${chartType === "candle" ? "bg-white dark:bg-slate-600 shadow-sm text-slate-900 dark:text-white" : "text-slate-500"}`}>
                  ローソク足
                </button>
              </div>
            )}

            {/* SMA toggles (line only) */}
            {!isIntraday && chartType === "line" && (
              <div className="hidden md:flex gap-1">
                {SMA_OPTIONS.map(s => {
                  const on = enabledSma.has(s.id);
                  return (
                    <button key={s.id} onClick={() => toggleSma(s.id)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium border transition-all ${on ? "border-current" : "border-transparent text-slate-400"}`}
                      style={on ? { color: s.color, borderColor: s.color + "60", background: s.color + "15" } : {}}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Close */}
            <button onClick={onClose}
              className="p-1.5 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
              <X className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            </button>
          </div>
        </div>

        {/* ── Range selector ── */}
        <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex gap-0.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-x-auto touch-pan-x">
            {RANGES.map(r => (
              <button key={r.key} onClick={() => setRange(r.key)}
                className={`px-3 py-1.5 text-xs rounded-md font-medium whitespace-nowrap transition-all ${
                  range === r.key
                    ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                }`}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Chart (flex-1 = fills remaining height) ── */}
        <div className="flex-1 touch-pan-y select-none min-h-0" ref={canvasRef}>
          {loading ? (
            <div className="skeleton h-full w-full" />
          ) : data.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-400">データがありません</div>
          ) : chartType === "candle" ? (
            <CandlestickCanvas
              data={data} width={canvasWidth} height={canvasRef.current?.offsetHeight ?? 400}
              currency={currency} fmt={fmt} range={range}
            />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 10, right: 16, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
                <XAxis dataKey="date" tickFormatter={d => fmtLabel(String(d), range)} tick={{ fontSize: 11 }} minTickGap={isIntraday ? 80 : 50} />
                <YAxis domain={[min - pad, max + pad]} tick={{ fontSize: 11 }} tickFormatter={fmt} width={72} />
                {first > 0 && (
                  <ReferenceLine y={first} stroke="#94a3b8" strokeDasharray="4 3" strokeWidth={1}
                    label={{ value: "始値", position: "insideTopRight", fontSize: 10, fill: "#94a3b8" }}
                  />
                )}
                <Tooltip
                  formatter={(v, name) => [`${fmt(Number(v))} ${currency ?? ""}`, name === "close" ? "終値" : String(name).toUpperCase()]}
                  labelFormatter={d => fmtLabel(String(d), range)}
                  labelStyle={{ color: "#475569" }}
                  contentStyle={{ background: "rgba(255,255,255,0.97)", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                />
                <Line type="monotone" dataKey="close" name="終値" stroke={lineColor} strokeWidth={2.5} dot={false} isAnimationActive={false} />
                {!isIntraday && SMA_OPTIONS.map(s => enabledSma.has(s.id) ? (
                  <Line key={s.id} type="monotone" dataKey={s.id} name={s.label}
                    stroke={s.color} strokeWidth={1.5} strokeDasharray="4 2" dot={false} isAnimationActive={false} connectNulls />
                ) : null)}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── Footer: OHLC summary ── */}
        {!loading && data.length > 0 && (
          <div className="shrink-0 px-4 py-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-4 text-[11px] font-mono text-slate-500 overflow-x-auto">
            <span>始 <span className="text-slate-700 dark:text-slate-300 font-semibold">{fmt(first)}</span></span>
            <span className={up ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
              末 {fmt(last)} ({up ? "▲" : "▼"}{Math.abs(((last - first) / first) * 100).toFixed(2)}%)
            </span>
            {data[0]?.high != null && <span>高 <span className="text-emerald-600 font-semibold">{fmt(Math.max(...data.map(d => d.high!).filter(Boolean)))}</span></span>}
            {data[0]?.low  != null && <span>安 <span className="text-rose-600 font-semibold">{fmt(Math.min(...data.map(d => d.low!).filter(Boolean)))}</span></span>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
export default function PriceChart({ symbol, currency }: { symbol: string; currency?: string | null }) {
  const [range,           setRange]          = useState<RangeKey>("1y");
  const [chartType,       setChartType]      = useState<ChartType>("line");
  const [raw,             setRaw]            = useState<Point[]>([]);
  const [loading,         setLoading]        = useState(false);
  const [multiView,       setMultiView]      = useState(false);
  const [expanded,        setExpanded]       = useState(false);
  const [enabledSma,      setEnabledSma]     = useState<Set<SmaId>>(new Set(["sma50", "sma200"]));
  const [panelKeys,       setPanelKeys]      = useState<RangeKey[]>(DEFAULT_PANEL_KEYS);
  const [showPanelPicker, setShowPanelPicker]= useState(false);
  const [canvasWidth,     setCanvasWidth]    = useState(0);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setPanelKeys(loadPanelKeys()); }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const obs = new ResizeObserver(e => setCanvasWidth(e[0]?.contentRect.width ?? 0));
    obs.observe(canvasRef.current);
    setCanvasWidth(canvasRef.current.offsetWidth);
    return () => obs.disconnect();
  }, []);

  const isIntraday    = INTRADAY_RANGES.includes(range);
  const hasOHLC       = raw.some(d => d.open != null && d.high != null && d.low != null);
  const showCandleToggle = !isIntraday && hasOHLC;

  useEffect(() => {
    if (multiView) return;
    const ctrl = new AbortController();
    setLoading(true);
    fetch(`/api/chart?symbol=${encodeURIComponent(symbol)}&range=${range}`, { signal: ctrl.signal })
      .then(r => r.json())
      .then(j => setRaw(j.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [symbol, range, multiView]);

  useEffect(() => { if (isIntraday) setChartType("line"); }, [isIntraday]);

  const data: Point[] = useMemo(() => {
    if (raw.length === 0 || isIntraday) return raw.map(p => ({ ...p }));
    const closes = raw.map(p => p.close);
    const sma20  = computeSMA(closes, 20);
    const sma50  = computeSMA(closes, 50);
    const sma200 = computeSMA(closes, 200);
    return raw.map((p, i) => ({ ...p, sma20: sma20[i], sma50: sma50[i], sma200: sma200[i] }));
  }, [raw, isIntraday]);

  const fmt = (v: number) => v.toLocaleString("ja-JP", { maximumFractionDigits: 2 });

  const allValues = data.flatMap(d => {
    const base = [d.close];
    if (chartType === "candle" && d.high != null && d.low != null) base.push(d.high, d.low);
    return [...base, d.sma20, d.sma50, d.sma200].filter((v): v is number => typeof v === "number");
  });
  const min = allValues.length ? Math.min(...allValues) : 0;
  const max = allValues.length ? Math.max(...allValues) : 0;
  const pad = (max - min) * 0.1 || max * 0.02;

  const first = raw[0]?.close ?? 0;
  const last  = raw[raw.length - 1]?.close ?? 0;
  const up    = last >= first;
  const lineColor = up ? "#10b981" : "#ef4444";

  const toggleSma = useCallback((id: SmaId) => {
    setEnabledSma(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const togglePanel = (key: RangeKey) => {
    setPanelKeys(prev => {
      let next: RangeKey[];
      if (prev.includes(key)) next = prev.filter(k => k !== key);
      else if (prev.length < 4) next = [...prev, key];
      else return prev;
      savePanelKeys(next);
      return next;
    });
  };

  const panelItems = panelKeys.map(k => ({
    key: k,
    label: RANGES.find(r => r.key === k)?.label ?? k,
  }));

  return (
    <>
      {/* ── Full-screen expanded modal ── */}
      {expanded && (
        <ExpandedModal
          symbol={symbol} currency={currency}
          data={data} loading={loading}
          range={range} setRange={setRange}
          chartType={chartType} setChartType={setChartType}
          enabledSma={enabledSma} toggleSma={toggleSma}
          onClose={() => setExpanded(false)}
        />
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-base font-semibold tracking-tight flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-slate-500" />
            価格チャート
          </h2>

          <div className="flex items-center gap-2 flex-wrap">
            {/* 拡大ボタン */}
            {!multiView && (
              <button
                onClick={() => setExpanded(true)}
                title="拡大表示"
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:border-blue-400 hover:text-blue-500 transition-all"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* 4分割トグル */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMultiView(v => !v)}
                title="4分割表示"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  multiView
                    ? "bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-200 dark:shadow-violet-900/30"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-violet-400"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                {multiView ? "4分割中" : "4分割"}
              </button>
              {multiView && (
                <button
                  onClick={() => setShowPanelPicker(v => !v)}
                  className={`p-1.5 rounded-lg border transition-all ${
                    showPanelPicker
                      ? "bg-violet-100 dark:bg-violet-900/40 border-violet-400 text-violet-600"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-violet-400 hover:text-violet-500"
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* ローソク足/折れ線トグル */}
            {!multiView && showCandleToggle && (
              <div className="flex gap-0.5 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-lg">
                <button onClick={() => setChartType("line")}
                  className={`px-2 py-1 text-[11px] rounded-md font-medium transition-all ${chartType === "line" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900"}`}>
                  折れ線
                </button>
                <button onClick={() => setChartType("candle")}
                  className={`px-2 py-1 text-[11px] rounded-md font-medium transition-all ${chartType === "candle" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900"}`}>
                  ローソク足
                </button>
              </div>
            )}

            {/* レンジ選択 */}
            {!multiView && (
              <div className="flex gap-0.5 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-lg overflow-x-auto touch-pan-x">
                {RANGES.map(r => (
                  <button key={r.key} onClick={() => setRange(r.key)}
                    className={`px-2 py-1 text-[11px] rounded-md font-medium whitespace-nowrap transition-all ${
                      range === r.key
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}>
                    {r.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* パネルピッカー */}
        {multiView && showPanelPicker && (
          <div className="mt-2 mb-3 p-3 rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50/60 dark:bg-violet-950/30">
            <p className="text-xs text-slate-500 mb-2">表示するパネルを選んでください（最大4つ）</p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_PANELS.map(p => {
                const selected = panelKeys.includes(p.key);
                return (
                  <button key={p.key} onClick={() => togglePanel(p.key)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                      selected
                        ? "bg-violet-600 text-white border-violet-600"
                        : panelKeys.length >= 4
                          ? "text-slate-300 border-slate-200 cursor-not-allowed dark:text-slate-600 dark:border-slate-700"
                          : "text-slate-600 border-slate-300 hover:border-violet-400 dark:text-slate-300 dark:border-slate-600"
                    }`}
                    disabled={!selected && panelKeys.length >= 4}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
            <button onClick={() => setShowPanelPicker(false)}
              className="mt-2 px-3 py-1 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 transition-colors">
              適用
            </button>
          </div>
        )}

        {/* SMA トグル */}
        {!multiView && !isIntraday && chartType === "line" && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {SMA_OPTIONS.map(s => {
              const on = enabledSma.has(s.id);
              return (
                <button key={s.id} onClick={() => toggleSma(s.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                    on ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                       : "bg-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <span className="w-3 h-0.5 rounded-full" style={{ background: on ? s.color : "currentColor" }} />
                  {s.label}
                </button>
              );
            })}
          </div>
        )}

        {/* ── 4分割ビュー ── */}
        {multiView ? (
          <div className="grid grid-cols-2 gap-3">
            {panelItems.map((p, idx) => (
              <MiniChart key={`${p.key}-${idx}`} symbol={symbol} range={p.key} label={symbol} currency={currency} />
            ))}
          </div>
        ) : (
          <div className="h-72 touch-pan-y select-none" ref={canvasRef}>
            {loading && <div className="skeleton h-full w-full rounded-xl" />}
            {!loading && data.length === 0 && (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">データがありません</div>
            )}
            {!loading && data.length > 0 && chartType === "candle" ? (
              <CandlestickCanvas data={data} width={canvasWidth} height={288} currency={currency} fmt={fmt} range={range} />
            ) : !loading && data.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
                  <XAxis dataKey="date" tickFormatter={d => fmtLabel(String(d), range)} tick={{ fontSize: 11 }} minTickGap={isIntraday ? 80 : 40} />
                  <YAxis domain={[min - pad, max + pad]} tick={{ fontSize: 11 }} tickFormatter={fmt} width={70} />
                  {first > 0 && (
                    <ReferenceLine y={first} stroke="#94a3b8" strokeDasharray="4 3" strokeWidth={1}
                      label={{ value: "始値", position: "insideTopRight", fontSize: 10, fill: "#94a3b8" }}
                    />
                  )}
                  <Tooltip
                    formatter={(v, name) => [`${fmt(Number(v))} ${currency ?? ""}`, name === "close" ? "終値" : String(name).toUpperCase()]}
                    labelFormatter={d => fmtLabel(String(d), range)}
                    labelStyle={{ color: "#475569" }}
                    contentStyle={{ background: "rgba(255,255,255,0.97)", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                  />
                  <Line type="monotone" dataKey="close" name="終値" stroke={lineColor} strokeWidth={2} dot={false} isAnimationActive={false} />
                  {!isIntraday && SMA_OPTIONS.map(s =>
                    enabledSma.has(s.id) ? (
                      <Line key={s.id} type="monotone" dataKey={s.id} name={s.label}
                        stroke={s.color} strokeWidth={1.5} strokeDasharray="4 2" dot={false} isAnimationActive={false} connectNulls />
                    ) : null,
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        )}

        {/* 分足ラベル */}
        {!multiView && isIntraday && (
          <p className="text-[10px] text-slate-400 text-right mt-1">
            {range === "1min" ? "1分足（直近1日）"
              : range === "5min" ? "5分足（直近1日）"
              : range === "30min" ? "30分足（直近5日）"
              : range === "1h" ? "1時間足（直近30日）"
              : ""}
          </p>
        )}
      </div>
    </>
  );
}
