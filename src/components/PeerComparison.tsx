"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PeerRow } from "@/app/api/peer-comparison/route";
import AIInsight from "@/components/AIInsight";

function Metric({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <div className="rounded-md bg-zinc-50 dark:bg-zinc-800/40 py-1">
      <div className="text-[8px] text-zinc-400 leading-none">{label}</div>
      <div className={`text-[11px] font-semibold tabular-nums leading-tight mt-0.5 ${cls}`}>{value}</div>
    </div>
  );
}

function fmtCap(v: number | null): string {
  if (v == null) return "—";
  if (v >= 1e12) return `${(v / 1e12).toLocaleString("ja-JP", { maximumFractionDigits: 1 })}兆`;
  if (v >= 1e8) {
    const oku = v / 1e8;
    return `${oku >= 100 ? Math.round(oku).toLocaleString("ja-JP") : oku.toFixed(1)}億`;
  }
  if (v >= 1e6)  return `${(v / 1e6).toFixed(0)}百万`;
  return v.toLocaleString();
}

function fmtNum(v: number | null, digits = 1): string {
  return v == null ? "—" : v.toFixed(digits);
}

function fmtPct(v: number | null): string {
  if (v == null) return "—";
  // dividendYield comes as decimal (0.0037 = 0.37%)
  return `${(v * 100).toFixed(2)}%`;
}

/** Color cell: low=good (green for lower) or high=good (green for higher) */
function cellColor(
  value: number | null,
  allValues: (number | null)[],
  direction: "low" | "high",
): string {
  if (value == null) return "text-zinc-400";
  const valid = allValues.filter((v): v is number => v != null);
  if (valid.length < 2) return "text-zinc-700 dark:text-zinc-200";
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  if (min === max) return "text-zinc-700 dark:text-zinc-200";
  const isExtreme = direction === "low" ? value === min : value === max;
  const isWorst   = direction === "low" ? value === max : value === min;
  if (isExtreme) return "text-emerald-600 dark:text-emerald-400 font-semibold";
  if (isWorst)   return "text-rose-600 dark:text-rose-400";
  return "text-zinc-700 dark:text-zinc-200";
}

export default function PeerComparison({ symbol }: { symbol: string }) {
  const [peers, setPeers] = useState<PeerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/peer-comparison?symbol=${encodeURIComponent(symbol)}`)
      .then(r => r.json())
      .then(j => setPeers(j.peers ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [symbol]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-4 animate-pulse">
        <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-700 rounded mb-4" />
        <div className="h-32 bg-zinc-100 dark:bg-zinc-800 rounded-xl" />
      </div>
    );
  }

  if (peers.length === 0) return null;

  const peValues  = peers.map(p => p.trailingPE);
  const pbrValues = peers.map(p => p.priceToBook);
  const roeValues = peers.map(p => p.returnOnEquity);
  const divValues = peers.map(p => p.dividendYield);
  const capValues = peers.map(p => p.marketCap);

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-3.5 pb-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
          <span>⚔️</span> 競合比較
        </h3>
        <span className="text-[10px] text-zinc-400">緑=優位 · 赤=劣位</span>
      </div>

      <div className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
        {peers.map(p => {
          const isTarget = p.symbol === symbol;
          const up = (p.changePercent ?? 0) >= 0;
          return (
            <div
              key={p.symbol}
              className={`px-3 py-2.5 ${isTarget ? "bg-blue-50/70 dark:bg-blue-950/20" : ""}`}
            >
              {/* 1段目: 銘柄 + 騰落率 */}
              <div className="flex items-center justify-between gap-2">
                <Link href={`/stock/${encodeURIComponent(p.symbol)}`} className="min-w-0 flex-1">
                  <span className={`font-mono font-bold text-[11px] ${isTarget ? "text-blue-600 dark:text-blue-400" : "text-zinc-700 dark:text-zinc-200"}`}>
                    {p.symbol}
                    {isTarget && (
                      <span className="ml-1 text-[8px] px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 align-middle">
                        選択中
                      </span>
                    )}
                  </span>
                  {(p.nameJa ?? p.name) && (
                    <span className="ml-1.5 text-[10px] text-zinc-400">{p.nameJa ?? p.name}</span>
                  )}
                </Link>
                <span className={`shrink-0 text-xs font-mono font-semibold tabular-nums ${up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {p.changePercent != null ? `${up ? "+" : ""}${p.changePercent.toFixed(2)}%` : "—"}
                </span>
              </div>
              {/* 2段目: 時価総額 / PER / PBR / ROE / 配当 */}
              <div className="mt-1.5 grid grid-cols-5 gap-1 text-center">
                <Metric label="時価" value={fmtCap(p.marketCap)} cls={cellColor(p.marketCap, capValues, "high")} />
                <Metric label="PER" value={fmtNum(p.trailingPE, 1)} cls={cellColor(p.trailingPE, peValues, "low")} />
                <Metric label="PBR" value={fmtNum(p.priceToBook, 2)} cls={cellColor(p.priceToBook, pbrValues, "low")} />
                <Metric label="ROE" value={p.returnOnEquity != null ? `${(p.returnOnEquity * 100).toFixed(1)}%` : "—"} cls={cellColor(p.returnOnEquity, roeValues, "high")} />
                <Metric label="配当" value={fmtPct(p.dividendYield)} cls={cellColor(p.dividendYield, divValues, "high")} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-4 py-2 text-[9px] text-zinc-400 border-t border-zinc-50 dark:border-zinc-800/50">
        PER低=割安(緑) · PBR低=割安(緑) · ROE高=優良(緑) · 配当高=高利回り(緑)
      </div>

      {peers.length >= 2 && (
        <div className="px-4 pb-4">
          <AIInsight
            label="AIで割安/割高を判定"
            endpoint="/api/ai-peer-verdict"
            payload={{ symbol, peers }}
          />
        </div>
      )}
    </div>
  );
}
