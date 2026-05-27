"use client";

import { useEffect, useState } from "react";
import { Users2 } from "lucide-react";
import { formatLargeNumber, formatPercent } from "@/lib/format";

type Holder = {
  organization: string;
  pctHeld: number | null;
  position: number | null;
  value: number | null;
  reportDate: string | null;
  pctChange: number | null;
};

type Data = {
  breakdown: {
    insidersPercentHeld: number | null;
    institutionsPercentHeld: number | null;
    institutionsFloatPercentHeld: number | null;
    institutionsCount: number | null;
  };
  institutions: Holder[];
  funds: Holder[];
};

export default function HoldersCard({ symbol }: { symbol: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setData(null);
    fetch(`/api/holders?symbol=${encodeURIComponent(symbol)}`, {
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then((j) => {
        if (!j.error) setData(j);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [symbol]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="text-sm text-slate-400">大株主情報を読み込み中…</div>
      </div>
    );
  }

  if (!data) return null;

  const hasBreakdown =
    data.breakdown.insidersPercentHeld !== null ||
    data.breakdown.institutionsPercentHeld !== null;
  const hasHolders = data.institutions.length > 0 || data.funds.length > 0;
  if (!hasBreakdown && !hasHolders) return null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
      <h2 className="text-base font-semibold tracking-tight flex items-center gap-2">
        <Users2 className="w-4 h-4 text-slate-500" />
        株主構成
      </h2>

      {hasBreakdown && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {data.breakdown.insidersPercentHeld !== null && (
            <Stat
              label="内部者保有比率"
              value={formatPercent(data.breakdown.insidersPercentHeld)}
            />
          )}
          {data.breakdown.institutionsPercentHeld !== null && (
            <Stat
              label="機関投資家保有"
              value={formatPercent(data.breakdown.institutionsPercentHeld)}
            />
          )}
          {data.breakdown.institutionsFloatPercentHeld !== null && (
            <Stat
              label="浮動株のうち機関"
              value={formatPercent(data.breakdown.institutionsFloatPercentHeld)}
            />
          )}
          {data.breakdown.institutionsCount !== null && (
            <Stat
              label="機関投資家数"
              value={data.breakdown.institutionsCount.toLocaleString("ja-JP")}
            />
          )}
        </div>
      )}

      {data.institutions.length > 0 && (
        <Section
          title="主要な機関投資家 (Top 10)"
          holders={data.institutions}
        />
      )}
      {data.funds.length > 0 && (
        <Section title="主要なファンド (Top 10)" holders={data.funds} />
      )}
    </div>
  );
}

function Section({ title, holders }: { title: string; holders: Holder[] }) {
  return (
    <div>
      <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-2">
        {title}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <th className="py-2 pr-3 font-medium">保有者</th>
              <th className="py-2 px-3 text-right font-medium">保有比率</th>
              <th className="py-2 px-3 text-right font-medium hidden md:table-cell">
                保有株式数
              </th>
              <th className="py-2 px-3 text-right font-medium hidden md:table-cell">
                時価評価
              </th>
            </tr>
          </thead>
          <tbody>
            {holders.map((h, i) => (
              <tr
                key={`${h.organization}-${i}`}
                className="border-b border-slate-100 dark:border-slate-800/60 last:border-0"
              >
                <td className="py-2 pr-3 font-medium truncate max-w-[280px]">
                  {h.organization}
                </td>
                <td className="py-2 px-3 text-right font-mono tabular-nums">
                  {formatPercent(h.pctHeld)}
                </td>
                <td className="py-2 px-3 text-right font-mono tabular-nums hidden md:table-cell">
                  {h.position
                    ? h.position.toLocaleString("ja-JP")
                    : "—"}
                </td>
                <td className="py-2 px-3 text-right font-mono tabular-nums hidden md:table-cell text-slate-600 dark:text-slate-400">
                  {formatLargeNumber(h.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="font-mono font-semibold tabular-nums mt-0.5">{value}</div>
    </div>
  );
}
