"use client";

import { useEffect, useState } from "react";
import { Target, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatNumber, formatJpy } from "@/lib/format";
import { translateGrade } from "@/lib/i18n";
import { useCurrency } from "@/lib/currency-context";

type TrendPoint = {
  period: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
};

type Upgrade = {
  date: string;
  firm: string;
  toGrade: string | null;
  fromGrade: string | null;
  action: string | null;
  priceTargetAction: string | null;
  currentPriceTarget: number | null;
  priorPriceTarget: number | null;
};

type Data = {
  currentPrice: number | null;
  currency: string | null;
  targetHigh: number | null;
  targetLow: number | null;
  targetMean: number | null;
  targetMedian: number | null;
  recommendationKey: string | null;
  recommendationMean: number | null;
  numberOfAnalystOpinions: number | null;
  trend: TrendPoint[];
  history: Upgrade[];
};

const RECOMMENDATION_JA: Record<string, { label: string; color: string }> = {
  strong_buy: { label: "強い買い", color: "bg-emerald-500" },
  buy: { label: "買い", color: "bg-emerald-400" },
  hold: { label: "中立", color: "bg-amber-400" },
  underperform: { label: "売り検討", color: "bg-rose-400" },
  sell: { label: "売り", color: "bg-rose-500" },
  none: { label: "—", color: "bg-slate-400" },
};

function recommendationStyle(key: string | null) {
  if (!key) return RECOMMENDATION_JA.none;
  return RECOMMENDATION_JA[key.toLowerCase()] ?? RECOMMENDATION_JA.none;
}

function gradeColor(toGrade: string | null): string {
  if (!toGrade) return "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200";
  const g = toGrade.toLowerCase();
  if (g.includes("strong buy") || g.includes("buy") || g.includes("outperform") || g.includes("overweight"))
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300";
  if (g.includes("hold") || g.includes("neutral") || g.includes("market perform") || g.includes("equal"))
    return "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300";
  if (g.includes("sell") || g.includes("underperform") || g.includes("underweight"))
    return "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300";
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

export default function AnalystRecommendations({ symbol }: { symbol: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  const { showJpy, jpyRate } = useCurrency();

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setData(null);
    fetch(`/api/analyst?symbol=${encodeURIComponent(symbol)}`, {
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then((j) => {
        if (!j.error) setData(j);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [symbol]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="text-sm text-slate-400">アナリスト情報を読み込み中…</div>
      </div>
    );
  }

  // 意味のあるデータが1つも無ければ非表示
  const hasMeaningfulData =
    (data?.numberOfAnalystOpinions ?? 0) > 0 ||
    data?.targetMean != null ||
    (data?.trend ?? []).some(
      (t) => t.strongBuy + t.buy + t.hold + t.sell + t.strongSell > 0,
    ) ||
    (data?.history ?? []).length > 0;

  if (!data || !hasMeaningfulData) {
    return null;
  }

  const rec = recommendationStyle(data.recommendationKey);

  const isUsd   = data.currency === "USD";
  const jpyMode = isUsd && showJpy && jpyRate != null;

  /** 株価・目標株価の表示フォーマット */
  const fmtPrice = (v: number | null | undefined): string => {
    if (v == null) return "—";
    if (jpyMode) return formatJpy(v * jpyRate!);
    if (data.currency === "JPY") return formatJpy(v);
    return formatNumber(v);
  };

  const current = data.currentPrice ?? 0;
  const upside =
    data.targetMean && current
      ? ((data.targetMean - current) / current) * 100
      : null;
  const upsideHigh =
    data.targetHigh && current
      ? ((data.targetHigh - current) / current) * 100
      : null;
  const upsideLow =
    data.targetLow && current
      ? ((data.targetLow - current) / current) * 100
      : null;

  const latest = data.trend[0];
  const total = latest
    ? latest.strongBuy +
      latest.buy +
      latest.hold +
      latest.sell +
      latest.strongSell
    : 0;
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-tight flex items-center gap-2">
          <Target className="w-4 h-4 text-slate-500" />
          アナリスト評価
        </h2>
        {data.numberOfAnalystOpinions && (
          <span className="text-xs text-slate-500">
            {data.numberOfAnalystOpinions}名のアナリスト
          </span>
        )}
      </div>

      {/* Recommendation + Target Price */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900/50 border border-slate-200/60 dark:border-slate-800/60">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">
            総合評価
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center px-3 py-1.5 rounded-lg text-white font-semibold text-sm ${rec.color}`}
            >
              {rec.label}
            </span>
            {data.recommendationMean !== null && (
              <span className="font-mono text-sm text-slate-600 dark:text-slate-400">
                {data.recommendationMean.toFixed(2)} / 5.0
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 mt-2">
            1=強い買い · 3=中立 · 5=強い売り
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-900/50 border border-blue-100/60 dark:border-blue-900/60">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
            目標株価 (平均)
          </div>
          {data.targetMean !== null ? (
            <div className="flex items-baseline gap-2">
              <div className="font-mono text-2xl font-bold tabular-nums">
                {fmtPrice(data.targetMean)}
              </div>
              {!jpyMode && data.currency !== "JPY" && (
                <div className="text-xs text-slate-500">{data.currency}</div>
              )}
              {upside !== null && (
                <div
                  className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-xs font-semibold ${
                    upside >= 0
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                  }`}
                >
                  {upside >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {upside >= 0 ? "+" : ""}
                  {upside.toFixed(1)}%
                </div>
              )}
            </div>
          ) : (
            <div className="text-slate-400">—</div>
          )}
          <div className="flex gap-3 text-xs text-slate-500 mt-2">
            <span>
              高値: <span className="font-mono">{fmtPrice(data.targetHigh)}</span>
              {upsideHigh !== null && (
                <span className="ml-1 text-emerald-600 dark:text-emerald-400">
                  ({upsideHigh >= 0 ? "+" : ""}
                  {upsideHigh.toFixed(0)}%)
                </span>
              )}
            </span>
            <span>
              安値: <span className="font-mono">{fmtPrice(data.targetLow)}</span>
              {upsideLow !== null && (
                <span
                  className={`ml-1 ${
                    upsideLow >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  ({upsideLow >= 0 ? "+" : ""}
                  {upsideLow.toFixed(0)}%)
                </span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Recommendation breakdown */}
      {latest && total > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs uppercase tracking-wider text-slate-500">
              レーティング内訳
            </h3>
            <span className="text-xs text-slate-400">{total} 件 (直近)</span>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
            {latest.strongBuy > 0 && (
              <div
                className="bg-emerald-600"
                style={{ width: `${pct(latest.strongBuy)}%` }}
                title={`Strong Buy: ${latest.strongBuy}`}
              />
            )}
            {latest.buy > 0 && (
              <div
                className="bg-emerald-400"
                style={{ width: `${pct(latest.buy)}%` }}
                title={`Buy: ${latest.buy}`}
              />
            )}
            {latest.hold > 0 && (
              <div
                className="bg-amber-400"
                style={{ width: `${pct(latest.hold)}%` }}
                title={`Hold: ${latest.hold}`}
              />
            )}
            {latest.sell > 0 && (
              <div
                className="bg-rose-400"
                style={{ width: `${pct(latest.sell)}%` }}
                title={`Sell: ${latest.sell}`}
              />
            )}
            {latest.strongSell > 0 && (
              <div
                className="bg-rose-600"
                style={{ width: `${pct(latest.strongSell)}%` }}
                title={`Strong Sell: ${latest.strongSell}`}
              />
            )}
          </div>
          <div className="grid grid-cols-5 gap-2 mt-3 text-center text-xs">
            <Cell label="強い買い" value={latest.strongBuy} color="text-emerald-700 dark:text-emerald-300" />
            <Cell label="買い" value={latest.buy} color="text-emerald-600 dark:text-emerald-400" />
            <Cell label="中立" value={latest.hold} color="text-amber-600 dark:text-amber-400" />
            <Cell label="売り" value={latest.sell} color="text-rose-600 dark:text-rose-400" />
            <Cell label="強い売り" value={latest.strongSell} color="text-rose-700 dark:text-rose-300" />
          </div>
        </div>
      )}

      {/* Recent upgrade/downgrade history */}
      {data.history.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-3">
            アナリスト最新アクション
          </h3>
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
                  <th className="py-2.5 px-3 font-medium whitespace-nowrap">日付</th>
                  <th className="py-2.5 px-3 font-medium whitespace-nowrap">証券会社</th>
                  <th className="py-2.5 px-3 font-medium whitespace-nowrap">レーティング</th>
                  <th className="py-2.5 px-3 font-medium whitespace-nowrap text-right">目標株価</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {data.history.slice(0, 10).map((h, i) => {
                  const isRaise = h.priceTargetAction === "Raises";
                  const isLower = h.priceTargetAction === "Lowers";
                  const TargetIcon = isRaise
                    ? TrendingUp
                    : isLower
                      ? TrendingDown
                      : Minus;
                  const targetColor = isRaise
                    ? "text-emerald-600 dark:text-emerald-400"
                    : isLower
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-slate-500";
                  return (
                    <tr
                      key={i}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-2.5 px-3 text-xs text-slate-400 whitespace-nowrap font-mono">
                        {h.date
                          ? new Date(h.date).toLocaleDateString("ja-JP", {
                              year: "2-digit",
                              month: "2-digit",
                              day: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-sm whitespace-nowrap max-w-[160px] truncate">
                        {h.firm}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${gradeColor(h.toGrade)}`}
                        >
                          {translateGrade(h.toGrade)}
                        </span>
                      </td>
                      <td className={`py-2.5 px-3 text-right font-mono text-sm whitespace-nowrap ${targetColor}`}>
                        {h.currentPriceTarget ? (
                          <span className="inline-flex items-center justify-end gap-1">
                            <TargetIcon className="w-3 h-3 shrink-0" />
                            {fmtPrice(h.currentPriceTarget)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Cell({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div>
      <div className={`font-mono font-semibold ${color}`}>{value}</div>
      <div className="text-[10px] text-slate-500">{label}</div>
    </div>
  );
}
