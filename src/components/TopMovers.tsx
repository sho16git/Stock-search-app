"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Flame, TrendingUp, TrendingDown, Zap } from "lucide-react";
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

const TABS: { id: Tab; label: string; icon: typeof TrendingUp }[] = [
  { id: "day_gainers", label: "値上がり", icon: TrendingUp },
  { id: "day_losers", label: "値下がり", icon: TrendingDown },
  { id: "most_actives", label: "出来高", icon: Zap },
];

const MARKETS: { id: Market; label: string; flag: string }[] = [
  { id: "US", label: "米国株", flag: "🇺🇸" },
  { id: "JP", label: "日本株", flag: "🇯🇵" },
];

type Key = `${Market}:${Tab}`;

export default function TopMovers() {
  const [market, setMarket] = useState<Market>("US");
  const [tab, setTab] = useState<Tab>("day_gainers");
  const [cache, setCache] = useState<Partial<Record<Key, Mover[]>>>({});
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
      .finally(() =>
        setLoadingKey((k) => (k === key ? null : k)),
      );
  }, [key, cache, market, tab]);

  const items = cache[key] ?? [];
  const isLoading = loadingKey === key;

  return (
    <div>
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 className="text-base font-bold tracking-tight flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-orange-500" />
            今日動いた銘柄
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            日米マーケットのランキング
          </p>
        </div>
      </div>

      {/* Market toggle */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl mb-2 w-fit">
        {MARKETS.map((m) => (
          <button
            key={m.id}
            onClick={() => setMarket(m.id)}
            className={`px-3.5 py-1.5 text-xs rounded-lg transition-all font-medium inline-flex items-center gap-1 ${
              market === m.id
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span>{m.flag}</span>
            {m.label}
          </button>
        ))}
      </div>

      {/* Type tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl mb-3 w-fit">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-all font-medium inline-flex items-center gap-1 ${
                tab === t.id
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        {isLoading && items.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-400">
            読み込み中…
          </div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-400">
            データがありません
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {items.slice(0, 8).map((m, i) => {
              const up = (m.change ?? 0) >= 0;
              const name =
                getJpName(m.symbol) ?? m.nameJa ?? m.longName ?? m.shortName;
              return (
                <li key={m.symbol}>
                  <Link
                    href={`/stock/${encodeURIComponent(m.symbol)}`}
                    className="flex items-center gap-3 px-3 py-2.5 sm:px-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <span className="font-mono text-xs text-slate-400 w-5 shrink-0 text-right">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-mono font-semibold text-blue-600 dark:text-blue-400 text-sm">
                        {m.symbol}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {name}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-sm font-semibold tabular-nums">
                        {formatNumber(m.price)}
                        <span className="text-[10px] text-slate-500 ml-0.5">
                          {m.currency}
                        </span>
                      </div>
                      <div
                        className={`text-xs font-mono font-semibold tabular-nums ${
                          up
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {m.changePercent !== null
                          ? `${up ? "+" : ""}${m.changePercent.toFixed(2)}%`
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
