"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { getJpName } from "@/lib/jp-stocks";
import { getRecent, type RecentItem } from "@/lib/recent";

type Quote = {
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  currency?: string;
  shortName?: string;
  longName?: string;
  nameJa?: string | null;
};

export default function RecentViewed() {
  const [items, setItems] = useState<RecentItem[]>([]);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});

  useEffect(() => {
    const load = () => {
      const list = getRecent();
      setItems(list);
      if (list.length === 0) {
        setQuotes({});
        return;
      }
      Promise.all(
        list.map((it) =>
          fetch(`/api/quote?symbol=${encodeURIComponent(it.symbol)}`)
            .then((r) => r.json())
            .then((j) => [it.symbol, j.quote as Quote] as const)
            .catch(() => [it.symbol, null] as const),
        ),
      ).then((results) => {
        const map: Record<string, Quote> = {};
        for (const [sym, q] of results) {
          if (q) map[sym] = q;
        }
        setQuotes(map);
      });
    };
    load();
    const onChange = () => load();
    window.addEventListener("recent:change", onChange);
    return () => window.removeEventListener("recent:change", onChange);
  }, []);

  if (items.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-4 rounded-full bg-gradient-to-b from-blue-500 to-violet-500 shrink-0" />
        <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200 tracking-tight flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-zinc-400" />
          最近見た銘柄
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {items.slice(0, 6).map((r) => {
          const q = quotes[r.symbol];
          const change = q?.regularMarketChangePercent ?? 0;
          const up = change >= 0;
          const name =
            getJpName(r.symbol) ?? q?.nameJa ?? q?.longName ?? q?.shortName;
          return (
            <Link
              key={r.symbol}
              href={`/stock/${encodeURIComponent(r.symbol)}`}
              className="group block p-3 rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-zinc-900 hover:border-blue-400/60 dark:hover:border-blue-500/50 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-mono font-semibold text-sm text-blue-600 dark:text-blue-400">
                    {r.symbol}
                  </div>
                  <div className="text-xs text-zinc-500 truncate">
                    {name ?? r.symbol}
                  </div>
                </div>
                {q && (
                  <div className="text-right">
                    <div className="font-mono text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                      {formatNumber(q.regularMarketPrice)}
                    </div>
                    <div
                      className={`text-[11px] font-mono font-semibold ${
                        up
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-500 dark:text-red-400"
                      }`}
                    >
                      {up ? "+" : ""}
                      {change.toFixed(2)}%
                    </div>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
