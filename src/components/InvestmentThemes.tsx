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

  const current = themes[market];

  return (
    <section>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <h2 className="text-base font-bold tracking-tight flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-violet-500" />
          投資テーマ
        </h2>

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

      {/* Content */}
      {loading || current === null ? (
        <Skeleton />
      ) : current.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center text-sm text-slate-500">
          データを取得できませんでした
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {current.map((theme) => (
            <div
              key={theme.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">{theme.emoji}</span>
                <span className="font-semibold text-sm">{theme.label}</span>
                <span className="text-[10px] text-slate-400">
                  · {theme.description}
                </span>
              </div>
              <ul className="space-y-0.5">
                {theme.quotes.slice(0, 4).map((s) => {
                  const up = (s.changePercent ?? 0) >= 0;
                  const name =
                    getJpName(s.symbol) ??
                    s.nameJa ??
                    s.longName ??
                    s.shortName;
                  return (
                    <li key={s.symbol}>
                      <Link
                        href={`/stock/${encodeURIComponent(s.symbol)}`}
                        className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group"
                      >
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
          ))}
        </div>
      )}
    </section>
  );
}
