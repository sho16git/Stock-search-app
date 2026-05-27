"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

type Point = {
  date: string;
  close: number;
  sma20?: number | null;
  sma50?: number | null;
  sma200?: number | null;
};

const RANGES = ["1mo", "3mo", "6mo", "1y", "5y", "10y"] as const;
type Range = (typeof RANGES)[number];

const SMA_OPTIONS = [
  { id: "sma20", label: "SMA20", color: "#f59e0b", periods: 20 },
  { id: "sma50", label: "SMA50", color: "#10b981", periods: 50 },
  { id: "sma200", label: "SMA200", color: "#ef4444", periods: 200 },
] as const;
type SmaId = (typeof SMA_OPTIONS)[number]["id"];

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

export default function PriceChart({
  symbol,
  currency,
}: {
  symbol: string;
  currency?: string | null;
}) {
  const [range, setRange] = useState<Range>("1y");
  const [raw, setRaw] = useState<{ date: string; close: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [enabledSma, setEnabledSma] = useState<Set<SmaId>>(
    new Set(["sma50", "sma200"]),
  );

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    fetch(`/api/chart?symbol=${encodeURIComponent(symbol)}&range=${range}`, {
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then((j) => {
        setRaw(
          (j.data ?? []).map((d: { date: string; close: number }) => ({
            date: d.date,
            close: d.close,
          })),
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [symbol, range]);

  const data: Point[] = useMemo(() => {
    if (raw.length === 0) return [];
    const closes = raw.map((p) => p.close);
    const sma20 = computeSMA(closes, 20);
    const sma50 = computeSMA(closes, 50);
    const sma200 = computeSMA(closes, 200);
    return raw.map((p, i) => ({
      ...p,
      sma20: sma20[i],
      sma50: sma50[i],
      sma200: sma200[i],
    }));
  }, [raw]);

  const fmt = (v: number) =>
    v.toLocaleString("ja-JP", { maximumFractionDigits: 2 });

  const allValues = data.flatMap((d) =>
    [d.close, d.sma20, d.sma50, d.sma200].filter(
      (v): v is number => typeof v === "number",
    ),
  );
  const min = allValues.length ? Math.min(...allValues) : 0;
  const max = allValues.length ? Math.max(...allValues) : 0;
  const pad = (max - min) * 0.1;

  const toggleSma = (id: SmaId) => {
    setEnabledSma((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-base font-semibold tracking-tight">価格チャート</h2>
        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-lg">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2.5 py-1 text-xs rounded-md transition-all font-medium ${
                range === r
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {SMA_OPTIONS.map((s) => {
          const on = enabledSma.has(s.id);
          return (
            <button
              key={s.id}
              onClick={() => toggleSma(s.id)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                on
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                  : "bg-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
            >
              <span
                className="w-3 h-0.5 rounded-full"
                style={{ background: on ? s.color : "currentColor" }}
              />
              {s.label}
            </button>
          );
        })}
      </div>
      <div className="h-72">
        {loading && (
          <div className="flex items-center justify-center h-full text-sm text-slate-400">
            読み込み中…
          </div>
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
                tick={{ fontSize: 11 }}
                minTickGap={40}
              />
              <YAxis
                domain={[min - pad, max + pad]}
                tick={{ fontSize: 11 }}
                tickFormatter={fmt}
                width={70}
              />
              <Tooltip
                formatter={(v, name) => [
                  `${fmt(Number(v))} ${currency ?? ""}`,
                  name === "close" ? "終値" : String(name).toUpperCase(),
                ]}
                labelStyle={{ color: "#475569" }}
                contentStyle={{
                  background: "rgba(255,255,255,0.95)",
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  fontSize: 12,
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                height={20}
                iconType="plainline"
                iconSize={14}
                wrapperStyle={{ fontSize: 11, color: "#64748b" }}
              />
              <Line
                type="monotone"
                dataKey="close"
                name="終値"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              {SMA_OPTIONS.map((s) =>
                enabledSma.has(s.id) ? (
                  <Line
                    key={s.id}
                    type="monotone"
                    dataKey={s.id}
                    name={s.label}
                    stroke={s.color}
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                    dot={false}
                    isAnimationActive={false}
                    connectNulls
                  />
                ) : null,
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
