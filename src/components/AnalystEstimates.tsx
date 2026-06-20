"use client";

import { useEffect, useState } from "react";
import { BarChart3, TrendingUp, TrendingDown } from "lucide-react";

type Estimate = {
  key: string; label: string; endDate: string | null; growth: number | null;
  epsAvg: number | null; epsLow: number | null; epsHigh: number | null;
  epsAnalysts: number | null; epsYearAgo: number | null; epsGrowth: number | null;
  revAvg: number | null; revLow: number | null; revHigh: number | null;
  revAnalysts: number | null; revYearAgo: number | null; revGrowth: number | null;
};
type EpsTrend = {
  key: string; label: string; current: number | null;
  d7: number | null; d30: number | null; d60: number | null; d90: number | null;
  upLast30: number | null; downLast30: number | null;
};
type Surprise = { quarter: string; epsActual: number | null; epsEstimate: number | null; surprisePercent: number | null };
type Resp = { currency: string | null; estimates: Estimate[]; epsTrend: EpsTrend[]; surprises: Surprise[] };

function fmtRev(v: number | null): string {
  if (v == null) return "—";
  const a = Math.abs(v);
  if (a >= 1e12) return `${(v / 1e12).toLocaleString("ja-JP", { maximumFractionDigits: 2 })}兆`;
  if (a >= 1e8) { const oku = v / 1e8; return `${Math.abs(oku) >= 100 ? Math.round(oku).toLocaleString("ja-JP") : oku.toFixed(1)}億`; }
  if (a >= 1e6) return `${(v / 1e6).toFixed(0)}百万`;
  return v.toLocaleString();
}
function fmtEps(v: number | null): string {
  return v == null ? "—" : v.toLocaleString("ja-JP", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function Pct({ v }: { v: number | null }) {
  if (v == null) return <span className="text-zinc-400">—</span>;
  const up = v >= 0;
  return (
    <span className={up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
      {up ? "+" : ""}{(v * 100).toFixed(1)}%
    </span>
  );
}
function fmtQuarter(q: string): string {
  // "2025-06-30T00:00:00.000Z" → "25/6期"
  const m = q.match(/^(\d{4})-(\d{2})/);
  if (m) return `${m[1].slice(2)}/${Number(m[2])}月`;
  return q;
}

export default function AnalystEstimates({ symbol }: { symbol: string }) {
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/estimates?symbol=${encodeURIComponent(symbol)}`)
      .then((r) => r.json())
      .then((j) => setData(j as Resp))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [symbol]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-4 animate-pulse">
        <div className="h-4 w-28 bg-zinc-200 dark:bg-zinc-700 rounded mb-4" />
        <div className="h-28 bg-zinc-100 dark:bg-zinc-800 rounded-xl" />
      </div>
    );
  }
  if (!data || !data.estimates || data.estimates.length === 0) return null;

  const { currency, estimates, epsTrend, surprises } = data;
  const maxAnalysts = Math.max(1, ...estimates.map((e) => e.epsAnalysts ?? 0));
  const cy = epsTrend.find((t) => t.key === "0y"); // current-year EPS revision

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-3.5 pb-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
          <BarChart3 className="w-4 h-4 text-indigo-500" /> 業績予想（アナリスト予想）
        </h3>
        <span className="text-[10px] text-zinc-400">
          最大{maxAnalysts}名{currency ? ` · ${currency}` : ""}
        </span>
      </div>

      {/* Consensus EPS / revenue by period */}
      <div className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
        {estimates.map((e) => (
          <div key={e.key} className="px-4 py-2.5">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200">{e.label}</span>
              {e.epsAnalysts != null && <span className="text-[10px] text-zinc-400">{e.epsAnalysts}名</span>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/40 px-2.5 py-1.5">
                <div className="text-[9px] text-zinc-400">予想EPS（平均）</div>
                <div className="text-sm font-semibold tabular-nums text-zinc-800 dark:text-zinc-100">{fmtEps(e.epsAvg)}</div>
                <div className="text-[10px] tabular-nums">前年比 <Pct v={e.epsGrowth} /></div>
              </div>
              <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/40 px-2.5 py-1.5">
                <div className="text-[9px] text-zinc-400">予想売上（平均）</div>
                <div className="text-sm font-semibold tabular-nums text-zinc-800 dark:text-zinc-100">{fmtRev(e.revAvg)}</div>
                <div className="text-[10px] tabular-nums">前年比 <Pct v={e.revGrowth} /></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* EPS revision trend (current fiscal year) */}
      {cy && cy.current != null && cy.d90 != null && (
        <div className="px-4 py-2.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2 text-xs">
          <span className="text-zinc-500">今期EPS予想の修正（90日前比）</span>
          <span className="flex items-center gap-1.5 font-semibold tabular-nums">
            <span className="text-zinc-400">{fmtEps(cy.d90)}</span>
            <span className="text-zinc-300">→</span>
            <span className="text-zinc-800 dark:text-zinc-100">{fmtEps(cy.current)}</span>
            {cy.current >= cy.d90
              ? <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400"><TrendingUp className="w-3.5 h-3.5" />上方修正</span>
              : <span className="inline-flex items-center gap-0.5 text-rose-600 dark:text-rose-400"><TrendingDown className="w-3.5 h-3.5" />下方修正</span>}
          </span>
        </div>
      )}

      {/* Earnings surprise history */}
      {surprises.length > 0 && (
        <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800">
          <div className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300 mb-2">決算サプライズ（実績 vs 予想EPS）</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {surprises.slice(0, 4).reverse().map((s, i) => {
              const beat = (s.surprisePercent ?? 0) >= 0;
              return (
                <div key={i} className="rounded-lg border border-zinc-100 dark:border-zinc-800 px-2 py-1.5 text-center">
                  <div className="text-[9px] text-zinc-400">{fmtQuarter(s.quarter)}</div>
                  <div className="text-xs font-bold tabular-nums text-zinc-800 dark:text-zinc-100">{fmtEps(s.epsActual)}</div>
                  <div className="text-[9px] text-zinc-400 tabular-nums">予想 {fmtEps(s.epsEstimate)}</div>
                  {s.surprisePercent != null && (
                    <div className={`text-[10px] font-semibold tabular-nums ${beat ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                      {beat ? "▲" : "▼"}{Math.abs(s.surprisePercent * 100).toFixed(1)}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="px-4 py-2 text-[9px] text-zinc-400 border-t border-zinc-50 dark:border-zinc-800/50">
        ※ アナリストのコンセンサス予想（Yahoo Finance）。実際の業績を保証するものではありません。
      </div>
    </div>
  );
}
