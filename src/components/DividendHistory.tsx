"use client";

import { useEffect, useState } from "react";
import type { DividendHistoryData, YearlyDividend } from "@/app/api/dividend-history/route";
import { useCurrency } from "@/lib/currency-context";

/* ── Helpers ── */
function fmtAmt(v: number, currency: string | null, showJpy: boolean, jpyRate: number | null): string {
  const isJpy = currency === "JPY" || (currency === "USD" && showJpy && jpyRate != null);
  const val   = currency === "USD" && showJpy && jpyRate ? v * jpyRate : v;
  if (isJpy) return "¥" + Math.round(val).toLocaleString("ja-JP");
  const sym = currency === "USD" ? "$" : currency ? currency + " " : "";
  return sym + val.toFixed(2);
}
function fmtPct(v: number | null, sign = true): string {
  if (v === null) return "—";
  const s = sign && v >= 0 ? "+" : "";
  return `${s}${v.toFixed(1)}%`;
}
function fmtChg(v: number | null, currency: string | null, showJpy: boolean, jpyRate: number | null): string {
  if (v === null) return "—";
  const isJpy = currency === "JPY" || (currency === "USD" && showJpy && jpyRate != null);
  const val   = currency === "USD" && showJpy && jpyRate ? v * jpyRate : v;
  const sym   = isJpy ? "¥" : currency === "USD" ? "$" : "";
  const s     = val >= 0 ? "+" : "";
  if (isJpy) return `${s}${sym}${Math.round(Math.abs(val)).toLocaleString("ja-JP")}`;
  return `${s}${sym}${val.toFixed(2)}`;
}

/* Sparkline SVG — bars for each year's dividend total */
function Sparkline({
  history,
  trend,
}: {
  history: YearlyDividend[];
  trend: DividendHistoryData["trend"];
}) {
  // history is newest-first; reverse for left→right display
  const bars = [...history].reverse();
  if (bars.length === 0) return null;

  const maxTotal = Math.max(...bars.map(b => b.total));
  const W = 160;
  const H = 44;
  const gap = 2;
  const barW = Math.floor((W - gap * (bars.length - 1)) / bars.length);

  const upColor   = "#10b981"; // emerald-500
  const downColor = "#ef4444"; // red-500
  const flatColor = "#94a3b8"; // slate-400

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      {bars.map((b, i) => {
        const x = i * (barW + gap);
        const barH = Math.max(3, (b.total / maxTotal) * (H - 4));
        const y = H - barH;
        const isIncrease = (b.change ?? 0) > 0.0001;
        const isDecrease = (b.change ?? 0) < -0.0001;
        const color = isIncrease ? upColor : isDecrease ? downColor : flatColor;
        return (
          <g key={b.year}>
            <rect
              x={x} y={y}
              width={barW} height={barH}
              rx={1.5}
              fill={color}
              opacity={0.85}
            />
          </g>
        );
      })}
    </svg>
  );
}

/* Trend config */
const TREND_CONFIG = {
  increase: {
    grad: "from-emerald-50 to-teal-50 dark:from-emerald-950/25 dark:to-teal-950/25",
    border: "border-emerald-200/70 dark:border-emerald-800/40",
    numColor: "text-emerald-600 dark:text-emerald-400",
    badge: "bg-emerald-500",
    icon: "🔥",
    label: "連続増配",
    badgeBg: "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300",
  },
  decrease: {
    grad: "from-rose-50 to-red-50 dark:from-rose-950/25 dark:to-red-950/25",
    border: "border-rose-200/70 dark:border-rose-800/40",
    numColor: "text-rose-600 dark:text-rose-400",
    badge: "bg-rose-500",
    icon: "⚠️",
    label: "連続減配",
    badgeBg: "bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300",
  },
  flat: {
    grad: "from-slate-50 to-slate-50 dark:from-slate-800/20 dark:to-slate-800/20",
    border: "border-slate-200/70 dark:border-slate-700/40",
    numColor: "text-slate-600 dark:text-slate-400",
    badge: "bg-slate-400",
    icon: "➡️",
    label: "横ばい",
    badgeBg: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
  },
  none: {
    grad: "from-slate-50 to-slate-50 dark:from-slate-800/20 dark:to-slate-800/20",
    border: "border-slate-200/70 dark:border-slate-700/40",
    numColor: "text-slate-600 dark:text-slate-400",
    badge: "bg-slate-400",
    icon: "💰",
    label: "配当あり",
    badgeBg: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
  },
};

export default function DividendHistory({ symbol }: { symbol: string }) {
  const [data, setData] = useState<DividendHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tableOpen, setTableOpen] = useState(false);

  // ページ共通の通貨コンテキスト
  const { showJpy, jpyRate } = useCurrency();

  useEffect(() => {
    setLoading(true);
    fetch(`/api/dividend-history?symbol=${encodeURIComponent(symbol)}`)
      .then(r => r.json())
      .then((d: DividendHistoryData & { error?: string }) => {
        if (!d.error) setData(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [symbol]);

  /* ── Skeleton ── */
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-3">
        <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
        <div className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
      </div>
    );
  }

  if (!data || data.history.length === 0) return null;

  const { history, consecutive, trend, fiveYearGrowth, cagr, currency } = data;
  const cfg = TREND_CONFIG[trend];
  const latest = history[0];
  const maxAbsChange = history.reduce((m, h) => Math.max(m, Math.abs(h.change ?? 0)), 0);

  const showStreak = (trend === "increase" || trend === "decrease") && consecutive >= 2;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">

      {/* ══ HERO SECTION ══ */}
      <div className={`bg-gradient-to-br ${cfg.grad} border-b ${cfg.border} px-5 py-4`}>
        <div className="flex items-start justify-between gap-4">

          {/* Left: streak + stats */}
          <div className="space-y-3 flex-1 min-w-0">

            {/* Title row */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">💰 配当履歴</span>
              <span className="text-[10px] text-slate-400 font-mono">
                {history.length}年分
              </span>
            </div>

            {/* Streak hero */}
            {showStreak ? (
              <div className="flex items-baseline gap-1.5">
                <span className="text-5xl font-black tabular-nums leading-none tracking-tight" style={{
                  color: trend === "increase" ? "#059669" : "#dc2626"
                }}>
                  {consecutive}
                </span>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-500">年</span>
                  <span className={`text-xs font-bold ${cfg.numColor}`}>
                    {cfg.icon} {cfg.label}
                  </span>
                </div>
              </div>
            ) : (
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold ${cfg.badgeBg}`}>
                {cfg.icon} {cfg.label}
              </div>
            )}

            {/* Stats chips row */}
            <div className="flex flex-wrap gap-2">
              {latest && (
                <div className="px-2.5 py-1 rounded-lg bg-white/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                  <div className="text-[9px] text-slate-400 uppercase tracking-wider">最新年間配当</div>
                  <div className="text-sm font-mono font-bold text-slate-800 dark:text-slate-100">
                    {fmtAmt(latest.total, currency, showJpy, jpyRate)}
                    <span className="text-[10px] text-slate-400 font-sans ml-1">×{latest.count}</span>
                  </div>
                </div>
              )}
              {fiveYearGrowth !== null && (
                <div className="px-2.5 py-1 rounded-lg bg-white/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                  <div className="text-[9px] text-slate-400 uppercase tracking-wider">5年成長率</div>
                  <div className={`text-sm font-mono font-bold ${fiveYearGrowth >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                    {fmtPct(fiveYearGrowth)}
                  </div>
                </div>
              )}
              {cagr !== null && (
                <div className="px-2.5 py-1 rounded-lg bg-white/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                  <div className="text-[9px] text-slate-400 uppercase tracking-wider">5年 CAGR</div>
                  <div className={`text-sm font-mono font-bold ${cagr >= 0 ? "text-blue-600 dark:text-blue-400" : "text-orange-600 dark:text-orange-400"}`}>
                    {fmtPct(cagr)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: sparkline */}
          <div className="shrink-0 flex flex-col items-end gap-1 pt-6">
            <Sparkline history={history} trend={trend} />
            <div className="flex justify-between w-40 mt-0.5">
              <span className="text-[9px] text-slate-400">{history[history.length - 1]?.year}</span>
              <span className="text-[9px] text-slate-400">{history[0]?.year}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══ TOGGLE BUTTON ══ */}
      <button
        onClick={() => setTableOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
      >
        <span className="font-semibold">年度別詳細</span>
        <span className="text-xs">{tableOpen ? "▲ 閉じる" : "▼ 開く"}</span>
      </button>

      {/* ══ TABLE ══ */}
      {tableOpen && (
        <div className="overflow-x-auto border-t border-slate-100 dark:border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50">
                <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400">年</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400">年間配当</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hidden sm:table-cell">前年比</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400">増減率</th>
                <th className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hidden md:table-cell w-28">推移</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {history.map((row, idx) => {
                const isNewest   = idx === 0;
                const isUp       = (row.change ?? 0) > 0.0001;
                const isDown     = (row.change ?? 0) < -0.0001;
                const bw = maxAbsChange > 0 ? Math.min(100, (Math.abs(row.change ?? 0) / maxAbsChange) * 100) : 0;

                return (
                  <tr
                    key={row.year}
                    className={`transition-colors ${isNewest ? "bg-slate-50/60 dark:bg-slate-800/20" : "hover:bg-slate-50/40 dark:hover:bg-slate-800/10"}`}
                  >
                    <td className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        {row.year}
                        {isNewest && (
                          <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 leading-none">最新</span>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-semibold tabular-nums text-slate-800 dark:text-slate-100 whitespace-nowrap">
                      {fmtAmt(row.total, currency, showJpy, jpyRate)}
                      <span className="text-[10px] text-slate-400 ml-1 font-sans">×{row.count}</span>
                    </td>
                    <td className={`px-3 py-2.5 text-right font-mono tabular-nums whitespace-nowrap text-sm hidden sm:table-cell ${isUp ? "text-emerald-600 dark:text-emerald-400" : isDown ? "text-rose-500 dark:text-rose-400" : "text-slate-400"}`}>
                      {fmtChg(row.change, currency, showJpy, jpyRate)}
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      {row.changePct !== null ? (
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold tabular-nums ${
                          isUp   ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                          : isDown ? "bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300"
                          :          "bg-slate-100 dark:bg-slate-800 text-slate-500"
                        }`}>
                          {fmtPct(row.changePct)}
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 hidden md:table-cell">
                      {row.change !== null && (
                        <div className="flex items-center h-4 gap-px">
                          <div className="flex-1 flex justify-end">
                            {isDown && <div className="h-3 rounded-l bg-rose-400 dark:bg-rose-500 opacity-75" style={{ width: `${bw}%` }} />}
                          </div>
                          <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 shrink-0" />
                          <div className="flex-1">
                            {isUp && <div className="h-3 rounded-r bg-emerald-400 dark:bg-emerald-500 opacity-75" style={{ width: `${bw}%` }} />}
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
      )}

      {/* ── Footer ── */}
      <div className="px-5 py-2 border-t border-slate-100 dark:border-slate-800">
        <p className="text-[10px] text-slate-400 dark:text-slate-600">
          暦年ベースの年間配当合計。出所: Yahoo Finance。
        </p>
      </div>
    </div>
  );
}
