"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: "day_gainers",  label: "値上がり", emoji: "🚀" },
  { id: "day_losers",   label: "値下がり", emoji: "📉" },
  { id: "most_actives", label: "出来高",   emoji: "⚡" },
];

const MARKETS: { id: Market; label: string; flag: string }[] = [
  { id: "US", label: "米国株", flag: "🇺🇸" },
  { id: "JP", label: "日本株", flag: "🇯🇵" },
];

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

  return (
    <div className="flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-3.5 pb-3 border-b border-slate-100 dark:border-slate-800/60 space-y-2.5">
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
          📈 今日動いた銘柄
        </h2>

        {/* Market toggle */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
            {MARKETS.map((m) => (
              <button
                key={m.id}
                onClick={() => setMarket(m.id)}
                className={`px-3 py-1 text-xs rounded-md transition-all font-semibold inline-flex items-center gap-1 ${
                  market === m.id
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                <span>{m.flag}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>

          {/* Type tabs */}
          <div className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-2.5 py-1 text-[11px] rounded-lg transition-all font-semibold ${
                  tab === t.id
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1">
        {isLoading && items.length === 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {Array(7).fill(null).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="skeleton h-3.5 w-4 rounded" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3.5 w-14 rounded" />
                  <div className="skeleton h-3 w-20 rounded" />
                </div>
                <div className="space-y-1.5 text-right">
                  <div className="skeleton h-3.5 w-12 rounded ml-auto" />
                  <div className="skeleton h-3 w-9 rounded ml-auto" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-sm text-slate-400">
            データがありません
          </div>
        ) : (
          <ul className="divide-y divide-slate-100/70 dark:divide-slate-800/40">
            {items.slice(0, 8).map((m, i) => {
              const up   = (m.change ?? 0) >= 0;
              const name = getJpName(m.symbol) ?? m.nameJa ?? m.longName ?? m.shortName;
              const medals = ["🥇","🥈","🥉"];

              return (
                <li key={m.symbol}>
                  <Link
                    href={`/stock/${encodeURIComponent(m.symbol)}`}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors group"
                  >
                    {/* Rank */}
                    <span className="w-5 text-center shrink-0 text-sm font-medium">
                      {i < 3
                        ? medals[i]
                        : <span className="text-xs text-slate-400">{i + 1}</span>
                      }
                    </span>

                    {/* Name */}
                    <div className="min-w-0 flex-1">
                      <div className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                        {m.symbol}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{name ?? "—"}</div>
                    </div>

                    {/* Price + change */}
                    <div className="text-right shrink-0">
                      <div className="font-mono text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                        {formatNumber(m.price)}
                        <span className="text-[10px] text-slate-400 ml-0.5">{m.currency}</span>
                      </div>
                      <div className={`text-xs font-mono font-bold tabular-nums px-1.5 py-0.5 rounded-md inline-block mt-0.5 ${
                        up
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                          : "bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400"
                      }`}>
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
