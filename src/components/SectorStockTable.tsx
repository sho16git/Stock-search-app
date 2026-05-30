"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, ArrowUpDown, Search, X } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { getJpName } from "@/lib/jp-stocks";

type StockEntry = { symbol: string; name: string; market: string };

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

const INITIAL_LIMIT = 30;
const COMPACT_LIMIT = 8;
const PAGE_SIZE = 50;

export default function SectorStockTable({
  stocks,
  compact = false,
}: {
  stocks: StockEntry[];
  compact?: boolean;
}) {
  const [visible, setVisible] = useState(compact ? COMPACT_LIMIT : INITIAL_LIMIT);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("symbol");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [search, setSearch] = useState("");

  // ── Client-side search filter ──────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search.trim()) return stocks;
    const q = search.trim().toLowerCase();
    return stocks.filter(
      (s) =>
        s.symbol.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        (getJpName(s.symbol) ?? "").includes(q),
    );
  }, [stocks, search]);

  // When search changes, reset pagination
  useEffect(() => {
    setVisible(compact ? COMPACT_LIMIT : INITIAL_LIMIT);
  }, [search, compact]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
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
  }, [filtered, quotes, sortKey, sortDir]);

  // When searching show all matches; otherwise paginate
  const shown = useMemo(
    () => (search.trim() ? sorted : sorted.slice(0, visible)),
    [sorted, visible, search],
  );

  // Fetch quotes for newly visible stocks (batch by chunks of 20)
  useEffect(() => {
    let cancelled = false;
    const toFetch = shown.filter((s) => !quotes[s.symbol]);
    if (toFetch.length === 0) return;
    setLoading(true);

    // Batch into groups of 20 concurrent requests
    const BATCH = 20;
    const batches: StockEntry[][] = [];
    for (let i = 0; i < toFetch.length; i += BATCH) {
      batches.push(toFetch.slice(i, i + BATCH));
    }

    const fetchBatch = async (batch: StockEntry[]) =>
      Promise.all(
        batch.map((s) =>
          fetch(`/api/quote?symbol=${encodeURIComponent(s.symbol)}`)
            .then((r) => r.json())
            .then((j) => [s.symbol, j.quote as Quote] as const)
            .catch(() => [s.symbol, null] as const),
        ),
      );

    (async () => {
      for (const batch of batches) {
        if (cancelled) return;
        const results = await fetchBatch(batch);
        if (cancelled) return;
        setQuotes((prev) => {
          const next = { ...prev };
          for (const [sym, q] of results) {
            if (q) next[sym] = q;
          }
          return next;
        });
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown]);

  const hasMore = !search.trim() && visible < filtered.length;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "symbol" ? "asc" : "desc");
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      {/* ── Search bar ── */}
      {!compact && (
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/70 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="銘柄コード・会社名で絞り込み…"
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600 text-slate-800 dark:text-slate-100"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="text-xs text-slate-400 tabular-nums shrink-0">
            {filtered.length.toLocaleString()} 件
          </span>
        </div>
      )}

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
            {shown.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-10 text-center text-sm text-slate-400">
                  該当する銘柄が見つかりませんでした
                </td>
              </tr>
            ) : (
              shown.map((s) => {
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
                        <div
                          className={`font-mono font-semibold text-blue-600 dark:text-blue-400 group-hover:underline ${compact ? "text-xs" : ""}`}
                        >
                          {s.symbol}
                        </div>
                        <div className="text-xs text-slate-500 truncate max-w-[240px]">
                          {displayName}
                        </div>
                      </Link>
                    </td>
                    <td
                      className={`${compact ? "py-2 px-3" : "py-3 px-4"} text-right font-mono tabular-nums ${compact ? "text-xs" : ""}`}
                    >
                      {q ? (
                        <>
                          {formatNumber(q.regularMarketPrice)}{" "}
                          <span className="text-xs text-slate-500">
                            {q.currency}
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">—</span>
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
                        ? `${up ? "+" : ""}${formatNumber(q.regularMarketChangePercent)}%`
                        : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Load more (unfiltered mode only) ── */}
      {hasMore && (
        <div className="p-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {visible.toLocaleString()} / {filtered.length.toLocaleString()} 件表示
          </span>
          <button
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            disabled={loading}
            className="inline-flex items-center gap-1 px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors disabled:opacity-50"
          >
            <ChevronDown className="w-4 h-4" />
            さらに {Math.min(PAGE_SIZE, filtered.length - visible)} 件
          </button>
        </div>
      )}

      {/* ── Search results count ── */}
      {search.trim() && shown.length > 0 && (
        <div className="p-3 border-t border-slate-100 dark:border-slate-800/60 text-center text-xs text-slate-400">
          {loading && "読み込み中… "}
          {shown.length.toLocaleString()} 件一致
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
  const Icon = active
    ? dir === "asc"
      ? ChevronUp
      : ChevronDown
    : ArrowUpDown;
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
