"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, ArrowUpDown } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { getJpName } from "@/lib/jp-stocks";
import type { CatalogStock } from "@/lib/stocks-catalog";

type Quote = {
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  currency?: string;
  shortName?: string;
  longName?: string;
  nameJa?: string | null;
};

type SortKey = "symbol" | "price" | "change" | "changePercent";
type SortDir = "asc" | "desc";

const INITIAL_LIMIT = 15;
const COMPACT_LIMIT = 8;
const PAGE_SIZE = 25;

export default function SectorStockTable({
  stocks,
  compact = false,
}: {
  stocks: CatalogStock[];
  compact?: boolean;
}) {
  const [visible, setVisible] = useState(compact ? COMPACT_LIMIT : INITIAL_LIMIT);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("symbol");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const sorted = useMemo(() => {
    const arr = [...stocks];
    arr.sort((a, b) => {
      const qa = quotes[a.symbol];
      const qb = quotes[b.symbol];
      let va: number | string;
      let vb: number | string;
      switch (sortKey) {
        case "price":
          va = qa?.regularMarketPrice ?? -Infinity;
          vb = qb?.regularMarketPrice ?? -Infinity;
          break;
        case "change":
          va = qa?.regularMarketChange ?? -Infinity;
          vb = qb?.regularMarketChange ?? -Infinity;
          break;
        case "changePercent":
          va = qa?.regularMarketChangePercent ?? -Infinity;
          vb = qb?.regularMarketChangePercent ?? -Infinity;
          break;
        case "symbol":
        default:
          va = a.symbol;
          vb = b.symbol;
      }
      if (va === vb) return 0;
      const dir = sortDir === "asc" ? 1 : -1;
      return va > vb ? dir : -dir;
    });
    return arr;
  }, [stocks, quotes, sortKey, sortDir]);

  const shown = useMemo(() => sorted.slice(0, visible), [sorted, visible]);

  useEffect(() => {
    let cancelled = false;
    const toFetch = stocks
      .slice(0, Math.max(visible, INITIAL_LIMIT))
      .filter((s) => !quotes[s.symbol]);
    if (toFetch.length === 0) return;
    setLoading(true);
    Promise.all(
      toFetch.map((s) =>
        fetch(`/api/quote?symbol=${encodeURIComponent(s.symbol)}`)
          .then((r) => r.json())
          .then((j) => [s.symbol, j.quote as Quote] as const)
          .catch(() => [s.symbol, null] as const),
      ),
    ).then((results) => {
      if (cancelled) return;
      setQuotes((prev) => {
        const next = { ...prev };
        for (const [sym, q] of results) {
          if (q) next[sym] = q;
        }
        return next;
      });
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, stocks]);

  const hasMore = visible < stocks.length;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Default to descending for numeric columns (most useful first)
      setSortDir(key === "symbol" ? "asc" : "desc");
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60">
              <SortHeader
                label="銘柄"
                sortKey="symbol"
                currentKey={sortKey}
                dir={sortDir}
                onToggle={toggleSort}
              />
              <SortHeader
                label="価格"
                sortKey="price"
                currentKey={sortKey}
                dir={sortDir}
                onToggle={toggleSort}
                align="right"
              />
              <SortHeader
                label="前日比"
                sortKey="change"
                currentKey={sortKey}
                dir={sortDir}
                onToggle={toggleSort}
                align="right"
              />
              <SortHeader
                label="%"
                sortKey="changePercent"
                currentKey={sortKey}
                dir={sortDir}
                onToggle={toggleSort}
                align="right"
              />
            </tr>
          </thead>
          <tbody>
            {shown.map((s) => {
              const q = quotes[s.symbol];
              const change = q?.regularMarketChange ?? 0;
              const up = change >= 0;
              const displayName =
                getJpName(s.symbol) ??
                q?.nameJa ??
                q?.longName ??
                q?.shortName ??
                s.name;
              return (
                <tr
                  key={s.symbol}
                  className="border-b border-slate-100 dark:border-slate-800/60 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className={compact ? "py-2 px-3" : "py-3 px-4"}>
                    <Link
                      href={`/stock/${encodeURIComponent(s.symbol)}`}
                      className="block group"
                    >
                      <div className={`font-mono font-semibold text-blue-600 dark:text-blue-400 group-hover:underline ${compact ? "text-xs" : ""}`}>
                        {s.symbol}
                      </div>
                      <div className="text-xs text-slate-500 truncate max-w-[240px]">
                        {displayName}
                      </div>
                    </Link>
                  </td>
                  <td className={`${compact ? "py-2 px-3" : "py-3 px-4"} text-right font-mono tabular-nums ${compact ? "text-xs" : ""}`}>
                    {q ? (
                      <>
                        {formatNumber(q.regularMarketPrice)}{" "}
                        <span className="text-xs text-slate-500">
                          {q.currency}
                        </span>
                      </>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td
                    className={`${compact ? "py-2 px-3 text-xs" : "py-3 px-4"} text-right font-mono tabular-nums ${
                      q
                        ? up
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                        : ""
                    }`}
                  >
                    {q ? `${up ? "+" : ""}${formatNumber(change)}` : "—"}
                  </td>
                  <td
                    className={`${compact ? "py-2 px-3 text-xs" : "py-3 px-4"} text-right font-mono tabular-nums font-semibold ${
                      q
                        ? up
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                        : ""
                    }`}
                  >
                    {q
                      ? `${up ? "+" : ""}${formatNumber(
                          q.regularMarketChangePercent,
                        )}%`
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {hasMore && (
        <div className="p-3 border-t border-slate-100 dark:border-slate-800/60 text-center">
          <button
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            disabled={loading}
            className="inline-flex items-center gap-1 px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors disabled:opacity-50"
          >
            <ChevronDown className="w-4 h-4" />
            さらに {Math.min(PAGE_SIZE, stocks.length - visible)} 件表示 (残り{" "}
            {stocks.length - visible} 件)
          </button>
        </div>
      )}
    </div>
  );
}

function SortHeader({
  label,
  sortKey,
  currentKey,
  dir,
  onToggle,
  align,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  dir: SortDir;
  onToggle: (key: SortKey) => void;
  align?: "right";
}) {
  const active = sortKey === currentKey;
  const Icon = active ? (dir === "asc" ? ChevronUp : ChevronDown) : ArrowUpDown;
  return (
    <th
      className={`py-3 px-4 font-medium ${align === "right" ? "text-right" : "text-left"}`}
    >
      <button
        onClick={() => onToggle(sortKey)}
        className={`inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors ${
          active ? "text-slate-900 dark:text-white" : ""
        } ${align === "right" ? "flex-row-reverse" : ""}`}
      >
        <Icon className="w-3 h-3 opacity-60" />
        {label}
      </button>
    </th>
  );
}
