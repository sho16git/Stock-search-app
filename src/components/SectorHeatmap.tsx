"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, TrendingUp, TrendingDown, Minus } from "lucide-react";
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

function pctColor(pct: number | null) {
  if (pct === null) return { text: "text-slate-400", bg: "bg-slate-100 dark:bg-slate-800" };
  if (pct > 1)  return { text: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-100 dark:bg-emerald-900/40" };
  if (pct > 0)  return { text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" };
  if (pct < -1) return { text: "text-rose-700 dark:text-rose-300", bg: "bg-rose-100 dark:bg-rose-900/40" };
  if (pct < 0)  return { text: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-900/20" };
  return { text: "text-slate-600 dark:text-slate-400", bg: "bg-slate-50 dark:bg-slate-800/40" };
}

function PctBadge({ pct }: { pct: number | null }) {
  const { text, bg } = pctColor(pct);
  const Icon = pct == null ? Minus : pct >= 0 ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-mono font-bold text-sm tabular-nums ${text} ${bg}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      {pct != null ? `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%` : "—"}
    </span>
  );
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

  const sectorsToShow: SectorRank[] =
    ranks ??
    GICS_SECTORS.map((s) => ({
      id: s.id,
      changePercent: null,
      count: 0,
      gainers: 0,
      losers: 0,
      topGainer: null,
      topLoser: null,
    }));

  // max abs % for bar scaling
  const maxAbs = Math.max(
    0.5,
    ...sectorsToShow.map((r) => Math.abs(r.changePercent ?? 0)),
  );

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800/60">
        <div>
          <h2 className="text-base font-bold tracking-tight flex items-center gap-1.5">
            <span>🔥</span>
            <span>セクター騰落率</span>
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">全銘柄の平均変動率・リアルタイム</p>
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

      {/* Ranking list */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
        {sectorsToShow.map((rank, idx) => {
          const s = getSector(rank.id);
          if (!s) return null;
          const pct = rank.changePercent;
          const { text } = pctColor(pct);
          const barWidth = pct != null ? Math.min(100, (Math.abs(pct) / maxAbs) * 100) : 0;
          const isUp = (pct ?? 0) >= 0;
          const gainerPct = rank.count > 0 ? (rank.gainers / rank.count) * 100 : 0;

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
                  <div className="text-sm font-semibold truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {s.nameJa}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">{rank.count > 0 ? `${rank.count}銘柄` : "—"}</div>
                </div>
              </div>

              {/* Bar */}
              <div className="flex-1 min-w-0 hidden sm:block">
                <div className="relative h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  {pct != null && (
                    <div
                      className={`absolute top-0 h-full rounded-full transition-all duration-500 ${isUp ? "left-1/2 bg-emerald-400/70" : "right-1/2 bg-rose-400/70"}`}
                      style={{ width: `${barWidth / 2}%` }}
                    />
                  )}
                </div>
                {/* Gainer/loser micro bar */}
                {rank.count > 0 && (
                  <div className="flex h-1 rounded-full overflow-hidden mt-1 bg-slate-100 dark:bg-slate-800">
                    <div className="bg-emerald-400/60 transition-all" style={{ width: `${gainerPct}%` }} />
                    <div className="bg-rose-400/60 flex-1" />
                  </div>
                )}
              </div>

              {/* % change badge */}
              <div className="shrink-0">
                <PctBadge pct={pct} />
              </div>

              {/* Top gainer */}
              <div className="hidden lg:block shrink-0 w-36 text-right">
                {rank.topGainer ? (
                  <div className="text-xs">
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                      ▲ +{rank.topGainer.pct.toFixed(1)}%
                    </span>
                    <span className="text-slate-400 ml-1">{rank.topGainer.symbol}</span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-300">—</span>
                )}
                {rank.topLoser && (
                  <div className="text-xs mt-0.5">
                    <span className="text-rose-600 dark:text-rose-400 font-mono font-semibold">
                      ▼ {rank.topLoser.pct.toFixed(1)}%
                    </span>
                    <span className="text-slate-400 ml-1">{rank.topLoser.symbol}</span>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Footer */}
      {asOf && (
        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800/60 text-[10px] text-slate-400 text-right">
          {new Date(asOf).toLocaleString("ja-JP")} 時点
        </div>
      )}
    </div>
  );
}
