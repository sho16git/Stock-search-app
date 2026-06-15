"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend, Cell,
  ReferenceLine,
} from "recharts";
import type { IncomeRow, BalanceRow, CashflowRow, FinancialStatementsResp } from "@/app/api/financial-statements/route";

type StmtTab = "income" | "balance" | "cashflow";

// ── Formatters ─────────────────────────────────────────────────────────────
function fmtAmt(v: number | null, compact = false): string {
  if (v == null) return "—";
  const abs = Math.abs(v);
  const sign = v < 0 ? "−" : "";
  // 兆／億 を基本単位に。十億は使わず、億はカンマ区切りで見やすく。
  if (abs >= 1e12) {
    return `${sign}${(abs / 1e12).toLocaleString("ja-JP", { maximumFractionDigits: compact ? 1 : 2 })}兆`;
  }
  if (abs >= 1e8) {
    const oku = abs / 1e8;
    // 100億以上は整数＋カンマ、それ未満は小数1桁
    const s = oku >= 100 ? Math.round(oku).toLocaleString("ja-JP") : oku.toFixed(1);
    return `${sign}${s}億`;
  }
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)}百万`;
  return `${sign}${abs.toLocaleString()}`;
}

function chartUnit(values: (number | null)[]): { divisor: number; label: string } {
  const max = Math.max(...values.filter((v): v is number => v != null).map(Math.abs));
  if (max >= 1e12) return { divisor: 1e12, label: "兆" };
  if (max >= 1e8)  return { divisor: 1e8,  label: "億" };
  if (max >= 1e6)  return { divisor: 1e6,  label: "百万" };
  return { divisor: 1, label: "" };
}

// ── Tooltip ────────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/95 dark:bg-zinc-900/95 shadow-lg px-3 py-2 text-xs">
      <div className="font-bold text-zinc-700 dark:text-zinc-200 mb-1.5">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: p.color }} />
          <span className="text-zinc-500">{p.name}</span>
          <span className="ml-auto font-mono font-semibold text-zinc-800 dark:text-zinc-100">
            {fmtAmt(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── Table ──────────────────────────────────────────────────────────────────
function DataTable({ rows, cols }: {
  rows: { key: string; label: string; color?: string }[];
  cols: { period: string; [key: string]: number | string | null }[];
}) {
  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <table className="w-full text-xs border-collapse min-w-[320px]">
        <thead>
          <tr className="border-b border-zinc-100 dark:border-zinc-800">
            <th className="text-left py-2 pr-2 text-zinc-400 font-medium w-28 shrink-0">項目</th>
            {cols.map(c => (
              <th key={c.period} className="text-right py-2 px-1.5 text-zinc-500 font-semibold tabular-nums">
                {c.period}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ key, label, color }) => (
            <tr key={key} className="border-b border-zinc-50 dark:border-zinc-800/50 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
              <td className="py-2 pr-2 text-zinc-500 font-medium whitespace-nowrap">{label}</td>
              {cols.map(c => {
                const v = c[key] as number | null;
                const isNeg = typeof v === "number" && v < 0;
                return (
                  <td key={c.period}
                    className={`py-2 px-1.5 text-right tabular-nums font-mono ${
                      isNeg
                        ? "text-rose-600 dark:text-rose-400"
                        : color ?? "text-zinc-800 dark:text-zinc-100"
                    }`}>
                    {fmtAmt(v)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Income Panel ───────────────────────────────────────────────────────────
function IncomePanel({ data }: { data: IncomeRow[] }) {
  const allVals = data.flatMap(d => [d.revenue, d.operatingIncome, d.netIncome]);
  const { divisor, label } = chartUnit(allVals);

  const chartData = data.map(d => ({
    period: d.period,
    "売上高": d.revenue != null ? +(d.revenue / divisor).toFixed(2) : null,
    "営業利益": d.operatingIncome != null ? +(d.operatingIncome / divisor).toFixed(2) : null,
    "純利益": d.netIncome != null ? +(d.netIncome / divisor).toFixed(2) : null,
  }));

  const cols = data.map(d => ({
    period: d.period,
    revenue: d.revenue,
    grossProfit: d.grossProfit,
    operatingIncome: d.operatingIncome,
    netIncome: d.netIncome,
    eps: d.eps,
  }));

  const rows = [
    { key: "revenue",         label: "売上高",   color: "text-blue-700 dark:text-blue-300" },
    { key: "grossProfit",     label: "売上総利益" },
    { key: "operatingIncome", label: "営業利益",  color: "text-indigo-700 dark:text-indigo-300" },
    { key: "netIncome",       label: "純利益",    color: "text-emerald-700 dark:text-emerald-300" },
    { key: "eps",             label: "EPS" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <div className="text-[10px] text-zinc-400 text-right mb-1">単位: {label}円 / ドル</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" strokeOpacity={0.7} />
            <XAxis dataKey="period" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={44}
              tickFormatter={v => `${v}`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend formatter={v => <span className="text-[10px] text-zinc-400">{v}</span>} />
            <Bar dataKey="売上高"   fill="#3b82f6" opacity={0.85} radius={[3,3,0,0]} isAnimationActive={false} />
            <Bar dataKey="営業利益" fill="#818cf8" opacity={0.85} radius={[3,3,0,0]} isAnimationActive={false} />
            <Bar dataKey="純利益"   fill="#10b981" opacity={0.85} radius={[3,3,0,0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <DataTable rows={rows} cols={cols} />
    </div>
  );
}

// ── Balance Panel ──────────────────────────────────────────────────────────
function BalancePanel({ data }: { data: BalanceRow[] }) {
  const allVals = data.flatMap(d => [d.totalAssets, d.totalLiabilities, d.totalEquity]);
  const { divisor, label } = chartUnit(allVals);

  const chartData = data.map(d => ({
    period: d.period,
    "純資産": d.totalEquity != null ? +(d.totalEquity / divisor).toFixed(2) : null,
    "負債":   d.totalLiabilities != null ? +(d.totalLiabilities / divisor).toFixed(2) : null,
  }));

  const cols = data.map(d => ({ ...d })) as { period: string; [k: string]: string | number | null }[];

  const rows = [
    { key: "totalAssets",      label: "総資産",       color: "text-blue-700 dark:text-blue-300" },
    { key: "totalLiabilities", label: "総負債",        color: "text-rose-700 dark:text-rose-300" },
    { key: "totalEquity",      label: "純資産(株主資本)", color: "text-emerald-700 dark:text-emerald-300" },
    { key: "cash",             label: "現金・同等物" },
    { key: "longTermDebt",     label: "長期負債" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <div className="text-[10px] text-zinc-400 text-right mb-1">単位: {label}円 / ドル</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" strokeOpacity={0.7} />
            <XAxis dataKey="period" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={44} />
            <Tooltip content={<CustomTooltip />} />
            <Legend formatter={v => <span className="text-[10px] text-zinc-400">{v}</span>} />
            <Bar dataKey="純資産" stackId="a" fill="#10b981" opacity={0.85} radius={[0,0,0,0]} isAnimationActive={false} />
            <Bar dataKey="負債"   stackId="a" fill="#f87171" opacity={0.85} radius={[3,3,0,0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <DataTable rows={rows} cols={cols} />
    </div>
  );
}

// ── Cashflow Panel ─────────────────────────────────────────────────────────
function CashflowPanel({ data }: { data: CashflowRow[] }) {
  const allVals = data.flatMap(d => [d.operatingCF, d.investingCF, d.financingCF, d.freeCF]);
  const { divisor, label } = chartUnit(allVals);

  const chartData = data.map(d => ({
    period: d.period,
    "営業CF":  d.operatingCF  != null ? +(d.operatingCF  / divisor).toFixed(2) : null,
    "投資CF":  d.investingCF  != null ? +(d.investingCF  / divisor).toFixed(2) : null,
    "財務CF":  d.financingCF  != null ? +(d.financingCF  / divisor).toFixed(2) : null,
    "フリーCF": d.freeCF      != null ? +(d.freeCF       / divisor).toFixed(2) : null,
  }));

  const cols = data.map(d => ({ ...d })) as { period: string; [k: string]: string | number | null }[];

  const rows = [
    { key: "operatingCF",  label: "営業CF",    color: "text-blue-700 dark:text-blue-300" },
    { key: "investingCF",  label: "投資CF" },
    { key: "financingCF",  label: "財務CF" },
    { key: "capex",        label: "設備投資(CapEx)" },
    { key: "freeCF",       label: "フリーCF",  color: "text-emerald-700 dark:text-emerald-300" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <div className="text-[10px] text-zinc-400 text-right mb-1">単位: {label}円 / ドル</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" strokeOpacity={0.7} />
            <XAxis dataKey="period" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={44} />
            <ReferenceLine yAxisId={0} y={0} stroke="#94a3b8" strokeDasharray="2 2" strokeOpacity={0.5} />
            <Tooltip content={<CustomTooltip />} />
            <Legend formatter={v => <span className="text-[10px] text-zinc-400">{v}</span>} />
            <Bar dataKey="営業CF" isAnimationActive={false} radius={[3,3,0,0]}>
              {chartData.map((d, i) => (
                <Cell key={i} fill={(d["営業CF"] ?? 0) >= 0 ? "#3b82f6" : "#f87171"} opacity={0.85} />
              ))}
            </Bar>
            <Bar dataKey="フリーCF" isAnimationActive={false} radius={[3,3,0,0]}>
              {chartData.map((d, i) => (
                <Cell key={i} fill={(d["フリーCF"] ?? 0) >= 0 ? "#10b981" : "#fb923c"} opacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <DataTable rows={rows} cols={cols} />
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
const TABS: { id: StmtTab; label: string; emoji: string }[] = [
  { id: "income",   label: "損益計算書", emoji: "📈" },
  { id: "balance",  label: "貸借対照表", emoji: "🏦" },
  { id: "cashflow", label: "CF計算書",   emoji: "💸" },
];

export default function FinancialStatements({ symbol }: { symbol: string }) {
  const [tab, setTab] = useState<StmtTab>("income");
  const [data, setData] = useState<FinancialStatementsResp | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/financial-statements?symbol=${encodeURIComponent(symbol)}`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [symbol]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm animate-pulse">
        <div className="h-4 w-40 rounded bg-zinc-200 dark:bg-zinc-700 mb-3" />
        <div className="flex gap-1 mb-4">
          {[1,2,3].map(i => <div key={i} className="h-7 w-24 rounded-lg bg-zinc-100 dark:bg-zinc-800" />)}
        </div>
        <div className="h-44 rounded-xl bg-zinc-100 dark:bg-zinc-800 mb-4" />
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="h-7 rounded bg-zinc-100 dark:bg-zinc-800" />)}
        </div>
      </div>
    );
  }

  if (!data || data.error) return null;

  const hasData =
    (data.income?.length  > 0) ||
    (data.balance?.length > 0) ||
    (data.cashflow?.length > 0);

  if (!hasData) return null;

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-3.5 pb-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
          <span>📋</span> 財務諸表
        </h3>
        <span className="text-[10px] text-zinc-400">年次 · 最大5期</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-zinc-100 dark:border-zinc-800">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 text-xs font-semibold transition-all border-b-2 ${
              tab === t.id
                ? "border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/20"
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            <span className="mr-1">{t.emoji}</span>{t.label}
          </button>
        ))}
      </div>

      {/* Panel */}
      <div className="p-4">
        {tab === "income"   && <IncomePanel   data={data.income   ?? []} />}
        {tab === "balance"  && <BalancePanel  data={data.balance  ?? []} />}
        {tab === "cashflow" && <CashflowPanel data={data.cashflow ?? []} />}
      </div>

      <div className="px-4 pb-3">
        <p className="text-[10px] text-zinc-400 leading-relaxed">
          ※ データはYahoo Financeより取得。表示は最大4〜5期分（データ提供状況による）。投資判断はご自身の責任で。
        </p>
      </div>
    </div>
  );
}
