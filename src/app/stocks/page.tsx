"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft, ChevronRight, Loader2, Library, Search,
  ChevronUp, ChevronDown, ChevronsUpDown, Layers, List,
} from "lucide-react";
import { formatNumber, formatLargeNumber } from "@/lib/format";

// ── Types ──────────────────────────────────────────────────────────
type Row = {
  symbol:        string;
  name:          string;
  nameEn:        string | null;
  market:        "JP" | "US";
  sector:        string | null;
  price:         number | null;
  changePercent: number | null;
  marketCap:     number | null;
  currency:      string | null;
};

type BrowseResp = {
  total:      number;
  page:       number;
  pageSize:   number;
  totalPages: number;
  results:    Row[];
};

type SortKey  = "price" | "changePercent" | "marketCap";
type SortDir  = "asc" | "desc";
type ViewMode = "list" | "sector";

// ── セクター定義（Yahoo Finance → 日本語）────────────────────────
const SECTOR_DISPLAY: Record<string, { nameJa: string; emoji: string }> = {
  "Technology":              { nameJa: "情報技術",          emoji: "💻" },
  "Financial Services":      { nameJa: "金融",              emoji: "🏦" },
  "Consumer Cyclical":       { nameJa: "一般消費財",        emoji: "🛍️" },
  "Consumer Defensive":      { nameJa: "生活必需品",        emoji: "🛒" },
  "Healthcare":              { nameJa: "ヘルスケア",        emoji: "💊" },
  "Communication Services":  { nameJa: "コミュニケーション", emoji: "📡" },
  "Energy":                  { nameJa: "エネルギー",        emoji: "⛽" },
  "Basic Materials":         { nameJa: "素材",              emoji: "🪨" },
  "Industrials":             { nameJa: "資本財・サービス",  emoji: "🏭" },
  "Utilities":               { nameJa: "公益事業",          emoji: "💡" },
  "Real Estate":             { nameJa: "不動産",            emoji: "🏢" },
};

function getSectorInfo(raw: string | null): { nameJa: string; emoji: string; key: string } {
  if (!raw) return { nameJa: "未分類", emoji: "📋", key: "__other__" };
  const info = SECTOR_DISPLAY[raw];
  if (info) return { ...info, key: raw };
  // 日本語セクター名がそのまま来る場合（JP stocks）
  const jpMap: Record<string, string> = {
    "電気機器": "💻", "情報・通信業": "📡", "自動車・輸送機器": "🚗",
    "銀行業": "🏦", "保険業": "🛡️", "証券、商品先物取引業": "📈",
    "医薬品": "💊", "小売業": "🛒", "サービス業": "🏢",
    "建設業": "🏗️", "食料品": "🍱", "化学": "🧪",
    "機械": "⚙️", "鉄鋼": "🔧", "非鉄金属": "🔩",
    "輸送用機器": "🚗", "精密機器": "🔬", "不動産業": "🏠",
    "鉱業": "⛏️", "繊維製品": "🧵", "パルプ・紙": "📄",
    "ゴム製品": "⭕", "ガラス・土石製品": "🏺", "その他製品": "📦",
    "卸売業": "🏭", "陸運業": "🚃", "海運業": "🚢",
    "空運業": "✈️", "倉庫・運輸関連業": "📦", "電力・ガス業": "💡",
    "水産・農林業": "🌾", "鉱業・採掘": "⛏️",
  };
  const emoji = jpMap[raw] ?? "📊";
  return { nameJa: raw, emoji, key: raw };
}

// ── 並び替えアイコン ───────────────────────────────────────────────
function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey | null; sortDir: SortDir }) {
  if (sortKey !== col) return <ChevronsUpDown className="w-3 h-3 opacity-30" />;
  return sortDir === "desc"
    ? <ChevronDown className="w-3 h-3 text-blue-500" />
    : <ChevronUp className="w-3 h-3 text-blue-500" />;
}

// ── セクターパネル ─────────────────────────────────────────────────
function SectorGroup({
  sectorKey, rows,
}: {
  sectorKey: string;
  rows: Row[];
}) {
  const [open, setOpen] = useState(true);
  const info = getSectorInfo(sectorKey === "__other__" ? null : sectorKey);

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
      {/* Sector header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
      >
        <span className="text-2xl leading-none shrink-0">{info.emoji}</span>
        <div className="flex-1 min-w-0">
          <span className="font-bold text-sm text-zinc-800 dark:text-zinc-100">{info.nameJa}</span>
          <span className="ml-2 text-xs text-zinc-400">{rows.length}銘柄</span>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-zinc-400 shrink-0" />
          : <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />}
      </button>

      {/* Stock list */}
      {open && (
        <div className="border-t border-zinc-100 dark:border-zinc-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/30">
                  <th className="py-2 px-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide">銘柄コード</th>
                  <th className="py-2 px-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide">会社名</th>
                  <th className="py-2 px-4 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wide">詳細</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {rows.map(r => (
                  <tr key={r.symbol} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="py-2.5 px-4">
                      <Link
                        href={`/stock/${encodeURIComponent(r.symbol)}`}
                        className="inline-flex items-center gap-1.5 font-mono font-semibold text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {r.symbol}
                        <span className="text-xs">{r.market === "JP" ? "🇯🇵" : "🇺🇸"}</span>
                      </Link>
                    </td>
                    <td className="py-2.5 px-4 max-w-[260px]">
                      <Link href={`/stock/${encodeURIComponent(r.symbol)}`} className="hover:text-blue-600 dark:hover:text-blue-400">
                        <span className="block truncate text-sm text-zinc-700 dark:text-zinc-200">{r.name}</span>
                        {r.market === "US" && r.nameEn && r.nameEn !== r.name && (
                          <span className="block truncate text-xs text-zinc-400">{r.nameEn}</span>
                        )}
                      </Link>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <Link
                        href={`/stock/${encodeURIComponent(r.symbol)}`}
                        className="text-xs text-blue-500 hover:underline font-medium"
                      >
                        詳細→
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── メインページ ───────────────────────────────────────────────────
const PAGE_SIZE = 50;

export default function AllStocksPage() {
  const [data,      setData]      = useState<BrowseResp | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [page,      setPage]      = useState(0);
  const [market,    setMarket]    = useState<"" | "JP" | "US">("");
  const [query,     setQuery]     = useState("");
  const [inputVal,  setInputVal]  = useState("");
  const [sortKey,   setSortKey]   = useState<SortKey | null>(null);
  const [sortDir,   setSortDir]   = useState<SortDir>("desc");
  const [viewMode,  setViewMode]  = useState<ViewMode>("list");

  // セクター別ビュー用
  const [sectorRows,    setSectorRows]    = useState<Row[]>([]);
  const [sectorLoading, setSectorLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // リスト用データ取得
  const fetchData = useCallback(async (p: number, mkt: string, q: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), pageSize: String(PAGE_SIZE) });
    if (mkt) params.set("market", mkt);
    if (q)   params.set("q", q);
    try {
      const res = await fetch(`/api/browse?${params}`).then(r => r.json());
      setData(res);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  // セクター別用データ取得（価格なし、全件）
  const fetchSectorData = useCallback(async (mkt: string, q: string) => {
    setSectorLoading(true);
    const params = new URLSearchParams({ page: "0", pageSize: "3000", noPrices: "true" });
    if (mkt) params.set("market", mkt);
    if (q)   params.set("q", q);
    try {
      const res: BrowseResp = await fetch(`/api/browse?${params}`).then(r => r.json());
      setSectorRows(res.results);
    } catch { /* ignore */ }
    finally { setSectorLoading(false); }
  }, []);

  useEffect(() => {
    if (viewMode === "list") fetchData(page, market, query);
  }, [page, market, query, fetchData, viewMode]);

  useEffect(() => {
    if (viewMode === "sector") fetchSectorData(market, query);
  }, [viewMode, market, query, fetchSectorData]);

  const handleInput = (val: string) => {
    setInputVal(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setQuery(val.trim()); setPage(0); }, 400);
  };

  const handleMarket = (v: "" | "JP" | "US") => { setMarket(v); setPage(0); };

  const handleSort = (col: SortKey) => {
    if (sortKey === col) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortKey(col); setSortDir("desc"); }
  };

  // クライアントソート
  const rawRows = data?.results ?? [];
  const rows = sortKey
    ? [...rawRows].sort((a, b) => {
        const av = a[sortKey] ?? (sortDir === "desc" ? -Infinity : Infinity);
        const bv = b[sortKey] ?? (sortDir === "desc" ? -Infinity : Infinity);
        return sortDir === "desc" ? (bv as number) - (av as number) : (av as number) - (bv as number);
      })
    : rawRows;

  const total      = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to   = Math.min((page + 1) * PAGE_SIZE, total);

  // セクターグループ化
  const sectorGroups = (() => {
    const map = new Map<string, Row[]>();
    for (const r of sectorRows) {
      const key = r.sector ?? "__other__";
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    // セクター名でソート（未分類は最後）
    return [...map.entries()].sort(([a], [b]) => {
      if (a === "__other__") return 1;
      if (b === "__other__") return -1;
      const infoA = getSectorInfo(a);
      const infoB = getSectorInfo(b);
      return infoA.nameJa.localeCompare(infoB.nameJa, "ja");
    });
  })();

  const SortTh = ({ col, label }: { col: SortKey; label: string }) => (
    <th
      className="py-3 px-4 font-semibold text-right cursor-pointer select-none hover:text-zinc-900 dark:hover:text-white transition-colors"
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

      {/* Header */}
      <header>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
          <Library className="w-6 h-6 text-blue-500" />
          全銘柄ブラウズ
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          {(loading || sectorLoading)
            ? "読み込み中…"
            : viewMode === "list"
              ? `${total.toLocaleString()} 銘柄 掲載`
              : `${sectorRows.length.toLocaleString()} 銘柄 · ${sectorGroups.length} セクター`}
        </p>
      </header>

      {/* Filter bar */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              value={inputVal}
              onChange={e => handleInput(e.target.value)}
              placeholder="銘柄名・コードで絞り込み (例: トヨタ, 7203, アップル, AAPL)"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400"
            />
          </div>
          {/* Market toggle */}
          <div className="flex p-0.5 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl gap-0.5 shrink-0">
            {(["", "JP", "US"] as const).map(m => (
              <button
                key={m}
                onClick={() => handleMarket(m)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  market === m
                    ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800"
                }`}
              >
                {m === "" ? "全て" : m === "JP" ? "🇯🇵 日本" : "🇺🇸 米国"}
              </button>
            ))}
          </div>
        </div>

        {/* View mode + result count */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          {/* View toggle */}
          <div className="flex p-0.5 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl gap-0.5">
            <button
              onClick={() => setViewMode("list")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "list"
                  ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              <List className="w-3.5 h-3.5" /> リスト
            </button>
            <button
              onClick={() => setViewMode("sector")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "sector"
                  ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> セクター別
            </button>
          </div>

          <div className="flex items-center gap-3">
            {viewMode === "list" && (
              <p className="text-xs text-zinc-500">
                {loading
                  ? "取得中…"
                  : total === 0
                    ? "該当なし"
                    : `${from.toLocaleString()}〜${to.toLocaleString()} 件 / 全 ${total.toLocaleString()} 件`}
              </p>
            )}
            {viewMode === "list" && sortKey && (
              <button onClick={() => setSortKey(null)} className="text-xs text-blue-500 hover:underline">
                並び替え解除
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── リストビュー ── */}
      {viewMode === "list" && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-zinc-500 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/30">
                  <th className="py-3 px-4 font-semibold">銘柄コード</th>
                  <th className="py-3 px-4 font-semibold">会社名</th>
                  <SortTh col="price"         label="株価" />
                  <SortTh col="changePercent" label="騰落率" />
                  <SortTh col="marketCap"     label="時価総額" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center">
                      <Loader2 className="inline w-6 h-6 animate-spin text-zinc-400" />
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-sm text-zinc-400">
                      該当する銘柄が見つかりませんでした
                    </td>
                  </tr>
                ) : (
                  rows.map(r => {
                    const up = (r.changePercent ?? 0) >= 0;
                    return (
                      <tr
                        key={r.symbol}
                        className="border-b border-zinc-100 dark:border-zinc-800/60 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <Link
                            href={`/stock/${encodeURIComponent(r.symbol)}`}
                            className="inline-flex items-center gap-1.5 font-mono font-semibold text-sm text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {r.symbol}
                            <span className="text-xs">{r.market === "JP" ? "🇯🇵" : "🇺🇸"}</span>
                          </Link>
                          {r.sector && (
                            <div className="text-[10px] text-zinc-400 mt-0.5 truncate max-w-[120px]">
                              {getSectorInfo(r.sector).emoji} {getSectorInfo(r.sector).nameJa}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Link
                            href={`/stock/${encodeURIComponent(r.symbol)}`}
                            className="hover:text-blue-600 dark:hover:text-blue-400 block max-w-[220px]"
                          >
                            <span className="truncate block text-zinc-700 dark:text-zinc-200">{r.name}</span>
                            {r.market === "US" && r.nameEn && r.nameEn !== r.name && (
                              <span className="text-xs text-zinc-400 truncate block">{r.nameEn}</span>
                            )}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-zinc-700 dark:text-zinc-300">
                          {r.price !== null
                            ? `${formatNumber(r.price)} ${r.currency ?? ""}`
                            : <span className="text-zinc-400 text-xs">—</span>}
                        </td>
                        <td className={`py-3 px-4 text-right font-mono tabular-nums font-semibold ${
                          r.changePercent === null
                            ? "text-zinc-400"
                            : up
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                        }`}>
                          {r.changePercent !== null
                            ? `${up ? "▲" : "▼"} ${Math.abs(r.changePercent).toFixed(2)}%`
                            : "—"}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-zinc-500">
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
            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100 dark:border-zinc-800/60">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> 前へ
              </button>
              <span className="text-sm text-zinc-500">
                {page + 1} / {totalPages} ページ
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                次へ <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── セクター別ビュー ── */}
      {viewMode === "sector" && (
        <div className="space-y-3">
          {sectorLoading ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
              <span className="text-sm text-zinc-500">セクター情報を読み込み中…</span>
            </div>
          ) : sectorGroups.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center text-sm text-zinc-400">
              該当する銘柄が見つかりませんでした
            </div>
          ) : (
            sectorGroups.map(([key, sRows]) => (
              <SectorGroup key={key} sectorKey={key} rows={sRows} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
