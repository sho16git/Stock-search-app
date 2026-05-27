"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, Zap } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { getJpName } from "@/lib/jp-stocks";

type Mover = {
  symbol: string;
  shortName?: string | null;
  longName?: string | null;
  nameJa?: string | null;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  currency: string | null;
  marketCap: number | null;
  volume: number | null;
};

type Tab = "day_gainers" | "day_losers" | "most_actives";
type Market = "US" | "JP";

const TABS: { id: Tab; label: string; emoji: string; color: string }[] = [
  { id: "day_gainers",  label: "値上がり", emoji: "🚀", color: "from-emerald-500 to-teal-500"   },
  { id: "day_losers",   label: "値下がり", emoji: "📉", color: "from-rose-500 to-pink-500"      },
  { id: "most_actives", label: "出来高",   emoji: "⚡", color: "from-violet-500 to-purple-500"  },
];

const MARKETS: { id: Market; label: string; flag: string }[] = [
  { id: "US", label: "米国株", flag: "🇺🇸" },
  { id: "JP", label: "日本株", flag: "🇯🇵" },
];

const MEDALS = ["🥇", "🥈", "🥉"];

type Key = `${Market}:${Tab}`;

export default function TopMovers() {
  const [market, setMarket] = useState<Market>("US");
  const [tab, setTab]       = useState<Tab>("day_gainers");
  const [cache, setCache]   = useState<Partial<Record<Key, Mover[]>>>({});
  const [loadingKey, setLoadingKey] = useState<Key | null>(null);

  const key: Key = `${market}:${tab}`;

  useEffect(() => {
    if (cache[key]) return;
    setLoadingKey(key);
    const endpoint =
      market === "JP" ? `/api/movers-jp?type=${tab}` : `/api/movers?type=${tab}`;
    fetch(endpoint)
      .then((r) => r.json())
      .then((j) => setCache((c) => ({ ...c, [key]: j.quotes ?? [] })))
      .catch(() => {})
      .finally(() => setLoadingKey((k) => (k === key ? null : k)));
  }, [key, cache, market, tab]);

  const items     = cache[key] ?? [];
  const isLoading = loadingKey === key;

  const activeTab = TABS.find((t) => t.id === tab)!;

  return (
    <div>
      {/* Title */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{activeTab.emoji}</span>
        <div>
          <h2 className="text-base font-bold tracking-tight leading-tight">
            今日動いた銘柄
          </h2>
          <p className="text-[11px] text-slate-500">日米マーケットのランキング</p>
        </div>
      </div>

      {/* Market toggle */}
      <div className="flex gap-1 p-1 bg-slate-100/80 dark:bg-slate-800/60 rounded-xl mb-2 w-fit backdrop-blur">
        {MARKETS.map((m) => (
          <button
            key={m.id}
            onClick={() => setMarket(m.id)}
            className={`px-3.5 py-1.5 text-xs rounded-lg transition-all font-semibold inline-flex items-center gap-1 ${
              market === m.id
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-md"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
            }`}
          >
            <span className="text-sm">{m.flag}</span>
            {m.label}
          </button>
        ))}
      </div>

      {/* Type tabs */}
      <div className="flex gap-1.5 mb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 text-xs rounded-xl transition-all font-semibold inline-flex items-center gap-1 ${
              tab === t.id
                ? `bg-gradient-to-r ${t.color} text-white shadow-md`
                : "bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <span>{t.emoji}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        {isLoading && items.length === 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {Array(6).fill(null).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="skeleton h-4 w-4 rounded" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3.5 w-16 rounded" />
                  <div className="skeleton h-3 w-24 rounded" />
                </div>
                <div className="space-y-1.5">
                  <div className="skeleton h-3.5 w-14 rounded" />
                  <div className="skeleton h-3 w-10 rounded ml-auto" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            データがありません
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {items.slice(0, 8).map((m, i) => {
              const up   = (m.change ?? 0) >= 0;
              const name = getJpName(m.symbol) ?? m.nameJa ?? m.longName ?? m.shortName;
              const medal = MEDALS[i];

              return (
                <li key={m.symbol}>
                  <Link
                    href={`/stock/${encodeURIComponent(m.symbol)}`}
                    className="flex items-center gap-3 px-3 py-2.5 sm:px-4 hover:bg-gradient-to-r hover:from-slate-50 hover:to-transparent dark:hover:from-slate-800/40 dark:hover:to-transparent transition-colors group"
                  >
                    {/* Rank */}
                    <span className="w-6 text-center shrink-0 text-sm">
                      {medal ?? (
                        <span className="font-mono text-xs text-slate-400">
                          {i + 1}
                        </span>
                      )}
                    </span>

                    {/* Name */}
                    <div className="min-w-0 flex-1">
                      <div className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                        {m.symbol}
                      </div>
                      <div className="text-xs text-slate-500 truncate">{name}</div>
                    </div>

                    {/* Price */}
                    <div className="text-right shrink-0">
                      <div className="font-mono text-sm font-bold tabular-nums">
                        {formatNumber(m.price)}
                        <span className="text-[10px] text-slate-400 ml-0.5">{m.currency}</span>
                      </div>
                      <div
                        className={`text-xs font-mono font-bold tabular-nums px-1.5 py-0.5 rounded-md inline-block mt-0.5 ${
                          up
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                            : "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {m.changePercent !== null
                          ? `${up ? "▲" : "▼"}${Math.abs(m.changePercent).toFixed(2)}%`
                          : "—"}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
