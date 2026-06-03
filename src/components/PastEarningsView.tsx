"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Search, ChevronDown, ChevronUp, Loader2,
  TrendingUp, TrendingDown, RefreshCw,
} from "lucide-react";
import { GICS_SECTORS } from "@/lib/gics";
import { formatLargeNumber } from "@/lib/format";

// ── Types ──────────────────────────────────────────────────────────
type BrowseRow = {
  symbol:  string;
  name:    string;
  nameEn:  string | null;
  market:  "JP" | "US";
  sector:  string | null;
};

type EarningsEntry = {
  date:               string;
  period:             string | null;
  periodType:         string | null;
  epsActual:          number | null;
  epsEstimate:        number | null;    // アナリスト予想 (US) or 会社予想 (JP)
  epsSurprise:        number | null;
  epsSurprisePercent: number | null;
  revenue:            number | null;
  operatingProfit:    number | null;   // J-Quants のみ
  netIncome:          number | null;
  forecastRevenue:    number | null;   // 会社通期予想 (J-Quants のみ)
  forecastNetIncome:  number | null;
  forecastEps:        number | null;
  source:             "jquants" | "yahoo" | undefined;
};

type EarningsResp = {
  symbol:   string;
  currency: string | null;
  history:  EarningsEntry[];
  error?:   string;
};

// ── GICS sector helper ─────────────────────────────────────────────
const GICS_MAP = Object.fromEntries(
  GICS_SECTORS.map(s => [s.id, { nameJa: s.nameJa, emoji: s.emoji }])
);
function getSectorInfo(id: string | null) {
  if (!id) return { nameJa: "未分類", emoji: "📋" };
  return GICS_MAP[id] ?? { nameJa: id, emoji: "📊" };
}

// ── Period formatter ───────────────────────────────────────────────
// Yahoo Finance period strings: "-1Q", "3Q2024", "TTM" etc.
function fmtPeriod(period: string | null, date: string): string {
  if (period) {
    // e.g. "3Q2024" or "-3Q" (negative = past relative quarters)
    const m = period.match(/(-?\d+)[Qq](\d{4})/);
    if (m) return `${m[2]}年Q${Math.abs(Number(m[1]))}`;
    if (/ttm/i.test(period)) return "TTM";
  }
  // Fallback: derive from date
  const d = new Date(date + "T00:00:00");
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `${d.getFullYear()}年Q${q}`;
}

// ── StockEarningsRow ───────────────────────────────────────────────
function StockEarningsRow({ row }: { row: BrowseRow }) {
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [data,    setData]    = useState<EarningsResp | null>(null);
  const [failed,  setFailed]  = useState(false);

  const doFetch = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const res  = await fetch(`/api/earnings-history?symbol=${encodeURIComponent(row.symbol)}`);
      const json = await res.json() as EarningsResp;
      if (json.error) { setFailed(true); setData(null); }
      else              setData(json);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [row.symbol]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !data && !loading) doFetch();
  };

  const beat    = (p: number | null) => p !== null && p >= 0;
  const hasData = data && data.history.length > 0;
  const isJQ    = !!(data?.history[0]?.source === "jquants");

  return (
    <div className="border-b border-zinc-100 dark:border-zinc-800/60 last:border-0">
      {/* ── Stock header ── */}
      <div
        onClick={toggle}
        className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors cursor-pointer select-none"
      >
        {/* Symbol */}
        <div className="shrink-0 w-[130px]">
          <Link
            href={`/stock/${encodeURIComponent(row.symbol)}`}
            onClick={e => e.stopPropagation()}
            className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {row.symbol}
          </Link>
          <span className="ml-1 text-xs">{row.market === "JP" ? "🇯🇵" : "🇺🇸"}</span>
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate block">{row.name}</span>
          {row.market === "US" && row.nameEn && row.nameEn !== row.name && (
            <span className="text-xs text-zinc-400 truncate block">{row.nameEn}</span>
          )}
        </div>

        {/* Controls */}
        <div className="shrink-0 flex items-center gap-1.5">
          {/* Re-fetch button (shown when already loaded) */}
          {data && !loading && (
            <button
              onClick={e => { e.stopPropagation(); doFetch(); }}
              className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              title="再取得"
            >
              <RefreshCw className="w-3 h-3 text-zinc-400" />
            </button>
          )}
          {loading
            ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
            : open
              ? <ChevronUp   className="w-3.5 h-3.5 text-zinc-400" />
              : <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />}
        </div>
      </div>

      {/* ── Earnings history table ── */}
      {open && (
        <div className="bg-zinc-50/60 dark:bg-zinc-800/20 border-t border-zinc-100 dark:border-zinc-800/50 px-4 pb-4 pt-2">
          {loading ? (
            <div className="flex justify-center py-5">
              <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
            </div>
          ) : failed ? (
            <p className="py-4 text-xs text-zinc-400 text-center">
              データを取得できませんでした。
              <button onClick={doFetch} className="ml-1 text-blue-500 hover:underline">再試行</button>
            </p>
          ) : !hasData ? (
            <p className="py-4 text-xs text-zinc-400 text-center">
              決算履歴データがありません（Yahoo Finance非掲載）
            </p>
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-xs min-w-[580px]">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-700">
                    <th className="py-2 px-2 text-left font-semibold text-zinc-400 uppercase tracking-wide">決算期</th>
                    <th className="py-2 px-2 text-right font-semibold text-zinc-400 uppercase tracking-wide">発表月</th>
                    <th className="py-2 px-2 text-right font-semibold text-zinc-400 uppercase tracking-wide">
                      {isJQ ? "会社予想EPS" : "アナリスト予想"}
                    </th>
                    <th className="py-2 px-2 text-right font-semibold text-zinc-400 uppercase tracking-wide">実績EPS</th>
                    <th className="py-2 px-2 text-right font-semibold text-zinc-400 uppercase tracking-wide">乖離率</th>
                    <th className="py-2 px-2 text-right font-semibold text-zinc-400 uppercase tracking-wide">売上高</th>
                    {isJQ && (
                      <th className="py-2 px-2 text-right font-semibold text-zinc-400 uppercase tracking-wide">営業利益</th>
                    )}
                    <th className="py-2 px-2 text-right font-semibold text-zinc-400 uppercase tracking-wide">純利益</th>
                  </tr>
                </thead>
                <tbody>
                  {data.history.map((e, i) => {
                    const beatEPS = beat(e.epsSurprisePercent);
                    return (
                      <tr
                        key={i}
                        className="border-b border-zinc-100 dark:border-zinc-800/40 last:border-0 hover:bg-zinc-100/60 dark:hover:bg-zinc-700/20 transition-colors"
                      >
                        {/* 決算期 */}
                        <td className="py-2 px-2 font-semibold text-zinc-700 dark:text-zinc-200 whitespace-nowrap">
                          {fmtPeriod(e.period, e.date)}
                        </td>

                        {/* 発表月 */}
                        <td className="py-2 px-2 text-right font-mono text-zinc-400 whitespace-nowrap">
                          {e.date.slice(0, 7)}
                        </td>

                        {/* 予想EPS */}
                        <td className="py-2 px-2 text-right font-mono text-zinc-500 whitespace-nowrap">
                          {e.epsEstimate !== null
                            ? (e.epsEstimate >= 0 ? "+" : "") + e.epsEstimate.toFixed(2)
                            : <span className="text-zinc-300 dark:text-zinc-600">—</span>}
                        </td>

                        {/* 実績EPS */}
                        <td className={`py-2 px-2 text-right font-mono font-semibold whitespace-nowrap ${
                          e.epsActual === null
                            ? "text-zinc-300 dark:text-zinc-600"
                            : e.epsActual >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                        }`}>
                          {e.epsActual !== null
                            ? (e.epsActual >= 0 ? "+" : "") + e.epsActual.toFixed(2)
                            : "—"}
                        </td>

                        {/* 乖離率 */}
                        <td className="py-2 px-2 text-right whitespace-nowrap">
                          {e.epsSurprisePercent !== null ? (
                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-mono font-bold ${
                              beatEPS
                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                                : "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400"
                            }`}>
                              {beatEPS
                                ? <TrendingUp  className="w-2.5 h-2.5 shrink-0" />
                                : <TrendingDown className="w-2.5 h-2.5 shrink-0" />}
                              {Math.abs(e.epsSurprisePercent).toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-zinc-300 dark:text-zinc-600">—</span>
                          )}
                        </td>

                        {/* 売上高 */}
                        <td className="py-2 px-2 text-right font-mono text-zinc-500 whitespace-nowrap">
                          {e.revenue !== null
                            ? formatLargeNumber(e.revenue)
                            : <span className="text-zinc-300 dark:text-zinc-600">—</span>}
                        </td>

                        {/* 営業利益 (J-Quants only) */}
                        {isJQ && (
                          <td className={`py-2 px-2 text-right font-mono whitespace-nowrap ${
                            e.operatingProfit === null
                              ? "text-zinc-300 dark:text-zinc-600"
                              : e.operatingProfit >= 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400"
                          }`}>
                            {e.operatingProfit !== null
                              ? formatLargeNumber(e.operatingProfit)
                              : "—"}
                          </td>
                        )}

                        {/* 純利益 */}
                        <td className={`py-2 px-2 text-right font-mono whitespace-nowrap ${
                          e.netIncome === null
                            ? "text-zinc-300 dark:text-zinc-600"
                            : e.netIncome >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                        }`}>
                          {e.netIncome !== null
                            ? formatLargeNumber(e.netIncome)
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Currency / Detail link */}
              <div className="flex items-center justify-between mt-2 pt-1">
                <span className="text-[10px] text-zinc-400">
                  通貨: {data.currency ?? "—"} ／ 出典:{" "}
                  {isJQ
                    ? <span className="text-blue-500 font-semibold">J-Quants</span>
                    : "Yahoo Finance"}
                </span>
                <Link
                  href={`/stock/${encodeURIComponent(row.symbol)}`}
                  className="text-xs font-semibold text-blue-500 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  詳細ページ →
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── SectorPanel ────────────────────────────────────────────────────
function SectorPanel({ sectorId, stocks }: { sectorId: string; stocks: BrowseRow[] }) {
  const [open, setOpen] = useState(false);
  const info = getSectorInfo(sectorId === "__other__" ? null : sectorId);

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
      >
        <span className="text-2xl leading-none shrink-0">{info.emoji}</span>
        <div className="flex-1 min-w-0">
          <span className="font-bold text-sm text-zinc-800 dark:text-zinc-100">{info.nameJa}</span>
          <span className="ml-2 text-xs text-zinc-400">{stocks.length}銘柄</span>
        </div>
        {open
          ? <ChevronUp   className="w-4 h-4 text-zinc-400 shrink-0" />
          : <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-zinc-100 dark:border-zinc-800">
          {stocks.map(s => <StockEarningsRow key={s.symbol} row={s} />)}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────
export default function PastEarningsView() {
  const [market,      setMarket]      = useState<"" | "JP" | "US">("");
  const [inputVal,    setInputVal]    = useState("");
  const [query,       setQuery]       = useState("");
  const [stockList,   setStockList]   = useState<BrowseRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadStocks = useCallback(async (mkt: string, q: string) => {
    setListLoading(true);
    const params = new URLSearchParams({ page: "0", pageSize: "3000", noPrices: "true" });
    if (mkt) params.set("market", mkt);
    if (q)   params.set("q", q);
    try {
      const res = await fetch(`/api/browse?${params}`).then(r => r.json());
      setStockList(res.results ?? []);
    } catch {
      setStockList([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => { loadStocks(market, query); }, [market, query, loadStocks]);

  const handleInput = (val: string) => {
    setInputVal(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setQuery(val.trim()), 400);
  };

  // ── Group by GICS sector ──
  const sectorGroups = (() => {
    const map = new Map<string, BrowseRow[]>();
    for (const s of stockList) {
      const key = s.sector ?? "__other__";
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    return [...map.entries()].sort(([a], [b]) => {
      if (a === "__other__") return 1;
      if (b === "__other__") return -1;
      return getSectorInfo(a).nameJa.localeCompare(getSectorInfo(b).nameJa, "ja");
    });
  })();

  const isSearchMode = query.length > 0;

  return (
    <div className="space-y-4">

      {/* ── Filter bar ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-3 shadow-sm space-y-2.5">
        <div className="flex flex-col sm:flex-row gap-2.5">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              value={inputVal}
              onChange={e => handleInput(e.target.value)}
              placeholder="銘柄名・コードで検索 (例: ソニー, 6758, Apple, AAPL)"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400"
            />
          </div>
          {/* Market toggle */}
          <div className="flex p-0.5 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl gap-0.5 shrink-0">
            {(["", "JP", "US"] as const).map(m => (
              <button
                key={m}
                onClick={() => setMarket(m)}
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

        {/* Summary line */}
        <p className="text-xs text-zinc-400">
          {listLoading ? "読み込み中…" : isSearchMode
            ? `「${query}」の検索結果: ${stockList.length}銘柄 — 銘柄行をタップで決算履歴を表示`
            : `${stockList.length}銘柄 · ${sectorGroups.length}セクター — セクターを展開して銘柄を選択`}
        </p>
      </div>

      {/* ── Content ── */}
      {listLoading ? (
        <div className="flex items-center justify-center py-16 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
          <span className="text-sm text-zinc-500">銘柄リストを読み込み中…</span>
        </div>

      ) : isSearchMode ? (
        /* Search results — flat list */
        stockList.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-10 text-center text-sm text-zinc-400">
            該当する銘柄が見つかりませんでした
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
            <div className="px-4 py-2 bg-zinc-50/60 dark:bg-zinc-800/30 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-xs font-semibold text-zinc-500">
                検索結果 — {stockList.length}件
              </span>
            </div>
            {stockList.map(s => <StockEarningsRow key={s.symbol} row={s} />)}
          </div>
        )

      ) : (
        /* Sector browse mode */
        <div className="space-y-3">
          {sectorGroups.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-10 text-center text-sm text-zinc-400">
              銘柄が見つかりませんでした
            </div>
          ) : (
            sectorGroups.map(([id, stocks]) => (
              <SectorPanel key={id} sectorId={id} stocks={stocks} />
            ))
          )}
        </div>
      )}

      {/* Footer note */}
      <p className="text-xs text-zinc-400 text-center leading-relaxed pb-2">
        ※ 日本株はJ-Quants（JPX公式）、米国株はYahoo Finance APIより自動取得。<br />
        日本株の「会社予想EPS」は通期予想。乖離率 = (実績EPS − 予想EPS) ÷ |予想EPS| × 100
      </p>
    </div>
  );
}
