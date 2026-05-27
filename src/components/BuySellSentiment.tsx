"use client";

import { useEffect, useState } from "react";
import { formatNumber } from "@/lib/format";

type AnalystData = {
  currentPrice: number | null;
  targetMean:   number | null;
  targetHigh:   number | null;
  targetLow:    number | null;
  recommendationKey: string | null;
  trend: {
    period:    string;
    strongBuy: number;
    buy:       number;
    hold:      number;
    sell:      number;
    strongSell:number;
  }[];
};

type Computed = {
  buyPct:  number;
  holdPct: number;
  sellPct: number;
  total:   number;
  recKey:  string;
  targetMean:   number | null;
  currentPrice: number | null;
  upside:       number | null;
};

const REC_LABELS: Record<string, { text: string; pill: string }> = {
  strong_buy:  { text: "強い買い", pill: "bg-emerald-500 text-white"  },
  buy:         { text: "買い",     pill: "bg-emerald-400 text-white"  },
  hold:        { text: "中立",     pill: "bg-amber-400 text-white"    },
  sell:        { text: "売り",     pill: "bg-rose-400 text-white"     },
  strong_sell: { text: "強い売り", pill: "bg-rose-600 text-white"     },
};

export default function BuySellSentiment({ symbol }: { symbol: string }) {
  const [computed, setComputed] = useState<Computed | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setComputed(null);

    fetch(`/api/analyst?symbol=${encodeURIComponent(symbol)}`)
      .then((r) => r.json())
      .then((j: AnalystData) => {
        if (cancelled) return;
        const t = j.trend?.[0];
        if (!t) return;

        const buyCount  = (t.strongBuy ?? 0) + (t.buy ?? 0);
        const sellCount = (t.sell ?? 0) + (t.strongSell ?? 0);
        const holdCount = t.hold ?? 0;
        const total     = buyCount + holdCount + sellCount;
        if (total === 0) return;

        const upside =
          j.targetMean && j.currentPrice
            ? ((j.targetMean - j.currentPrice) / j.currentPrice) * 100
            : null;

        setComputed({
          buyPct:  Math.round((buyCount  / total) * 100),
          holdPct: Math.round((holdCount / total) * 100),
          sellPct: Math.round((sellCount / total) * 100),
          total,
          recKey:       j.recommendationKey ?? "hold",
          targetMean:   j.targetMean,
          currentPrice: j.currentPrice,
          upside,
        });
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [symbol]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
        <div className="skeleton h-4 w-36 rounded mb-3" />
        <div className="skeleton h-6 rounded-full mb-2" />
        <div className="skeleton h-3 w-48 rounded" />
      </div>
    );
  }

  if (!computed) return null;

  const label = REC_LABELS[computed.recKey] ?? REC_LABELS["hold"];

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      {/* Title row */}
      <div className="px-4 pt-3.5 pb-2.5 flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-1.5">
          <span>🎯</span>
          <span>アナリスト売買予想</span>
          <span className="text-[10px] font-normal text-slate-400 ml-1">みんかぶ風</span>
        </h3>
        <span className={`text-xs font-bold px-3 py-1 rounded-full ${label.pill}`}>
          {label.text}
        </span>
      </div>

      {/* Gradient bar */}
      <div className="mx-4 flex rounded-full overflow-hidden h-6 gap-px mb-1.5 shadow-inner">
        <div
          className="bg-gradient-to-r from-emerald-500 to-emerald-400 flex items-center justify-center text-white text-[10px] font-bold transition-all duration-700"
          style={{ width: `${computed.buyPct}%` }}
        >
          {computed.buyPct >= 12 && `${computed.buyPct}%`}
        </div>
        <div
          className="bg-gradient-to-r from-amber-400 to-yellow-300 flex items-center justify-center text-white text-[10px] font-bold transition-all duration-700"
          style={{ width: `${computed.holdPct}%` }}
        >
          {computed.holdPct >= 12 && `${computed.holdPct}%`}
        </div>
        <div
          className="bg-gradient-to-r from-rose-400 to-rose-500 flex items-center justify-center text-white text-[10px] font-bold transition-all duration-700"
          style={{ width: `${computed.sellPct}%` }}
        >
          {computed.sellPct >= 12 && `${computed.sellPct}%`}
        </div>
      </div>

      {/* Legend */}
      <div className="mx-4 mb-3 flex justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shrink-0" />
          買い {computed.buyPct}%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block shrink-0" />
          中立 {computed.holdPct}%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shrink-0" />
          売り {computed.sellPct}%
        </span>
      </div>

      {/* Target price */}
      {computed.targetMean != null && computed.currentPrice != null && (
        <div className="mx-4 mb-3.5 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-2.5">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">
              目標株価（平均）
            </div>
            <div className="font-mono font-black text-lg tabular-nums">
              {formatNumber(computed.targetMean)}
            </div>
          </div>
          {computed.upside != null && (
            <span
              className={`text-sm font-bold px-3 py-1.5 rounded-xl ${
                computed.upside >= 0
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                  : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
              }`}
            >
              {computed.upside >= 0 ? "▲" : "▼"} {Math.abs(computed.upside).toFixed(1)}%
            </span>
          )}
        </div>
      )}

      <div className="px-4 pb-3 text-[10px] text-slate-400 text-right">
        アナリスト {computed.total} 名の予想
      </div>
    </div>
  );
}
