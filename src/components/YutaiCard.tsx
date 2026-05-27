"use client";

import { Gift } from "lucide-react";
import { getYutai } from "@/lib/yutai";

const MONTH_NAMES = [
  "—",
  "1月",
  "2月",
  "3月",
  "4月",
  "5月",
  "6月",
  "7月",
  "8月",
  "9月",
  "10月",
  "11月",
  "12月",
];

export default function YutaiCard({ symbol }: { symbol: string }) {
  // JP stocks only
  if (!/\.T$/.test(symbol)) return null;

  const y = getYutai(symbol);
  if (!y) return null;

  const noBenefit = y.minShares === 0;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
      <h2 className="text-base font-semibold tracking-tight flex items-center gap-2 mb-4">
        <Gift className="w-4 h-4 text-pink-500" />
        株主優待
      </h2>

      {noBenefit ? (
        <div className="text-sm text-slate-500 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
          {y.description}
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-50 to-white dark:from-pink-950/30 dark:to-slate-900/50 border border-pink-100/60 dark:border-pink-900/60">
          <div className="text-base font-medium leading-snug">
            {y.description}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <Stat
              label="必要株数"
              value={`${y.minShares.toLocaleString("ja-JP")} 株〜`}
            />
            {y.approxValueJpy && (
              <Stat
                label="優待相当額 (目安)"
                value={`¥${y.approxValueJpy.toLocaleString("ja-JP")}`}
              />
            )}
            {y.holdingRequirement && (
              <Stat label="保有期間要件" value={y.holdingRequirement} />
            )}
            {y.recordMonths && y.recordMonths.length > 0 && (
              <Stat
                label="権利確定月"
                value={y.recordMonths
                  .map((m) => MONTH_NAMES[m] ?? `${m}月`)
                  .join(" · ")}
              />
            )}
          </div>
          <p className="text-[10px] text-slate-400 mt-3">
            ※ 株主優待は変更・廃止される場合があります。最新の制度は企業の
            IR ページでご確認ください。
          </p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-2 rounded-xl bg-white/60 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/60">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="font-medium text-sm mt-0.5">{value}</div>
    </div>
  );
}
