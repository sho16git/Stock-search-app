"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Loader2,
  Library,
} from "lucide-react";
import { formatNumber, formatLargeNumber, formatPercent } from "@/lib/format";
import { GICS_SECTORS } from "@/lib/gics";
import { getJpName } from "@/lib/jp-stocks";

type Row = {
  symbol: string;
  name: string;
  nameJa: string | null;
  market: "JP" | "US";
  sector: string;
  type: string;
  price: number | null;
  changePercent: number | null;
  per: number | null;
  pbr: number | null;
  dividendYield: number | null;
  marketCap: number | null;
  currency: string | null;
};

type SortKey =
  | "symbol"
  | "name"
  | "price"
  | "changePercent"
  | "per"
  | "pbr"
  | "dividendYield"
  | "marketCap";

const PAGE_SIZE = 50;

export default function AllStocksPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("marketCap");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [visible, setVisible] = useState(PAGE_SIZE);

  // Filters
  const [market, setMarket] = useState<"" | "JP" | "US">("");
  const [sector, setSector] = useState("");
  const [type, setType] = useState<"stock" | "etf" | "all">("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (market) params.set("market", market);
    if (sector) params.set("sector", sector);
    params.set("type", type);
    setLoading(true);
    fetch(`/api/screener?${params.toString()}`)
      .then((r) => r.json())
      .then((j) => {
        setRows(j.results ?? []);
        setTotal(j.total ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [market, sector, type]);

  const sorted = useMemo(() => {
    const lowerQ = query.trim().toLowerCase();
    let arr = rows;
    if (lowerQ) {
      arr = arr.filter((r) => {
        const name = getJpName(r.symbol) ?? r.nameJa ?? r.name;
        return (
          r.symbol.toLowerCase().includes(lowerQ) ||
          (name ?? "").toLowerCase().includes(lowerQ)
        );
      });
    }
    arr = [...arr];
    arr.sort((a, b) => {
      let va: number | string | null;
      let vb: number | string | null;
      if (sortKey === "name") {
        va = getJpName(a.symbol) ?? a.nameJa ?? a.name;
        vb = getJpName(b.symbol) ?? b.nameJa ?? b.name;
      } else {
        va = a[sortKey] as number | string | null;
        vb = b[sortKey] as number | string | null;
      }
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      const dir = sortDir === "asc" ? 1 : -1;
      if (typeof va === "number" && typeof vb === "number") {
        return (va - vb) * dir;
      }
      return String(va) > String(vb) ? dir : -dir;
    });
    return arr;
  }, [rows, sortKey, sortDir, query]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir(k === "symbol" || k === "name" ? "asc" : "desc");
    }
  };

  const reset = () => {
    setMarket("");
    setSector("");
    setType("all");
    setQuery("");
  };

  const shown = sorted.slice(0, visible);
  const hasMore = visible < sorted.length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2.5">
          <Library className="w-7 h-7 text-emerald-500" />
          全銘柄ブラウズ
        </h1>
        <p className="text-sm text-slate-500 mt-1.5">
          掲載銘柄を一覧から探す ({total.toLocaleString()} 銘柄)
        </p>
      </header>

      {/* Filter bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <label className="block">
            <span className="block text-[11px] uppercase tracking-wider text-slate-500 mb-1">
              名前で絞り込み
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="例: トヨタ, AAPL"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </label>
          <label className="block">
            <span className="block text-[11px] uppercase tracking-wider text-slate-500 mb-1">
              市場
            </span>
            <select
              value={market}
              onChange={(e) => setMarket(e.target.value as typeof market)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm"
            >
              <option value="">日米両方</option>
              <option value="JP">🇯🇵 日本株のみ</option>
              <option value="US">🇺🇸 米国株のみ</option>
            </select>
          </label>
          <label className="block">
            <span className="block text-[11px] uppercase tracking-wider text-slate-500 mb-1">
              セクター
            </span>
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm"
            >
              <option value="">すべて</option>
              {GICS_SECTORS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.emoji} {s.nameJa}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-[11px] uppercase tracking-wider text-slate-500 mb-1">
              種別
            </span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm"
            >
              <option value="all">株 + ETF</option>
              <option value="stock">個別株のみ</option>
              <option value="etf">ETFのみ</option>
            </select>
          </label>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs">
          <button
            onClick={reset}
            className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            条件をリセット
          </button>
          <span className="text-slate-500">
            {loading
              ? "読み込み中…"
              : `${sorted.length.toLocaleString()} 件表示中`}
          </span>
        </div>
      </div>

      {/* Results table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60">
                <SortHeader
                  label="銘柄"
                  k="symbol"
                  curKey={sortKey}
                  dir={sortDir}
                  onToggle={toggleSort}
                />
                <SortHeader
                  label="社名"
                  k="name"
                  curKey={sortKey}
                  dir={sortDir}
                  onToggle={toggleSort}
                />
                <SortHeader
                  label="価格"
                  k="price"
                  curKey={sortKey}
                  dir={sortDir}
                  onToggle={toggleSort}
                  align="right"
                />
                <SortHeader
                  label="変動率"
                  k="changePercent"
                  curKey={sortKey}
                  dir={sortDir}
                  onToggle={toggleSort}
                  align="right"
                />
                <SortHeader
                  label="PER"
                  k="per"
                  curKey={sortKey}
                  dir={sortDir}
                  onToggle={toggleSort}
                  align="right"
                />
                <SortHeader
                  label="PBR"
                  k="pbr"
                  curKey={sortKey}
                  dir={sortDir}
                  onToggle={toggleSort}
                  align="right"
                />
                <SortHeader
                  label="配当"
                  k="dividendYield"
                  curKey={sortKey}
                  dir={sortDir}
                  onToggle={toggleSort}
                  align="right"
                />
                <SortHeader
                  label="時価総額"
                  k="marketCap"
                  curKey={sortKey}
                  dir={sortDir}
                  onToggle={toggleSort}
                  align="right"
                />
              </tr>
            </thead>
            <tbody>
              {loading && shown.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <Loader2 className="inline w-5 h-5 animate-spin text-slate-400" />
                  </td>
                </tr>
              ) : shown.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-12 text-center text-sm text-slate-400"
                  >
                    該当する銘柄が見つかりませんでした
                  </td>
                </tr>
              ) : (
                shown.map((r) => {
                  const up = (r.changePercent ?? 0) >= 0;
                  const name = getJpName(r.symbol) ?? r.nameJa ?? r.name;
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
                          {r.type === "etf" && (
                            <span className="text-[9px] px-1 py-0.5 rounded bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300">
                              ETF
                            </span>
                          )}
                          <span className="text-[9px] font-normal">
                            {r.market === "JP" ? "🇯🇵" : "🇺🇸"}
                          </span>
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          href={`/stock/${encodeURIComponent(r.symbol)}`}
                          className="text-sm hover:text-blue-600 dark:hover:text-blue-400 truncate block max-w-[280px]"
                        >
                          {name}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {formatNumber(r.price)}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono tabular-nums font-semibold ${
                          r.changePercent === null
                            ? "text-slate-400"
                            : up
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {r.changePercent !== null
                          ? `${up ? "+" : ""}${r.changePercent.toFixed(2)}%`
                          : "—"}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {formatNumber(r.per)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {formatNumber(r.pbr)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {formatPercent(r.dividendYield)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                        {formatLargeNumber(r.marketCap)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {hasMore && (
          <div className="p-3 border-t border-slate-100 dark:border-slate-800/60 text-center">
            <button
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
              className="inline-flex items-center gap-1 px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
            >
              <ChevronDown className="w-4 h-4" />
              さらに {Math.min(PAGE_SIZE, sorted.length - visible)} 件表示 (残り{" "}
              {sorted.length - visible} 件)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SortHeader({
  label,
  k,
  curKey,
  dir,
  onToggle,
  align,
}: {
  label: string;
  k: SortKey;
  curKey: SortKey;
  dir: "asc" | "desc";
  onToggle: (k: SortKey) => void;
  align?: "right";
}) {
  const active = k === curKey;
  const Icon = active ? (dir === "asc" ? ChevronUp : ChevronDown) : ArrowUpDown;
  return (
    <th
      className={`py-3 px-4 font-medium ${align === "right" ? "text-right" : "text-left"}`}
    >
      <button
        onClick={() => onToggle(k)}
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
