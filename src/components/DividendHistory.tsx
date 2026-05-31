"use client";

import { useEffect, useState } from "react";
import type { DividendHistoryData, YearlyDividend } from "@/app/api/dividend-history/route";

/* ── helpers ── */
function fmtAmt(v: number, currency: string | null): string {
  const sym = currency === "JPY" ? "¥" : currency === "USD" ? "$" : currency ? currency + " " : "";
  if (currency === "JPY") return sym + Math.round(v).toLocaleString();
  return sym + v.toFixed(2);
}

function fmtPct(v: number | null): string {
  if (v === null) return "—";
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(1)}%`;
}

function fmtChg(v: number | null, currency: string | null): string {
  if (v === null) return "—";
  const sym = currency === "JPY" ? "¥" : currency === "USD" ? "$" : "";
  const sign = v >= 0 ? "+" : "";
  if (currency === "JPY") return `${sign}${sym}${Math.round(v).toLocaleString()}`;
  return `${sign}${sym}${v.toFixed(2)}`;
}

/* Bar width: scale within ±maxAbs */
function barWidth(change: number | null, maxAbs: number): number {
  if (change === null || maxAbs === 0) return 0;
  return Math.min(100, (Math.abs(change) / maxAbs) * 100);
}

export default function DividendHistory({ symbol }: { symbol: string }) {
  const [data, setData] = useState<DividendHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/dividend-history?symbol=${encodeURIComponent(symbol)}`)
      .then((r) => r.json())
      .then((d: DividendHistoryData & { error?: string }) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("取得失敗"))
      .finally(() => setLoading(false));
  }, [symbol]);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
        <div className="h-5 w-32 rounded bg-slate-200 dark:bg-slate-700 animate-pulse mb-4" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  /* ── No dividend data ── */
  if (error || !data || data.history.length === 0) {
    return null; // silent: 無配当銘柄などには表示しない
  }

  const { history, consecutive, trend, fiveYearGrowth, cagr, currency } = data;

  /* ── Streak badge ── */
  const streakBadge = (() => {
    if (trend === "increase" && consecutive >= 2)
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
          🔥 {consecutive}年連続増配
        </span>
      );
    if (trend === "decrease" && consecutive >= 2)
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300 text-xs font-bold">
          ⚠️ {consecutive}年連続減配
        </span>
      );
    if (trend === "flat")
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold">
          ➡️ 横ばい
        </span>
      );
    return null;
  })();

  /* ── Max abs change for bar scaling ── */
  const maxAbs = history.reduce((m, h) => Math.max(m, Math.abs(h.change ?? 0)), 0);

  /* ── Rows ── */
  const rows: YearlyDividend[] = history;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      {/* ── Header ── */}
      <div className="px-5 pt-5 pb-3 flex flex-wrap items-start gap-2">
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            💰 配当履歴
          </h2>
        </div>

        {/* Stats chips row */}
        <div className="flex flex-wrap items-center gap-2">
          {streakBadge}
          {fiveYearGrowth !== null && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                fiveYearGrowth >= 0
                  ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                  : "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300"
              }`}
            >
              5年成長 {fmtPct(fiveYearGrowth)}
            </span>
          )}
          {cagr !== null && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                cagr >= 0
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                  : "bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-300"
              }`}
            >
              CAGR {fmtPct(cagr)}
            </span>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <th className="text-left px-5 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 w-16">
                年
              </th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                年間配当
              </th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hidden sm:table-cell">
                前年比
              </th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                増減率
              </th>
              <th className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hidden md:table-cell w-32">
                推移
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((row, idx) => {
              const isNewest = idx === 0;
              const isIncrease = row.change !== null && row.change > 0.0001;
              const isDecrease = row.change !== null && row.change < -0.0001;
              const bw = barWidth(row.change, maxAbs);

              return (
                <tr
                  key={row.year}
                  className={`transition-colors ${
                    isNewest
                      ? "bg-slate-50/70 dark:bg-slate-800/30"
                      : "hover:bg-slate-50/50 dark:hover:bg-slate-800/20"
                  }`}
                >
                  {/* Year */}
                  <td className="px-5 py-2.5 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      {row.year}
                      {isNewest && (
                        <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 leading-none">
                          最新
                        </span>
                      )}
                    </span>
                  </td>

                  {/* Annual total */}
                  <td className="px-3 py-2.5 text-right font-mono font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap tabular-nums">
                    {fmtAmt(row.total, currency)}
                    <span className="text-[10px] text-slate-400 ml-1 font-sans">
                      ×{row.count}
                    </span>
                  </td>

                  {/* YoY change absolute */}
                  <td
                    className={`px-3 py-2.5 text-right font-mono whitespace-nowrap tabular-nums text-sm hidden sm:table-cell ${
                      isIncrease
                        ? "text-emerald-600 dark:text-emerald-400"
                        : isDecrease
                        ? "text-rose-500 dark:text-rose-400"
                        : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {fmtChg(row.change, currency)}
                  </td>

                  {/* YoY % badge */}
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    {row.changePct !== null ? (
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-bold tabular-nums ${
                          isIncrease
                            ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                            : isDecrease
                            ? "bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        {fmtPct(row.changePct)}
                      </span>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                    )}
                  </td>

                  {/* Mini bar */}
                  <td className="px-4 py-2.5 hidden md:table-cell">
                    {row.change !== null && (
                      <div className="flex items-center h-4 gap-0.5">
                        {/* negative side (left) */}
                        <div className="flex-1 flex justify-end">
                          {isDecrease && (
                            <div
                              className="h-3 rounded-l bg-rose-400 dark:bg-rose-500 opacity-80"
                              style={{ width: `${bw}%` }}
                            />
                          )}
                        </div>
                        {/* center line */}
                        <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 shrink-0" />
                        {/* positive side (right) */}
                        <div className="flex-1">
                          {isIncrease && (
                            <div
                              className="h-3 rounded-r bg-emerald-400 dark:bg-emerald-500 opacity-80"
                              style={{ width: `${bw}%` }}
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Footer note ── */}
      <div className="px-5 py-2.5 border-t border-slate-100 dark:border-slate-800">
        <p className="text-[10px] text-slate-400 dark:text-slate-600">
          年間配当合計（暦年）。出所: Yahoo Finance。直近 {rows.length} 年分を表示。
        </p>
      </div>
    </div>
  );
}
