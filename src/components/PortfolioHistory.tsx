"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { TrendingUp, PieChart as PieIcon } from "lucide-react";
import type { HoldingValuation, PortfolioSummary } from "@/lib/portfolio";
import { GICS_SECTORS } from "@/lib/gics";

const PERIODS = [
  { key: "3mo", label: "3ヶ月" },
  { key: "6mo", label: "6ヶ月" },
  { key: "1y",  label: "1年" },
] as const;

const SECTOR_COLORS = [
  "#3b82f6", "#f59e0b", "#10b981", "#ec4899", "#8b5cf6",
  "#06b6d4", "#ef4444", "#84cc16", "#f97316", "#14b8a6", "#a855f7",
];

function fmtJpyShort(v: number): string {
  if (Math.abs(v) >= 1e8) return `¥${(v / 1e8).toFixed(2)}億`;
  if (Math.abs(v) >= 1e4) return `¥${(v / 1e4).toFixed(0)}万`;
  return `¥${Math.round(v).toLocaleString("ja-JP")}`;
}

type SectorSlice = { name: string; value: number };

export default function PortfolioHistory({
  valuations, usdJpy, summary,
}: {
  valuations: HoldingValuation[];
  usdJpy: number;
  summary: PortfolioSummary | null;
}) {
  const [period, setPeriod] = useState<typeof PERIODS[number]["key"]>("6mo");
  const [series, setSeries] = useState<{ date: string; value: number }[]>([]);
  const [sectors, setSectors] = useState<SectorSlice[]>([]);
  const [loading, setLoading] = useState(false);

  const holdingsKey = valuations.map((v) => `${v.holding.symbol}:${v.holding.quantity}`).join(",");

  // ── asset value history ──
  const loadHistory = useCallback(async () => {
    if (valuations.length === 0) { setSeries([]); return; }
    setLoading(true);
    try {
      const charts = await Promise.all(valuations.map(async (v) => {
        const fx = (v.holding.currency ?? "JPY") === "JPY" ? 1 : usdJpy;
        const qty = v.holding.quantity;
        try {
          const j = await (await fetch(`/api/chart?symbol=${encodeURIComponent(v.holding.symbol)}&range=${period}`)).json();
          const data = (j.data ?? []) as { date: string; close: number }[];
          return { qty, fx, data };
        } catch { return { qty, fx, data: [] as { date: string; close: number }[] }; }
      }));

      // union of dates, forward-filled per holding
      const dateSet = new Set<string>();
      for (const c of charts) for (const d of c.data) dateSet.add(d.date.slice(0, 10));
      const dates = [...dateSet].sort();
      if (dates.length === 0) { setSeries([]); return; }

      const maps = charts.map((c) => {
        const m = new Map<string, number>();
        for (const d of c.data) m.set(d.date.slice(0, 10), d.close);
        return { ...c, m };
      });

      const out = dates.map((date) => {
        let total = 0;
        for (const c of maps) {
          let close: number | undefined = c.m.get(date);
          if (close == null) {
            // forward-fill: most recent prior close
            for (let i = dates.indexOf(date) - 1; i >= 0; i--) {
              const prev = c.m.get(dates[i]);
              if (prev != null) { close = prev; break; }
            }
          }
          if (close != null) total += close * c.qty * c.fx;
        }
        return { date, value: Math.round(total) };
      }).filter((p) => p.value > 0);

      setSeries(out);
    } catch { setSeries([]); }
    finally { setLoading(false); }
  }, [holdingsKey, period, usdJpy]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // ── sector allocation (best-effort) ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (valuations.length === 0) { setSectors([]); return; }
      const sectorJa = new Map(GICS_SECTORS.map((s) => [s.id, s.nameJa]));
      const agg = new Map<string, number>();
      await Promise.all(valuations.map(async (v) => {
        const val = v.marketValueJpy ?? 0;
        if (val <= 0) return;
        let label = "その他";
        try {
          const j = await (await fetch(`/api/profile?symbol=${encodeURIComponent(v.holding.symbol)}`)).json();
          const gid = j.gicsId as string | null;
          if (gid && sectorJa.has(gid as never)) label = sectorJa.get(gid as never)!;
        } catch { /* keep その他 */ }
        agg.set(label, (agg.get(label) ?? 0) + val);
      }));
      if (cancelled) return;
      setSectors([...agg.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value));
    })();
    return () => { cancelled = true; };
  }, [holdingsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (valuations.length === 0 || !summary) return null;

  const cost = summary.totalCostJpy;
  const first = series[0]?.value;
  const last = series[series.length - 1]?.value;
  const periodGain = first != null && last != null ? last - first : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Asset value chart */}
      <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-indigo-500" />資産推移
            {periodGain != null && (
              <span className={`text-[11px] font-mono ml-1 ${periodGain >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
                {periodGain >= 0 ? "+" : ""}{fmtJpyShort(periodGain)}
              </span>
            )}
          </h2>
          <div className="flex gap-0.5 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
            {PERIODS.map((p) => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  period === p.key ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white" : "text-slate-500"
                }`}>{p.label}</button>
            ))}
          </div>
        </div>
        <div className="h-60">
          {loading ? (
            <div className="w-full h-full rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ) : series.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-slate-400">推移データを取得できませんでした</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 5, right: 8, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="pv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.4} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#94a3b8" }} tickFormatter={(d) => String(d).slice(5)} minTickGap={40} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} tickFormatter={(v) => fmtJpyShort(Number(v))} width={52} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0" }}
                  formatter={(v) => [fmtJpyShort(Number(v)), "評価額"]}
                  labelFormatter={(l) => String(l)}
                />
                {cost > 0 && (
                  <ReferenceLine y={cost} stroke="#94a3b8" strokeDasharray="4 4"
                    label={{ value: `取得原価 ${fmtJpyShort(cost)}`, fontSize: 9, fill: "#94a3b8", position: "insideTopRight" }} />
                )}
                <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} fill="url(#pv)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        <p className="text-[9px] text-slate-400 mt-1">※ 現在の保有株数で過去の株価から遡及評価した概算(為替は現在レート)。</p>
      </div>

      {/* Sector donut */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
        <h2 className="text-sm font-bold flex items-center gap-1.5 mb-2">
          <PieIcon className="w-4 h-4 text-violet-500" />セクター配分
        </h2>
        <div className="h-60">
          {sectors.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-slate-400">読み込み中…</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sectors} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={40} outerRadius={68} paddingAngle={2}>
                  {sectors.map((_, i) => <Cell key={i} fill={SECTOR_COLORS[i % SECTOR_COLORS.length]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0" }}
                  formatter={(v) => fmtJpyShort(Number(v))}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
