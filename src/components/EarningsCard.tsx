"use client";

import { useEffect, useState } from "react";
import { Calendar, Coins, TrendingUp, TrendingDown } from "lucide-react";
import { formatNumber, formatPercent, formatLargeNumber } from "@/lib/format";

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

function DividendCell({
  shares,
  dividendRate,
  currency,
  highlight,
  jpyRate,
}: {
  shares: number;
  dividendRate: number;
  currency: string | null;
  highlight?: boolean;
  jpyRate?: number | null;
}) {
  const amount    = dividendRate * shares;
  const jpyAmount = jpyRate ? amount * jpyRate : null;

  return (
    <div
      className={`p-3 rounded-xl border ${
        highlight
          ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900"
          : "bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800/60"
      }`}
    >
      <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">
        {shares.toLocaleString("ja-JP")} 株
      </div>
      <div className="font-mono font-bold text-base tabular-nums">
        {formatNumber(amount)}
        <span className="text-[10px] font-normal text-slate-400 ml-1">{currency ?? ""}</span>
      </div>
      {jpyAmount != null && (
        <div className="text-[11px] font-mono text-rose-600 dark:text-rose-400 font-semibold mt-0.5">
          ≈ ¥{Math.round(jpyAmount).toLocaleString("ja-JP")}
        </div>
      )}
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
  const [jpyRate, setJpyRate] = useState<number | null>(null);

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

  // USD銘柄のときのみ為替レートを取得
  useEffect(() => {
    if (data?.currency !== "USD") return;
    fetch("/api/quote?symbol=JPY%3DX")
      .then(r => r.json())
      .then(j => {
        const rate = j.quote?.regularMarketPrice as number | undefined;
        if (rate) setJpyRate(rate);
      })
      .catch(() => {});
  }, [data?.currency]);

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

  const dUntil = daysUntil(data.nextEarningsDate);

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
                  {formatNumber(data.epsEstimateAverage)}
                </span>
                <span className="ml-1 text-slate-400">
                  ({formatNumber(data.epsEstimateLow)}–
                  {formatNumber(data.epsEstimateHigh)})
                </span>
              </div>
            )}
            {data.revenueEstimateAverage !== null && (
              <div className="text-xs text-slate-500">
                売上予想:{" "}
                <span className="font-mono font-semibold text-slate-900 dark:text-slate-200">
                  {formatLargeNumber(data.revenueEstimateAverage)}
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
                    {formatNumber(data.dividendRate)} {data.currency}
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
          <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
            予想配当金額 (年間 · 税引前)
            {jpyRate && data.currency === "USD" && (
              <span className="text-[10px] normal-case text-rose-500 font-normal bg-rose-50 dark:bg-rose-950/30 px-1.5 py-0.5 rounded-full">
                🇯🇵 円換算付き (1USD=¥{jpyRate.toFixed(2)})
              </span>
            )}
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <DividendCell shares={1}    dividendRate={data.dividendRate} currency={data.currency} jpyRate={jpyRate} />
            <DividendCell shares={100}  dividendRate={data.dividendRate} currency={data.currency} jpyRate={jpyRate} highlight />
            <DividendCell shares={1000} dividendRate={data.dividendRate} currency={data.currency} jpyRate={jpyRate} />
          </div>

          {/* 米株追加情報 */}
          {data.currency === "USD" && data.fiveYearAvgDividendYield != null && (
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
            ※ 直近予想配当 ({formatNumber(data.dividendRate)} {data.currency}) に基づく試算。実際の配当は変動する可能性があります。
            {data.currency === "JPY" && " 日本株は100株単位 (単元株) での購入が一般的です。"}
            {data.currency === "USD" && jpyRate && " 円換算は取得時点の為替レートによります。"}
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
                          {formatNumber(e.epsActual)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-slate-500">
                          {formatNumber(e.epsEstimate)}
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
