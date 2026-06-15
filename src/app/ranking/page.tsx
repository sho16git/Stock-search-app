"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingUp } from "lucide-react";

type RankingType = "dividend" | "low-per" | "high-roe" | "52w-high";
type Market = "JP" | "US";

type RankItem = {
  symbol: string;
  shortName: string | null;
  nameJa: string | null;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  marketCap: number | null;
  trailingPE: number | null;
  dividendYield: number | null;
  fiftyTwoWeekHigh: number | null;
  regularMarketPrice: number | null;
  roe: number | null;
};

const RANK_TABS: { key: RankingType; label: string; desc: string }[] = [
  { key: "dividend",  label: "配当利回り",    desc: "配当利回りが高い銘柄" },
  { key: "low-per",   label: "低PER",         desc: "PERが低い(割安)銘柄" },
  { key: "high-roe",  label: "高ROE",         desc: "収益性が高い銘柄" },
  { key: "52w-high",  label: "52週高値更新",   desc: "52週高値に近い銘柄" },
];

function fmtPrice(v: number | null): string {
  if (v == null) return "—";
  return v.toLocaleString("ja-JP", { maximumFractionDigits: 2 });
}

/** 前日比(変化額)。API値が無い場合は価格と騰落率から算出。 */
function changeAmount(item: RankItem): number | null {
  if (item.change != null) return item.change;
  if (item.price != null && item.changePercent != null) {
    const r = item.changePercent / 100;
    return item.price - item.price / (1 + r);
  }
  return null;
}

function fmtChange(v: number | null): string {
  if (v == null) return "—";
  const a = Math.abs(v);
  return a.toLocaleString("ja-JP", { maximumFractionDigits: a < 10 ? 2 : a < 100 ? 1 : 0 });
}

export default function RankingPage() {
  const [tab, setTab]         = useState<RankingType>("dividend");
  const [market, setMarket]   = useState<Market>("JP");
  const [items, setItems]     = useState<RankItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setItems([]);
    fetch(`/api/ranking?type=${tab}&market=${market}`)
      .then(r => r.json())
      .then(j => setItems(j.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [tab, market]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:-translate-x-0.5 transition-all duration-150"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          トップ
        </Link>
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-500" />
          ランキング
        </h1>
      </div>

      {/* Controls */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {/* Market toggle */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800/60">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium shrink-0">市場</span>
          <div className="flex gap-0.5 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
            {(["JP", "US"] as Market[]).map(m => (
              <button
                key={m}
                onClick={() => setMarket(m)}
                className={`px-3 py-1 rounded-md font-semibold transition-all ${
                  market === m
                    ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white"
                    : "text-slate-500"
                }`}
              >
                {m === "JP" ? "🇯🇵 日本株" : "🇺🇸 米国株"}
              </button>
            ))}
          </div>
        </div>

        {/* Type tabs */}
        <div className="flex overflow-x-auto scrollbar-none border-b border-slate-100 dark:border-slate-800/60">
          {RANK_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-shrink-0 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
                tab === t.key
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Description */}
        <div className="px-4 py-2 text-[10px] text-slate-400">
          {RANK_TABS.find(t => t.key === tab)?.desc}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">データが取得できませんでした</div>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
            {items.map((item, idx) => {
              const up = (item.changePercent ?? 0) >= 0;
              const chg = changeAmount(item);
              const ratio52w = item.fiftyTwoWeekHigh
                ? ((item.regularMarketPrice ?? 0) / item.fiftyTwoWeekHigh) * 100
                : null;
              const metric =
                tab === "dividend" ? { label: "配当", value: item.dividendYield != null ? `${item.dividendYield.toFixed(2)}%` : "—", cls: "text-emerald-600 dark:text-emerald-400" }
                : tab === "low-per" ? { label: "PER", value: item.trailingPE != null ? item.trailingPE.toFixed(1) : "—", cls: "text-slate-700 dark:text-slate-200" }
                : tab === "high-roe" ? { label: "ROE", value: item.roe != null ? `${(item.roe * 100).toFixed(1)}%` : "—", cls: "text-emerald-600 dark:text-emerald-400" }
                : { label: "52W比", value: ratio52w != null ? `${ratio52w.toFixed(1)}%` : "—", cls: "text-blue-600 dark:text-blue-400" };
              return (
                <Link
                  key={item.symbol}
                  href={`/stock/${encodeURIComponent(item.symbol)}`}
                  className="flex items-center gap-2 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {/* rank */}
                  <span className="w-5 shrink-0 text-center text-[11px] font-mono tabular-nums text-slate-400">{idx + 1}</span>
                  {/* 銘柄 */}
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[11px] font-semibold text-blue-600 dark:text-blue-400 leading-tight">{item.symbol}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate leading-tight">{item.nameJa ?? item.shortName ?? ""}</div>
                  </div>
                  {/* ランキング指標 */}
                  <div className="shrink-0 w-12 text-right">
                    <div className="text-[8px] text-slate-400 leading-none">{metric.label}</div>
                    <div className={`text-[11px] font-bold tabular-nums leading-tight ${metric.cls}`}>{metric.value}</div>
                  </div>
                  {/* 価格 + 前日比 */}
                  <div className="shrink-0 w-[88px] text-right font-mono tabular-nums">
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-tight">{fmtPrice(item.price)}</div>
                    <div className={`text-[10px] leading-tight ${up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                      {up ? "+" : "−"}{fmtChange(chg)}
                      <span className="ml-0.5">({up ? "+" : ""}{item.changePercent != null ? item.changePercent.toFixed(2) : "—"}%)</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
