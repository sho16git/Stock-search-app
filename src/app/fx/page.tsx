"use client";

import { useEffect, useState, useRef } from "react";
import { RefreshCw } from "lucide-react";

type FxPair = {
  symbol: string;
  name: string;
  from: string;
  to: string;
  flag: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  high: number | null;
  low: number | null;
  open: number | null;
};

const GROUP_JPY = ["JPY=X","EURJPY=X","GBPJPY=X","AUDJPY=X","CADJPY=X","CHFJPY=X","CNHJPY=X","NZDJPY=X"];
const GROUP_USD = ["EURUSD=X","GBPUSD=X","AUDUSD=X","USDCNH=X"];

function fmt(v: number | null, decimals = 2): string {
  if (v == null) return "—";
  return v.toLocaleString("ja-JP", { minimumFractionDigits: decimals, maximumFractionDigits: decimals + 1 });
}

export default function FxPage() {
  const [pairs, setPairs]     = useState<FxPair[]>([]);
  const [loading, setLoading] = useState(true);
  const prevRef = useRef<Record<string, number>>({});
  const [flash, setFlash]     = useState<Record<string, "up" | "down">>({});

  const load = () => {
    setLoading(true);
    fetch("/api/fx")
      .then((r) => r.json())
      .then((j) => {
        setPairs((prev) => {
          const map: Record<string, number> = {};
          for (const p of prev) if (p.price != null) map[p.symbol] = p.price;
          prevRef.current = map;
          return j.pairs ?? [];
        });
        // Flash changed items
        setFlash((prev) => {
          const next = { ...prev };
          for (const p of (j.pairs ?? []) as FxPair[]) {
            const old = prevRef.current[p.symbol];
            if (old != null && p.price != null && old !== p.price) {
              next[p.symbol] = p.price > old ? "up" : "down";
            }
          }
          return next;
        });
        setTimeout(() => setFlash({}), 1200);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const jpy = pairs.filter((p) => GROUP_JPY.includes(p.symbol));
  const usd = pairs.filter((p) => GROUP_USD.includes(p.symbol));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black flex items-center gap-2">
            <span className="inline-flex w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 items-center justify-center text-white shadow-lg shadow-blue-500/20 text-lg">💱</span>
            <span className="bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">
              FX為替レート
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 ml-11">主要通貨ペアのリアルタイムレート</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white inline-flex items-center gap-1 transition-colors disabled:opacity-50 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Main USD/JPY hero */}
      {jpy[0] && <HeroPair pair={jpy[0]} flashClass={flash[jpy[0].symbol] ? (flash[jpy[0].symbol] === "up" ? "flash-up" : "flash-down") : ""} />}

      {/* JPY pairs grid */}
      <section>
        <h2 className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-2.5 flex items-center gap-1.5">
          <span>🇯🇵</span> 対円レート
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {jpy.slice(1).map((p) => (
            <PairCard key={p.symbol} pair={p} flashClass={flash[p.symbol] ? (flash[p.symbol] === "up" ? "flash-up" : "flash-down") : ""} />
          ))}
        </div>
      </section>

      {/* USD crosses */}
      <section>
        <h2 className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-2.5 flex items-center gap-1.5">
          <span>🇺🇸</span> ドルクロス
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {usd.map((p) => (
            <PairCard key={p.symbol} pair={p} flashClass={flash[p.symbol] ? (flash[p.symbol] === "up" ? "flash-up" : "flash-down") : ""} />
          ))}
        </div>
      </section>

      <p className="text-[10px] text-slate-400 text-right">30秒ごと自動更新 · Yahoo Finance</p>
    </div>
  );
}

function HeroPair({ pair, flashClass }: { pair: FxPair; flashClass: string }) {
  const up = (pair.change ?? 0) >= 0;
  return (
    <div className={`rounded-2xl overflow-hidden shadow-md ${flashClass}`}>
      <div className={`h-2 w-full bg-gradient-to-r ${up ? "from-emerald-500 to-teal-400" : "from-rose-500 to-pink-400"}`} />
      <div className="bg-white dark:bg-slate-900 border border-t-0 border-slate-200 dark:border-slate-800 rounded-b-2xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs text-slate-500 flex items-center gap-1.5 mb-1">
              <span className="text-base">{pair.flag}</span>
              <span className="font-medium">{pair.name}</span>
            </div>
            <div className="font-mono font-black text-4xl sm:text-5xl tabular-nums tracking-tight">
              {fmt(pair.price, 2)}
            </div>
            <div className={`inline-flex items-center gap-1 mt-1.5 font-mono font-bold text-base px-3 py-1 rounded-xl ${
              up ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                 : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300"}`}>
              {up ? "▲" : "▼"} {fmt(Math.abs(pair.change ?? 0), 2)} ({up ? "+" : ""}{pair.changePercent?.toFixed(2) ?? "—"}%)
            </div>
          </div>
          <div className="text-right space-y-1.5">
            <div className="text-xs text-slate-500">始値 <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{fmt(pair.open, 2)}</span></div>
            <div className="text-xs text-slate-500">高値 <span className="font-mono font-semibold text-emerald-600">{fmt(pair.high, 2)}</span></div>
            <div className="text-xs text-slate-500">安値 <span className="font-mono font-semibold text-rose-600">{fmt(pair.low, 2)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PairCard({ pair, flashClass }: { pair: FxPair; flashClass: string }) {
  const up = (pair.change ?? 0) >= 0;
  return (
    <div className={`rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-sm hover:shadow-md transition-shadow ${flashClass}`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-sm">{pair.flag}</span>
        <span className="text-[11px] text-slate-500 font-medium truncate">{pair.name}</span>
      </div>
      <div className="font-mono font-black text-lg tabular-nums">{fmt(pair.price, 2)}</div>
      <div className={`text-xs font-mono font-bold mt-0.5 ${up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
        {up ? "▲" : "▼"} {pair.changePercent?.toFixed(2) ?? "—"}%
      </div>
    </div>
  );
}
