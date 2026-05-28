"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
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

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {sectorsToShow.map((rank) => {
          const s = getSector(rank.id);
          if (!s) return null;
          const pct = rank.changePercent;
          const cls = bgFromPct(pct);
          const gainerPct = rank.count > 0 ? (rank.gainers / rank.count) * 100 : 0;
          return (
            <Link
              key={rank.id}
              href={`/sector/${rank.id}`}
              className={`rounded-xl p-3 ${cls} transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer border border-black/5 dark:border-white/5`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{s.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm leading-tight truncate">{s.nameJa}</div>
                  <div className="font-mono text-lg font-black tabular-nums leading-tight">
                    {pct != null ? `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%` : "—"}
                  </div>
                </div>
              </div>
              {/* Gainer/Loser bar */}
              {rank.count > 0 && (
                <>
                  <div className="flex h-1.5 rounded-full overflow-hidden bg-black/10 mt-1">
                    <div className="bg-emerald-400/70" style={{ width: `${gainerPct}%` }} />
                    <div className="bg-rose-400/70 flex-1" />
                  </div>
                  <div className="flex justify-between text-[9px] mt-0.5 opacity-75">
                    <span>▲{rank.gainers}</span>
                    <span>{rank.count}銘柄</span>
                    <span>▼{rank.losers}</span>
                  </div>
                </>
              )}
              {rank.topGainer && (
                <div className="text-[10px] mt-1 opacity-80 truncate">
                  ▲ {rank.topGainer.symbol} +{rank.topGainer.pct.toFixed(1)}%
                </div>
              )}
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
