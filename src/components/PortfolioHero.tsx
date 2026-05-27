"use client";

import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Plus,
  RefreshCw,
} from "lucide-react";
import { usePortfolio } from "@/lib/use-portfolio";

function formatJpy(v: number): string {
  if (Math.abs(v) >= 1e8) return `¥${(v / 1e8).toFixed(2)}億`;
  if (Math.abs(v) >= 1e4) return `¥${(v / 1e4).toFixed(2)}万`;
  return `¥${Math.round(v).toLocaleString("ja-JP")}`;
}

function formatJpyExact(v: number): string {
  return `¥${Math.round(v).toLocaleString("ja-JP")}`;
}

export default function PortfolioHero() {
  const { summary, holdings, loading, refresh } = usePortfolio();

  // Empty state — show friendly onboarding
  if (!summary || holdings.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-br from-white via-sky-50 to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/40 px-6 py-7 md:px-10 md:py-9 shadow-sm">
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-blue-200/40 dark:bg-blue-900/30 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-medium mb-3">
              <Wallet className="w-3.5 h-3.5" />
              マイポートフォリオ
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">
              所有株を追加しよう 💼
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm md:text-base">
              保有銘柄を登録すると、資産推移・本日の損益・収益率を一目で確認できます
            </p>
          </div>
          <Link
            href="/portfolio"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-md shadow-blue-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            銘柄を追加する
          </Link>
        </div>
      </div>
    );
  }

  const up = summary.totalGainJpy >= 0;
  const dayUp = summary.dayChangeJpy >= 0;
  const Arrow = up ? TrendingUp : TrendingDown;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800/80 px-4 py-5 sm:px-6 sm:py-7 md:px-10 md:py-9 shadow-sm ${
        up
          ? "bg-gradient-to-br from-white via-emerald-50/40 to-emerald-50/80 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/30"
          : "bg-gradient-to-br from-white via-rose-50/40 to-rose-50/80 dark:from-slate-900 dark:via-slate-900 dark:to-rose-950/30"
      }`}
    >
      <div
        className={`absolute -right-12 -top-12 w-56 h-56 rounded-full blur-3xl ${
          up
            ? "bg-emerald-200/40 dark:bg-emerald-900/30"
            : "bg-rose-200/40 dark:bg-rose-900/30"
        }`}
      />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200/60 dark:border-slate-700/60">
            <Wallet className="w-3.5 h-3.5" />
            マイポートフォリオ
            <span className="text-slate-400">·</span>
            <span className="text-slate-500">{summary.count} 銘柄</span>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white inline-flex items-center gap-1 transition-colors disabled:opacity-50"
            aria-label="更新"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">
              評価額
            </div>
            <div className="font-mono text-3xl sm:text-4xl md:text-5xl font-bold tabular-nums tracking-tight break-all">
              {formatJpyExact(summary.totalValueJpy)}
            </div>
          </div>
          <div
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl font-mono font-bold tabular-nums text-base shadow-sm ${
              up
                ? "bg-emerald-100/90 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                : "bg-rose-100/90 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300"
            }`}
          >
            <Arrow className="w-4 h-4" />
            {up ? "+" : ""}
            {formatJpy(summary.totalGainJpy)} ({up ? "+" : ""}
            {summary.totalGainPercent.toFixed(2)}%)
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          <Stat label="本日の損益" value={summary.dayChangeJpy} pct={summary.dayChangePercent} colored up={dayUp} />
          <Stat label="取得原価" value={summary.totalCostJpy} />
          <Stat label="累計損益" value={summary.totalGainJpy} colored up={up} />
          <Stat
            label="予想年間配当"
            staticValue={
              summary.annualDividendJpy > 0
                ? formatJpyExact(summary.annualDividendJpy)
                : "—"
            }
            sub={
              summary.annualDividendJpy > 0
                ? `利回り ${summary.portfolioYield.toFixed(2)}%`
                : undefined
            }
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/portfolio"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium text-sm hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
          >
            <Wallet className="w-4 h-4" />
            ポートフォリオ詳細
          </Link>
          <Link
            href="/portfolio"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium text-sm hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            銘柄を追加
          </Link>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  pct,
  colored,
  up,
  staticValue,
  sub,
}: {
  label: string;
  value?: number;
  pct?: number;
  colored?: boolean;
  up?: boolean;
  staticValue?: string;
  sub?: string;
}) {
  let cls = "text-slate-900 dark:text-slate-100";
  if (colored && value !== undefined) {
    cls = up
      ? "text-emerald-700 dark:text-emerald-400"
      : "text-rose-700 dark:text-rose-400";
  }
  return (
    <div className="px-4 py-3 rounded-xl bg-white/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 backdrop-blur-sm">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className={`font-mono font-bold tabular-nums mt-1 ${cls}`}>
        {staticValue
          ? staticValue
          : value !== undefined
            ? `${value >= 0 && colored ? "+" : ""}${formatJpy(value)}`
            : "—"}
      </div>
      {pct !== undefined && (
        <div className={`text-xs font-mono tabular-nums ${cls}`}>
          {pct >= 0 ? "+" : ""}
          {pct.toFixed(2)}%
        </div>
      )}
      {sub && (
        <div className="text-xs text-slate-500 mt-0.5">{sub}</div>
      )}
    </div>
  );
}
