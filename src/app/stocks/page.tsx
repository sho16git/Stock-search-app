"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Library,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import { formatNumber, formatLargeNumber, formatPercent } from "@/lib/format";

type Row = {
  symbol: string;
  name: string;
  market: "JP" | "US";
  sector: string | null;
  price: number | null;
  changePercent: number | null;
  marketCap: number | null;
  currency: string | null;
};

type BrowseResp = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  results: Row[];
};

type SortKey = "price" | "changePercent" | "marketCap";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 50;

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey | null; sortDir: SortDir }) {
  if (sortKey !== col) return <ChevronsUpDown className="w-3 h-3 opacity-30" />;
  return sortDir === "desc"
    ? <ChevronDown className="w-3 h-3 text-blue-500" />
    : <ChevronUp className="w-3 h-3 text-blue-500" />;
}

export default function AllStocksPage() {
  const [data, setData]       = useState<BrowseResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(0);
  const [market, setMarket]   = useState<"" | "JP" | "US">("");
  const [query, setQuery]     = useState("");
  const [inputVal, setInputVal] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async (p: number, mkt: string, q: string) => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(p),
      pageSize: String(PAGE_SIZE),
    });
    if (mkt) params.set("market", mkt);
    if (q)   params.set("q", q);
    try {
      const res = await fetch(`/api/browse?${params}`).then((r) => r.json());
      setData(res);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(page, market, query);
  }, [page, market, query, fetchData]);

  const handleInput = (val: string) => {
    setInputVal(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setQuery(val.trim());
      setPage(0);
    }, 400);
  };

  const handleMarket = (v: "" | "JP" | "US") => {
    setMarket(v);
    setPage(0);
  };

  const handleSort = (col: SortKey) => {
    if (sortKey === col) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(col);
      setSortDir("desc");
    }
  };

  // Client-side sort of the current page's rows
  const rawRows = data?.results ?? [];
  const rows = sortKey
    ? [...rawRows].sort((a, b) => {
        const av = a[sortKey] ?? (sortDir === "desc" ? -Infinity : Infinity);
        const bv = b[sortKey] ?? (sortDir === "desc" ? -Infinity : Infinity);
        return sortDir === "desc" ? (bv as number) - (av as number) : (av as number) - (bv as number);
      })
    : rawRows;

  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to   = Math.min((page + 1) * PAGE_SIZE, total);

  const SortTh = ({ col, label }: { col: SortKey; label: string }) => (
    <th
      className="py-3 px-4 font-medium text-right cursor-pointer select-none hover:text-slate-900 dark:hover:text-white transition-colors"
      onClick={() => handleSort(col)}
    >
      <span className="inline-flex items-center gap-1 justify-end">
        {label}
        <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
      </span>
    </th>
  );

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
          <Library className="w-6 h-6 text-emerald-500" />
          全銘柄ブラウズ
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {loading ? "読み込み中…" : `${total.toLocaleString()} 銘柄 掲載`}
        </p>
      </header>

      {/* Filter bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={inputVal}
              onChange={(e) => handleInput(e.target.value)}
              placeholder="銘柄名・コードで絞り込み (例: トヨタ, 7203)"
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>
          {/* Market toggle */}
          <div className="flex p-0.5 bg-slate-100 dark:bg-slate-800/60 rounded-lg gap-0.5 shrink-0">
            {(["", "JP", "US"] as const).map((m) => (
              <button
                key={m}
                onClick={() => handleMarket(m)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  market === m
                    ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800"
                }`}
              >
                {m === "" ? "全て" : m === "JP" ? "🇯🇵 日本" : "🇺🇸 米国"}
              </button>
            ))}
          </div>
        </div>
        {/* Sort hint + result count */}
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            {loading
              ? "取得中…"
              : total === 0
                ? "該当なし"
                : `${from.toLocaleString()}〜${to.toLocaleString()} 件表示 / 全 ${total.toLocaleString()} 件`}
          </p>
          {sortKey && (
            <button
              onClick={() => setSortKey(null)}
              className="text-xs text-blue-500 hover:underline"
            >
              並び替え解除
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60">
                <th className="py-3 px-4 font-medium">銘柄</th>
                <th className="py-3 px-4 font-medium">社名</th>
                <SortTh col="price" label="価格" />
                <SortTh col="changePercent" label="変動率" />
                <SortTh col="marketCap" label="時価総額" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <Loader2 className="inline w-5 h-5 animate-spin text-slate-400" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-sm text-slate-400">
                    該当する銘柄が見つかりませんでした
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const up = (r.changePercent ?? 0) >= 0;
                  return (
                    <tr
                      key={r.symbol}
                      className="border-b border-slate-100 dark:border-slate-800/60 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <td className="py-3 px-4">
                        <Link
                          href={`/stock/${encodeURIComponent(r.symbol)}`}
                          className="font-mono font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                        >
                          {r.symbol}
                          <span className="text-[9px] font-normal">
                            {r.market === "JP" ? "🇯🇵" : "🇺🇸"}
                          </span>
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          href={`/stock/${encodeURIComponent(r.symbol)}`}
                          className="hover:text-blue-600 dark:hover:text-blue-400 truncate block max-w-[260px]"
                        >
                          {r.name}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {r.price !== null
                          ? `${formatNumber(r.price)} ${r.currency ?? ""}`
                          : <span className="text-slate-400 text-xs">詳細→</span>}
                      </td>
                      <td className={`py-3 px-4 text-right font-mono tabular-nums font-semibold ${
                        r.changePercent === null
                          ? "text-slate-400"
                          : up
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                      }`}>
                        {r.changePercent !== null
                          ? `${up ? "+" : ""}${r.changePercent.toFixed(2)}%`
                          : "—"}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-500">
                        {r.marketCap !== null ? formatLargeNumber(r.marketCap) : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800/60">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              前へ
            </button>
            <span className="text-xs text-slate-500">
              {page + 1} / {totalPages} ページ
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              次へ
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
