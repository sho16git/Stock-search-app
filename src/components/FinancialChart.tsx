"use client";

import { useEffect, useState } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

type FinRow = {
  period: string;
  revenue: number | null;
  netIncome: number | null;
  eps: number | null;
};

type Tab = "annual" | "quarterly";

function fmtRevenue(v: number): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? "−" : "";
  if (abs >= 1e12) return `${sign}${(abs / 1e12).toLocaleString("ja-JP", { maximumFractionDigits: 1 })}兆`;
  if (abs >= 1e8) {
    const oku = abs / 1e8;
    return `${sign}${oku >= 100 ? Math.round(oku).toLocaleString("ja-JP") : oku.toFixed(1)}億`;
  }
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)}百万`;
  return v.toLocaleString();
}

export default function FinancialChart({ symbol }: { symbol: string }) {
  const [tab, setTab] = useState<Tab>("annual");
  const [annual, setAnnual] = useState<FinRow[]>([]);
  const [quarterly, setQuarterly] = useState<FinRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(`/api/financials?symbol=${encodeURIComponent(symbol)}`)
      .then(r => r.json())
      .then(j => {
        setAnnual(j.annual ?? []);
        setQuarterly(j.quarterly ?? []);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [symbol]);

  const data = tab === "annual" ? annual : quarterly;

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-4">
        <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-4" />
        <div className="h-40 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || data.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-4">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">財務推移</p>
        <p className="text-xs text-slate-400">財務データが取得できませんでした</p>
      </div>
    );
  }

  // Determine if values are likely in USD (large) or JPY
  const maxRevenue = Math.max(...data.map(d => Math.abs(d.revenue ?? 0)));
  const unit = maxRevenue >= 1_000_000 ? "百万" : "";

  const chartData = data.map(d => ({
    period: d.period,
    revenue: d.revenue != null ? Math.round(d.revenue / 1_000_000) : null,
    netIncome: d.netIncome != null ? Math.round(d.netIncome / 1_000_000) : null,
  }));

  const hasNegative = chartData.some(d => (d.netIncome ?? 0) < 0);

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800/60">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">財務推移</h3>
        <div className="flex gap-0.5 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
          <button
            onClick={() => setTab("annual")}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
              tab === "annual"
                ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white"
                : "text-slate-500"
            }`}
          >
            年次
          </button>
          <button
            onClick={() => setTab("quarterly")}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
              tab === "quarterly"
                ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white"
                : "text-slate-500"
            }`}
          >
            四半期
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="px-2 pt-3 pb-2">
        <div className="text-[9px] text-slate-400 text-right pr-2 mb-1">単位: {unit}円/ドル</div>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" strokeOpacity={0.6} />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="main"
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              tickFormatter={fmtRevenue}
              width={50}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(v, name) => {
                const labels: Record<string, string> = {
                  revenue: "売上高",
                  netIncome: "純利益",
                };
                return [v != null ? `${Number(v).toLocaleString()}${unit}` : "—", labels[name as string] ?? name];
              }}
              contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0", background: "rgba(255,255,255,0.97)" }}
            />
            <Legend
              formatter={(value) => {
                const labels: Record<string, string> = { revenue: "売上高", netIncome: "純利益" };
                return <span style={{ fontSize: 10, color: "#94a3b8" }}>{labels[value] ?? value}</span>;
              }}
            />
            <Bar yAxisId="main" dataKey="revenue" fill="#3b82f6" opacity={0.8} radius={[3, 3, 0, 0]} isAnimationActive={false} />
            <Bar
              yAxisId="main"
              dataKey="netIncome"
              radius={[3, 3, 0, 0]}
              isAnimationActive={false}
              fill={hasNegative ? "#f87171" : "#10b981"}
              opacity={0.8}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
