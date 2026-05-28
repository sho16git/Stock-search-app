"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";
import { LayoutGrid, BarChart2 } from "lucide-react";

type Point = {
  date: string;
  close: number;
  sma20?: number | null;
  sma50?: number | null;
  sma200?: number | null;
};

type RangeKey = "1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y" | "5y" | "10y";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "1d",  label: "1日" },
  { key: "5d",  label: "5日" },
  { key: "1mo", label: "1ヶ月" },
  { key: "3mo", label: "3ヶ月" },
  { key: "6mo", label: "6ヶ月" },
  { key: "1y",  label: "1年" },
  { key: "5y",  label: "5年" },
  { key: "10y", label: "10年" },
];

const INTRADAY_RANGES: RangeKey[] = ["1d", "5d"];

const SMA_OPTIONS = [
  { id: "sma20"  as const, label: "SMA20",  color: "#f59e0b", periods: 20  },
  { id: "sma50"  as const, label: "SMA50",  color: "#10b981", periods: 50  },
  { id: "sma200" as const, label: "SMA200", color: "#ef4444", periods: 200 },
];
type SmaId = (typeof SMA_OPTIONS)[number]["id"];

// 4分割の各パネル定義
const PANELS: { key: RangeKey; label: string }[] = [
  { key: "1d",  label: "1日（分足）" },
  { key: "1mo", label: "1ヶ月"       },
  { key: "3mo", label: "3ヶ月"       },
  { key: "1y",  label: "1年"         },
];

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

/** ISO 文字列を range に応じて表示用にフォーマット */
function fmtLabel(date: string, range: RangeKey): string {
  const d = new Date(date);
  if (range === "1d") {
    return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  }
  if (range === "5d") {
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  }
  if (range === "5y" || range === "10y") {
    return `${d.getFullYear()}/${d.getMonth() + 1}`;
  }
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/* ─────────────────────── MiniChart (4分割用) ─────────────────────── */
function MiniChart({ symbol, range, label, currency }: {
  symbol: string; range: RangeKey; label: string; currency?: string | null;
}) {
  const [raw, setRaw]       = useState<{ date: string; close: number }[]>([]);
  const [loading, setLoading] = useState(true);

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

  const isIntraday = INTRADAY_RANGES.includes(range);
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

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-3 py-2 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">{label}</span>
        {raw.length > 1 && (
          <span className={`text-[11px] font-mono font-bold ${up ? "text-emerald-600" : "text-rose-600"}`}>
            {up ? "▲" : "▼"} {Math.abs(pct).toFixed(2)}%
          </span>
        )}
      </div>
      {/* Chart */}
      <div className="h-32 flex-1">
        {loading ? (
          <div className="skeleton h-full w-full" />
        ) : raw.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-slate-400">データなし</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={raw} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
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
            </LineChart>
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

/* ─────────────────────── メインコンポーネント ─────────────────────── */
export default function PriceChart({ symbol, currency }: { symbol: string; currency?: string | null }) {
  const [range,      setRange]      = useState<RangeKey>("1y");
  const [raw,        setRaw]        = useState<{ date: string; close: number }[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [multiView,  setMultiView]  = useState(false);
  const [enabledSma, setEnabledSma] = useState<Set<SmaId>>(new Set(["sma50", "sma200"]));

  const isIntraday = INTRADAY_RANGES.includes(range);

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

  const data: Point[] = useMemo(() => {
    if (raw.length === 0 || isIntraday) {
      // 分足では SMA 表示しない
      return raw.map(p => ({ ...p }));
    }
    const closes = raw.map(p => p.close);
    const sma20  = computeSMA(closes, 20);
    const sma50  = computeSMA(closes, 50);
    const sma200 = computeSMA(closes, 200);
    return raw.map((p, i) => ({ ...p, sma20: sma20[i], sma50: sma50[i], sma200: sma200[i] }));
  }, [raw, isIntraday]);

  const fmt = (v: number) => v.toLocaleString("ja-JP", { maximumFractionDigits: 2 });

  const allValues = data.flatMap(d =>
    [d.close, d.sma20, d.sma50, d.sma200].filter((v): v is number => typeof v === "number"),
  );
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

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-base font-semibold tracking-tight flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-slate-500" />
          価格チャート
        </h2>

        <div className="flex items-center gap-2">
          {/* 4分割トグル */}
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

          {/* レンジ選択（単一表示時のみ） */}
          {!multiView && (
            <div className="flex gap-0.5 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-lg">
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

      {/* SMA トグル（単一・非分足のみ） */}
      {!multiView && !isIntraday && (
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
          {PANELS.map(p => (
            <MiniChart key={p.key} symbol={symbol} range={p.key} label={p.label} currency={currency} />
          ))}
        </div>
      ) : (
        /* ── 単一チャート ── */
        <div className="h-72">
          {loading && (
            <div className="skeleton h-full w-full rounded-xl" />
          )}
          {!loading && data.length === 0 && (
            <div className="flex items-center justify-center h-full text-sm text-slate-400">
              データがありません
            </div>
          )}
          {!loading && data.length > 0 && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
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
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* 分足ラベル */}
      {!multiView && isIntraday && (
        <p className="text-[10px] text-slate-400 text-right mt-1">
          {range === "1d" ? "5分足（直近1日）" : "30分足（直近5日）"}
        </p>
      )}
    </div>
  );
}
