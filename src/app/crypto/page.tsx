"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";

type Coin = {
  symbol: string;
  name: string;
  nameEn: string;
  emoji: string;
  color: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  high24h: number | null;
  low24h: number | null;
  volume: number | null;
  marketCap: number | null;
  marketCapStr: string | null;
};

function fmtPrice(v: number | null): string {
  if (v == null) return "—";
  if (v >= 1000) return v.toLocaleString("ja-JP", { maximumFractionDigits: 0 });
  if (v >= 1)    return v.toLocaleString("ja-JP", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return v.toLocaleString("ja-JP", { minimumFractionDigits: 4, maximumFractionDigits: 8 });
}

export default function CryptoPage() {
  const [coins, setCoins]     = useState<Coin[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch("/api/crypto")
      .then((r) => r.json())
      .then((j) => setCoins(j.coins ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const btc = coins[0];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black flex items-center gap-2">
            <span className="inline-flex w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 items-center justify-center text-white shadow-lg shadow-orange-500/20 text-lg">₿</span>
            <span className="bg-gradient-to-r from-orange-600 to-amber-600 dark:from-orange-400 dark:to-amber-400 bg-clip-text text-transparent">
              仮想通貨
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 ml-11">主要暗号資産のリアルタイム価格</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* BTC Hero */}
      {btc && (
        <div className={`rounded-2xl overflow-hidden shadow-md`}>
          <div className={`h-2 bg-gradient-to-r ${btc.color}`} />
          <div className="bg-white dark:bg-slate-900 border border-t-0 border-slate-200 dark:border-slate-800 rounded-b-2xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{btc.emoji}</span>
                  <div>
                    <div className="font-bold text-base">{btc.name}</div>
                    <div className="text-xs text-slate-500">{btc.nameEn}</div>
                  </div>
                </div>
                <div className="font-mono font-black text-3xl sm:text-4xl tabular-nums mt-2">
                  ${fmtPrice(btc.price)}
                </div>
                <div className={`inline-flex items-center gap-1 mt-2 font-mono font-bold px-3 py-1 rounded-xl ${
                  (btc.change ?? 0) >= 0
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                    : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300"
                }`}>
                  {(btc.change ?? 0) >= 0 ? "▲" : "▼"} {Math.abs(btc.changePercent ?? 0).toFixed(2)}%
                </div>
              </div>
              <div className="text-right space-y-1.5">
                {btc.marketCapStr && (
                  <div className="text-xs text-slate-500">時価総額<br /><span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm">{btc.marketCapStr}</span></div>
                )}
                <div className="text-xs text-slate-500">24h高値<br /><span className="font-mono font-semibold text-emerald-600">${fmtPrice(btc.high24h)}</span></div>
                <div className="text-xs text-slate-500">24h安値<br /><span className="font-mono font-semibold text-rose-600">${fmtPrice(btc.low24h)}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All coins table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900">
                <th className="py-3 px-4 font-medium">#</th>
                <th className="py-3 px-2 font-medium">通貨</th>
                <th className="py-3 px-4 font-medium text-right">価格 (USD)</th>
                <th className="py-3 px-4 font-medium text-right">24h変動</th>
                <th className="py-3 px-4 font-medium text-right hidden sm:table-cell">時価総額</th>
              </tr>
            </thead>
            <tbody>
              {(loading && coins.length === 0 ? Array(8).fill(null) : coins).map((coin, i) => {
                if (!coin) return (
                  <tr key={i} className="border-b border-slate-100 dark:border-slate-800/60">
                    <td className="py-3 px-4"><div className="skeleton h-4 w-4 rounded" /></td>
                    <td className="py-3 px-2"><div className="skeleton h-4 w-24 rounded" /></td>
                    <td className="py-3 px-4"><div className="skeleton h-4 w-16 rounded ml-auto" /></td>
                    <td className="py-3 px-4"><div className="skeleton h-4 w-12 rounded ml-auto" /></td>
                    <td className="py-3 px-4 hidden sm:table-cell"><div className="skeleton h-4 w-14 rounded ml-auto" /></td>
                  </tr>
                );
                const up = (coin.change ?? 0) >= 0;
                return (
                  <tr key={coin.symbol} className="border-b border-slate-100 dark:border-slate-800/60 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-slate-400 text-xs font-mono">{i + 1}</td>
                    <td className="py-3 px-2">
                      <Link href={`/stock/${encodeURIComponent(coin.symbol)}`} className="flex items-center gap-2 group">
                        <span className="inline-flex w-8 h-8 rounded-xl bg-gradient-to-br items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm"
                          style={{ background: `linear-gradient(135deg, var(--tw-gradient-from), var(--tw-gradient-to))` }}
                        >
                          <span className={`w-8 h-8 rounded-xl bg-gradient-to-br ${coin.color} flex items-center justify-center text-sm`}>{coin.emoji}</span>
                        </span>
                        <div>
                          <div className="font-bold text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{coin.name}</div>
                          <div className="text-xs text-slate-400">{coin.nameEn}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold tabular-nums">
                      ${fmtPrice(coin.price)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`inline-block font-mono font-bold text-xs px-2 py-1 rounded-lg tabular-nums ${
                        up ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                           : "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400"
                      }`}>
                        {up ? "▲" : "▼"} {Math.abs(coin.changePercent ?? 0).toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-slate-500 font-mono hidden sm:table-cell">
                      {coin.marketCapStr ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[10px] text-slate-400 text-right">30秒ごと自動更新 · Yahoo Finance</p>
    </div>
  );
}
