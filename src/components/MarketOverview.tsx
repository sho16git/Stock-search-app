"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatNumber } from "@/lib/format";

type Index = {
  symbol: string;
  name: string;
  flag?: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
};

export default function MarketOverview() {
  const [indices, setIndices] = useState<Index[] | null>(null);

  const load = () => {
    fetch("/api/indices")
      .then((r) => r.json())
      .then((j) => setIndices(j.indices ?? null))
      .catch(() => {});
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="-mx-4 overflow-x-auto">
      <div className="flex gap-2 px-4 min-w-max pb-1">
        {(indices ?? Array(6).fill(null)).map((idx, i) => {
          if (!idx) {
            return (
              <div
                key={i}
                className="min-w-[150px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 shadow-sm animate-pulse"
              >
                <div className="h-3 w-16 bg-slate-100 dark:bg-slate-800 rounded mb-2" />
                <div className="h-5 w-20 bg-slate-100 dark:bg-slate-800 rounded" />
              </div>
            );
          }
          const up = (idx.change ?? 0) >= 0;
          const Arrow = up ? TrendingUp : TrendingDown;
          return (
            <div
              key={idx.symbol}
              className="min-w-[160px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 shadow-sm"
            >
              <div className="text-[10px] uppercase tracking-wider text-slate-500 flex items-center gap-1">
                {idx.flag} <span>{idx.name}</span>
              </div>
              <div className="font-mono font-bold text-lg tabular-nums mt-0.5">
                {idx.price !== null ? formatNumber(idx.price) : "—"}
              </div>
              <div
                className={`inline-flex items-center gap-0.5 text-xs font-mono font-semibold ${
                  up
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {idx.change !== null && <Arrow className="w-3 h-3" />}
                {idx.changePercent !== null
                  ? `${up ? "+" : ""}${idx.changePercent.toFixed(2)}%`
                  : "—"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
