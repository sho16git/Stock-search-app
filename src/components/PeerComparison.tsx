"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type PeerQuote = {
  symbol: string;
  name: string | null;
  price: number | null;
  changePercent: number | null;
  marketCap: number | null;
  trailingPE: number | null;
  priceToBook: number | null;
  returnOnEquity: number | null;
  dividendYield: number | null;
  currency: string | null;
};

function fmtCap(v: number | null): string {
  if (v == null) return "—";
  if (v >= 1e12) return `${(v / 1e12).toFixed(1)}兆`;
  if (v >= 1e8)  return `${(v / 1e8).toFixed(0)}億`;
  if (v >= 1e6)  return `${(v / 1e6).toFixed(0)}百万`;
  return v.toLocaleString();
}

function fmtNum(v: number | null, digits = 1): string {
  return v == null ? "—" : v.toFixed(digits);
}

function fmtPct(v: number | null): string {
  // Yahoo Finance returns dividendYield already as percentage (e.g. 6.18 = 6.18%)
  return v == null ? "—" : `${v.toFixed(2)}%`;
}

/** Color cell: low=good direction (green for lower is better), or high=good (green for higher is better) */
function cellColor(
  value: number | null,
  allValues: (number | null)[],
  direction: "low" | "high",
): string {
  if (value == null) return "text-slate-400";
  const valid = allValues.filter((v): v is number => v != null);
  if (valid.length < 2) return "text-slate-700 dark:text-slate-200";
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  if (min === max) return "text-slate-700 dark:text-slate-200";
  const isExtreme = direction === "low" ? value === min : value === max;
  const isWorst   = direction === "low" ? value === max : value === min;
  if (isExtreme) return "text-emerald-600 dark:text-emerald-400 font-semibold";
  if (isWorst)   return "text-rose-600 dark:text-rose-400";
  return "text-slate-700 dark:text-slate-200";
}

export default function PeerComparison({ symbol }: { symbol: string }) {
  const [peers, setPeers] = useState<PeerQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);

    // 1. Get peer symbols from existing /api/peers
    fetch(`/api/peers?symbol=${encodeURIComponent(symbol)}`)
      .then(r => r.json())
      .then(async (j) => {
        const peerSymbols: string[] = (j.peers ?? [])
          .map((p: { symbol?: string }) => p.symbol)
          .filter(Boolean)
          .slice(0, 4);

        // 2. Fetch fundamentals for target symbol + peers
        const allSymbols = [symbol, ...peerSymbols];
        const results = await Promise.all(
          allSymbols.map(s =>
            fetch(`/api/fundamentals?symbol=${encodeURIComponent(s)}`)
              .then(r => r.json())
              .then(j2 => ({
                symbol: s,
                name: null as string | null,
                price: null as number | null,
                changePercent: null as number | null,
                marketCap: (j2.current?.marketCap ?? null) as number | null,
                trailingPE: (j2.current?.trailingPE ?? null) as number | null,
                priceToBook: (j2.current?.priceToBook ?? null) as number | null,
                returnOnEquity: (j2.current?.returnOnEquity ?? null) as number | null,
                dividendYield: (j2.current?.dividendYield ?? null) as number | null,
                currency: (j2.current?.currency ?? null) as string | null,
              }))
              .catch(() => ({
                symbol: s,
                name: null,
                price: null,
                changePercent: null,
                marketCap: null,
                trailingPE: null,
                priceToBook: null,
                returnOnEquity: null,
                dividendYield: null,
                currency: null,
              }))
          )
        );

        // Enrich with name/price from peers response
        const peersMap = new Map(
          (j.peers ?? []).map((p: { symbol?: string; shortName?: string; longName?: string; price?: number; changePercent?: number; nameJa?: string }) => [
            p.symbol,
            { name: p.nameJa ?? p.shortName ?? p.longName ?? null, price: p.price ?? null, changePercent: p.changePercent ?? null },
          ])
        );

        const enriched: PeerQuote[] = results.map(r => {
          const peerData = peersMap.get(r.symbol) as { name: string | null; price: number | null; changePercent: number | null } | undefined;
          return {
            ...r,
            name: peerData?.name ?? r.name,
            price: peerData?.price ?? r.price,
            changePercent: peerData?.changePercent ?? r.changePercent,
          };
        });

        setPeers(enriched);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [symbol]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-4">
        <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-4" />
        <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || peers.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-4">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">競合比較</p>
        <p className="text-xs text-slate-400">競合データが取得できませんでした</p>
      </div>
    );
  }

  const peValues  = peers.map(p => p.trailingPE);
  const pbrValues = peers.map(p => p.priceToBook);
  const roeValues = peers.map(p => p.returnOnEquity);
  const divValues = peers.map(p => p.dividendYield);
  const capValues = peers.map(p => p.marketCap);

  const COLS = [
    { key: "name",          label: "銘柄",   width: "min-w-[100px]" },
    { key: "marketCap",     label: "時価総額", width: "min-w-[70px]" },
    { key: "changePercent", label: "騰落率",   width: "min-w-[60px]" },
    { key: "trailingPE",    label: "PER",      width: "min-w-[50px]" },
    { key: "priceToBook",   label: "PBR",      width: "min-w-[50px]" },
    { key: "returnOnEquity",label: "ROE",      width: "min-w-[50px]" },
    { key: "dividendYield", label: "配当利回り", width: "min-w-[70px]" },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800/60">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">競合比較</h3>
        <p className="text-[10px] text-slate-400 mt-0.5">緑=優位, 赤=劣位</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800">
              {COLS.map(col => (
                <th
                  key={col.key}
                  className={`${col.width} px-3 py-2 text-left text-[10px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {peers.map((p, idx) => {
              const isTarget = p.symbol === symbol;
              const up = (p.changePercent ?? 0) >= 0;
              return (
                <tr
                  key={p.symbol}
                  className={`border-b last:border-0 border-slate-50 dark:border-slate-800/50 ${
                    isTarget ? "bg-blue-50/60 dark:bg-blue-900/10" : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  } transition-colors`}
                >
                  {/* Name */}
                  <td className="px-3 py-2">
                    <Link href={`/stock/${encodeURIComponent(p.symbol)}`} className="hover:underline">
                      <div className={`font-mono font-semibold ${isTarget ? "text-blue-600 dark:text-blue-400" : "text-slate-700 dark:text-slate-200"}`}>
                        {p.symbol}
                        {isTarget && <span className="ml-1 text-[8px] px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">選択中</span>}
                      </div>
                      {p.name && <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{p.name}</div>}
                    </Link>
                  </td>
                  {/* Market Cap */}
                  <td className={`px-3 py-2 tabular-nums whitespace-nowrap ${cellColor(p.marketCap, capValues, "high")}`}>
                    {fmtCap(p.marketCap)}
                  </td>
                  {/* Change % */}
                  <td className={`px-3 py-2 tabular-nums font-mono ${up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                    {p.changePercent != null ? `${up ? "+" : ""}${p.changePercent.toFixed(2)}%` : "—"}
                  </td>
                  {/* PER */}
                  <td className={`px-3 py-2 tabular-nums ${cellColor(p.trailingPE, peValues, "low")}`}>
                    {fmtNum(p.trailingPE, 1)}
                  </td>
                  {/* PBR */}
                  <td className={`px-3 py-2 tabular-nums ${cellColor(p.priceToBook, pbrValues, "low")}`}>
                    {fmtNum(p.priceToBook, 2)}
                  </td>
                  {/* ROE */}
                  <td className={`px-3 py-2 tabular-nums ${cellColor(p.returnOnEquity, roeValues, "high")}`}>
                    {p.returnOnEquity != null ? `${(p.returnOnEquity * 100).toFixed(1)}%` : "—"}
                  </td>
                  {/* Dividend Yield */}
                  <td className={`px-3 py-2 tabular-nums ${cellColor(p.dividendYield, divValues, "high")}`}>
                    {fmtPct(p.dividendYield)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-2 text-[9px] text-slate-400 border-t border-slate-50 dark:border-slate-800/50">
        PER低=割安(緑) · PBR低=割安(緑) · ROE高=優良(緑) · 配当高=高利回り(緑)
      </div>
    </div>
  );
}
