"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

type SigLevel = "bullish" | "neutral" | "bearish";

type Indicator = {
  value?: number;
  pos?: number;
  upper?: number;
  lower?: number;
  ma50?: number | null;
  ma200?: number | null;
  signal: SigLevel;
  desc: string;
};

type TechData = {
  symbol: string;
  lastClose: number;
  composite: SigLevel;
  compositeScore: number;
  bullCount: number;
  bearCount: number;
  indicators: {
    rsi:  Indicator & { value: number };
    macd: Indicator & { value: number };
    bb:   Indicator & { pos: number; upper: number; lower: number };
    ma:   Indicator & { ma50: number | null; ma200: number | null };
  };
  error?: string;
};

const SIG_STYLES: Record<SigLevel, { text: string; bg: string; label: string; Icon: typeof TrendingUp }> = {
  bullish: { text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/40", label: "↑ 買い",  Icon: TrendingUp },
  neutral: { text: "text-slate-500  dark:text-slate-400",   bg: "bg-slate-50   dark:bg-slate-800/40   border-slate-200/60   dark:border-slate-700/40",   label: "→ 中立", Icon: Minus },
  bearish: { text: "text-rose-600   dark:text-rose-400",    bg: "bg-rose-50    dark:bg-rose-950/40    border-rose-200/60    dark:border-rose-800/40",    label: "↓ 売り",  Icon: TrendingDown },
};

const COMPOSITE_LABELS: Record<SigLevel, { label: string; color: string }> = {
  bullish: { label: "買いシグナル優勢",    color: "text-emerald-600 dark:text-emerald-400" },
  neutral: { label: "シグナル中立",        color: "text-slate-500 dark:text-slate-400" },
  bearish: { label: "売りシグナル優勢",    color: "text-rose-600 dark:text-rose-400" },
};

function SignalBadge({ sig }: { sig: SigLevel }) {
  const s = SIG_STYLES[sig];
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${s.text} ${s.bg}`}>
      {s.label}
    </span>
  );
}

function IndicatorRow({ name, desc, sig, detail }: { name: string; desc: string; sig: SigLevel; detail: string }) {
  const s = SIG_STYLES[sig];
  return (
    <div className="flex items-start gap-3 py-2.5 border-b last:border-0 border-zinc-100 dark:border-zinc-800/60">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200">{name}</span>
          <SignalBadge sig={sig} />
        </div>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">{desc}</p>
        <p className={`text-[10px] font-medium mt-0.5 ${s.text}`}>{detail}</p>
      </div>
    </div>
  );
}

export default function TechnicalSignal({ symbol }: { symbol: string }) {
  const [data, setData] = useState<TechData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/technical-signal?symbol=${encodeURIComponent(symbol)}`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [symbol]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm animate-pulse">
        <div className="h-4 w-40 rounded bg-zinc-200 dark:bg-zinc-700 mb-3" />
        <div className="h-14 rounded-xl bg-zinc-100 dark:bg-zinc-800 mb-3" />
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="h-12 rounded bg-zinc-100 dark:bg-zinc-800" />)}
        </div>
      </div>
    );
  }

  if (!data || data.error) return null;

  const comp   = COMPOSITE_LABELS[data.composite];
  const compSt = SIG_STYLES[data.composite];

  // Score gauge (0-100)
  const gaugeScore = data.bullCount * 25;

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-3.5 pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
            <span>📡</span> テクニカル複合シグナル
          </h3>
          <span className="text-[10px] text-zinc-400">RSI・MACD・BB・MA</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Composite signal card */}
        <div className={`rounded-xl p-3 border flex items-center gap-3 ${compSt.bg}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${compSt.text}`}>
            <compSt.Icon className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className={`text-sm font-bold ${comp.color}`}>{comp.label}</div>
            <div className="text-[11px] text-zinc-500 mt-0.5">
              {data.bullCount}強気 / {data.bearCount}弱気 / {4 - data.bullCount - data.bearCount}中立
              <span className="ml-2 text-zinc-400">（4指標）</span>
            </div>
          </div>
          {/* Mini gauge */}
          <div className="shrink-0 text-right">
            <div className={`text-lg font-black tabular-nums ${compSt.text}`}>{gaugeScore}</div>
            <div className="text-[9px] text-zinc-400">/ 100</div>
          </div>
        </div>

        {/* Signal bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-zinc-400">
            <span>売り</span><span>中立</span><span>買い</span>
          </div>
          <div className="relative h-2 rounded-full bg-gradient-to-r from-rose-300 via-slate-200 to-emerald-300 dark:from-rose-900/60 dark:via-slate-700 dark:to-emerald-900/60">
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white dark:bg-zinc-900 border-2 shadow-sm transition-all duration-500"
              style={{
                left: `calc(${gaugeScore}% - 7px)`,
                borderColor: data.composite === "bullish" ? "#10b981" : data.composite === "bearish" ? "#ef4444" : "#94a3b8"
              }}
            />
          </div>
        </div>

        {/* Individual indicators */}
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
          <IndicatorRow
            name="RSI (14)"
            desc="相対力指数 — 過買い・過売りの判定"
            sig={data.indicators.rsi.signal}
            detail={`RSI: ${data.indicators.rsi.value} — ${data.indicators.rsi.desc}`}
          />
          <IndicatorRow
            name="MACD"
            desc="移動平均収束拡散 — トレンド転換の検出"
            sig={data.indicators.macd.signal}
            detail={data.indicators.macd.desc}
          />
          <IndicatorRow
            name="ボリンジャーバンド"
            desc="価格のバンド内位置 — 過熱感の判定"
            sig={data.indicators.bb.signal}
            detail={`${data.indicators.bb.desc}  上限:${data.indicators.bb.upper.toFixed(1)} / 下限:${data.indicators.bb.lower.toFixed(1)}`}
          />
          <IndicatorRow
            name="移動平均線"
            desc="MA50 / MA200 — 中長期トレンド判定"
            sig={data.indicators.ma.signal}
            detail={data.indicators.ma.desc}
          />
        </div>

        <p className="text-[10px] text-zinc-400 leading-relaxed">
          ※ テクニカル分析は過去データに基づく参考値です。投資判断はご自身の責任で行ってください。
        </p>
      </div>
    </div>
  );
}
