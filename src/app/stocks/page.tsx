"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft, ChevronRight, Loader2, Library, Search,
  ChevronUp, ChevronDown, ChevronsUpDown, Layers, List, RefreshCw,
} from "lucide-react";
import { formatNumber, formatLargeNumber } from "@/lib/format";
import { GICS_SECTORS } from "@/lib/gics";

// ── GICS ID → 表示情報マップ ───────────────────────────────────────
const GICS_ID_MAP: Record<string, { nameJa: string; emoji: string }> =
  Object.fromEntries(GICS_SECTORS.map(s => [s.id, { nameJa: s.nameJa, emoji: s.emoji }]));

// ── セグメントバッジ ───────────────────────────────────────────────
const SEGMENT_STYLE: Record<string, string> = {
  "プライム":    "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400",
  "スタンダード": "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400",
  "グロース":    "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400",
};
function SegmentBadge({ segment }: { segment: string | null }) {
  if (!segment || !SEGMENT_STYLE[segment]) return null;
  return (
    <span className={`inline-block text-[9px] font-bold px-1 py-0.5 rounded leading-none ${SEGMENT_STYLE[segment]}`}>
      {segment}
    </span>
  );
}

// ── Types ──────────────────────────────────────────────────────────
type Segment = "" | "プライム" | "スタンダード" | "グロース";

type Row = {
  symbol:        string;
  name:          string;
  nameEn:        string | null;
  market:        "JP" | "US";
  sector:        string | null;
  segment:       string | null;
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

function getSectorInfo(raw: string | null): { nameJa: string; emoji: string; key: string } {
  if (!raw) return { nameJa: "未分類", emoji: "📋", key: "__other__" };
  const info = GICS_ID_MAP[raw];
  if (info) return { ...info, key: raw };
  // 不明なセクター（GICSマップ外）はそのまま表示
  return { nameJa: raw, emoji: "📊", key: raw };
}

// ── 並び替えアイコン ───────────────────────────────────────────────
function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey | null; sortDir: SortDir }) {
  if (sortKey !== col) return <ChevronsUpDown className="w-3 h-3 opacity-30" />;
  return sortDir === "desc"
    ? <ChevronDown className="w-3 h-3 text-blue-500" />
    : <ChevronUp className="w-3 h-3 text-blue-500" />;
}

// ── 株価データ型 ───────────────────────────────────────────────────
type QuoteData = {
  price:         number | null;
  changePercent: number | null;
  marketCap:     number | null;
  currency:      string | null;
  high52w:       number | null;
  low52w:        number | null;
};

// ── セクターパネル ─────────────────────────────────────────────────
function SectorGroup({
  sectorKey, rows,
}: {
  sectorKey: string;
  rows: Row[];
}) {
  const [open,          setOpen]          = useState(false);
  const [priceMap,      setPriceMap]      = useState<Record<string, QuoteData>>({});
  const [priceLoading,  setPriceLoading]  = useState(false);
  const [priceFetched,  setPriceFetched]  = useState(false);
  const [sectorSortKey, setSectorSortKey] = useState<"changePercent" | "price" | "marketCap">("changePercent");
  const [sectorSortAsc, setSectorSortAsc] = useState(false);

  const info = getSectorInfo(sectorKey === "__other__" ? null : sectorKey);

  // セクター展開時に株価を一括取得
  const fetchPrices = useCallback(async () => {
    if (priceFetched || rows.length === 0) return;
    setPriceLoading(true);
    try {
      // 200件ずつ分割してリクエスト
      const chunks: string[][] = [];
      for (let i = 0; i < rows.length; i += 200) {
        chunks.push(rows.slice(i, i + 200).map(r => r.symbol));
      }
      const maps = await Promise.all(
        chunks.map(syms =>
          fetch(`/api/quotes?symbols=${syms.join(",")}`)
            .then(r => r.json())
            .then(d => (d.quotes ?? {}) as Record<string, QuoteData>)
            .catch(() => ({} as Record<string, QuoteData>))
        )
      );
      const merged: Record<string, QuoteData> = {};
      for (const m of maps) Object.assign(merged, m);
      setPriceMap(merged);
      setPriceFetched(true);
    } finally {
      setPriceLoading(false);
    }
  }, [rows, priceFetched]);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !priceFetched) fetchPrices();
  };

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPriceFetched(false);
    setPriceMap({});
    fetchPrices().then(() => setPriceFetched(true));
  };

  // 指定キーでソート (デフォルト: changePercent 降順)
  const sortedRows = priceFetched
    ? [...rows].sort((a, b) => {
        const pa = priceMap[a.symbol]?.[sectorSortKey] ?? null;
        const pb = priceMap[b.symbol]?.[sectorSortKey] ?? null;
        if (pa === null && pb === null) return 0;
        if (pa === null) return 1;
        if (pb === null) return -1;
        return sectorSortAsc ? pa - pb : pb - pa;
      })
    : rows;

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
      {/* Sector header */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
      >
        <span className="text-2xl leading-none shrink-0">{info.emoji}</span>
        <div className="flex-1 min-w-0">
          <span className="font-bold text-sm text-zinc-800 dark:text-zinc-100">{info.nameJa}</span>
          <span className="ml-2 text-xs text-zinc-400">{rows.length}銘柄</span>
        </div>
        {/* 株価ロード中スピナー */}
        {priceLoading && <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin shrink-0" />}
        {open
          ? <ChevronUp className="w-4 h-4 text-zinc-400 shrink-0" />
          : <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />}
      </button>

      {/* Stock list */}
      {open && (
        <div className="border-t border-zinc-100 dark:border-zinc-800">

          {/* ── スケルトン ── */}
          {priceLoading && (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 animate-pulse">
              {rows.slice(0, 4).map(r => (
                <div key={r.symbol} className="flex items-center gap-3 px-4 py-3">
                  <div className="h-3 w-20 rounded bg-zinc-200 dark:bg-zinc-700" />
                  <div className="flex-1 h-3 rounded bg-zinc-100 dark:bg-zinc-800" />
                  <div className="h-3 w-16 rounded bg-zinc-200 dark:bg-zinc-700" />
                  <div className="h-5 w-14 rounded-md bg-zinc-100 dark:bg-zinc-800" />
                </div>
              ))}
            </div>
          )}

          {!priceLoading && (<>
            {/* ── モバイル: カードリスト (< md) ── */}
            <div className="md:hidden">
              {/* ソートコントロール (価格取得後に表示) */}
              {priceFetched && (
                <div className="flex items-center gap-1.5 px-3 py-2 bg-zinc-50/70 dark:bg-zinc-800/40 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-[10px] text-zinc-400 shrink-0 font-medium mr-0.5">並び替え</span>
                  {(["changePercent", "price", "marketCap"] as const).map(col => {
                    const labels = { changePercent: "騰落率", price: "株価", marketCap: "時価総額" } as const;
                    const active = sectorSortKey === col;
                    return (
                      <button
                        key={col}
                        onClick={() => {
                          if (sectorSortKey === col) setSectorSortAsc(a => !a);
                          else { setSectorSortKey(col); setSectorSortAsc(false); }
                        }}
                        className={`shrink-0 inline-flex items-center gap-0.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                          active
                            ? "bg-blue-500 text-white shadow-sm"
                            : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700"
                        }`}
                      >
                        {labels[col]}
                        {active && (!sectorSortAsc
                          ? <ChevronDown className="w-3 h-3" />
                          : <ChevronUp   className="w-3 h-3" />)}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {sortedRows.map(r => {
                  const q   = priceMap[r.symbol];
                  const up  = (q?.changePercent ?? 0) >= 0;
                  return (
                    <Link
                      key={r.symbol}
                      href={`/stock/${encodeURIComponent(r.symbol)}`}
                      className="row-hover flex items-start gap-2 px-4 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 active:bg-zinc-100 dark:active:bg-zinc-800/50"
                    >
                      {/* 左: 銘柄コード + 社名 */}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">{r.symbol}</span>
                          <span className="text-xs">{r.market === "JP" ? "🇯🇵" : "🇺🇸"}</span>
                        </div>
                        <div className="text-sm text-zinc-700 dark:text-zinc-300 truncate leading-tight">{r.name}</div>
                        {r.market === "US" && r.nameEn && r.nameEn !== r.name && (
                          <div className="text-xs text-zinc-400 truncate">{r.nameEn}</div>
                        )}
                      </div>

                      {/* 右: 株価・騰落率・時価総額 (縦積み) */}
                      <div className="shrink-0 text-right w-[108px]">
                        <div className="font-mono font-semibold text-sm text-zinc-800 dark:text-zinc-100 tabular-nums">
                          {q?.price != null
                            ? <>{formatNumber(q.price)}<span className="text-[10px] text-zinc-400 ml-0.5">{q.currency ?? ""}</span></>
                            : <span className="text-zinc-300 dark:text-zinc-600">—</span>}
                        </div>
                        <div className="mt-0.5">
                          {q?.changePercent != null ? (
                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-bold ${
                              up
                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                                : "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400"
                            }`}>
                              {up ? "▲" : "▼"}{Math.abs(q.changePercent).toFixed(2)}%
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-300 dark:text-zinc-600">—</span>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-400 tabular-nums mt-0.5">
                          {q?.marketCap != null ? formatLargeNumber(q.marketCap) : ""}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* ── デスクトップ: テーブル (md 以上) ── */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm table-fixed">
                <colgroup>
                  <col className="w-[120px]" />
                  <col />
                  <col className="w-[104px]" />
                  <col className="w-[84px]" />
                  <col className="w-[96px]" />
                  <col className="w-[84px]" />
                  <col className="w-[84px]" />
                  <col className="w-[44px]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/30">
                    <th className="py-2 px-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide">銘柄</th>
                    <th className="py-2 px-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide">会社名</th>
                    <th className="py-2 px-3 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wide w-[96px]">
                      <span className="inline-flex items-center justify-end gap-1">
                        株価
                        {priceFetched && (
                          <button onClick={handleRefresh} className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors" title="再取得">
                            <RefreshCw className="w-3 h-3 text-zinc-400" />
                          </button>
                        )}
                      </span>
                    </th>
                    <th className="py-2 px-3 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wide w-[80px]">騰落率</th>
                    <th className="py-2 px-3 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wide w-[88px]">時価総額</th>
                    <th className="py-2 px-3 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wide w-[80px] hidden lg:table-cell">52W高値</th>
                    <th className="py-2 px-3 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wide w-[80px] hidden lg:table-cell">52W安値</th>
                    <th className="py-2 px-3 w-[44px]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {sortedRows.map(r => {
                    const q  = priceMap[r.symbol];
                    const up = (q?.changePercent ?? 0) >= 0;
                    return (
                      <tr key={r.symbol} className="row-hover hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                        <td className="py-2.5 px-3">
                          <Link href={`/stock/${encodeURIComponent(r.symbol)}`} className="inline-flex items-center gap-1 font-mono font-bold text-sm text-blue-600 dark:text-blue-400 hover:underline">
                            {r.symbol}<span className="text-xs">{r.market === "JP" ? "🇯🇵" : "🇺🇸"}</span>
                          </Link>
                        </td>
                        <td className="py-2.5 px-3 max-w-[220px]">
                          <Link href={`/stock/${encodeURIComponent(r.symbol)}`} className="hover:text-blue-600 dark:hover:text-blue-400">
                            <span className="block truncate text-sm text-zinc-700 dark:text-zinc-200">{r.name}</span>
                            {r.market === "US" && r.nameEn && r.nameEn !== r.name && (
                              <span className="block truncate text-xs text-zinc-400">{r.nameEn}</span>
                            )}
                          </Link>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                          {q?.price != null ? (
                            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                              {formatNumber(q.price)}<span className="text-xs text-zinc-400 ml-0.5">{q.currency ?? ""}</span>
                            </span>
                          ) : <span className="text-xs text-zinc-300 dark:text-zinc-600">—</span>}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {q?.changePercent != null ? (
                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-bold ${up ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400" : "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400"}`}>
                              {up ? "▲" : "▼"}{Math.abs(q.changePercent).toFixed(2)}%
                            </span>
                          ) : <span className="text-xs text-zinc-300 dark:text-zinc-600">—</span>}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-xs text-zinc-500 tabular-nums">
                          {q?.marketCap != null ? formatLargeNumber(q.marketCap) : <span className="text-zinc-300 dark:text-zinc-600">—</span>}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-xs text-zinc-500 tabular-nums hidden lg:table-cell">
                          {q?.high52w != null ? formatNumber(q.high52w) : <span className="text-zinc-300 dark:text-zinc-600">—</span>}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-xs text-zinc-500 tabular-nums hidden lg:table-cell">
                          {q?.low52w != null ? formatNumber(q.low52w) : <span className="text-zinc-300 dark:text-zinc-600">—</span>}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Link href={`/stock/${encodeURIComponent(r.symbol)}`} className="text-xs text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 font-medium">詳細→</Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>)}
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
  const [segment,   setSegment]   = useState<Segment>("");
  const [query,     setQuery]     = useState("");
  const [inputVal,  setInputVal]  = useState("");
  const [sortKey,   setSortKey]   = useState<SortKey | null>(null);
  const [sortDir,   setSortDir]   = useState<SortDir>("desc");
  const [viewMode,  setViewMode]  = useState<ViewMode>("list");

  // セクター別ビュー用
  const [sectorRows,    setSectorRows]    = useState<Row[]>([]);
  const [sectorLoading, setSectorLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── 絞り込み/並び替え/ページ/スクロールを保持し、進む・戻るで復元 ──
  type SavedBrowse = {
    page?: number; market?: "" | "JP" | "US"; segment?: Segment;
    query?: string; sortKey?: SortKey | null; sortDir?: SortDir;
    viewMode?: ViewMode; scrollY?: number;
  };
  const savedRef = useRef<SavedBrowse | null | undefined>(undefined);
  if (savedRef.current === undefined) {
    try {
      savedRef.current = typeof window !== "undefined"
        ? (JSON.parse(sessionStorage.getItem("browse:v1") || "null") as SavedBrowse | null)
        : null;
    } catch { savedRef.current = null; }
  }
  const restoredRef = useRef(false);
  useEffect(() => {
    const s = savedRef.current;
    if (s) {
      if (typeof s.page === "number") setPage(s.page);
      if (s.market !== undefined) setMarket(s.market);
      if (s.segment !== undefined) setSegment(s.segment);
      if (s.query !== undefined) { setQuery(s.query); setInputVal(s.query); }
      if (s.sortKey !== undefined) setSortKey(s.sortKey);
      if (s.sortDir) setSortDir(s.sortDir);
      if (s.viewMode) setViewMode(s.viewMode);
      if (typeof s.scrollY === "number") {
        const y = s.scrollY;
        requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, y)));
      }
    }
    restoredRef.current = true;
  }, []);
  useEffect(() => {
    if (!restoredRef.current) return;
    const save = () => {
      try {
        sessionStorage.setItem("browse:v1", JSON.stringify({
          page, market, segment, query, sortKey, sortDir, viewMode, scrollY: window.scrollY,
        }));
      } catch { /* ignore */ }
    };
    save();
    let raf = 0;
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(save); };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, [page, market, segment, query, sortKey, sortDir, viewMode]);

  // リスト用データ取得
  const fetchData = useCallback(async (p: number, mkt: string, seg: string, q: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), pageSize: String(PAGE_SIZE) });
    if (mkt) params.set("market", mkt);
    if (seg) params.set("segment", seg);
    if (q)   params.set("q", q);
    try {
      const res = await fetch(`/api/browse?${params}`).then(r => r.json());
      setData(res);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  // セクター別用データ取得（価格なし、全件）
  const fetchSectorData = useCallback(async (mkt: string, seg: string, q: string) => {
    setSectorLoading(true);
    const params = new URLSearchParams({ page: "0", pageSize: "5000", noPrices: "true" });
    if (mkt) params.set("market", mkt);
    if (seg) params.set("segment", seg);
    if (q)   params.set("q", q);
    try {
      const res: BrowseResp = await fetch(`/api/browse?${params}`).then(r => r.json());
      setSectorRows(res.results);
    } catch { /* ignore */ }
    finally { setSectorLoading(false); }
  }, []);

  useEffect(() => {
    if (viewMode === "list") fetchData(page, market, segment, query);
  }, [page, market, segment, query, fetchData, viewMode]);

  useEffect(() => {
    if (viewMode === "sector") fetchSectorData(market, segment, query);
  }, [viewMode, market, segment, query, fetchSectorData]);

  const handleInput = (val: string) => {
    setInputVal(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setQuery(val.trim()); setPage(0); }, 400);
  };

  const handleMarket = (v: "" | "JP" | "US") => {
    setMarket(v);
    setPage(0);
    if (v !== "JP") setSegment("");  // 米国・全市場はセグメント不問
  };

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
      className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 text-right cursor-pointer select-none hover:text-zinc-900 dark:hover:text-white transition-colors"
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

        {/* Segment filter — JP only */}
        {market === "JP" && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider shrink-0">市場区分</span>
            <div className="flex p-0.5 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl gap-0.5 flex-wrap">
              {(["", "プライム", "スタンダード", "グロース"] as const).map(seg => (
                <button
                  key={seg}
                  onClick={() => { setSegment(seg); setPage(0); }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    segment === seg
                      ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white"
                      : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                >
                  {seg === "" ? "全区分" : seg}
                </button>
              ))}
            </div>
          </div>
        )}

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

          {/* ── モバイルカード (< md) ── */}
          <div className="md:hidden">
            {/* ソートコントロール */}
            {!loading && rows.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-2 bg-zinc-50/70 dark:bg-zinc-800/40 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-[10px] text-zinc-400 shrink-0 font-medium mr-0.5">並び替え</span>
                {(["price", "changePercent", "marketCap"] as const).map(col => {
                  const labels = { price: "株価", changePercent: "騰落率", marketCap: "時価総額" } as const;
                  const active = sortKey === col;
                  return (
                    <button
                      key={col}
                      onClick={() => handleSort(col)}
                      className={`shrink-0 inline-flex items-center gap-0.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                        active
                          ? "bg-blue-500 text-white shadow-sm"
                          : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700"
                      }`}
                    >
                      {labels[col]}
                      {active && (sortDir === "desc"
                        ? <ChevronDown className="w-3 h-3" />
                        : <ChevronUp   className="w-3 h-3" />)}
                    </button>
                  );
                })}
                {sortKey && (
                  <button
                    onClick={() => setSortKey(null)}
                    className="shrink-0 text-[10px] text-blue-500 hover:underline ml-auto"
                  >
                    解除
                  </button>
                )}
              </div>
            )}

            {/* カードリスト */}
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {loading ? (
                <div className="py-16 flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
                </div>
              ) : rows.length === 0 ? (
                <div className="py-16 text-center text-sm text-zinc-400">該当する銘柄が見つかりませんでした</div>
              ) : (
                rows.map(r => {
                  const up = (r.changePercent ?? 0) >= 0;
                  const sector = r.sector ? getSectorInfo(r.sector) : null;
                  return (
                    <Link
                      key={r.symbol}
                      href={`/stock/${encodeURIComponent(r.symbol)}`}
                      className="row-hover flex items-start gap-2 px-4 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 active:bg-zinc-100 dark:active:bg-zinc-800/50"
                    >
                      {/* 左: 銘柄コード + 社名 + セクター */}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">{r.symbol}</span>
                          <span className="text-xs">{r.market === "JP" ? "🇯🇵" : "🇺🇸"}</span>
                          <SegmentBadge segment={r.segment} />
                        </div>
                        <div className="text-sm text-zinc-700 dark:text-zinc-300 truncate leading-tight">{r.name}</div>
                        {r.market === "US" && r.nameEn && r.nameEn !== r.name
                          ? <div className="text-xs text-zinc-400 truncate">{r.nameEn}</div>
                          : sector && <div className="text-[10px] text-zinc-400 truncate">{sector.emoji} {sector.nameJa}</div>
                        }
                      </div>
                      {/* 右: 株価・騰落率・時価総額 (縦積み) */}
                      <div className="shrink-0 text-right w-[108px]">
                        <div className="font-mono font-semibold text-sm text-zinc-800 dark:text-zinc-100 tabular-nums">
                          {r.price !== null
                            ? <>{formatNumber(r.price)}<span className="text-[10px] text-zinc-400 ml-0.5">{r.currency ?? ""}</span></>
                            : <span className="text-zinc-300 dark:text-zinc-600">—</span>}
                        </div>
                        <div className="mt-0.5">
                          {r.changePercent !== null ? (
                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-bold ${
                              up
                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                                : "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400"
                            }`}>
                              {up ? "▲" : "▼"}{Math.abs(r.changePercent).toFixed(2)}%
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-300 dark:text-zinc-600">—</span>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-400 tabular-nums mt-0.5">
                          {r.marketCap !== null ? formatLargeNumber(r.marketCap) : ""}
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          {/* ── デスクトップテーブル (md 以上) ── */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm table-fixed">
              <colgroup>
                <col className="w-[140px]" />
                <col />
                <col className="w-[110px]" />
                <col className="w-[92px]" />
                <col className="w-[104px]" />
              </colgroup>
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-zinc-500 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/30">
                  <th className="py-3 px-3 font-semibold">銘柄コード</th>
                  <th className="py-3 px-3 font-semibold">会社名</th>
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
                        <td className="py-2.5 px-3">
                          <Link
                            href={`/stock/${encodeURIComponent(r.symbol)}`}
                            className="inline-flex items-center gap-1.5 font-mono font-semibold text-sm text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {r.symbol}
                            <span className="text-xs">{r.market === "JP" ? "🇯🇵" : "🇺🇸"}</span>
                          </Link>
                          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                            <SegmentBadge segment={r.segment} />
                            {r.sector && (
                              <span className="text-[10px] text-zinc-400 truncate max-w-[110px]">
                                {getSectorInfo(r.sector).emoji} {getSectorInfo(r.sector).nameJa}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <Link
                            href={`/stock/${encodeURIComponent(r.symbol)}`}
                            className="hover:text-blue-600 dark:hover:text-blue-400 block max-w-[240px]"
                          >
                            <span className="truncate block text-zinc-700 dark:text-zinc-200">{r.name}</span>
                            {r.market === "US" && r.nameEn && r.nameEn !== r.name && (
                              <span className="text-xs text-zinc-400 truncate block">{r.nameEn}</span>
                            )}
                          </Link>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-zinc-700 dark:text-zinc-300 text-sm">
                          {r.price !== null
                            ? <>{formatNumber(r.price)}<span className="text-xs text-zinc-400 ml-0.5">{r.currency ?? ""}</span></>
                            : <span className="text-zinc-400 text-xs">—</span>}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {r.changePercent !== null ? (
                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-bold ${
                              up
                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                                : "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400"
                            }`}>
                              {up ? "▲" : "▼"}{Math.abs(r.changePercent).toFixed(2)}%
                            </span>
                          ) : (
                            <span className="text-zinc-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-xs text-zinc-500">
                          {r.marketCap !== null ? formatLargeNumber(r.marketCap) : <span className="text-zinc-300 dark:text-zinc-600">—</span>}
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
