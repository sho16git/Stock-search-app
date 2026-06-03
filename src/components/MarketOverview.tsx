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

const ACCENT: Record<string, { from: string; to: string }> = {
  "^N225":     { from: "#ef4444", to: "#f97316" },
  "^TOPX":     { from: "#f43f5e", to: "#ec4899" },
  "^GSPC":     { from: "#3b82f6", to: "#6366f1" },
  "^IXIC":     { from: "#8b5cf6", to: "#a855f7" },
  "^DJI":      { from: "#0ea5e9", to: "#3b82f6" },
  "000001.SS": { from: "#f59e0b", to: "#f97316" },
};
const DEFAULT_ACCENT = { from: "#52525b", to: "#71717a" };

function pctColor(pct: number | null) {
  if (pct === null) return "text-zinc-400";
  return pct >= 0
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-red-500 dark:text-red-400";
}
function pctBg(pct: number | null) {
  if (pct === null) return "bg-zinc-100 dark:bg-zinc-800";
  return pct >= 0
    ? "bg-emerald-50 dark:bg-emerald-950/40"
    : "bg-red-50 dark:bg-red-950/30";
}

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

  const items = indices ?? Array(6).fill(null);

  return (
    <div>
      {/* Section label */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-4 rounded-full bg-gradient-to-b from-blue-500 to-violet-500 shrink-0" />
        <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200 tracking-tight">
          マーケット指数
        </span>
      </div>

      {/* Mobile: horizontal snap scroll / Desktop: grid */}
      <div className="-mx-3 sm:-mx-4 lg:mx-0 overflow-x-auto lg:overflow-visible scrollbar-none">
        <div className="flex lg:grid lg:grid-cols-3 xl:grid-cols-6 gap-2 px-3 sm:px-4 lg:px-0 pb-1.5 lg:pb-0 momentum-scroll lg:[scroll-snap-type:unset]">
          {items.map((idx: Index | null, i: number) => {
            /* ── Skeleton ── */
            if (!idx) {
              return (
                <div
                  key={i}
                  className="shrink-0 min-w-[144px] lg:min-w-0 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-white/[0.07] overflow-hidden"
                >
                  <div className="h-[2px] bg-zinc-200 dark:bg-zinc-800" />
                  <div className="px-3 py-3 space-y-2">
                    <div className="skeleton h-2.5 w-14 rounded" />
                    <div className="skeleton h-5 w-20 rounded" />
                    <div className="skeleton h-3 w-10 rounded" />
                  </div>
                </div>
              );
            }

            const up = (idx.change ?? 0) >= 0;
            const prevPrice = prevRef.current[idx.symbol];
            const flashClass =
              prevPrice != null && idx.price != null && prevPrice !== idx.price
                ? idx.price > prevPrice ? "flash-up" : "flash-down"
                : "";
            const accent = ACCENT[idx.symbol] ?? DEFAULT_ACCENT;

            return (
              <div
                key={idx.symbol}
                className={`card-hover shrink-0 min-w-[144px] lg:min-w-0 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-white/[0.07] overflow-hidden hover:border-zinc-300 dark:hover:border-white/[0.14] ${flashClass}`}
              >
                {/* Color accent bar */}
                <div
                  className="h-[2px]"
                  style={{ background: `linear-gradient(90deg, ${accent.from}, ${accent.to})` }}
                />

                <div className="px-3 py-3">
                  {/* Name */}
                  <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1 mb-1.5 truncate">
                    <span>{idx.flag}</span>
                    <span className="truncate">{idx.name}</span>
                  </div>

                  {/* Price */}
                  <div className="font-mono font-black text-[17px] tabular-nums leading-tight text-zinc-900 dark:text-zinc-50">
                    {idx.price !== null ? formatNumber(idx.price) : "—"}
                  </div>

                  {/* Change badge */}
                  <div className={`inline-flex items-center gap-0.5 mt-1.5 px-1.5 py-0.5 rounded-md text-xs font-mono font-bold ${pctBg(idx.changePercent)} ${pctColor(idx.changePercent)}`}>
                    {up ? "▲" : "▼"}
                    {idx.changePercent !== null
                      ? Math.abs(idx.changePercent).toFixed(2) + "%"
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
