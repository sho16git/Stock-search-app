"use client";

import { useEffect, useState } from "react";
import { Calendar, Coins, TrendingUp, TrendingDown } from "lucide-react";
import { formatNumber, formatPercent, formatLargeNumber, formatJpy } from "@/lib/format";
import { useCurrency } from "@/lib/currency-context";

type EarningsRow = {
  quarter: string | null;
  epsActual: number | null;
  epsEstimate: number | null;
  epsDifference: number | null;
  surprisePercent: number | null;
};

type Data = {
  currency: string | null;
  nextEarningsDate: string | null;
  isEarningsEstimated: boolean | null;
  epsEstimateAverage: number | null;
  epsEstimateLow: number | null;
  epsEstimateHigh: number | null;
  revenueEstimateAverage: number | null;
  exDividendDate: string | null;
  dividendDate: string | null;
  dividendRate: number | null;
  dividendYield: number | null;
  payoutRatio: number | null;
  fiveYearAvgDividendYield: number | null;
  recentEarnings: EarningsRow[];
};

/** コンパクト表示 (通貨対応) */
function fmtAmount(n: number, isJpyMode: boolean): string {
  if (isJpyMode) {
    // 円単位 (小数なし)
    const abs = Math.abs(n);
    if (abs >= 1e8)  return `¥${(n / 1e8).toFixed(1)}億`;
    if (abs >= 1e4)  return `¥${(n / 1e4).toFixed(1)}万`;
    return `¥${Math.round(n).toLocaleString("ja-JP")}`;
  }
  // USD / その他
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 10_000)    return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("ja-JP", { maximumFractionDigits: 2 });
}

function DividendCell({
  shares,
  dividendRate,
  currency,
  highlight,
  showJpy,
  jpyRate,
}: {
  shares: number;
  dividendRate: number;
  currency: string | null;
  highlight?: boolean;
  showJpy: boolean;
  jpyRate: number | null;
}) {
  const isNativeJpy = currency === "JPY";
  const isJpyMode   = isNativeJpy || (showJpy && jpyRate != null);
  const baseAmount  = dividendRate * shares;
  const dispAmount  = isNativeJpy ? baseAmount
    : showJpy && jpyRate ? baseAmount * jpyRate
    : baseAmount;

  const mainStr     = fmtAmount(dispAmount, isJpyMode);
  const mainCurr    = isJpyMode ? "" : (currency ?? "");

  return (
    <div
      className={`p-2.5 rounded-xl border overflow-hidden ${
        highlight
          ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900"
          : "bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800/60"
      }`}
    >
      <div className="text-[9px] uppercase tracking-wider text-slate-500 mb-0.5 truncate">
        {shares.toLocaleString("ja-JP")} 株
      </div>
      <div className="font-mono font-bold text-sm tabular-nums leading-tight truncate">
        {mainStr}
        {mainCurr && (
          <span className="text-[9px] font-normal text-slate-400 ml-0.5">{mainCurr}</span>
        )}
      </div>
    </div>
  );
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function EarningsCard({ symbol }: { symbol: string }) {
  const [data, setData]       = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  // ページ共通の通貨コンテキスト
  const { showJpy, jpyRate } = useCurrency();

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setData(null);
    fetch(`/api/events?symbol=${encodeURIComponent(symbol)}`, { signal: ctrl.signal })
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
        <div className="text-sm text-slate-400">決算情報を読み込み中…</div>
      </div>
    );
  }

  if (!data) return null;
  const hasAnything =
    data.nextEarningsDate ||
    data.dividendRate ||
    data.dividendYield ||
    data.recentEarnings.length > 0;
  if (!hasAnything) return null;

  const dUntil      = daysUntil(data.nextEarningsDate);
  const isUsd       = data.currency === "USD";
  const isNativeJpy = data.currency === "JPY";
  const isJpyMode   = isNativeJpy || (isUsd && showJpy && jpyRate != null);

  /** EPS などの小さな金額を表示 */
  const fmtEps = (v: number | null | undefined) => {
    if (v == null) return "—";
    if (isUsd && showJpy && jpyRate) return formatJpy(v * jpyRate);
    if (isNativeJpy) return formatJpy(v);
    return formatNumber(v);
  };

  /** 大きな金額 (売上予想等) を表示 */
  const fmtRevenue = (v: number | null | undefined) => {
    if (v == null) return "—";
    if (isUsd && showJpy && jpyRate) return formatJpy(v * jpyRate);
    return formatLargeNumber(v);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
      <h2 className="text-base font-semibold tracking-tight flex items-center gap-2">
        <Calendar className="w-4 h-4 text-slate-500" />
        決算・配当情報
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {data.nextEarningsDate && (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/30 dark:to-slate-900/50 border border-indigo-100/60 dark:border-indigo-900/60">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
              次回決算発表 {data.isEarningsEstimated ? "(予定)" : ""}
            </div>
            <div className="font-semibold text-lg">
              {fmtDate(data.nextEarningsDate)}
            </div>
            {dUntil !== null && dUntil >= 0 && (
              <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">
                あと {dUntil} 日
              </div>
            )}
            {data.epsEstimateAverage !== null && (
              <div className="text-xs text-slate-500 mt-2">
                EPS予想:{" "}
                <span className="font-mono font-semibold text-slate-900 dark:text-slate-200">
                  {fmtEps(data.epsEstimateAverage)}
                </span>
                <span className="ml-1 text-slate-400">
                  ({fmtEps(data.epsEstimateLow)}–
                  {fmtEps(data.epsEstimateHigh)})
                </span>
              </div>
            )}
            {data.revenueEstimateAverage !== null && (
              <div className="text-xs text-slate-500">
                売上予想:{" "}
                <span className="font-mono font-semibold text-slate-900 dark:text-slate-200">
                  {fmtRevenue(data.revenueEstimateAverage)}
                </span>
              </div>
            )}
          </div>
        )}

        {(data.dividendYield !== null || data.dividendRate !== null) && (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-slate-900/50 border border-amber-100/60 dark:border-amber-900/60">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
              <Coins className="w-3 h-3" />
              配当
            </div>
            <div className="flex items-baseline gap-2">
              <div className="font-mono text-2xl font-bold tabular-nums">
                {data.dividendYield !== null
                  ? formatPercent(data.dividendYield)
                  : "—"}
              </div>
              <div className="text-xs text-slate-500">利回り</div>
            </div>
            <div className="text-xs text-slate-500 mt-1.5 space-x-3">
              {data.dividendRate !== null && (
                <span>
                  1株配当:{" "}
                  <span className="font-mono font-semibold">
                    {isJpyMode
                      ? formatJpy(isNativeJpy ? data.dividendRate : data.dividendRate * (jpyRate ?? 1))
                      : `${formatNumber(data.dividendRate)} ${data.currency}`}
                  </span>
                </span>
              )}
              {data.payoutRatio !== null && (
                <span>
                  配当性向:{" "}
                  <span className="font-mono font-semibold">
                    {formatPercent(data.payoutRatio)}
                  </span>
                </span>
              )}
            </div>
            {data.exDividendDate && (
              <div className="text-[10px] text-slate-400 mt-2">
                権利落ち日: {fmtDate(data.exDividendDate)}
              </div>
            )}
          </div>
        )}
      </div>

      {data.dividendRate !== null && (
        <div>
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            <h3 className="text-xs uppercase tracking-wider text-slate-500">
              予想配当金額 (年間 · 税引前)
            </h3>
            {isNativeJpy && (
              <span className="text-[10px] normal-case text-blue-600 font-normal bg-blue-50 dark:bg-blue-950/30 px-1.5 py-0.5 rounded-full">
                🇯🇵 日本株 · 100株単位
              </span>
            )}
            {isUsd && (
              <span className="text-[10px] normal-case text-slate-400 font-normal bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
                {showJpy && jpyRate
                  ? `🇯🇵 円換算 (1USD≈¥${jpyRate.toFixed(0)})`
                  : "🇺🇸 米株 · 1株単位"}
              </span>
            )}
          </div>

          {/* 日本株: 1株 / 100株（単元株）/ 1000株 */}
          {isNativeJpy && (
            <div className="grid grid-cols-3 gap-2">
              <DividendCell shares={1}    dividendRate={data.dividendRate} currency={data.currency} showJpy={false} jpyRate={null} />
              <DividendCell shares={100}  dividendRate={data.dividendRate} currency={data.currency} showJpy={false} jpyRate={null} highlight />
              <DividendCell shares={1000} dividendRate={data.dividendRate} currency={data.currency} showJpy={false} jpyRate={null} />
            </div>
          )}

          {/* 米株: 1株 / 10株 / 100株 — ページ共通トグルで通貨切り替え */}
          {isUsd && (
            <div className="grid grid-cols-3 gap-2">
              <DividendCell shares={1}   dividendRate={data.dividendRate} currency={data.currency} showJpy={showJpy} jpyRate={jpyRate} />
              <DividendCell shares={10}  dividendRate={data.dividendRate} currency={data.currency} showJpy={showJpy} jpyRate={jpyRate} highlight />
              <DividendCell shares={100} dividendRate={data.dividendRate} currency={data.currency} showJpy={showJpy} jpyRate={jpyRate} />
            </div>
          )}

          {/* その他通貨 */}
          {!isNativeJpy && !isUsd && (
            <div className="grid grid-cols-3 gap-2">
              <DividendCell shares={1}    dividendRate={data.dividendRate} currency={data.currency} showJpy={false} jpyRate={null} />
              <DividendCell shares={100}  dividendRate={data.dividendRate} currency={data.currency} showJpy={false} jpyRate={null} highlight />
              <DividendCell shares={1000} dividendRate={data.dividendRate} currency={data.currency} showJpy={false} jpyRate={null} />
            </div>
          )}

          {/* 米株: 5年平均利回り */}
          {isUsd && data.fiveYearAvgDividendYield != null && (
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
              <span>5年平均利回り:</span>
              <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                {formatPercent(data.fiveYearAvgDividendYield)}
              </span>
              {data.dividendYield != null && (
                <>
                  <span className="text-slate-300 dark:text-slate-600">vs</span>
                  <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                    現在 {formatPercent(data.dividendYield)}
                  </span>
                </>
              )}
            </div>
          )}

          <p className="text-[10px] text-slate-400 mt-2">
            ※ 直近予想配当 ({isJpyMode
              ? formatJpy(isNativeJpy ? data.dividendRate : data.dividendRate * (jpyRate ?? 1))
              : `${formatNumber(data.dividendRate)} ${data.currency}`}) に基づく試算。実際の配当は変動する可能性があります。
            {isNativeJpy && " 日本株は通常100株単位（単元株）での購入。"}
            {isUsd && " 米国株は1株から購入可能。"}
          </p>
        </div>
      )}

      {data.recentEarnings.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-2">
            直近決算 (EPS実績 vs 予想)
          </h3>
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <th className="py-2 px-2 font-medium">四半期</th>
                  <th className="py-2 px-2 text-right font-medium">実績</th>
                  <th className="py-2 px-2 text-right font-medium">予想</th>
                  <th className="py-2 px-2 text-right font-medium">サプライズ</th>
                </tr>
              </thead>
              <tbody>
                {data.recentEarnings
                  .slice()
                  .reverse()
                  .map((e, i) => {
                    const up = (e.surprisePercent ?? 0) >= 0;
                    const Arrow = up ? TrendingUp : TrendingDown;
                    return (
                      <tr
                        key={i}
                        className="border-b border-slate-100 dark:border-slate-800/60 last:border-0"
                      >
                        <td className="py-2 px-2 text-slate-500 whitespace-nowrap">
                          {e.quarter
                            ? new Date(e.quarter).toLocaleDateString("ja-JP", {
                                year: "2-digit",
                                month: "2-digit",
                              })
                            : "—"}
                        </td>
                        <td className="py-2 px-2 text-right font-mono">
                          {fmtEps(e.epsActual)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-slate-500">
                          {fmtEps(e.epsEstimate)}
                        </td>
                        <td
                          className={`py-2 px-2 text-right font-mono font-semibold ${
                            up
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {e.surprisePercent !== null ? (
                            <span className="inline-flex items-center gap-0.5 justify-end">
                              <Arrow className="w-3 h-3" />
                              {up ? "+" : ""}
                              {(e.surprisePercent * 100).toFixed(1)}%
                            </span>
                          ) : (
                            "—"
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
