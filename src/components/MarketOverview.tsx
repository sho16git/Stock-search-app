"use client";

import { useEffect, useRef, useState } from "react";
import { formatNumber } from "@/lib/format";

type Index = {
  symbol: string;
  name: string;
  flag?: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
};

// Gradient for each major index
const GRADIENTS: Record<string, string> = {
  "^N225":  "from-red-500    to-orange-500",
  "^TOPX":  "from-rose-500   to-pink-500",
  "^GSPC":  "from-blue-500   to-indigo-600",
  "^IXIC":  "from-violet-500 to-purple-600",
  "^DJI":   "from-sky-500    to-blue-600",
  "000001.SS": "from-amber-500 to-orange-500",
};
const DEFAULT_GRADIENT = "from-slate-500 to-slate-600";

export default function MarketOverview() {
  const [indices, setIndices] = useState<Index[] | null>(null);
  const prevRef = useRef<Record<string, number>>({});

  const load = () =>
    fetch("/api/indices")
      .then((r) => r.json())
      .then((j) => {
        setIndices((prev) => {
          if (prev) {
            const map: Record<string, number> = {};
            for (const idx of prev) {
              if (idx.price != null) map[idx.symbol] = idx.price;
            }
            prevRef.current = map;
          }
          return j.indices ?? null;
        });
      })
      .catch(() => {});

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <h2 className="text-base font-bold tracking-tight flex items-center gap-1.5 mb-2.5">
        <span>🌐</span>
        <span>マーケット指数</span>
      </h2>
      <div className="-mx-3 sm:-mx-4 overflow-x-auto">
        <div className="flex gap-2.5 px-3 sm:px-4 min-w-max pb-1.5">
          {(indices ?? Array(6).fill(null)).map((idx, i) => {
            if (!idx) {
              return (
                <div
                  key={i}
                  className="min-w-[148px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-3 shadow-sm"
                >
                  <div className="skeleton h-2.5 w-14 rounded mb-2" />
                  <div className="skeleton h-6 w-20 rounded mb-1" />
                  <div className="skeleton h-2.5 w-12 rounded" />
                </div>
              );
            }

            const up = (idx.change ?? 0) >= 0;
            const prevPrice = prevRef.current[idx.symbol];
            const flashClass =
              prevPrice != null && idx.price != null && prevPrice !== idx.price
                ? idx.price > prevPrice
                  ? "flash-up"
                  : "flash-down"
                : "";

            const gradient = GRADIENTS[idx.symbol] ?? DEFAULT_GRADIENT;

            return (
              <div
                key={idx.symbol}
                className={`group min-w-[148px] rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow ${flashClass}`}
              >
                {/* Gradient accent top */}
                <div className={`h-1.5 bg-gradient-to-r ${gradient}`} />
                <div className="bg-white dark:bg-slate-900 border border-t-0 border-slate-200 dark:border-slate-800 rounded-b-2xl px-4 py-3">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 flex items-center gap-1 mb-1">
                    {idx.flag} <span>{idx.name}</span>
                  </div>
                  <div className="font-mono font-black text-lg tabular-nums leading-tight">
                    {idx.price !== null ? formatNumber(idx.price) : "—"}
                  </div>
                  <div
                    className={`inline-flex items-center gap-0.5 text-xs font-mono font-bold mt-0.5 px-1.5 py-0.5 rounded-md ${
                      up
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                        : "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {up ? "▲" : "▼"}
                    {idx.changePercent !== null
                      ? `${Math.abs(idx.changePercent).toFixed(2)}%`
                      : "—"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
