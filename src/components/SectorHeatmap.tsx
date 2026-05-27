"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { GICS_SECTORS, type GicsSectorId, getSector } from "@/lib/gics";

type SectorRank = {
  id: GicsSectorId;
  changePercent: number | null;
  count: number;
  gainers: number;
  losers: number;
  topGainer: { symbol: string; name: string; pct: number } | null;
  topLoser: { symbol: string; name: string; pct: number } | null;
};

function bgFromPct(pct: number | null): string {
  if (pct === null || Number.isNaN(pct)) {
    return "bg-slate-100 dark:bg-slate-800/60";
  }
  const intensity = Math.min(Math.abs(pct) / 3, 1); // 0..1, saturates at 3%
  if (pct > 0.05) {
    if (intensity > 0.66)
      return "bg-emerald-500/90 text-white dark:bg-emerald-500/80";
    if (intensity > 0.33)
      return "bg-emerald-400/80 text-white dark:bg-emerald-500/60";
    return "bg-emerald-200/70 text-emerald-900 dark:bg-emerald-700/40 dark:text-emerald-100";
  } else if (pct < -0.05) {
    if (intensity > 0.66)
      return "bg-rose-500/90 text-white dark:bg-rose-500/80";
    if (intensity > 0.33)
      return "bg-rose-400/80 text-white dark:bg-rose-500/60";
    return "bg-rose-200/70 text-rose-900 dark:bg-rose-700/40 dark:text-rose-100";
  }
  return "bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300";
}

export default function SectorHeatmap() {
  const [ranks, setRanks] = useState<SectorRank[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [asOf, setAsOf] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/sector-ranking")
      .then((r) => r.json())
      .then((j) => {
        setRanks(j.ranks ?? null);
        setAsOf(j.asOf ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 120_000);
    return () => clearInterval(id);
  }, []);

  // Always render in catalog order with placeholders when loading
  const sectorsToShow =
    ranks ??
    GICS_SECTORS.map(
      (s): SectorRank => ({
        id: s.id,
        changePercent: null,
        count: 0,
        gainers: 0,
        losers: 0,
        topGainer: null,
        topLoser: null,
      }),
    );

  return (
    <div>
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 className="text-base font-bold tracking-tight flex items-center gap-1.5">
            <span>🔥</span>
            <span>セクター騰落率</span>
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            セクター全銘柄の平均変動率
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          更新
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 gap-2">
        {sectorsToShow.map((rank) => {
          const s = getSector(rank.id);
          if (!s) return null;
          const pct = rank.changePercent;
          const cls = bgFromPct(pct);
          const Arrow = pct !== null && pct >= 0 ? TrendingUp : TrendingDown;
          return (
            <Link
              key={rank.id}
              href={`/sector/${rank.id}`}
              className={`group relative rounded-2xl p-4 ${cls} hover:scale-[1.02] transition-transform shadow-sm border border-black/5 dark:border-white/5 overflow-hidden`}
            >
              <div className="absolute -right-2 -bottom-2 text-6xl opacity-15 select-none">
                {s.emoji}
              </div>
              <div className="relative">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="text-sm font-semibold leading-tight">
                    {s.nameJa}
                  </div>
                  {pct !== null && (
                    <Arrow className="w-4 h-4 shrink-0 opacity-80" />
                  )}
                </div>
                <div className="font-mono text-2xl font-bold tabular-nums leading-tight">
                  {pct === null
                    ? "—"
                    : `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`}
                </div>
                {rank.count > 0 && (
                  <div className="text-[10px] mt-1 opacity-80 tracking-wide uppercase">
                    上昇 {rank.gainers} · 下落 {rank.losers}
                  </div>
                )}
                {rank.topGainer && (
                  <div className="text-[11px] mt-2 truncate opacity-90">
                    高: {rank.topGainer.symbol} +
                    {rank.topGainer.pct.toFixed(2)}%
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
      {asOf && (
        <div className="text-[10px] text-slate-400 mt-2 text-right">
          {new Date(asOf).toLocaleString("ja-JP")} 時点
        </div>
      )}
    </div>
  );
}
