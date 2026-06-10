"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine, Area,
} from "recharts";
import { Maximize2, X, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { formatJpy } from "@/lib/format";
import { useCurrency } from "@/lib/currency-context";

/* ─── Types ─── */
type Point = {
  date: string;
  close: number;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  volume?: number | null;
};

type IndicatorKey = "BB" | "RSI" | "MACD";

/* ─── Technical Indicator Calculations ─── */

/** Bollinger Bands (20期間, 2σ) */
function calcBB(data: Point[], period = 20, stdDev = 2): { bb_upper: number | null; bb_mid: number | null; bb_lower: number | null }[] {
  return data.map((_, i) => {
    if (i < period - 1) return { bb_upper: null, bb_mid: null, bb_lower: null };
    const slice = data.slice(i - period + 1, i + 1).map(d => d.close);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
    const sd = Math.sqrt(variance);
    return { bb_upper: mean + stdDev * sd, bb_mid: mean, bb_lower: mean - stdDev * sd };
  });
}

/** RSI (14期間) */
function calcRSI(data: Point[], period = 14): (number | null)[] {
  const result: (number | null)[] = Array(data.length).fill(null);
  if (data.length < period + 1) return result;

  let gainSum = 0, lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const diff = data[i].close - data[i - 1].close;
    if (diff >= 0) gainSum += diff; else lossSum -= diff;
  }
  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;
  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i].close - data[i - 1].close;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return result;
}

/** EMA helper */
function ema(values: number[], period: number): number[] {
  const result: number[] = [];
  const k = 2 / (period + 1);
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) { result.push(NaN); continue; }
    if (i === period - 1) { result.push(prev); continue; }
    prev = values[i] * k + prev * (1 - k);
    result.push(prev);
  }
  return result;
}

/** MACD (12, 26, 9) */
function calcMACD(data: Point[]): { macd: number | null; signal: number | null; hist: number | null }[] {
  const closes = data.map(d => d.close);
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdLine = ema12.map((v, i) => (isNaN(v) || isNaN(ema26[i])) ? NaN : v - ema26[i]);
  const validMacd = macdLine.map(v => isNaN(v) ? 0 : v);
  const signalLine = ema(validMacd, 9);

  return data.map((_, i) => {
    if (isNaN(macdLine[i]) || isNaN(signalLine[i])) return { macd: null, signal: null, hist: null };
    const m = macdLine[i];
    const s = signalLine[i];
    return { macd: m, signal: s, hist: m - s };
  });
}

type RangeKey =
  | "1min" | "5min" | "10min" | "1h"           // 足種
  | "1d" | "1wk" | "1mo" | "3mo" | "6mo" | "1y" | "5y" | "10y" | "max"; // 期間

type ChartType = "line" | "candle";

const RANGES: { key: RangeKey; label: string; apiRange: string; group: "intraday" | "period" }[] = [
  /* ── 足種 ── */
  { key: "1min",  label: "1分",   apiRange: "1min",  group: "intraday" },
  { key: "5min",  label: "5分",   apiRange: "5min",  group: "intraday" },
  { key: "10min", label: "10分",  apiRange: "10min", group: "intraday" }, // 15m足で代用
  { key: "1h",    label: "1時間", apiRange: "1h",    group: "intraday" },
  /* ── 期間 ── */
  { key: "1d",    label: "1日",   apiRange: "1d",    group: "period" },
  { key: "1wk",   label: "1週",   apiRange: "5d",    group: "period" },
  { key: "1mo",   label: "1月",   apiRange: "1mo",   group: "period" },
  { key: "3mo",   label: "3月",   apiRange: "3mo",   group: "period" },
  { key: "6mo",   label: "6月",   apiRange: "6mo",   group: "period" },
  { key: "1y",    label: "1年",   apiRange: "1y",    group: "period" },
  { key: "5y",    label: "5年",   apiRange: "5y",    group: "period" },
  { key: "10y",   label: "10年",  apiRange: "10y",   group: "period" },
  { key: "max",   label: "MAX",   apiRange: "max",   group: "period" },
];

/* ─── Helpers ─── */
function fmtDate(date: string, range: RangeKey): string {
  const d = new Date(date);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  const mo = d.getMonth() + 1;
  const da = d.getDate();
  // 分足・当日分 → HH:MM
  if (range === "1min" || range === "5min" || range === "10min" || range === "1d") {
    return `${hh}:${mm}`;
  }
  // 時間足・週次 → M/D HH:00
  if (range === "1h" || range === "1wk") {
    return `${mo}/${da} ${hh}:00`;
  }
  // 長期 → YYYY/M
  if (range === "5y" || range === "10y" || range === "max") {
    return `${d.getFullYear()}/${mo}`;
  }
  // 中期 → M/D
  return `${mo}/${da}`;
}

function fmtPrice(v: number): string {
  return v.toLocaleString("ja-JP", { maximumFractionDigits: 2 });
}

function fmtVol(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

/* ─── Candlestick SVG canvas ─── */
function CandleChart({
  data, height, range, fmt: fmtFn,
}: {
  data: Point[];
  height: number;
  range: RangeKey;
  fmt?: (v: number) => string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<{ idx: number; x: number; y: number } | null>(null);

  const [svgW, setSvgW] = useState(0);
  useEffect(() => {
    if (!svgRef.current) return;
    const obs = new ResizeObserver((entries) => setSvgW(entries[0].contentRect.width));
    obs.observe(svgRef.current);
    return () => obs.disconnect();
  }, []);

  const ml = 8, mr = 8, mt = 8, mb = 2;
  const plotW = svgW - ml - mr;

  const highs  = data.map(d => d.high  ?? d.close);
  const lows   = data.map(d => d.low   ?? d.close);
  const maxH   = Math.max(...highs);
  const minL   = Math.min(...lows);
  const pad    = (maxH - minL) * 0.08 || maxH * 0.02;
  const domMax = maxH + pad;
  const domMin = minL - pad;
  const plotH  = height - mt - mb;

  function toY(v: number) { return mt + (1 - (v - domMin) / (domMax - domMin)) * plotH; }
  function toX(i: number) { return ml + (i + 0.5) * (plotW / data.length); }

  const candleW = Math.max(1, Math.min(12, (plotW / data.length) * 0.6));

  const handleMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const idx = Math.floor((x - ml) / (plotW / data.length));
    if (idx >= 0 && idx < data.length) setHover({ idx, x, y: e.clientY - rect.top });
    else setHover(null);
  }, [plotW, data.length]);

  const hp = hover ? data[hover.idx] : null;

  return (
    <svg
      ref={svgRef}
      width="100%"
      height={height}
      className="touch-pan-y select-none"
      onPointerMove={handleMove}
      onPointerLeave={() => setHover(null)}
    >
      {data.map((d, i) => {
        const isUp  = (d.close ?? 0) >= (d.open ?? d.close ?? 0);
        const color = isUp ? "#10b981" : "#ef4444";
        const x     = toX(i);
        const cTop  = toY(Math.max(d.close ?? 0, d.open ?? d.close ?? 0));
        const cBot  = toY(Math.min(d.close ?? 0, d.open ?? d.close ?? 0));
        const wTop  = toY(d.high ?? d.close ?? 0);
        const wBot  = toY(d.low  ?? d.close ?? 0);
        const dim   = hover && hover.idx !== i;
        return (
          <g key={i} opacity={dim ? 0.35 : 1}>
            {/* Wick */}
            <line x1={x} x2={x} y1={wTop} y2={wBot} stroke={color} strokeWidth={1} />
            {/* Body */}
            <rect
              x={x - candleW / 2}
              y={cTop}
              width={candleW}
              height={Math.max(1, cBot - cTop)}
              fill={color}
              rx={1}
            />
          </g>
        );
      })}

      {/* Hover crosshair */}
      {hover && (
        <line
          x1={toX(hover.idx)}
          x2={toX(hover.idx)}
          y1={mt}
          y2={mt + plotH}
          stroke="#94a3b8"
          strokeWidth={1}
          strokeDasharray="4 3"
        />
      )}

      {/* Tooltip */}
      {hp && hover && (() => {
        const tw = 120, th = 74;
        const left = hover.idx < data.length * 0.65 ? toX(hover.idx) + 6 : toX(hover.idx) - tw - 6;
        const top  = Math.min(mt + 4, height - th - 4);
        return (
          <g>
            <rect x={left} y={top} width={tw} height={th} fill="white" stroke="#e2e8f0" strokeWidth={1} rx={6} />
            <text x={left + 8} y={top + 16} fontSize={9} fill="#64748b">{fmtDate(hp.date, range)}</text>
            {[
              ["始値", hp.open],
              ["高値", hp.high],
              ["安値", hp.low],
              ["終値", hp.close],
            ].map(([label, val], i) => (
              <text key={i} x={left + 8} y={top + 28 + i * 12} fontSize={10} fill="#1e293b">
                <tspan fill="#64748b">{label} </tspan>{val != null ? (fmtFn ?? fmtPrice)(Number(val)) : "—"}
              </text>
            ))}
          </g>
        );
      })()}
    </svg>
  );
}

/* ─── Chart controls ─── */
const INTRADAY_RANGES = RANGES.filter(r => r.group === "intraday");
const PERIOD_RANGES   = RANGES.filter(r => r.group === "period");

function TabRow({
  items, range, onChange,
}: {
  items: typeof RANGES;
  range: RangeKey;
  onChange: (r: RangeKey) => void;
}) {
  return (
    <div className="flex gap-0.5 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
      {items.map(r => (
        <button
          key={r.key}
          onClick={() => onChange(r.key)}
          className={`px-2 sm:px-2.5 py-1 text-[11px] rounded-md font-semibold transition-all whitespace-nowrap ${
            range === r.key
              ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

function RangeTabs({ range, onChange }: { range: RangeKey; onChange: (r: RangeKey) => void }) {
  return (
    <div className="space-y-1.5">
      {/* 足種 */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 w-7 shrink-0">足種</span>
        <div className="overflow-x-auto scrollbar-none">
          <TabRow items={INTRADAY_RANGES} range={range} onChange={onChange} />
        </div>
      </div>
      {/* 期間 */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 w-7 shrink-0">期間</span>
        <div className="overflow-x-auto scrollbar-none">
          <TabRow items={PERIOD_RANGES} range={range} onChange={onChange} />
        </div>
      </div>
    </div>
  );
}

/* ─── RSI Sub-panel ─── */
function RSIPanel({ data, range }: { data: (number | null)[]; range: RangeKey }) {
  const chartData = data.map((rsi) => ({ rsi }));
  return (
    <ResponsiveContainer width="100%" height={80}>
      <ComposedChart data={chartData} margin={{ top: 2, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" strokeOpacity={0.4} />
        <XAxis dataKey="date" hide />
        <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#94a3b8" }} width={28} axisLine={false} tickLine={false} ticks={[30, 50, 70]} />
        <Tooltip formatter={(v) => [v != null ? Number(v).toFixed(1) : "—", "RSI"]} contentStyle={{ fontSize: 10, borderRadius: 6 }} />
        <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="4 3" strokeWidth={1} />
        <ReferenceLine y={30} stroke="#10b981" strokeDasharray="4 3" strokeWidth={1} />
        <Line type="monotone" dataKey="rsi" stroke="#8b5cf6" strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* ─── MACD Sub-panel ─── */
function MACDPanel({ macdData }: { macdData: { macd: number | null; signal: number | null; hist: number | null }[] }) {
  const chartData = macdData.map(d => ({
    macd: d.macd,
    signal: d.signal,
    hist: d.hist,
  }));
  return (
    <ResponsiveContainer width="100%" height={80}>
      <ComposedChart data={chartData} margin={{ top: 2, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" strokeOpacity={0.4} />
        <XAxis dataKey="date" hide />
        <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} width={28} axisLine={false} tickLine={false} />
        <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1} />
        <Tooltip
          formatter={(v, name) => {
            const labels: Record<string, string> = { macd: "MACD", signal: "シグナル", hist: "ヒスト" };
            return [v != null ? Number(v).toFixed(3) : "—", labels[name as string] ?? name];
          }}
          contentStyle={{ fontSize: 10, borderRadius: 6 }}
        />
        <Bar dataKey="hist" fill="#94a3b8" opacity={0.6} radius={[1, 1, 0, 0]} isAnimationActive={false} />
        <Line type="monotone" dataKey="macd" stroke="#3b82f6" strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls={false} />
        <Line type="monotone" dataKey="signal" stroke="#ef4444" strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* ─── Recharts line + volume chart ─── */
function LineVolumeChart({
  data, range, first, height = 240, fmt: fmtFn, showBB = false,
}: {
  data: Point[];
  range: RangeKey;
  first: number;
  height?: number;
  fmt?: (v: number) => string;
  showBB?: boolean;
}) {
  const allVals = data.map(d => d.close).filter(Boolean) as number[];
  const min     = allVals.length ? Math.min(...allVals) : 0;
  const max     = allVals.length ? Math.max(...allVals) : 0;
  const pad     = (max - min) * 0.1 || max * 0.02;
  const lineColor = data.length && data[data.length - 1].close >= first ? "#10b981" : "#ef4444";

  // Compute BB and merge into data
  const bbValues = useMemo(() => showBB ? calcBB(data) : null, [data, showBB]);
  const chartData = useMemo(() => {
    if (!bbValues) return data;
    return data.map((p, i) => ({ ...p, ...bbValues[i] }));
  }, [data, bbValues]);

  // Adjust domain to include BB bands
  const priceDomain = useMemo((): [number, number] => {
    if (!bbValues) return [min - pad, max + pad];
    const uppers = bbValues.map(b => b.bb_upper).filter((v): v is number => v !== null);
    const lowers = bbValues.map(b => b.bb_lower).filter((v): v is number => v !== null);
    const bbMax = uppers.length ? Math.max(...uppers) : max;
    const bbMin = lowers.length ? Math.min(...lowers) : min;
    const domMax = Math.max(max, bbMax);
    const domMin = Math.min(min, bbMin);
    const dp = (domMax - domMin) * 0.08 || domMax * 0.02;
    return [domMin - dp, domMax + dp];
  }, [bbValues, min, max, pad]);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={chartData} margin={{ top: 6, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" strokeOpacity={0.6} />
        <XAxis
          dataKey="date"
          tickFormatter={(d) => fmtDate(String(d), range)}
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          minTickGap={50}
          interval="preserveStartEnd"
          axisLine={false}
          tickLine={false}
        />
        {/* Price Y axis (left) */}
        <YAxis
          yAxisId="price"
          domain={priceDomain}
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          tickFormatter={fmtFn ?? fmtPrice}
          width={60}
          axisLine={false}
          tickLine={false}
        />
        {/* Volume Y axis (right, hidden ticks) */}
        <YAxis
          yAxisId="vol"
          orientation="right"
          tick={false}
          axisLine={false}
          tickLine={false}
          width={0}
        />
        {first > 0 && (
          <ReferenceLine yAxisId="price" y={first} stroke="#94a3b8" strokeDasharray="4 3" strokeWidth={1} />
        )}
        <Tooltip
          formatter={(v, name) => {
            if (name === "volume") return [fmtVol(Number(v)), "出来高"];
            if (name === "bb_upper") return [(fmtFn ?? fmtPrice)(Number(v)), "BB上限"];
            if (name === "bb_mid")   return [(fmtFn ?? fmtPrice)(Number(v)), "BB中心"];
            if (name === "bb_lower") return [(fmtFn ?? fmtPrice)(Number(v)), "BB下限"];
            return [`${(fmtFn ?? fmtPrice)(Number(v))}`, "終値"];
          }}
          labelFormatter={(l) => fmtDate(String(l), range)}
          contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0", background: "rgba(255,255,255,0.97)" }}
        />
        {/* Volume bars */}
        <Bar
          yAxisId="vol"
          dataKey="volume"
          fill={lineColor}
          opacity={0.18}
          radius={[1, 1, 0, 0]}
          isAnimationActive={false}
        />
        {/* Bollinger Band overlay */}
        {showBB && (
          <>
            <Area
              yAxisId="price"
              type="monotone"
              dataKey="bb_upper"
              stroke="#3b82f6"
              strokeWidth={1}
              strokeDasharray="3 3"
              fill="none"
              dot={false}
              isAnimationActive={false}
              connectNulls={false}
            />
            <Area
              yAxisId="price"
              type="monotone"
              dataKey="bb_lower"
              stroke="#3b82f6"
              strokeWidth={1}
              strokeDasharray="3 3"
              fill="#3b82f6"
              fillOpacity={0.05}
              dot={false}
              isAnimationActive={false}
              connectNulls={false}
            />
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="bb_mid"
              stroke="#3b82f6"
              strokeWidth={1}
              strokeDasharray="6 3"
              dot={false}
              isAnimationActive={false}
              connectNulls={false}
            />
          </>
        )}
        {/* Price line */}
        <Line
          yAxisId="price"
          type="monotone"
          dataKey="close"
          stroke={lineColor}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* ─── Expanded modal ─── */
function ExpandedModal({
  symbol, currency, data, loading, range, setRange, chartType, setChartType, first, fmt, onClose,
}: {
  symbol: string;
  currency?: string | null;
  data: Point[];
  loading: boolean;
  range: RangeKey;
  setRange: (r: RangeKey) => void;
  chartType: ChartType;
  setChartType: (t: ChartType) => void;
  first: number;
  fmt: (v: number) => string;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const last = data[data.length - 1]?.close ?? 0;
  const pct  = first ? ((last - first) / first) * 100 : 0;
  const up   = pct >= 0;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-white dark:bg-slate-950">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shrink-0">
        <div className="flex-1 flex flex-wrap items-center gap-3">
          <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{symbol}</span>
          {!loading && data.length > 0 && (
            <span className={`text-sm font-bold font-mono tabular-nums ${up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
              {up ? "▲" : "▼"} {Math.abs(pct).toFixed(2)}%
            </span>
          )}
          {last > 0 && (
            <span className="text-sm font-mono text-slate-600 dark:text-slate-400">
              {fmt(last)}{currency && ` ${currency}`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Chart type toggle */}
          <div className="flex gap-0.5 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
            <button
              onClick={() => setChartType("line")}
              className={`px-2 py-1 rounded-md font-semibold transition-all ${chartType === "line" ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white" : "text-slate-500"}`}
            >
              折れ線
            </button>
            <button
              onClick={() => setChartType("candle")}
              className={`px-2 py-1 rounded-md font-semibold transition-all ${chartType === "candle" ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white" : "text-slate-500"}`}
            >
              ローソク
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="閉じる"
          >
            <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>
      </div>

      {/* Range tabs (2 rows) */}
      <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800/70 shrink-0 overflow-x-auto">
        <RangeTabs range={range} onChange={setRange} />
      </div>

      {/* Chart area */}
      <div className="flex-1 p-4 min-h-0">
        {loading ? (
          <div className="w-full h-full rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm">データなし</div>
        ) : chartType === "candle" ? (
          <div className="w-full h-full">
            <CandleChart data={data} height={window.innerHeight - 200} range={range} fmt={fmt} />
          </div>
        ) : (
          <LineVolumeChart data={data} range={range} first={first} height={window.innerHeight - 200} fmt={fmt} />
        )}
      </div>

      {/* OHLC footer */}
      {data.length > 0 && (() => {
        const d = data[data.length - 1];
        return (
          <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800/70 shrink-0 flex gap-4 text-xs font-mono text-slate-500 dark:text-slate-400">
            {d.open  != null && <span>始値 <strong className="text-slate-700 dark:text-slate-200">{fmt(d.open)}</strong></span>}
            {d.high  != null && <span>高値 <strong className="text-emerald-600 dark:text-emerald-400">{fmt(d.high)}</strong></span>}
            {d.low   != null && <span>安値 <strong className="text-rose-600 dark:text-rose-400">{fmt(d.low)}</strong></span>}
            <span>終値 <strong className="text-slate-700 dark:text-slate-200">{fmt(d.close)}</strong></span>
            {d.volume != null && <span>出来高 <strong>{fmtVol(d.volume)}</strong></span>}
          </div>
        );
      })()}
    </div>
  );
}

/* ─── Auto-refresh intervals for intraday ranges (ms) ─── */
const REFRESH_MS: Partial<Record<RangeKey, number>> = {
  "1min":  10_000,   // 10 s — keep chart data fresh
  "5min":  20_000,   // 20 s
  "10min": 30_000,   // 30 s
  "1h":    60_000,   // 1 min
  "1d":    20_000,   // 20 s — during-session view
  "1wk":   120_000,  // 2 min
};

function fmtUpdatedAt(d: Date): string {
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  const s = d.getSeconds().toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

/** Format a "YYYY-MM-DD" string for display (e.g. "6/6 (金)") */
function fmtTradingDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()} (${dayNames[d.getUTCDay()]})`;
}

/** True if "YYYY-MM-DD" is today in UTC */
function isToday(dateStr: string): boolean {
  return new Date().toISOString().slice(0, 10) === dateStr;
}

/* ─── Indicator toggle button ─── */
function IndicatorToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-0.5 text-[10px] rounded border font-semibold transition-all ${
        active
          ? "border-blue-400 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
          : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-400"
      }`}
    >
      {label}
    </button>
  );
}

/* ─── Main StockChart component ─── */
export default function StockChart({ symbol, currency }: { symbol: string; currency?: string | null }) {
  const [range, setRange]           = useState<RangeKey>("3mo");
  const [chartType, setChartType]   = useState<ChartType>("line");
  const [data, setData]             = useState<Point[]>([]);
  const [loading, setLoading]       = useState(true);
  const [expanded, setExpanded]     = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [updatedAt, setUpdatedAt]   = useState<Date | null>(null);
  const [spinning, setSpinning]     = useState(false);
  const [activeIndicators, setActiveIndicators] = useState<Set<IndicatorKey>>(new Set());

  function toggleIndicator(key: IndicatorKey) {
    setActiveIndicators(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  const showBB   = activeIndicators.has("BB");
  const showRSI  = activeIndicators.has("RSI");
  const showMACD = activeIndicators.has("MACD");
  /** Populated only for singleDay ranges (1min / 1d) — the date of the data */
  const [tradingDate, setTradingDate] = useState<string | null>(null);
  /** Latest real-time price for injecting a "live" bar into the 1-min chart */
  const [livePoint, setLivePoint]   = useState<{ price: number; ts: number } | null>(null);

  // Track the previous fetch key to avoid showing the loading skeleton during auto-refresh
  const prevFetchKey = useRef('');

  const { showJpy, jpyRate } = useCurrency();
  const jpyMode = showJpy && jpyRate != null;

  const isIntraday = useMemo(() => RANGES.find(r => r.key === range)?.group === "intraday", [range]);

  useEffect(() => {
    const r = RANGES.find(r => r.key === range)!;
    const fetchKey = `${symbol}-${range}`;
    // Only show loading skeleton on initial load or when symbol/range changes.
    // Background auto-refreshes (same fetchKey) update silently.
    const isAutoRefresh = prevFetchKey.current === fetchKey;
    prevFetchKey.current = fetchKey;

    const ctrl = new AbortController();
    if (!isAutoRefresh) setLoading(true);
    fetch(`/api/chart?symbol=${encodeURIComponent(symbol)}&range=${r.apiRange}`, { signal: ctrl.signal })
      .then(res => res.json())
      .then(j => {
        setData((j.data ?? []) as Point[]);
        setTradingDate(j.tradingDate ?? null);
        setUpdatedAt(new Date());
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [symbol, range, refreshTick]);

  // Auto-refresh for intraday ranges
  useEffect(() => {
    const ms = REFRESH_MS[range];
    if (!ms) return;
    const id = setInterval(() => setRefreshTick(t => t + 1), ms);
    return () => clearInterval(id);
  }, [symbol, range]);

  // Live price polling for 1-min chart: fetch /api/quote every 10 s and
  // inject the latest price as the "current forming bar" at the chart tail.
  useEffect(() => {
    if (range !== "1min") { setLivePoint(null); return; }
    const fetchLive = () => {
      fetch(`/api/quote?symbol=${encodeURIComponent(symbol)}`)
        .then(r => r.json())
        .then(j => {
          const q = j.quote;
          if (q?.regularMarketPrice == null) return;
          // regularMarketTime comes as a serialised ISO string or Unix ms
          const raw = q.regularMarketTime;
          const ts  = raw
            ? (typeof raw === "number" ? raw * 1000 : new Date(raw).getTime())
            : Date.now();
          setLivePoint({ price: Number(q.regularMarketPrice), ts });
        })
        .catch(() => {});
    };
    fetchLive();
    const id = setInterval(fetchLive, 10_000);
    return () => clearInterval(id);
  }, [symbol, range]);

  const handleManualRefresh = () => {
    setSpinning(true);
    setRefreshTick(t => t + 1);
    setTimeout(() => setSpinning(false), 800);
  };

  /**
   * Merge the live quote price into the raw chart data as the last bar.
   * - If the live price timestamp is newer than the last chart bar → append a new bar.
   * - If it falls within the same minute as the last bar → update that bar's close.
   * This ensures the 1-min chart always reflects the most recent price.
   */
  const dataWithLive = useMemo(() => {
    if (!livePoint || range !== "1min" || !data.length) return data;
    const lastBar   = data[data.length - 1];
    const lastBarTs = new Date(lastBar.date).getTime();
    // Only append if the live price is genuinely newer
    if (livePoint.ts <= lastBarTs) return data;

    const minuteTs     = Math.floor(livePoint.ts   / 60_000) * 60_000;
    const lastMinuteTs = Math.floor(lastBarTs       / 60_000) * 60_000;

    if (minuteTs > lastMinuteTs) {
      // A new minute has started — append a brand-new bar
      return [...data, {
        date:   new Date(minuteTs).toISOString(),
        close:  livePoint.price,
        open:   lastBar.close,   // best-effort: previous close as open
        high:   null,
        low:    null,
        volume: null,
      }];
    } else {
      // Still in the same minute — update the last bar's closing price
      return [...data.slice(0, -1), { ...lastBar, close: livePoint.price }];
    }
  }, [data, livePoint, range]);

  /** 円換算時は O/H/L/C をすべて jpyRate 倍に変換したデータを使う */
  const displayData = useMemo(() => {
    if (!jpyMode || !jpyRate) return dataWithLive;
    return dataWithLive.map(d => ({
      ...d,
      close: d.close * jpyRate,
      open:   d.open   != null ? d.open   * jpyRate : null,
      high:   d.high   != null ? d.high   * jpyRate : null,
      low:    d.low    != null ? d.low    * jpyRate : null,
    }));
  }, [dataWithLive, jpyMode, jpyRate]);

  // RSI / MACD calculations (computed from displayData)
  const rsiData  = useMemo(() => showRSI  ? calcRSI(displayData)  : [], [displayData, showRSI]);
  const macdData = useMemo(() => showMACD ? calcMACD(displayData) : [], [displayData, showMACD]);

  /** True when a live price bar is actively tracking the current minute */
  const isLive = livePoint != null && range === "1min" &&
    Date.now() - livePoint.ts < 5 * 60_000; // within last 5 minutes

  /** 価格フォーマット — JPY モードは円単位 */
  const fmtDisplay = (v: number) => jpyMode ? formatJpy(v) : fmtPrice(v);

  const first = displayData[0]?.close ?? 0;
  const last  = displayData[displayData.length - 1]?.close ?? 0;
  const pct   = first ? ((last - first) / first) * 100 : 0;
  const up    = pct >= 0;

  return (
    <>
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800/60 space-y-2">
          {/* Top row: period return + chart type + refresh + expand */}
          <div className="flex items-center justify-between gap-2">
            {/* Period return + last-updated */}
            <div className="flex items-center gap-2 min-w-0">
              {!loading && data.length > 0 && (
                <div className={`flex items-center gap-1 text-xs font-bold font-mono tabular-nums ${up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {up ? "+" : ""}{pct.toFixed(2)}%
                </div>
              )}
              {isIntraday && !loading && tradingDate && !isToday(tradingDate) && (
                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40 font-medium">
                  {fmtTradingDate(tradingDate)}
                </span>
              )}
              {isIntraday && updatedAt && !loading && (
                <span className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">
                  {fmtUpdatedAt(updatedAt)} 更新
                </span>
              )}
              {isLive && !loading && (
                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                  LIVE
                </span>
              )}
            </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Indicator toggles */}
            <div className="flex items-center gap-1">
              <IndicatorToggle label="BB"   active={showBB}   onClick={() => toggleIndicator("BB")} />
              <IndicatorToggle label="RSI"  active={showRSI}  onClick={() => toggleIndicator("RSI")} />
              <IndicatorToggle label="MACD" active={showMACD} onClick={() => toggleIndicator("MACD")} />
            </div>

            {/* Manual refresh (intraday only) */}
            {isIntraday && (
              <button
                onClick={handleManualRefresh}
                title="最新データに更新"
                disabled={loading}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-500 disabled:opacity-40 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${spinning ? "animate-spin" : ""}`} />
              </button>
            )}

            {/* Chart type toggle */}
            <div className="flex gap-0.5 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
              <button
                onClick={() => setChartType("line")}
                className={`px-2 py-1 rounded-md font-semibold transition-all ${chartType === "line" ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white" : "text-slate-500"}`}
              >
                折れ線
              </button>
              <button
                onClick={() => setChartType("candle")}
                className={`px-2 py-1 rounded-md font-semibold transition-all ${chartType === "candle" ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white" : "text-slate-500"}`}
              >
                ローソク
              </button>
            </div>

            {/* Expand */}
            <button
              onClick={() => setExpanded(true)}
              title="全画面表示"
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-all"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
          </div>

          {/* Range tabs (2 rows: 足種 / 期間) */}
          <RangeTabs range={range} onChange={setRange} />
        </div>

        {/* Chart */}
        <div className="px-2 pt-2 pb-1">
          {loading ? (
            <div className="h-64 w-full rounded-xl bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
          ) : data.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-sm text-slate-400">データなし</div>
          ) : chartType === "candle" ? (
            <div className="touch-pan-y select-none" style={{ height: 264 }}>
              <CandleChart data={displayData} height={264} range={range} fmt={fmtDisplay} />
            </div>
          ) : (
            <div className="touch-pan-y select-none">
              <LineVolumeChart data={displayData} range={range} first={first} height={264} fmt={fmtDisplay} showBB={showBB} />
            </div>
          )}
        </div>

        {/* RSI Sub-panel */}
        {showRSI && !loading && displayData.length > 0 && (
          <div className="px-2 pb-1 border-t border-slate-100 dark:border-slate-800/50">
            <div className="flex items-center gap-1.5 px-1 pt-1 pb-0.5">
              <span className="text-[9px] font-bold text-violet-500 uppercase tracking-wider">RSI (14)</span>
            </div>
            <RSIPanel data={rsiData} range={range} />
          </div>
        )}

        {/* MACD Sub-panel */}
        {showMACD && !loading && displayData.length > 0 && (
          <div className="px-2 pb-1 border-t border-slate-100 dark:border-slate-800/50">
            <div className="flex items-center gap-2 px-1 pt-1 pb-0.5">
              <span className="text-[9px] font-bold text-blue-500 uppercase tracking-wider">MACD (12,26,9)</span>
              <span className="text-[8px] text-slate-400 flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-blue-500 inline-block" />青=MACD
                <span className="w-3 h-0.5 bg-red-400 inline-block" />赤=シグナル
              </span>
            </div>
            <MACDPanel macdData={macdData} />
          </div>
        )}

        {/* Volume hint */}
        {!loading && data.length > 0 && data[0].volume != null && (
          <div className="px-4 pb-3 pt-1 text-[10px] text-slate-400 flex gap-3">
            <span>最新出来高: <strong className="text-slate-600 dark:text-slate-400">{fmtVol(data[data.length - 1].volume ?? 0)}</strong></span>
          </div>
        )}
      </div>

      {/* Expanded modal */}
      {expanded && (
        <ExpandedModal
          symbol={symbol}
          currency={currency}
          data={displayData}
          loading={loading}
          range={range}
          setRange={setRange}
          chartType={chartType}
          setChartType={setChartType}
          first={first}
          fmt={fmtDisplay}
          onClose={() => setExpanded(false)}
        />
      )}
    </>
  );
}
