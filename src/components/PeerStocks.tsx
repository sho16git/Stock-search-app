"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Network } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { getJpName } from "@/lib/jp-stocks";

type Peer = {
  symbol: string;
  shortName: string | null;
  longName: string | null;
  nameJa?: string | null;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  currency: string | null;
  marketCap: number | null;
};

export default function PeerStocks({ symbol }: { symbol: string }) {
  const [peers, setPeers] = useState<Peer[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setPeers(null);
    fetch(`/api/peers?symbol=${encodeURIComponent(symbol)}`, {
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then((j) => {
        if (!j.error) setPeers(j.peers ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [symbol]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="text-sm text-slate-400">関連銘柄を読み込み中…</div>
      </div>
    );
  }

  if (!peers || peers.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
      <h2 className="text-base font-semibold tracking-tight flex items-center gap-2 mb-4">
        <Network className="w-4 h-4 text-slate-500" />
        関連銘柄
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {peers.map((p) => {
          const up = (p.change ?? 0) >= 0;
          const name =
            getJpName(p.symbol) ?? p.nameJa ?? p.longName ?? p.shortName;
          return (
            <Link
              key={p.symbol}
              href={`/stock/${encodeURIComponent(p.symbol)}`}
              className="group flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-800/20 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:border-blue-200 dark:hover:border-blue-800 transition-all"
            >
              <div className="min-w-0 flex-1">
                <div className="font-mono font-semibold text-sm text-blue-600 dark:text-blue-400">
                  {p.symbol}
                </div>
                <div className="text-xs text-slate-500 truncate">{name}</div>
              </div>
              <div className="text-right">
                <div className="font-mono font-semibold text-sm tabular-nums">
                  {formatNumber(p.price)}
                  <span className="text-[10px] text-slate-500 ml-0.5">
                    {p.currency}
                  </span>
                </div>
                <div
                  className={`text-xs font-mono font-semibold ${
                    up
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {p.changePercent !== null
                    ? `${up ? "+" : ""}${p.changePercent.toFixed(2)}%`
                    : "—"}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
