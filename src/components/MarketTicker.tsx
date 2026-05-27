"use client";

import { useEffect, useState } from "react";
import { formatNumber } from "@/lib/format";

type TickerItem = {
  symbol: string;
  name: string;
  flag?: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
};

export default function MarketTicker() {
  const [items, setItems] = useState<TickerItem[]>([]);

  useEffect(() => {
    fetch("/api/indices")
      .then((r) => r.json())
      .then((j) => setItems(j.indices ?? []))
      .catch(() => {});
    const id = setInterval(() => {
      fetch("/api/indices")
        .then((r) => r.json())
        .then((j) => setItems(j.indices ?? []))
        .catch(() => {});
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  if (items.length === 0) return null;

  // triple for seamless loop
  const doubled = [...items, ...items, ...items];

  return (
    <div className="bg-slate-900 overflow-hidden h-7 flex items-center border-b border-slate-700/40 shrink-0">
      <div className="flex animate-ticker whitespace-nowrap select-none">
        {doubled.map((item, i) => {
          const up = (item.change ?? 0) >= 0;
          const pct = item.changePercent;
          return (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 px-5 border-r border-slate-700/40 text-[11px]"
            >
              <span className="text-slate-400">
                {item.flag} {item.name}
              </span>
              <span className="font-mono font-bold text-white">
                {item.price !== null ? formatNumber(item.price) : "—"}
              </span>
              {pct !== null && (
                <span
                  className={`font-mono font-semibold ${
                    up ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {up ? "▲" : "▼"}
                  {Math.abs(pct).toFixed(2)}%
                </span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}
