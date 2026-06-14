"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, ExternalLink } from "lucide-react";
import type { InsiderTx } from "@/app/api/insider/route";

type InsiderResp = {
  symbol: string;
  transactions: InsiderTx[];
  supported: boolean;
  error?: boolean;
};

function fmtDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function fmtValue(v: number | null): string {
  if (v == null) return "";
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000)     return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)         return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toLocaleString()}`;
}

function fmtShares(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M株`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K株`;
  return `${n.toLocaleString()}株`;
}

function Summary({ txs }: { txs: InsiderTx[] }) {
  const buys  = txs.filter(t => t.isBuy);
  const sells = txs.filter(t => !t.isBuy);
  const buyVal  = buys.reduce((a, t) => a + (t.value ?? 0), 0);
  const sellVal = sells.reduce((a, t) => a + (t.value ?? 0), 0);

  return (
    <div className="grid grid-cols-2 gap-2 mb-4">
      <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 p-3 text-center">
        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mb-0.5">📈 買い</div>
        <div className="text-base font-black text-emerald-700 dark:text-emerald-300 tabular-nums">{fmtValue(buyVal)}</div>
        <div className="text-[10px] text-emerald-500">{buys.length}件</div>
      </div>
      <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 p-3 text-center">
        <div className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold mb-0.5">📉 売り</div>
        <div className="text-base font-black text-rose-700 dark:text-rose-300 tabular-nums">{fmtValue(sellVal)}</div>
        <div className="text-[10px] text-rose-500">{sells.length}件</div>
      </div>
    </div>
  );
}

export default function InsiderTrading({ symbol }: { symbol: string }) {
  const [data, setData] = useState<InsiderResp | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/insider?symbol=${encodeURIComponent(symbol)}`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [symbol]);

  // Loading
  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm animate-pulse">
        <div className="h-4 w-44 rounded bg-zinc-200 dark:bg-zinc-700 mb-3" />
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="h-16 rounded-xl bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-16 rounded-xl bg-zinc-100 dark:bg-zinc-800" />
        </div>
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-12 rounded bg-zinc-100 dark:bg-zinc-800" />)}
        </div>
      </div>
    );
  }

  // JP stocks or not supported
  if (!data || !data.supported) return null;

  // No recent transactions
  if (data.transactions.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        <div className="px-4 pt-3.5 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
            <span>👔</span> インサイダー取引（直近90日）
          </h3>
        </div>
        <div className="p-6 text-center">
          <p className="text-sm text-zinc-400">直近90日間のインサイダー取引は見つかりませんでした</p>
        </div>
      </div>
    );
  }

  // Net signal
  const buysTotal  = data.transactions.filter(t => t.isBuy).reduce((a, t) => a + (t.value ?? 0), 0);
  const sellsTotal = data.transactions.filter(t => !t.isBuy).reduce((a, t) => a + (t.value ?? 0), 0);
  const netBullish = buysTotal > sellsTotal;

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-3.5 pb-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
          <span>👔</span> インサイダー取引
          <span className="text-[10px] text-zinc-400 font-normal ml-1">直近90日 · SEC Form 4</span>
        </h3>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
          netBullish
            ? "text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/50"
            : "text-rose-700 bg-rose-100 dark:text-rose-300 dark:bg-rose-950/50"
        }`}>
          {netBullish ? "▲ 買越し" : "▼ 売越し"}
        </span>
      </div>

      <div className="p-4">
        <Summary txs={data.transactions} />

        {/* Transaction list */}
        <div className="space-y-2">
          {data.transactions.slice(0, 10).map((tx, i) => (
            <div
              key={i}
              className={`rounded-xl p-3 border ${
                tx.isBuy
                  ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30"
                  : "bg-rose-50/60 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30"
              }`}
            >
              <div className="flex items-start gap-2">
                <div className={`mt-0.5 shrink-0 w-6 h-6 rounded-lg flex items-center justify-center ${
                  tx.isBuy ? "bg-emerald-100 dark:bg-emerald-950/50" : "bg-rose-100 dark:bg-rose-950/50"
                }`}>
                  {tx.isBuy
                    ? <TrendingUp  className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    : <TrendingDown className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-100 truncate">
                      {tx.name}
                    </span>
                    <span className="text-[10px] text-zinc-400 shrink-0">{fmtDate(tx.date)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[10px] text-zinc-500">{tx.title}</span>
                    <span className={`text-[10px] font-bold ${tx.isBuy ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                      {tx.isBuy ? "買い" : "売り"} {fmtShares(tx.shares)}
                    </span>
                    {tx.price != null && (
                      <span className="text-[10px] text-zinc-400">@ ${tx.price.toFixed(2)}</span>
                    )}
                    {tx.value != null && (
                      <span className={`text-[10px] font-bold ${tx.isBuy ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                        {fmtValue(tx.value)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* SEC link */}
        <a
          href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${symbol}&type=4&dateb=&owner=include&count=20`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center gap-1 text-[10px] text-zinc-400 hover:text-blue-500 transition-colors w-fit"
        >
          <ExternalLink className="w-3 h-3" />
          SECでForm 4を確認
        </a>
      </div>
    </div>
  );
}
