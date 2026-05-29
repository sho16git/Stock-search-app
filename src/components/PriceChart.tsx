"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ComposedChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";
import { LayoutGrid, BarChart2, Settings } from "lucide-react";

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
      if (Array.isArray(parsed) && parsed.length > 0 && parsed.length <= 4) {
        return parsed;
      }
    }
  } catch { /* ignore */ }
  return DEFAULT_PANEL_KEYS;
}

function savePanelKeys(keys: RangeKey[]) {
  try {
    localStorage.setItem(PANEL_STORAGE_KEY, JSON.stringify(keys));
  } catch { /* ignore */ }
}

/* ─── Candlestick Canvas (pure SVG, no recharts internals) ─── */
function CandlestickCanvas({ data, width, height, currency, fmt, compact }: {
  data: Point[];
  width: number;
  height: number;
  currency?: string | null;
  fmt: (v: number) => string;
  compact?: boolean;
}) {
  if (width <= 0 || data.length === 0) return null;

  const margin = compact
    ? { top: 4, right: 4, left: 44, bottom: 18 }
    : { top: 8, right: 16, left: 72, bottom: 28 };
  const plotW = Math.max(width - margin.left - margin.right, 1);
  const plotH = Math.max(height - margin.top - margin.bottom, 1);

  // Domain
  const allVals: number[] = [];
  for (const d of data) {
    allVals.push(d.close);
    if (d.high != null) allVals.push(d.high);
    if (d.low != null)  allVals.push(d.low);
  }
  const domMin = Math.min(...allVals);
  const domMax = Math.max(...allVals);
  const pad    = (domMax - domMin) * 0.1 || domMax * 0.02;
  const vMin   = domMin - pad;
  const vMax   = domMax + pad;
  const vRange = vMax - vMin || 1;

  const xOf  = (i: number) => margin.left + (i + 0.5) * (plotW / data.length);
  const yOf  = (v: number) => margin.top + plotH - ((v - vMin) / vRange) * plotH;
  const cndW = Math.max((plotW / data.length) * 0.7, 2);

  // Y-axis ticks (5 evenly spaced)
  const Y_TICKS = 5;
  const yTicks = Array.from({ length: Y_TICKS }, (_, i) =>
    vMin + (i / (Y_TICKS - 1)) * vRange
  );

  // X-axis ticks (evenly spaced, ~1 per 70px)
  const xTickCount = Math.max(2, Math.min(Math.floor(plotW / 70), data.length));
  const xTickIdxs  = Array.from({ length: xTickCount }, (_, i) =>
    Math.round((i / (xTickCount - 1)) * (data.length - 1))
  );

  // Tooltip state — handled externally, skip for simplicity

  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      {/* grid lines */}
      {yTicks.map((v, i) => {
        const y = yOf(v);
        return (
          <line key={i}
            x1={margin.left} y1={y} x2={margin.left + plotW} y2={y}
            stroke="#e5e7eb" strokeDasharray="3 3" strokeWidth={1} opacity={0.6}
          />
        );
      })}

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
        const d = new Date(data[idx].date);
        const label = `${d.getMonth() + 1}/${d.getDate()}`;
        return (
          <text key={idx}
            x={xOf(idx)} y={margin.top + plotH + (compact ? 12 : 16)}
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
            <line
              x1={margin.left} y1={y} x2={margin.left + plotW} y2={y}
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
        const cx = xOf(i);
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
        const bH   = Math.max(Math.abs(yC - yO), 1);
        return (
          <g key={i}>
            {/* Wick */}
            <line x1={cx} y1={yH} x2={cx} y2={yL} stroke={col} strokeWidth={1} />
            {/* Body */}
            <rect
              x={cx - cndW / 2} y={bTop} width={cndW} height={bH}
              fill={isUp ? col : "transparent"}
              stroke={col} strokeWidth={1}
            />
          </g>
        );
      })}
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
    setLoading(true);
    setRaw([]);
    fetch(`/api/chart?symbol=${encodeURIComponent(symbol)}&range=${range}`, { signal: ctrl.signal })
      .then(r => r.json())
      .then(j => setRaw(j.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [symbol, range]);

  // Track container width for CandlestickCanvas
  useEffect(() => {
    if (!canvasRef.current) return;
    const obs = new ResizeObserver(entries => {
      setCanvasWidth(entries[0]?.contentRect.width ?? 0);
    });
    obs.observe(canvasRef.current);
    setCanvasWidth(canvasRef.current.offsetWidth);
    return () => obs.disconnect();
  }, []);

  const isIntraday = INTRADAY_RANGES.includes(range);
  const hasOHLC = raw.some(d => d.open != null && d.high != null && d.low != null);
  const showCandleToggle = !isIntraday && hasOHLC;

  // Reset to line when switching to intraday range
  useEffect(() => {
    if (isIntraday) setChartType("line");
  }, [isIntraday]);

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
      {/* Header */}
      <div className="px-3 py-2 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">{label} ({rangeLabel})</span>
        <div className="flex items-center gap-1.5">
          {/* Line/Candle toggle (only when OHLC data available and not intraday) */}
          {showCandleToggle && (
            <div className="flex gap-0.5 p-0.5 bg-slate-200/60 dark:bg-slate-700/60 rounded-md">
              <button
                onClick={() => setChartType("line")}
                className={`px-1.5 py-0.5 text-[9px] rounded transition-all font-medium ${
                  chartType === "line"
                    ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                折線
              </button>
              <button
                onClick={() => setChartType("candle")}
                className={`px-1.5 py-0.5 text-[9px] rounded transition-all font-medium ${
                  chartType === "candle"
                    ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                蝋燭
              </button>
            </div>
          )}
          {raw.length > 1 && (
            <span className={`text-[11px] font-mono font-bold ${up ? "text-emerald-600" : "text-rose-600"}`}>
              {up ? "▲" : "▼"} {Math.abs(pct).toFixed(2)}%
            </span>
          )}
        </div>
      </div>
      {/* Chart */}
      <div className="h-32 flex-1" ref={canvasRef}>
        {loading ? (
          <div className="skeleton h-full w-full" />
        ) : raw.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-slate-400">データなし</div>
        ) : chartType === "candle" ? (
          <CandlestickCanvas data={raw} width={canvasWidth} height={128} currency={currency} fmt={fmt} compact />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={raw} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <YAxis domain={[min - pad, max + pad]} hide />
              <XAxis
                dataKey="date"
                tickFormatter={d => fmtLabel(d, range)}
                tick={{ fontSize: 9 }}
                minTickGap={isIntraday ? 60 : 30}
                interval="preserveStartEnd"
              />
              {first > 0 && <ReferenceLine y={first} stroke="#94a3b8" strokeDasharray="3 2" strokeWidth={1} />}
              <Tooltip
                formatter={(v) => [`${fmt(Number(v))} ${currency ?? ""}`, "終値"]}
                labelFormatter={d => fmtLabel(String(d), range)}
                contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0" }}
              />
              <Line
                type="monotone" dataKey="close"
                stroke={color} strokeWidth={1.5}
                dot={false} isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
      {/* Footer */}
      {raw.length > 0 && (
        <div className="px-3 py-1 text-[10px] font-mono text-slate-500 border-t border-slate-100 dark:border-slate-800 flex justify-between">
          <span>始 {fmt(first)}</span>
          <span className={up ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>末 {fmt(last)}</span>
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ─── */
export default function PriceChart({ symbol, currency }: { symbol: string; currency?: string | null }) {
  const [range,          setRange]         = useState<RangeKey>("1y");
  const [chartType,      setChartType]     = useState<ChartType>("line");
  const [raw,            setRaw]           = useState<Point[]>([]);
  const [loading,        setLoading]       = useState(false);
  const [multiView,      setMultiView]     = useState(false);
  const [enabledSma,     setEnabledSma]    = useState<Set<SmaId>>(new Set(["sma50", "sma200"]));
  const [panelKeys,      setPanelKeys]     = useState<RangeKey[]>(DEFAULT_PANEL_KEYS);
  const [showPanelPicker,setShowPanelPicker] = useState(false);
  const [canvasWidth,    setCanvasWidth]   = useState(0);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Load panel keys from localStorage on mount
  useEffect(() => {
    setPanelKeys(loadPanelKeys());
  }, []);

  // Track container width for CandlestickCanvas
  useEffect(() => {
    if (!canvasRef.current) return;
    const obs = new ResizeObserver(entries => {
      setCanvasWidth(entries[0]?.contentRect.width ?? 0);
    });
    obs.observe(canvasRef.current);
    setCanvasWidth(canvasRef.current.offsetWidth);
    return () => obs.disconnect();
  }, []);

  const isIntraday = INTRADAY_RANGES.includes(range);
  const hasOHLC = raw.some(d => d.open != null && d.high != null && d.low != null);
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

  // Reset chart type to line when switching to intraday
  useEffect(() => {
    if (isIntraday) setChartType("line");
  }, [isIntraday]);

  const data: Point[] = useMemo(() => {
    if (raw.length === 0 || isIntraday) {
      return raw.map(p => ({ ...p }));
    }
    const closes = raw.map(p => p.close);
    const sma20  = computeSMA(closes, 20);
    const sma50  = computeSMA(closes, 50);
    const sma200 = computeSMA(closes, 200);
    return raw.map((p, i) => ({ ...p, sma20: sma20[i], sma50: sma50[i], sma200: sma200[i] }));
  }, [raw, isIntraday]);

  const fmt = (v: number) => v.toLocaleString("ja-JP", { maximumFractionDigits: 2 });

  const allValues = data.flatMap(d => {
    const base = [d.close];
    if (chartType === "candle" && d.high != null && d.low != null) {
      base.push(d.high, d.low);
    }
    return [...base, d.sma20, d.sma50, d.sma200].filter((v): v is number => typeof v === "number");
  });
  const min = allValues.length ? Math.min(...allValues) : 0;
  const max = allValues.length ? Math.max(...allValues) : 0;
  const pad = (max - min) * 0.1 || max * 0.02;

  const first = raw[0]?.close ?? 0;
  const last  = raw[raw.length - 1]?.close ?? 0;
  const up    = last >= first;
  const lineColor = up ? "#10b981" : "#ef4444";

  const toggleSma = (id: SmaId) => {
    setEnabledSma(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const togglePanel = (key: RangeKey) => {
    setPanelKeys(prev => {
      let next: RangeKey[];
      if (prev.includes(key)) {
        next = prev.filter(k => k !== key);
      } else if (prev.length < 4) {
        next = [...prev, key];
      } else {
        return prev;
      }
      savePanelKeys(next);
      return next;
    });
  };

  const panelItems = panelKeys.map(k => ({
    key: k,
    label: RANGES.find(r => r.key === k)?.label ?? k,
  }));

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-base font-semibold tracking-tight flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-slate-500" />
          価格チャート
        </h2>

        <div className="flex items-center gap-2 flex-wrap">
          {/* 4分割トグル + ギアアイコン */}
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
                title="パネル設定"
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

          {/* ローソク足/折れ線トグル（非分足・OHLCありのみ） */}
          {!multiView && showCandleToggle && (
            <div className="flex gap-0.5 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-lg">
              <button
                onClick={() => setChartType("line")}
                className={`px-2 py-1 text-[11px] rounded-md transition-all font-medium ${
                  chartType === "line"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                折れ線
              </button>
              <button
                onClick={() => setChartType("candle")}
                className={`px-2 py-1 text-[11px] rounded-md transition-all font-medium ${
                  chartType === "candle"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                ローソク足
              </button>
            </div>
          )}

          {/* レンジ選択（単一表示時のみ） */}
          {!multiView && (
            <div className="flex gap-0.5 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-lg overflow-x-auto">
              {RANGES.map(r => (
                <button
                  key={r.key}
                  onClick={() => setRange(r.key)}
                  className={`px-2 py-1 text-[11px] rounded-md transition-all font-medium whitespace-nowrap ${
                    range === r.key
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* パネルピッカー */}
      {multiView && showPanelPicker && (
        <div className="mt-2 p-3 rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50/60 dark:bg-violet-950/30">
          <p className="text-xs text-slate-500 mb-2">4分割するパネルを選んでください（最大4つ）</p>
          <div className="flex flex-wrap gap-1.5">
            {ALL_PANELS.map(p => {
              const selected = panelKeys.includes(p.key);
              return (
                <button key={p.key}
                  onClick={() => togglePanel(p.key)}
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
          <button
            onClick={() => setShowPanelPicker(false)}
            className="mt-2 px-3 py-1 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 transition-colors"
          >
            適用
          </button>
        </div>
      )}

      {/* SMA トグル（単一・非分足・折れ線のみ） */}
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
        /* ── 単一チャート ── */
        <div className="h-72" ref={canvasRef}>
          {loading && (
            <div className="skeleton h-full w-full rounded-xl" />
          )}
          {!loading && data.length === 0 && (
            <div className="flex items-center justify-center h-full text-sm text-slate-400">
              データがありません
            </div>
          )}
          {!loading && data.length > 0 && chartType === "candle" ? (
            /* ── ローソク足: pure SVG (recharts v3 Customized API非互換のため) ── */
            <CandlestickCanvas data={data} width={canvasWidth} height={288} currency={currency} fmt={fmt} />
          ) : !loading && data.length > 0 ? (
            /* ── 折れ線チャート (recharts) ── */
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
                <XAxis
                  dataKey="date"
                  tickFormatter={d => fmtLabel(String(d), range)}
                  tick={{ fontSize: 11 }}
                  minTickGap={isIntraday ? 80 : 40}
                />
                <YAxis
                  domain={[min - pad, max + pad]}
                  tick={{ fontSize: 11 }}
                  tickFormatter={fmt}
                  width={70}
                />
                {first > 0 && (
                  <ReferenceLine y={first} stroke="#94a3b8" strokeDasharray="4 3" strokeWidth={1}
                    label={{ value: "始値", position: "insideTopRight", fontSize: 10, fill: "#94a3b8" }}
                  />
                )}
                <Tooltip
                  formatter={(v, name) => [
                    `${fmt(Number(v))} ${currency ?? ""}`,
                    name === "close" ? "終値" : String(name).toUpperCase(),
                  ]}
                  labelFormatter={d => fmtLabel(String(d), range)}
                  labelStyle={{ color: "#475569" }}
                  contentStyle={{
                    background: "rgba(255,255,255,0.97)",
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone" dataKey="close" name="終値"
                  stroke={lineColor} strokeWidth={2}
                  dot={false} isAnimationActive={false}
                />
                {!isIntraday && SMA_OPTIONS.map(s =>
                  enabledSma.has(s.id) ? (
                    <Line key={s.id} type="monotone" dataKey={s.id} name={s.label}
                      stroke={s.color} strokeWidth={1.5} strokeDasharray="4 2"
                      dot={false} isAnimationActive={false} connectNulls
                    />
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
  );
}
