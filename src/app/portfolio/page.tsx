"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Wallet,
  RefreshCw,
  Edit3,
  TrendingUp,
  TrendingDown,
  BookText,
} from "lucide-react";
import { usePortfolio } from "@/lib/use-portfolio";
import { getJpName } from "@/lib/jp-stocks";
import { formatNumber } from "@/lib/format";
import HoldingForm from "@/components/HoldingForm";
import AIPortfolioDiagnosis from "@/components/AIPortfolioDiagnosis";
import PortfolioHistory from "@/components/PortfolioHistory";
import PortfolioRisk from "@/components/PortfolioRisk";

function fmtJpy(v: number, compact = false): string {
  if (compact) {
    if (Math.abs(v) >= 1e8) return `¥${(v / 1e8).toFixed(2)}億`;
    if (Math.abs(v) >= 1e4) return `¥${(v / 1e4).toFixed(2)}万`;
  }
  return `¥${Math.round(v).toLocaleString("ja-JP")}`;
}

export default function PortfolioPage() {
  const { valuations, summary, usdJpy, loading, refresh } = usePortfolio();
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2.5">
            <Wallet className="w-7 h-7 text-indigo-500" />
            ポートフォリオ
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            所有株の評価額・損益を一覧で管理 (USD/JPY: {usdJpy.toFixed(2)})
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/transactions"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors shadow-sm text-sm"
          >
            <BookText className="w-4 h-4 text-indigo-500" />
            取引記録
          </Link>
          <button
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 disabled:opacity-50 transition-colors shadow-sm text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            更新
          </button>
        </div>
      </header>

      {summary && valuations.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <BigStat
              label="評価額"
              value={fmtJpy(summary.totalValueJpy)}
              tone="primary"
            />
            <BigStat
              label="本日の損益"
              value={`${summary.dayChangeJpy >= 0 ? "+" : ""}${fmtJpy(summary.dayChangeJpy, true)}`}
              sub={`${summary.dayChangePercent >= 0 ? "+" : ""}${summary.dayChangePercent.toFixed(2)}%`}
              tone={summary.dayChangeJpy >= 0 ? "up" : "down"}
            />
            <BigStat
              label="取得原価"
              value={fmtJpy(summary.totalCostJpy)}
            />
            <BigStat
              label="累計損益"
              value={`${summary.totalGainJpy >= 0 ? "+" : ""}${fmtJpy(summary.totalGainJpy, true)}`}
              sub={`${summary.totalGainPercent >= 0 ? "+" : ""}${summary.totalGainPercent.toFixed(2)}%`}
              tone={summary.totalGainJpy >= 0 ? "up" : "down"}
            />
          </div>
          {summary.annualDividendJpy > 0 && (
            <div className="rounded-2xl border border-amber-200/60 dark:border-amber-900/60 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-slate-900 p-5">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    💰 予想年間配当 (税引前)
                  </div>
                  <div className="font-mono font-bold text-3xl tabular-nums mt-1 text-amber-700 dark:text-amber-300">
                    {fmtJpy(summary.annualDividendJpy)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    ポートフォリオ利回り{" "}
                    <span className="font-mono font-semibold">
                      {summary.portfolioYield.toFixed(2)}%
                    </span>{" "}
                    · 配当銘柄 {summary.dividendCount} / {summary.count}
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  月平均: {fmtJpy(summary.annualDividendJpy / 12, true)}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {valuations.length > 0 && (
        <PortfolioHistory valuations={valuations} usdJpy={usdJpy} summary={summary} />
      )}

      {valuations.length > 0 && (
        <PortfolioRisk valuations={valuations} summary={summary} />
      )}

      {valuations.length > 0 && (
        <AIPortfolioDiagnosis valuations={valuations} summary={summary} />
      )}

      {valuations.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-sm">
          <div className="text-5xl mb-3 opacity-30">💼</div>
          <p className="text-slate-500 mb-3">
            ポートフォリオに銘柄が登録されていません
          </p>
          <p className="text-xs text-slate-400 mb-4">
            銘柄詳細ページの「保有を追加」ボタンから登録できます
          </p>
          <Link
            href="/"
            className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
          >
            銘柄を検索する →
          </Link>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60">
                  <th className="py-3 px-4 font-medium">銘柄</th>
                  <th className="py-3 px-4 text-right font-medium">数量</th>
                  <th className="py-3 px-4 text-right font-medium hidden md:table-cell">取得単価</th>
                  <th className="py-3 px-4 text-right font-medium">現在価格</th>
                  <th className="py-3 px-4 text-right font-medium">評価額 (¥)</th>
                  <th className="py-3 px-4 text-right font-medium">損益 (¥)</th>
                  <th className="py-3 px-4 text-right font-medium hidden md:table-cell">年間配当</th>
                  <th className="py-3 px-4 text-right font-medium hidden lg:table-cell">権利落ち日</th>
                  <th className="py-3 px-4 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {valuations.map((v) => {
                  const h = v.holding;
                  const name = getJpName(h.symbol) ?? h.name ?? h.symbol;
                  const gainUp = (v.gain ?? 0) >= 0;
                  const dayUp = (v.dayChange ?? 0) >= 0;
                  const cur = h.currency ?? "";
                  return (
                    <tr
                      key={h.symbol}
                      className="border-b border-slate-100 dark:border-slate-800/60 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <td className="py-3 px-4">
                        <Link
                          href={`/stock/${encodeURIComponent(h.symbol)}`}
                          className="block group"
                        >
                          <div className="font-mono font-semibold text-blue-600 dark:text-blue-400 group-hover:underline">
                            {h.symbol}
                          </div>
                          <div className="text-xs text-slate-500 truncate max-w-[200px]">
                            {name}
                          </div>
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {h.quantity.toLocaleString("ja-JP")}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400 hidden md:table-cell">
                        {formatNumber(h.avgCost)} <span className="text-xs">{cur}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {v.currentPrice !== null
                          ? formatNumber(v.currentPrice)
                          : "—"}{" "}
                        <span className="text-xs text-slate-500">{cur}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                        {v.marketValueJpy !== null
                          ? fmtJpy(v.marketValueJpy, true)
                          : "—"}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono tabular-nums font-semibold ${
                          v.gain === null
                            ? "text-slate-400"
                            : gainUp
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {v.gainJpy !== null ? (
                          <>
                            {gainUp ? "+" : ""}
                            {fmtJpy(v.gainJpy, true)}
                            <div className="text-xs font-normal">
                              ({gainUp ? "+" : ""}
                              {(v.gainPercent ?? 0).toFixed(2)}%)
                            </div>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums hidden md:table-cell">
                        {v.annualDividendJpy !== null &&
                        v.annualDividendJpy > 0 ? (
                          <>
                            <div className="text-amber-700 dark:text-amber-300 font-semibold">
                              {fmtJpy(v.annualDividendJpy, true)}
                            </div>
                            {v.dividendYield !== null && v.dividendYield > 0 && (
                              <div className="text-[10px] text-slate-500 font-normal">
                                利回り {(v.dividendYield * 100).toFixed(2)}%
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-xs text-slate-600 dark:text-slate-400 hidden lg:table-cell">
                        {v.exDividendDate
                          ? new Date(v.exDividendDate).toLocaleDateString(
                              "ja-JP",
                              {
                                year: "2-digit",
                                month: "2-digit",
                                day: "2-digit",
                              },
                            )
                          : v.dividendDate
                            ? new Date(v.dividendDate).toLocaleDateString(
                                "ja-JP",
                                {
                                  year: "2-digit",
                                  month: "2-digit",
                                  day: "2-digit",
                                },
                              )
                            : "—"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setEditing(h.symbol)}
                          className="p-1.5 text-slate-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40"
                          aria-label="編集"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && (
        <HoldingForm
          symbol={editing}
          name={
            getJpName(editing) ??
            valuations.find((v) => v.holding.symbol === editing)?.holding.name
          }
          currency={
            valuations.find((v) => v.holding.symbol === editing)?.holding.currency
          }
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function BigStat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "primary" | "up" | "down";
}) {
  const cls =
    tone === "up"
      ? "text-emerald-700 dark:text-emerald-400"
      : tone === "down"
        ? "text-rose-700 dark:text-rose-400"
        : "text-slate-900 dark:text-white";
  const bg =
    tone === "up"
      ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-900/60"
      : tone === "down"
        ? "bg-rose-50 dark:bg-rose-950/30 border-rose-200/60 dark:border-rose-900/60"
        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800";
  return (
    <div className={`p-4 rounded-2xl border shadow-sm ${bg}`}>
      <div className="text-[10px] uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className={`font-mono font-bold text-xl md:text-2xl tabular-nums mt-1 ${cls}`}>
        {value}
      </div>
      {sub && <div className={`text-xs font-mono ${cls}`}>{sub}</div>}
    </div>
  );
}
