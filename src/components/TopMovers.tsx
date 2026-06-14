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
type Key = `${Market}:${Tab}`;

const TABS: { id: Tab; label: string; activeClass: string }[] = [
  { id: "day_gainers",  label: "▲ 値上がり", activeClass: "bg-emerald-500 dark:bg-emerald-500 text-white" },
  { id: "day_losers",   label: "▼ 値下がり", activeClass: "bg-red-500    dark:bg-red-500    text-white" },
  { id: "most_actives", label: "⚡ 出来高",  activeClass: "bg-blue-500   dark:bg-blue-500   text-white" },
];

const MARKETS: { id: Market; label: string; flag: string }[] = [
  { id: "JP", label: "日本株", flag: "🇯🇵" },
  { id: "US", label: "米株",   flag: "🇺🇸" },
];

export default function TopMovers() {
  const [market, setMarket] = useState<Market>("JP");
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
    <div className="flex flex-col bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/60 dark:border-white/[0.07] overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-3.5 pb-3 border-b border-zinc-100 dark:border-white/[0.05] space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">
            今日動いた銘柄
          </h2>
          {/* Market toggle */}
          <div className="flex gap-1 p-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
            {MARKETS.map((m) => (
              <button
                key={m.id}
                onClick={() => setMarket(m.id)}
                className={`px-2.5 py-1 text-xs rounded-md transition-all font-semibold inline-flex items-center gap-1 ${
                  market === m.id
                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                    : "text-zinc-500 dark:text-zinc-400"
                }`}
              >
                <span>{m.flag}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Type tabs */}
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-1.5 text-xs rounded-lg transition-all font-semibold ${
                tab === t.id
                  ? t.activeClass
                  : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1">
        {isLoading && items.length === 0 ? (
          <div className="divide-y divide-zinc-100 dark:divide-white/[0.04]">
            {Array(7).fill(null).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="skeleton h-3 w-4 rounded" />
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
          <div className="flex items-center justify-center h-40 text-sm text-zinc-400">
            データがありません
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100/70 dark:divide-white/[0.04]">
            {items.slice(0, 8).map((m, i) => {
              const up   = (m.change ?? 0) >= 0;
              const name = getJpName(m.symbol) ?? m.nameJa ?? m.longName ?? m.shortName;

              return (
                <li key={m.symbol} className="animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                  <Link
                    href={`/stock/${encodeURIComponent(m.symbol)}`}
                    className="row-hover flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50/80 dark:hover:bg-white/[0.03] group"
                  >
                    {/* Rank */}
                    <span className={`w-5 text-center shrink-0 font-mono font-bold tabular-nums leading-none ${
                      i === 0 ? "text-amber-500 dark:text-amber-400 text-sm" :
                      i === 1 ? "text-zinc-500 dark:text-zinc-400 text-sm" :
                      i === 2 ? "text-orange-500/80 dark:text-orange-400/80 text-sm" :
                                "text-zinc-400 dark:text-zinc-600 text-xs"
                    }`}>
                      {i + 1}
                    </span>

                    {/* Name */}
                    <div className="min-w-0 flex-1">
                      <div className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                        {m.symbol}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{name ?? "—"}</div>
                    </div>

                    {/* Price + change */}
                    <div className="text-right shrink-0">
                      <div className="font-mono text-sm font-semibold tabular-nums text-zinc-800 dark:text-zinc-100">
                        {formatNumber(m.price)}
                        <span className="text-[10px] text-zinc-400 ml-0.5">{m.currency}</span>
                      </div>
                      <div className={`text-xs font-mono font-bold tabular-nums px-1.5 py-0.5 rounded-md inline-block mt-0.5 ${
                        up
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                          : "bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400"
                      }`}>
                        {m.change !== null ? (
                          <>
                            {up ? "▲" : "▼"}{formatNumber(Math.abs(m.change))}
                            {m.changePercent !== null && (
                              <span className="font-normal opacity-80 ml-1">
                                ({Math.abs(m.changePercent).toFixed(2)}%)
                              </span>
                            )}
                          </>
                        ) : m.changePercent !== null
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
