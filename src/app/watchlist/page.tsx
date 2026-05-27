"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { X, RefreshCw, ChevronUp, ChevronDown, ArrowUpDown } from "lucide-react";
import {
  getWatchlist,
  removeWatch,
  type WatchItem,
} from "@/lib/watchlist";
import { getJpName } from "@/lib/jp-stocks";
import { formatNumber } from "@/lib/format";

type Quote = {
  symbol: string;
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

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchItem[]>([]);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("symbol");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const sortedItems = useMemo(() => {
    const arr = [...items];
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
  }, [items, quotes, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "symbol" ? "asc" : "desc");
    }
  };

  const refresh = async (list: WatchItem[]) => {
    if (list.length === 0) {
      setQuotes({});
      return;
    }
    setLoading(true);
    try {
      const results = await Promise.all(
        list.map((it) =>
          fetch(`/api/quote?symbol=${encodeURIComponent(it.symbol)}`)
            .then((r) => r.json())
            .then((j) => [it.symbol, j.quote as Quote] as const)
            .catch(() => [it.symbol, null] as const),
        ),
      );
      const map: Record<string, Quote> = {};
      for (const [sym, q] of results) {
        if (q) map[sym] = q;
      }
      setQuotes(map);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = () => {
      const list = getWatchlist();
      setItems(list);
      refresh(list);
    };
    load();
    const onChange = () => load();
    window.addEventListener("watchlist:change", onChange);
    return () => window.removeEventListener("watchlist:change", onChange);
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ウォッチリスト</h1>
          <p className="text-sm text-slate-500 mt-1">
            {items.length > 0
              ? `${items.length} 銘柄を追跡中`
              : "銘柄を追加して動向を追跡しましょう"}
          </p>
        </div>
        <button
          onClick={() => refresh(items)}
          disabled={loading || items.length === 0}
          className="inline-flex items-center text-sm px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 disabled:opacity-50 transition-colors shadow-sm"
        >
          <RefreshCw
            className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`}
          />
          更新
        </button>
      </div>

      {items.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-sm">
          <div className="text-5xl mb-3 opacity-30">⭐</div>
          <p className="text-slate-500 mb-3">ウォッチリストは空です</p>
          <Link
            href="/"
            className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
          >
            銘柄を検索して追加 →
          </Link>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
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
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((w) => {
                const q = quotes[w.symbol];
                const change = q?.regularMarketChange ?? 0;
                const up = change >= 0;
                const name =
                  getJpName(w.symbol) ??
                  q?.nameJa ??
                  w.name ??
                  q?.longName ??
                  q?.shortName ??
                  w.symbol;
                return (
                  <tr
                    key={w.symbol}
                    className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="py-3 px-4">
                      <Link
                        href={`/stock/${encodeURIComponent(w.symbol)}`}
                        className="block"
                      >
                        <div className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                          {w.symbol}
                        </div>
                        <div className="text-xs text-slate-500 truncate max-w-[200px]">
                          {name}
                        </div>
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {q ? (
                        <>
                          {formatNumber(q.regularMarketPrice)}{" "}
                          <span className="text-xs text-slate-500">
                            {q.currency}
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-mono ${
                        q
                          ? up
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                          : ""
                      }`}
                    >
                      {q
                        ? `${up ? "+" : ""}${formatNumber(change)}`
                        : "—"}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-mono ${
                        q
                          ? up
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                          : ""
                      }`}
                    >
                      {q
                        ? `${up ? "+" : ""}${formatNumber(
                            q.regularMarketChangePercent,
                          )}%`
                        : "—"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => removeWatch(w.symbol)}
                        className="p-1 text-slate-400 hover:text-red-500"
                        aria-label="削除"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
