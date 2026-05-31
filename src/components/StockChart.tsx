"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";
import { Maximize2, X, TrendingUp, TrendingDown } from "lucide-react";

/* ─── Types ─── */
type Point = {
  date: string;
  close: number;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  volume?: number | null;
};

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
  data, height, range,
}: {
  data: Point[];
  height: number;
  range: RangeKey;
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
                <tspan fill="#64748b">{label} </tspan>{val != null ? fmtPrice(Number(val)) : "—"}
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

/* ─── Recharts line + volume chart ─── */
function LineVolumeChart({
  data, range, first, height = 240,
}: {
  data: Point[];
  range: RangeKey;
  first: number;
  height?: number;
}) {
  const allVals = data.map(d => d.close).filter(Boolean) as number[];
  const min     = allVals.length ? Math.min(...allVals) : 0;
  const max     = allVals.length ? Math.max(...allVals) : 0;
  const pad     = (max - min) * 0.1 || max * 0.02;
  const lineColor = data.length && data[data.length - 1].close >= first ? "#10b981" : "#ef4444";

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 6, right: 4, left: 0, bottom: 0 }}>
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
          domain={[min - pad, max + pad]}
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          tickFormatter={fmtPrice}
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
            return [`${fmtPrice(Number(v))}`, "終値"];
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
  symbol, currency, data, loading, range, setRange, chartType, setChartType, first, onClose,
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
              {fmtPrice(last)} {currency}
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
            <CandleChart data={data} height={window.innerHeight - 200} range={range} />
          </div>
        ) : (
          <LineVolumeChart data={data} range={range} first={first} height={window.innerHeight - 200} />
        )}
      </div>

      {/* OHLC footer */}
      {data.length > 0 && (() => {
        const d = data[data.length - 1];
        return (
          <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800/70 shrink-0 flex gap-4 text-xs font-mono text-slate-500 dark:text-slate-400">
            {d.open  != null && <span>始値 <strong className="text-slate-700 dark:text-slate-200">{fmtPrice(d.open)}</strong></span>}
            {d.high  != null && <span>高値 <strong className="text-emerald-600 dark:text-emerald-400">{fmtPrice(d.high)}</strong></span>}
            {d.low   != null && <span>安値 <strong className="text-rose-600 dark:text-rose-400">{fmtPrice(d.low)}</strong></span>}
            <span>終値 <strong className="text-slate-700 dark:text-slate-200">{fmtPrice(d.close)}</strong></span>
            {d.volume != null && <span>出来高 <strong>{fmtVol(d.volume)}</strong></span>}
          </div>
        );
      })()}
    </div>
  );
}

/* ─── Main StockChart component ─── */
export default function StockChart({ symbol, currency }: { symbol: string; currency?: string | null }) {
  const [range, setRange]           = useState<RangeKey>("3mo");
  const [chartType, setChartType]   = useState<ChartType>("line");
  const [data, setData]             = useState<Point[]>([]);
  const [loading, setLoading]       = useState(true);
  const [expanded, setExpanded]     = useState(false);

  useEffect(() => {
    const r = RANGES.find(r => r.key === range)!;
    const ctrl = new AbortController();
    setLoading(true);
    fetch(`/api/chart?symbol=${encodeURIComponent(symbol)}&range=${r.apiRange}`, { signal: ctrl.signal })
      .then(res => res.json())
      .then(j => setData((j.data ?? []) as Point[]))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [symbol, range]);

  const first = data[0]?.close ?? 0;
  const last  = data[data.length - 1]?.close ?? 0;
  const pct   = first ? ((last - first) / first) * 100 : 0;
  const up    = pct >= 0;

  return (
    <>
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800/60 space-y-2">
          {/* Top row: period return + chart type + expand */}
          <div className="flex items-center justify-between gap-2">
            {/* Period return badge */}
            <div className="h-5">
              {!loading && data.length > 0 && (
                <div className={`flex items-center gap-1 text-xs font-bold font-mono tabular-nums ${up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {up ? "+" : ""}{pct.toFixed(2)}%
                </div>
              )}
            </div>

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
              <CandleChart data={data} height={264} range={range} />
            </div>
          ) : (
            <div className="touch-pan-y select-none">
              <LineVolumeChart data={data} range={range} first={first} height={264} />
            </div>
          )}
        </div>

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
          data={data}
          loading={loading}
          range={range}
          setRange={setRange}
          chartType={chartType}
          setChartType={setChartType}
          first={first}
          onClose={() => setExpanded(false)}
        />
      )}
    </>
  );
}
