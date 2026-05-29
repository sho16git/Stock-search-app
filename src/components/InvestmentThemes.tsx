"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { getJpName } from "@/lib/jp-stocks";

type ThemeStock = {
  symbol: string;
  shortName: string | null;
  longName: string | null;
  nameJa?: string | null;
  price: number | null;
  changePercent: number | null;
  currency: string | null;
};

type Theme = {
  id: string;
  label: string;
  emoji: string;
  description: string;
  quotes: ThemeStock[];
};

type Market = "US" | "JP";
type SortMode = "default" | "gainers" | "losers";

const MARKET_TABS: { key: Market; flag: string; label: string }[] = [
  { key: "US", flag: "🇺🇸", label: "米国株" },
  { key: "JP", flag: "🇯🇵", label: "日本株" },
];

function Skeleton() {
  return (
    <div className="grid grid-cols-1 gap-2">
      {Array(3).fill(null).map((_, i) => (
        <div key={i} className="h-32 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse" />
      ))}
    </div>
  );
}

export default function InvestmentThemes() {
  const [market, setMarket] = useState<Market>("US");
  const [themes, setThemes]   = useState<Record<Market, Theme[] | null>>({ US: null, JP: null });
  const [loading, setLoading] = useState(false);
  const [sort, setSort]       = useState<SortMode>("default");

  useEffect(() => {
    // Only fetch if not already cached
    if (themes[market] !== null) return;
    setLoading(true);
    fetch(`/api/themes?market=${market}`)
      .then((r) => r.json())
      .then((j) =>
        setThemes((prev) => ({ ...prev, [market]: j.themes ?? [] })),
      )
      .catch(() =>
        setThemes((prev) => ({ ...prev, [market]: [] })),
      )
      .finally(() => setLoading(false));
  }, [market]); // eslint-disable-line react-hooks/exhaustive-deps

  const rawThemes = themes[market];

  // Compute avg changePercent per theme
  function themeAvg(theme: Theme): number {
    if (!theme.quotes.length) return 0;
    return theme.quotes.reduce((s, q) => s + (q.changePercent ?? 0), 0) / theme.quotes.length;
  }

  // Sort themes by average changePercent
  const current = rawThemes === null ? null : (() => {
    const themed = rawThemes.map(t => ({
      ...t,
      // Always sort stocks within each theme by changePercent (desc)
      quotes: [...t.quotes].sort((a, b) => (b.changePercent ?? -Infinity) - (a.changePercent ?? -Infinity)),
    }));
    if (sort === "default") return themed;
    return [...themed].sort((a, b) => {
      const avgA = themeAvg(a);
      const avgB = themeAvg(b);
      return sort === "gainers" ? avgB - avgA : avgA - avgB;
    });
  })();

  return (
    <section>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <h2 className="text-base font-bold tracking-tight flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-violet-500" />
          投資テーマ
        </h2>

        <div className="flex items-center gap-1.5">
          {/* Sort buttons */}
          <div className="flex items-center gap-0.5">
            {(["default", "gainers", "losers"] as SortMode[]).map(mode => (
              <button key={mode} onClick={() => setSort(mode)}
                className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${sort === mode ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}
              >
                {mode === "default" ? "デフォ" : mode === "gainers" ? "▲上昇" : "▼下落"}
              </button>
            ))}
          </div>

          {/* 🇯🇵 / 🇺🇸 Toggle */}
          <div className="flex p-0.5 bg-slate-100 dark:bg-slate-800/60 rounded-lg gap-0.5">
            {MARKET_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setMarket(tab.key)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
                  market === tab.key
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <span>{tab.flag}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      {loading || current === null ? (
        <Skeleton />
      ) : current.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center text-sm text-slate-500">
          データを取得できませんでした
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {current.map((theme, themeIdx) => {
            const avg = themeAvg(theme);
            const avgUp = avg >= 0;
            return (
              <div
                key={theme.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm"
              >
                {/* Theme header */}
                <div className="flex items-center gap-2 mb-2">
                  {/* Rank badge (only in gainers/losers sort) */}
                  {sort !== "default" && (
                    <span className="shrink-0 w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold flex items-center justify-center">
                      {themeIdx + 1}
                    </span>
                  )}
                  <span className="text-base">{theme.emoji}</span>
                  <span className="font-semibold text-sm">{theme.label}</span>
                  <span className="text-[10px] text-slate-400 truncate flex-1">
                    · {theme.description}
                  </span>
                  {/* Theme avg performance */}
                  {theme.quotes.length > 0 && (
                    <span className={`shrink-0 text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-lg ${
                      avgUp
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                        : "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400"
                    }`}>
                      {avgUp ? "+" : ""}{avg.toFixed(2)}%
                    </span>
                  )}
                </div>
                {/* Stock list with rank numbers */}
                <ul className="space-y-0.5">
                  {theme.quotes.slice(0, 5).map((s, rankIdx) => {
                    const up = (s.changePercent ?? 0) >= 0;
                    const name =
                      getJpName(s.symbol) ??
                      s.nameJa ??
                      s.longName ??
                      s.shortName;
                    const rankLabel = ["🥇", "🥈", "🥉", "4", "5"][rankIdx] ?? String(rankIdx + 1);
                    const isEmoji = rankIdx < 3;
                    return (
                      <li key={s.symbol}>
                        <Link
                          href={`/stock/${encodeURIComponent(s.symbol)}`}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group"
                        >
                          {/* Rank */}
                          <span className={`shrink-0 w-5 text-center ${
                            isEmoji ? "text-sm" : "text-[10px] font-bold text-slate-400"
                          }`}>
                            {rankLabel}
                          </span>
                          <div className="min-w-0 flex-1 flex items-center gap-2">
                            <span className="font-mono font-semibold text-sm text-blue-600 dark:text-blue-400 shrink-0">
                              {s.symbol}
                            </span>
                            <span className="text-xs text-slate-500 truncate">
                              {name}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-mono text-xs tabular-nums">
                              {formatNumber(s.price)}{" "}
                              <span className="text-[10px] text-slate-400">
                                {s.currency}
                              </span>
                            </div>
                            <div
                              className={`text-[10px] font-mono font-semibold ${
                                up
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-rose-600 dark:text-rose-400"
                              }`}
                            >
                              {s.changePercent !== null
                                ? `${up ? "+" : ""}${s.changePercent.toFixed(2)}%`
                                : "—"}
                            </div>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
