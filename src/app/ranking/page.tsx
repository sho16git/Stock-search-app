"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingUp } from "lucide-react";

type RankingType = "dividend" | "low-per" | "high-roe" | "52w-high";
type Market = "JP" | "US";

type RankItem = {
  symbol: string;
  shortName: string | null;
  price: number | null;
  changePercent: number | null;
  marketCap: number | null;
  trailingPE: number | null;
  dividendYield: number | null;
  fiftyTwoWeekHigh: number | null;
  regularMarketPrice: number | null;
};

const RANK_TABS: { key: RankingType; label: string; desc: string }[] = [
  { key: "dividend",  label: "配当利回り",    desc: "配当利回りが高い銘柄" },
  { key: "low-per",   label: "低PER",         desc: "PERが低い(割安)銘柄" },
  { key: "high-roe",  label: "高ROE",         desc: "収益性が高い銘柄" },
  { key: "52w-high",  label: "52週高値更新",   desc: "52週高値に近い銘柄" },
];

function fmtCap(v: number | null): string {
  if (v == null) return "—";
  if (v >= 1e12) return `${(v / 1e12).toFixed(1)}兆`;
  if (v >= 1e8)  return `${(v / 1e8).toFixed(0)}億`;
  if (v >= 1e6)  return `${(v / 1e6).toFixed(0)}百万`;
  return v.toLocaleString();
}

function fmtPrice(v: number | null): string {
  if (v == null) return "—";
  return v.toLocaleString("ja-JP", { maximumFractionDigits: 2 });
}

export default function RankingPage() {
  const [tab, setTab]         = useState<RankingType>("dividend");
  const [market, setMarket]   = useState<Market>("US");
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
            {(["US", "JP"] as Market[]).map(m => (
              <button
                key={m}
                onClick={() => setMarket(m)}
                className={`px-3 py-1 rounded-md font-semibold transition-all ${
                  market === m
                    ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white"
                    : "text-slate-500"
                }`}
              >
                {m === "US" ? "米国株" : "日本株"}
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
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-500 dark:text-slate-400 w-8">#</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-500 dark:text-slate-400 min-w-[120px]">銘柄</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-slate-500 dark:text-slate-400 min-w-[70px]">株価</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-slate-500 dark:text-slate-400 min-w-[60px]">騰落率</th>
                  {tab === "dividend"  && <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-slate-500 dark:text-slate-400 min-w-[70px]">配当利回り</th>}
                  {tab === "low-per"   && <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-slate-500 dark:text-slate-400 min-w-[50px]">PER</th>}
                  {tab === "high-roe"  && <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-slate-500 dark:text-slate-400 min-w-[50px]">PER</th>}
                  {tab === "52w-high"  && <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-slate-500 dark:text-slate-400 min-w-[70px]">52週高値比</th>}
                  <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-slate-500 dark:text-slate-400 min-w-[70px]">時価総額</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const up = (item.changePercent ?? 0) >= 0;
                  const ratio52w = item.fiftyTwoWeekHigh
                    ? ((item.regularMarketPrice ?? 0) / item.fiftyTwoWeekHigh) * 100
                    : null;
                  return (
                    <tr
                      key={item.symbol}
                      className="border-b last:border-0 border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-3 py-2.5 text-slate-400 font-mono tabular-nums">{idx + 1}</td>
                      <td className="px-3 py-2.5">
                        <Link href={`/stock/${encodeURIComponent(item.symbol)}`} className="hover:underline block">
                          <div className="font-mono font-semibold text-blue-600 dark:text-blue-400">{item.symbol}</div>
                          {item.shortName && (
                            <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{item.shortName}</div>
                          )}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-mono text-slate-700 dark:text-slate-200">
                        {fmtPrice(item.price)}
                      </td>
                      <td className={`px-3 py-2.5 text-right tabular-nums font-mono ${up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                        {item.changePercent != null ? `${up ? "+" : ""}${item.changePercent.toFixed(2)}%` : "—"}
                      </td>
                      {tab === "dividend" && (
                        <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                          {item.dividendYield != null ? `${item.dividendYield.toFixed(2)}%` : "—"}
                        </td>
                      )}
                      {tab === "low-per" && (
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {item.trailingPE != null ? item.trailingPE.toFixed(1) : "—"}
                        </td>
                      )}
                      {tab === "high-roe" && (
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {item.trailingPE != null ? item.trailingPE.toFixed(1) : "—"}
                        </td>
                      )}
                      {tab === "52w-high" && (
                        <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-blue-600 dark:text-blue-400">
                          {ratio52w != null ? `${ratio52w.toFixed(1)}%` : "—"}
                        </td>
                      )}
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-500 dark:text-slate-400">
                        {fmtCap(item.marketCap)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
