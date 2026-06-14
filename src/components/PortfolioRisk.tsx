"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, Activity, TrendingDown, Layers } from "lucide-react";
import type { HoldingValuation, PortfolioSummary } from "@/lib/portfolio";
import { getJpName } from "@/lib/jp-stocks";
import { getUsKatakana } from "@/lib/us-katakana";

type Series = { symbol: string; weight: number; dates: string[]; returns: number[]; map: Map<string, number> };

type RiskResult = {
  volatility: number;          // 年率 %
  maxDrawdown: number;         // %
  topWeight: number;           // %
  topSymbol: string;
  hhi: number;                 // 0..1
  avgCorr: number | null;      // -1..1
  corr: { a: string; b: string; v: number }[];
  symbols: string[];
};

const num = (s: string) => getJpName(s) ?? getUsKatakana(s) ?? s;

function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  const v = xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(v);
}
function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 3) return 0;
  const ax = a.slice(-n), bx = b.slice(-n);
  const ma = ax.reduce((s, x) => s + x, 0) / n, mb = bx.reduce((s, x) => s + x, 0) / n;
  let num2 = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { const x = ax[i] - ma, y = bx[i] - mb; num2 += x * y; da += x * x; db += y * y; }
  return da > 0 && db > 0 ? num2 / Math.sqrt(da * db) : 0;
}

export default function PortfolioRisk({
  valuations, summary,
}: {
  valuations: HoldingValuation[];
  summary: PortfolioSummary | null;
}) {
  const [risk, setRisk] = useState<RiskResult | null>(null);
  const [loading, setLoading] = useState(true);
  const holdingsKey = valuations.map((v) => v.holding.symbol).join(",");

  useEffect(() => {
    if (valuations.length === 0 || !summary || summary.totalValueJpy <= 0) { setRisk(null); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const total = summary.totalValueJpy;
      const series: Series[] = (await Promise.all(valuations.map(async (v) => {
        const weight = (v.marketValueJpy ?? 0) / total;
        if (weight <= 0) return null;
        try {
          const j = await (await fetch(`/api/chart?symbol=${encodeURIComponent(v.holding.symbol)}&range=1y`)).json();
          const data = (j.data ?? []) as { date: string; close: number }[];
          const map = new Map<string, number>();
          const dates: string[] = [];
          const closes: number[] = [];
          for (const d of data) { const dt = d.date.slice(0, 10); if (d.close != null) { map.set(dt, d.close); dates.push(dt); closes.push(d.close); } }
          const returns = closes.slice(1).map((c, i) => (c - closes[i]) / closes[i]);
          return { symbol: v.holding.symbol, weight, dates: dates.slice(1), returns, map };
        } catch { return null; }
      }))).filter((s): s is Series => s != null && s.returns.length > 5);

      if (cancelled) return;
      if (series.length === 0) { setRisk(null); setLoading(false); return; }

      // renormalize weights over the series we actually have
      const wSum = series.reduce((a, s) => a + s.weight, 0) || 1;
      series.forEach((s) => (s.weight = s.weight / wSum));

      // intersection of dates → portfolio daily returns
      const common = series.reduce<string[]>((acc, s, i) => {
        if (i === 0) return [...s.map.keys()];
        const set = new Set(s.dates);
        return acc.filter((d) => set.has(d));
      }, []).sort();
      const retByDate = series.map((s) => {
        const m = new Map<string, number>();
        let prev: number | null = null;
        for (const d of [...s.map.keys()].sort()) {
          const c = s.map.get(d)!;
          if (prev != null) m.set(d, (c - prev) / prev);
          prev = c;
        }
        return m;
      });
      const portRet: number[] = [];
      for (const d of common) {
        let r = 0; let ok = true;
        series.forEach((s, i) => { const rr = retByDate[i].get(d); if (rr == null) ok = false; else r += s.weight * rr; });
        if (ok) portRet.push(r);
      }

      const volatility = stdev(portRet) * Math.sqrt(252) * 100;

      // max drawdown from cumulative portfolio value
      let peak = 1, cum = 1, maxDD = 0;
      for (const r of portRet) { cum *= 1 + r; if (cum > peak) peak = cum; const dd = (peak - cum) / peak; if (dd > maxDD) maxDD = dd; }

      // concentration
      const sorted = [...series].sort((a, b) => b.weight - a.weight);
      const topWeight = sorted[0].weight * 100;
      const hhi = series.reduce((a, s) => a + s.weight ** 2, 0);

      // pairwise correlation
      const corr: { a: string; b: string; v: number }[] = [];
      let corrSum = 0, corrN = 0;
      for (let i = 0; i < series.length; i++) {
        for (let k = i + 1; k < series.length; k++) {
          // align on common dates of the pair
          const dsB = new Set(series[k].dates);
          const aRet: number[] = [], bRet: number[] = [];
          series[i].dates.forEach((d, idx) => { if (dsB.has(d)) { const bv = retByDate[k].get(d); const av = series[i].returns[idx]; if (bv != null) { aRet.push(av); bRet.push(bv); } } });
          const v = pearson(aRet, bRet);
          corr.push({ a: series[i].symbol, b: series[k].symbol, v });
          corrSum += v; corrN++;
        }
      }

      setRisk({
        volatility, maxDrawdown: maxDD * 100, topWeight, topSymbol: sorted[0].symbol,
        hhi, avgCorr: corrN ? corrSum / corrN : null, corr, symbols: series.map((s) => s.symbol),
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [holdingsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (valuations.length === 0) return null;

  const volLabel = (v: number) => v < 15 ? "低" : v < 25 ? "中" : v < 40 ? "やや高" : "高";
  const corrColor = (v: number) => {
    if (v >= 0.7) return "bg-rose-500";
    if (v >= 0.4) return "bg-amber-400";
    if (v >= 0) return "bg-emerald-400";
    return "bg-blue-400";
  };
  const divScore = risk ? Math.round(Math.max(0, Math.min(100, (1 - risk.hhi) * 100 * (risk.avgCorr != null ? (1 - Math.max(0, risk.avgCorr)) : 1) + (1 - risk.hhi) * 30))) : 0;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
      <h2 className="text-sm font-bold flex items-center gap-1.5 mb-3">
        <ShieldAlert className="w-4 h-4 text-amber-500" />リスク分析
      </h2>

      {loading ? (
        <div className="h-28 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
      ) : !risk ? (
        <div className="text-sm text-slate-400 py-6 text-center">リスク指標を計算できませんでした（履歴データ不足）</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <RiskStat icon={Activity} label="年率ボラティリティ" value={`${risk.volatility.toFixed(1)}%`} sub={`変動${volLabel(risk.volatility)}`} />
            <RiskStat icon={TrendingDown} label="最大ドローダウン" value={`-${risk.maxDrawdown.toFixed(1)}%`} sub="直近1年" tone="down" />
            <RiskStat icon={Layers} label="集中度(最大保有)" value={`${risk.topWeight.toFixed(0)}%`} sub={risk.topSymbol} tone={risk.topWeight > 40 ? "down" : undefined} />
            <RiskStat icon={ShieldAlert} label="分散スコア" value={`${divScore}/100`} sub={risk.avgCorr != null ? `平均相関${risk.avgCorr.toFixed(2)}` : ""} />
          </div>

          {risk.symbols.length >= 2 && (
            <div className="mt-4">
              <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-2">銘柄間の相関（高いほど一緒に動く＝分散が効きにくい）</div>
              <div className="overflow-x-auto">
                <table className="text-[10px] border-collapse">
                  <thead>
                    <tr>
                      <th className="p-1"></th>
                      {risk.symbols.map((s) => <th key={s} className="p-1 font-mono font-bold text-slate-500 whitespace-nowrap">{s}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {risk.symbols.map((rowSym) => (
                      <tr key={rowSym}>
                        <td className="p-1 font-mono font-bold text-slate-500 whitespace-nowrap pr-2">{rowSym}</td>
                        {risk.symbols.map((colSym) => {
                          if (rowSym === colSym) return <td key={colSym} className="p-0.5"><div className="w-9 h-7 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-400">—</div></td>;
                          const pair = risk.corr.find((c) => (c.a === rowSym && c.b === colSym) || (c.a === colSym && c.b === rowSym));
                          const v = pair?.v ?? 0;
                          return (
                            <td key={colSym} className="p-0.5">
                              <div className={`w-9 h-7 rounded flex items-center justify-center text-white font-mono font-semibold ${corrColor(v)}`} style={{ opacity: 0.55 + Math.abs(v) * 0.45 }}>
                                {v.toFixed(1)}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center gap-3 mt-2 text-[9px] text-slate-400">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-400" />低(分散◎)</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-400" />中</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-rose-500" />高(同調)</span>
              </div>
            </div>
          )}
          <p className="text-[9px] text-slate-400 mt-3">※ 直近1年の日次リターンから算出した概算。ボラ・DDは現在の保有比率で加重。</p>
        </>
      )}
    </div>
  );
}

function RiskStat({ icon: Icon, label, value, sub, tone }: {
  icon: React.ElementType; label: string; value: string; sub?: string; tone?: "down";
}) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 px-3 py-2.5">
      <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-1"><Icon className="w-3 h-3" />{label}</div>
      <div className={`font-bold text-lg tabular-nums ${tone === "down" ? "text-rose-600 dark:text-rose-400" : ""}`}>{value}</div>
      {sub && <div className="text-[10px] text-slate-400 truncate">{sub}</div>}
    </div>
  );
}
