"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from "lucide-react";

type Factors = {
  value: number;
  growth: number;
  quality: number;
  momentum: number;
  health: number;
};

type Meta = {
  pe: number | null;
  pbr: number | null;
  divYield: number | null;
  epsGrowth: number | null;
  revGrowth: number | null;
  roe: number | null;
  currentRatio: number | null;
  debtToEquity: number | null;
};

type QuantData = {
  symbol: string;
  total: number;
  factors: Factors;
  meta: Meta;
};

const FACTOR_LABELS: { key: keyof Factors; label: string; desc: string }[] = [
  { key: "value",    label: "割安度",     desc: "PER・PBR・配当利回り" },
  { key: "growth",   label: "成長性",     desc: "EPS・売上成長率" },
  { key: "quality",  label: "収益品質",   desc: "ROE・利益率" },
  { key: "momentum", label: "モメンタム", desc: "52週位置・騰落率" },
  { key: "health",   label: "財務健全性", desc: "流動比率・有利子負債" },
];

function scoreColor(s: number): string {
  if (s >= 75) return "text-emerald-600 dark:text-emerald-400";
  if (s >= 50) return "text-blue-600 dark:text-blue-400";
  if (s >= 30) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

function barColor(s: number): string {
  if (s >= 75) return "bg-emerald-500";
  if (s >= 50) return "bg-blue-500";
  if (s >= 30) return "bg-amber-400";
  return "bg-rose-500";
}

function verdict(total: number): { label: string; Icon: typeof TrendingUp; color: string } {
  if (total >= 75) return { label: "強く買い",   Icon: TrendingUp,   color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40" };
  if (total >= 60) return { label: "買い優勢",   Icon: TrendingUp,   color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40" };
  if (total >= 45) return { label: "中立",       Icon: Minus,        color: "text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800" };
  if (total >= 30) return { label: "売り優勢",   Icon: TrendingDown, color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40" };
  return               { label: "強く売り",   Icon: TrendingDown, color: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40" };
}

function MetaRow({ label, value }: { label: string; value: string | null }) {
  if (value == null) return null;
  return (
    <div className="flex justify-between items-center text-xs py-0.5">
      <span className="text-zinc-400">{label}</span>
      <span className="font-mono font-medium text-zinc-700 dark:text-zinc-300">{value}</span>
    </div>
  );
}

export default function QuantScore({ symbol }: { symbol: string }) {
  const [data, setData] = useState<QuantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/quant-score?symbol=${encodeURIComponent(symbol)}`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [symbol]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm animate-pulse">
        <div className="h-4 w-32 rounded bg-zinc-200 dark:bg-zinc-700 mb-3" />
        <div className="h-16 rounded-xl bg-zinc-100 dark:bg-zinc-800 mb-3" />
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="h-5 rounded bg-zinc-100 dark:bg-zinc-800" />)}
        </div>
      </div>
    );
  }

  if (!data || !data.total) return null;

  const v = verdict(data.total);

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-3.5 pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
            <span>📊</span> クォンツスコア
          </h3>
          <span className="text-[10px] text-zinc-400">5因子定量分析</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Score ring + verdict */}
        <div className="flex items-center gap-4">
          {/* Circular score */}
          <div className="relative w-20 h-20 shrink-0">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor"
                className="text-zinc-100 dark:text-zinc-800" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.5" fill="none"
                stroke={data.total >= 75 ? "#10b981" : data.total >= 60 ? "#3b82f6" : data.total >= 45 ? "#94a3b8" : data.total >= 30 ? "#f59e0b" : "#ef4444"}
                strokeWidth="3"
                strokeDasharray={`${(data.total / 100) * 97.4} 97.4`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-xl font-black tabular-nums leading-none ${scoreColor(data.total)}`}>{data.total}</span>
              <span className="text-[8px] text-zinc-400 leading-none">/ 100</span>
            </div>
          </div>

          {/* Verdict */}
          <div className="flex-1">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-sm ${v.color}`}>
              <v.Icon className="w-4 h-4 shrink-0" />
              {v.label}
            </div>
            <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
              5因子の定量評価による総合スコアです。過去データに基づく参考値です。
            </p>
          </div>
        </div>

        {/* Factor bars */}
        <div className="space-y-2">
          {FACTOR_LABELS.map(({ key, label, desc }) => {
            const s = data.factors[key];
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-0.5">
                  <div>
                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{label}</span>
                    <span className="ml-1.5 text-[10px] text-zinc-400">{desc}</span>
                  </div>
                  <span className={`text-xs font-bold tabular-nums ${scoreColor(s)}`}>{s}</span>
                </div>
                <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${barColor(s)}`}
                    style={{ width: `${s}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Expandable meta */}
        <button
          onClick={() => setOpen(v => !v)}
          className="w-full flex items-center justify-between text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 pt-1 border-t border-zinc-100 dark:border-zinc-800 transition-colors"
        >
          <span>使用データを確認</span>
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {open && (
          <div className="pt-1 space-y-0.5">
            <MetaRow label="PER"       value={data.meta.pe   != null ? data.meta.pe.toFixed(1) + "倍" : null} />
            <MetaRow label="PBR"       value={data.meta.pbr  != null ? data.meta.pbr.toFixed(2) + "倍" : null} />
            <MetaRow label="配当利回り" value={data.meta.divYield != null ? data.meta.divYield.toFixed(2) + "%" : null} />
            <MetaRow label="EPS成長率" value={data.meta.epsGrowth != null ? (data.meta.epsGrowth > 0 ? "+" : "") + data.meta.epsGrowth + "%" : null} />
            <MetaRow label="売上成長率" value={data.meta.revGrowth != null ? (data.meta.revGrowth > 0 ? "+" : "") + data.meta.revGrowth + "%" : null} />
            <MetaRow label="ROE"       value={data.meta.roe  != null ? data.meta.roe.toFixed(1) + "%" : null} />
            <MetaRow label="流動比率"  value={data.meta.currentRatio != null ? data.meta.currentRatio.toFixed(2) : null} />
            <MetaRow label="負債資本比率" value={data.meta.debtToEquity != null ? data.meta.debtToEquity.toFixed(1) : null} />
          </div>
        )}
      </div>
    </div>
  );
}
