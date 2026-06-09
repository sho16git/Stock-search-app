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
type StockSort = "gainers" | "losers";

const MARKET_TABS: { key: Market; flag: string; label: string }[] = [
  { key: "JP", flag: "🇯🇵", label: "日本株" },
  { key: "US", flag: "🇺🇸", label: "米株" },
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
  const [market, setMarket]       = useState<Market>("JP");
  const [themes, setThemes]       = useState<Record<Market, Theme[] | null>>({ US: null, JP: null });
  const [loading, setLoading]     = useState(false);
  const [stockSort, setStockSort] = useState<StockSort>("gainers");

  useEffect(() => {
    if (themes[market] !== null) return;
    setLoading(true);
    fetch(`/api/themes?market=${market}`)
      .then((r) => r.json())
      .then((j) => setThemes((prev) => ({ ...prev, [market]: j.themes ?? [] })))
      .catch(() => setThemes((prev) => ({ ...prev, [market]: [] })))
      .finally(() => setLoading(false));
  }, [market]); // eslint-disable-line react-hooks/exhaustive-deps

  const rawThemes = themes[market];

  // Sort stocks within each theme, then sort themes by their average changePercent
  const themeAvg = (quotes: ThemeStock[]) =>
    quotes.length
      ? quotes.reduce((s, q) => s + (q.changePercent ?? 0), 0) / quotes.length
      : 0;

  const current = rawThemes === null ? null : rawThemes
    .map(t => ({
      ...t,
      quotes: [...t.quotes].sort((a, b) =>
        stockSort === "gainers"
          ? (b.changePercent ?? -Infinity) - (a.changePercent ?? -Infinity)
          : (a.changePercent ?? Infinity)  - (b.changePercent ?? Infinity)
      ),
    }))
    .sort((a, b) => {
      const avgA = themeAvg(a.quotes);
      const avgB = themeAvg(b.quotes);
      return stockSort === "gainers" ? avgB - avgA : avgA - avgB;
    });

  return (
    <section>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <h2 className="text-base font-bold tracking-tight flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-violet-500" />
          投資テーマ
        </h2>

        <div className="flex items-center gap-1.5">
          {/* Stock sort toggle */}
          <div className="flex p-0.5 bg-slate-100 dark:bg-slate-800/60 rounded-lg gap-0.5">
            <button
              onClick={() => setStockSort("gainers")}
              className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
                stockSort === "gainers"
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              ▲ 上昇
            </button>
            <button
              onClick={() => setStockSort("losers")}
              className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
                stockSort === "losers"
                  ? "bg-rose-500 text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              ▼ 下落
            </button>
          </div>

          {/* 🇺🇸 / 🇯🇵 Toggle */}
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
          {current.map((theme) => {
            const avg = theme.quotes.length
              ? theme.quotes.reduce((s, q) => s + (q.changePercent ?? 0), 0) / theme.quotes.length
              : 0;
            const avgUp = avg >= 0;
            const RANK_LABELS = stockSort === "gainers"
              ? ["🥇", "🥈", "🥉", "4", "5"]
              : ["💀", "📉", "⚠️", "4", "5"];

            return (
              <div
                key={theme.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm"
              >
                {/* Theme header */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">{theme.emoji}</span>
                  <span className="font-semibold text-sm">{theme.label}</span>
                  <span className="text-[10px] text-slate-400 truncate flex-1">
                    · {theme.description}
                  </span>
                  {/* Theme avg */}
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

                {/* Stock list */}
                <ul className="space-y-0.5">
                  {theme.quotes.slice(0, 5).map((s, idx) => {
                    const up = (s.changePercent ?? 0) >= 0;
                    const name = getJpName(s.symbol) ?? s.nameJa ?? s.longName ?? s.shortName;
                    const rankLabel = RANK_LABELS[idx] ?? String(idx + 1);
                    const isEmoji = idx < 3;
                    return (
                      <li key={s.symbol}>
                        <Link
                          href={`/stock/${encodeURIComponent(s.symbol)}`}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                        >
                          <span className={`shrink-0 w-5 text-center leading-none ${
                            isEmoji ? "text-sm" : "text-[10px] font-bold text-slate-400"
                          }`}>
                            {rankLabel}
                          </span>
                          <div className="min-w-0 flex-1 flex items-center gap-2">
                            <span className="font-mono font-semibold text-sm text-blue-600 dark:text-blue-400 shrink-0">
                              {s.symbol}
                            </span>
                            <span className="text-xs text-slate-500 truncate">{name}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-mono text-xs tabular-nums text-slate-700 dark:text-slate-300">
                              {formatNumber(s.price)}{" "}
                              <span className="text-[10px] text-slate-400">{s.currency}</span>
                            </div>
                            <div className={`text-[10px] font-mono font-bold ${
                              up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                            }`}>
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
