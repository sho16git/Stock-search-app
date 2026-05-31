"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  RefreshCw, LayoutGrid, AlignJustify,
  TrendingUp, TrendingDown, Minus,
} from "lucide-react";
import { GICS_SECTORS, type GicsSectorId, getSector } from "@/lib/gics";
import type { SectorRank } from "@/app/api/sector-ranking/route";

/* ─── Market / View types ─── */
type Market   = "all" | "JP" | "US";
type ViewMode = "heat" | "list";

/* ─── Placeholder while loading ─── */
const PLACEHOLDER: SectorRank[] = GICS_SECTORS.map((s) => ({
  id:              s.id,
  changePercent:   null,
  jpChangePercent: null,
  usChangePercent: null,
  count: 0, jpCount: 0, usCount: 0,
  gainers: 0, losers: 0, jpGainers: 0, usGainers: 0,
  topGainer: null, topLoser: null,
}));

/* ─── Helpers ─── */
function getPct(r: SectorRank, m: Market): number | null {
  return m === "JP" ? r.jpChangePercent
       : m === "US" ? r.usChangePercent
       : r.changePercent;
}
function getCount(r: SectorRank, m: Market): number {
  return m === "JP" ? r.jpCount : m === "US" ? r.usCount : r.count;
}
function getGainers(r: SectorRank, m: Market): number {
  return m === "JP" ? r.jpGainers : m === "US" ? r.usGainers : r.gainers;
}

/* ─── Tile color based on % magnitude ─── */
type HeatStyle = { bg: string; text: string; sub: string; bar: string };
function heatStyle(pct: number | null): HeatStyle {
  if (pct === null)
    return { bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-400 dark:text-slate-500", sub: "text-slate-400 dark:text-slate-500", bar: "bg-slate-300 dark:bg-slate-600" };
  if (pct >=  3) return { bg: "bg-emerald-700", text: "text-white", sub: "text-emerald-200", bar: "bg-white/40" };
  if (pct >=  2) return { bg: "bg-emerald-600", text: "text-white", sub: "text-emerald-100", bar: "bg-white/40" };
  if (pct >=  1) return { bg: "bg-emerald-500", text: "text-white", sub: "text-emerald-100", bar: "bg-white/40" };
  if (pct >= 0.3){ return { bg: "bg-emerald-400", text: "text-white", sub: "text-emerald-50",  bar: "bg-white/40" }; }
  if (pct >   0) return { bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-800 dark:text-emerald-200", sub: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-400/50" };
  if (pct ===  0) return { bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-600 dark:text-slate-300", sub: "text-slate-400", bar: "bg-slate-400/40" };
  if (pct >= -0.3) return { bg: "bg-rose-100 dark:bg-rose-900/40", text: "text-rose-800 dark:text-rose-200", sub: "text-rose-600 dark:text-rose-400", bar: "bg-rose-400/50" };
  if (pct >= -1) return { bg: "bg-rose-400", text: "text-white", sub: "text-rose-50",  bar: "bg-white/40" };
  if (pct >= -2) return { bg: "bg-rose-500", text: "text-white", sub: "text-rose-100", bar: "bg-white/40" };
  if (pct >= -3) return { bg: "bg-rose-600", text: "text-white", sub: "text-rose-100", bar: "bg-white/40" };
  return           { bg: "bg-rose-700",    text: "text-white", sub: "text-rose-200", bar: "bg-white/40" };
}

/* ─── List badge color ─── */
function listColor(pct: number | null) {
  if (pct === null) return { text: "text-slate-400", bg: "bg-slate-100 dark:bg-slate-800" };
  if (pct >  1) return { text: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-100 dark:bg-emerald-900/40" };
  if (pct >  0) return { text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" };
  if (pct < -1) return { text: "text-rose-700 dark:text-rose-300",       bg: "bg-rose-100 dark:bg-rose-900/40" };
  if (pct <  0) return { text: "text-rose-600 dark:text-rose-400",       bg: "bg-rose-50 dark:bg-rose-900/20" };
  return               { text: "text-slate-600 dark:text-slate-400",     bg: "bg-slate-50 dark:bg-slate-800/40" };
}

/* ═══════════════════════════════════════════════════════════
   Main Component
═══════════════════════════════════════════════════════════ */
export default function SectorHeatmap() {
  const [ranks,   setRanks]   = useState<SectorRank[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [asOf,    setAsOf]    = useState<string | null>(null);
  const [market,  setMarket]  = useState<Market>("all");
  const [view,    setView]    = useState<ViewMode>("heat");

  const load = () => {
    setLoading(true);
    fetch("/api/sector-ranking")
      .then((r) => r.json())
      .then((j) => { setRanks(j.ranks ?? null); setAsOf(j.asOf ?? null); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 120_000);
    return () => clearInterval(id);
  }, []);

  /* ── Sort by selected market's % ── */
  const displayRanks = useMemo(() => {
    const base = ranks ?? PLACEHOLDER;
    return [...base].sort((a, b) => {
      const pa = getPct(a, market);
      const pb = getPct(b, market);
      if (pa === null && pb === null) return 0;
      if (pa === null) return 1;
      if (pb === null) return -1;
      return pb - pa;
    });
  }, [ranks, market]);

  const maxAbs = Math.max(
    0.5,
    ...displayRanks.map((r) => Math.abs(getPct(r, market) ?? 0)),
  );

  /* ── 全体の騰落サマリー ── */
  const summary = useMemo(() => {
    const base = ranks;
    if (!base) return null;
    const vals = base.map((r) => getPct(r, market)).filter((v): v is number => v !== null);
    if (!vals.length) return null;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const rising = vals.filter((v) => v > 0).length;
    return { avg, rising, total: vals.length };
  }, [ranks, market]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">

      {/* ════ Header ════ */}
      <div className="px-4 pt-3.5 pb-3 border-b border-slate-100 dark:border-slate-800/60 space-y-2.5">

        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-bold tracking-tight flex items-center gap-1.5">
              <span>🔥</span><span>セクター騰落率</span>
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">全銘柄の平均変動率・リアルタイム</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* View toggle */}
            <div className="flex gap-0.5 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <button
                onClick={() => setView("heat")}
                title="ヒートマップ"
                className={`p-1.5 rounded-md transition-all ${
                  view === "heat"
                    ? "bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white"
                    : "text-slate-400 hover:text-slate-700 dark:hover:text-white"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setView("list")}
                title="一覧"
                className={`p-1.5 rounded-md transition-all ${
                  view === "list"
                    ? "bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white"
                    : "text-slate-400 hover:text-slate-700 dark:hover:text-white"
                }`}
              >
                <AlignJustify className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Refresh */}
            <button
              onClick={load}
              disabled={loading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all disabled:opacity-40"
              title="更新"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Market + summary row */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Tabs */}
          <div className="flex gap-1">
            {(["all", "JP", "US"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMarket(m)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  market === m
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white"
                }`}
              >
                {m === "all" ? "全体" : m === "JP" ? "🇯🇵 日本株" : "🇺🇸 米国株"}
              </button>
            ))}
          </div>

          {/* Summary chip */}
          {summary && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                ▲ {summary.rising}
              </span>
              <span className="text-rose-600 dark:text-rose-400 font-semibold">
                ▼ {summary.total - summary.rising}
              </span>
              <span className={`font-mono font-bold ${summary.avg >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                {summary.avg >= 0 ? "+" : ""}{summary.avg.toFixed(2)}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ════ Heatmap view ════ */}
      {view === "heat" && (
        <div className="p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {displayRanks.map((rank, idx) => {
            const s = getSector(rank.id);
            if (!s) return null;
            const pct      = getPct(rank, market);
            const count    = getCount(rank, market);
            const gainers  = getGainers(rank, market);
            const losers   = count - gainers;
            const style    = heatStyle(pct);
            const gPct     = count > 0 ? (gainers / count) * 100 : 0;
            const isTop    = idx === 0 && pct !== null && pct > 0;
            const isBottom = idx === displayRanks.length - 1 && pct !== null && pct < 0;

            return (
              <Link
                key={rank.id}
                href={`/sector/${rank.id}`}
                className={`relative block rounded-xl p-3.5 ${style.bg} transition-all duration-300 hover:scale-[1.03] hover:shadow-lg hover:z-10 cursor-pointer`}
              >
                {/* Top / Bottom badge */}
                {(isTop || isBottom) && (
                  <div className={`absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    isTop ? "bg-emerald-900/30 text-emerald-100" : "bg-rose-900/30 text-rose-100"
                  }`}>
                    {isTop ? "TOP↑" : "LOW↓"}
                  </div>
                )}

                {/* Rank number */}
                <div className={`absolute top-2 left-3 text-[10px] font-bold tabular-nums ${style.sub}`}>
                  #{idx + 1}
                </div>

                {/* Emoji */}
                <div className="text-2xl mt-3 mb-1.5">{s.emoji}</div>

                {/* Sector name */}
                <div className={`text-xs font-semibold truncate mb-2 ${style.text}`}>
                  {s.nameJa}
                </div>

                {/* % change — large */}
                <div className={`font-mono font-bold text-xl leading-none tabular-nums ${style.text}`}>
                  {pct !== null
                    ? `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`
                    : loading ? "…" : "—"}
                </div>

                {/* Gainer / loser counts */}
                {count > 0 && (
                  <div className={`text-[10px] mt-2 font-medium flex items-center gap-1.5 ${style.sub}`}>
                    <span>▲{gainers}</span>
                    <span>▼{losers}</span>
                    <span className="opacity-60">/ {count}</span>
                  </div>
                )}

                {/* Proportion bar */}
                {count > 0 && (
                  <div className="mt-1.5 h-1 rounded-full overflow-hidden bg-black/10 dark:bg-white/10">
                    <div
                      className={`h-full ${style.bar} transition-all duration-500`}
                      style={{ width: `${gPct}%` }}
                    />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {/* ════ List view ════ */}
      {view === "list" && (
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {displayRanks.map((rank, idx) => {
            const s = getSector(rank.id);
            if (!s) return null;
            const pct      = getPct(rank, market);
            const count    = getCount(rank, market);
            const gainers  = getGainers(rank, market);
            const losers   = count - gainers;
            const { text, bg } = listColor(pct);
            const barWidth = pct !== null
              ? Math.min(100, (Math.abs(pct) / maxAbs) * 100)
              : 0;
            const isUp   = (pct ?? 0) >= 0;
            const gPct   = count > 0 ? (gainers / count) * 100 : 0;
            const Icon   = pct == null ? Minus : pct >= 0 ? TrendingUp : TrendingDown;

            return (
              <Link
                key={rank.id}
                href={`/sector/${rank.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group"
              >
                {/* Rank */}
                <div className="w-5 shrink-0 text-center">
                  <span className={`text-xs font-bold tabular-nums ${idx < 3 ? "text-amber-500" : "text-slate-400"}`}>
                    {idx + 1}
                  </span>
                </div>

                {/* Emoji + Name */}
                <div className="flex items-center gap-2 w-36 shrink-0">
                  <span className="text-xl">{s.emoji}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{s.nameJa}</div>
                    <div className="text-[10px] text-slate-400">
                      {count > 0 ? `${count}銘柄` : "—"}
                    </div>
                  </div>
                </div>

                {/* Bar + gainer strip */}
                <div className="flex-1 min-w-0 hidden sm:block space-y-1">
                  {/* Change bar (centered at 0) */}
                  <div className="relative h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    {pct !== null && (
                      <div
                        className={`absolute top-0 h-full rounded-full transition-all duration-500 ${
                          isUp ? "left-1/2 bg-emerald-400/80" : "right-1/2 bg-rose-400/80"
                        }`}
                        style={{ width: `${barWidth / 2}%` }}
                      />
                    )}
                    {/* Center line */}
                    <div className="absolute left-1/2 top-0 h-full w-px bg-slate-300 dark:bg-slate-600" />
                  </div>
                  {/* Gainer/loser proportion */}
                  {count > 0 && (
                    <div className="flex h-1 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                      <div
                        className="bg-emerald-400/60 transition-all duration-500"
                        style={{ width: `${gPct}%` }}
                      />
                      <div className="bg-rose-400/60 flex-1" />
                    </div>
                  )}
                </div>

                {/* % badge */}
                <div className="shrink-0">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-mono font-bold text-sm tabular-nums ${text} ${bg}`}>
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {pct !== null ? `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%` : "—"}
                  </span>
                </div>

                {/* Gainers / Losers count */}
                <div className="hidden md:flex flex-col items-end shrink-0 w-16 text-xs gap-0.5">
                  {count > 0 ? (
                    <>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">▲{gainers}</span>
                      <span className="text-rose-600   dark:text-rose-400   font-semibold">▼{losers}</span>
                    </>
                  ) : null}
                </div>

                {/* Top gainer / loser */}
                <div className="hidden lg:block shrink-0 w-40 text-right space-y-0.5">
                  {rank.topGainer && (
                    <div className="text-xs">
                      <span className="text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                        ▲+{rank.topGainer.pct.toFixed(1)}%
                      </span>
                      <span className="text-slate-400 ml-1 font-mono text-[10px]">
                        {rank.topGainer.symbol}
                      </span>
                    </div>
                  )}
                  {rank.topLoser && (
                    <div className="text-xs">
                      <span className="text-rose-600 dark:text-rose-400 font-mono font-semibold">
                        ▼{rank.topLoser.pct.toFixed(1)}%
                      </span>
                      <span className="text-slate-400 ml-1 font-mono text-[10px]">
                        {rank.topLoser.symbol}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* ════ Footer ════ */}
      {asOf && (
        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
          <span className="text-[10px] text-slate-400">
            {market === "all" ? "全銘柄平均" : market === "JP" ? "日本株のみ" : "米国株のみ"}
          </span>
          <span className="text-[10px] text-slate-400">
            {new Date(asOf).toLocaleString("ja-JP")} 時点
          </span>
        </div>
      )}
    </div>
  );
}
