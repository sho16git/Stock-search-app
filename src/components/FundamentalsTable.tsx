"use client";

import { useEffect, useState } from "react";
import { formatLargeNumber, formatNumber, formatPercent } from "@/lib/format";

type YearRow = {
  year: number;
  eps: number | null;
  per: number | null;
  pbr: number | null;
  roe: number | null;
  netIncome: number | null;
  revenue: number | null;
  equity: number | null;
};

type Current = {
  trailingPE: number | null;
  forwardPE: number | null;
  priceToBook: number | null;
  trailingEps: number | null;
  forwardEps: number | null;
  returnOnEquity: number | null;
  returnOnAssets: number | null;
  profitMargins: number | null;
  debtToEquity: number | null;
  dividendYield: number | null;
  marketCap: number | null;
  currency: string | null;
};

export default function FundamentalsTable({ symbol }: { symbol: string }) {
  const [rows, setRows] = useState<YearRow[]>([]);
  const [current, setCurrent] = useState<Current | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    setRows([]);
    setCurrent(null);
    fetch(`/api/fundamentals?symbol=${encodeURIComponent(symbol)}`, {
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.error) {
          setError(j.error);
        } else {
          setRows(j.rows ?? []);
          setCurrent(j.current ?? null);
        }
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError("読み込みに失敗しました");
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [symbol]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-sm">
      <div>
        <h2 className="text-base font-semibold mb-4 tracking-tight">
          現在の主要指標
        </h2>
        {loading && <div className="text-sm text-slate-400">読み込み中…</div>}
        {error && <div className="text-sm text-red-500">{error}</div>}
        {!loading && !error && current && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <Metric label="PER (実績)" value={formatNumber(current.trailingPE)} />
            <Metric label="PER (予想)" value={formatNumber(current.forwardPE)} />
            <Metric label="PBR" value={formatNumber(current.priceToBook)} />
            <Metric
              label="ROE"
              value={formatPercent(current.returnOnEquity)}
            />
            <Metric
              label="EPS (実績)"
              value={formatNumber(current.trailingEps)}
            />
            <Metric
              label="EPS (予想)"
              value={formatNumber(current.forwardEps)}
            />
            <Metric
              label="配当利回り"
              value={formatPercent(current.dividendYield)}
            />
            <Metric
              label="時価総額"
              value={formatLargeNumber(current.marketCap)}
            />
            <Metric
              label="ROA"
              value={formatPercent(current.returnOnAssets)}
            />
            <Metric
              label="利益率"
              value={formatPercent(current.profitMargins)}
            />
            <Metric
              label="D/E比率"
              value={formatNumber(current.debtToEquity)}
            />
            <Metric label="通貨" value={current.currency ?? "—"} />
          </div>
        )}
      </div>

      <div>
        <h2 className="text-base font-semibold mb-4 tracking-tight">
          年次推移
        </h2>
        {!loading && rows.length === 0 && !error && (
          <div className="text-sm text-slate-400">年次データがありません</div>
        )}
        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2 pr-3">年度</th>
                  <th className="py-2 pr-3 text-right">売上高</th>
                  <th className="py-2 pr-3 text-right">純利益</th>
                  <th className="py-2 pr-3 text-right">自己資本</th>
                  <th className="py-2 pr-3 text-right">EPS</th>
                  <th className="py-2 pr-3 text-right">ROE</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.year}
                    className="border-b border-slate-100 dark:border-slate-800"
                  >
                    <td className="py-2 pr-3 font-medium">{r.year}</td>
                    <td className="py-2 pr-3 text-right font-mono">
                      {formatLargeNumber(r.revenue)}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono">
                      {formatLargeNumber(r.netIncome)}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono">
                      {formatLargeNumber(r.equity)}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono">
                      {formatNumber(r.eps)}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono">
                      {formatPercent(r.roe)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-slate-400 mt-2">
              ※ Yahoo Financeは直近4年分の年次データを提供しています
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="font-mono font-semibold text-base mt-1 tabular-nums">
        {value}
      </div>
    </div>
  );
}
