"use client";

import { useEffect, useState } from "react";
import { formatNumber } from "@/lib/format";
import { TrendingUp, TrendingDown } from "lucide-react";

// ── Analyst types ────────────────────────────────────────────────────────────
type AnalystData = {
  currentPrice:          number | null;
  targetMean:            number | null;
  targetHigh:            number | null;
  targetLow:             number | null;
  recommendationKey:     string | null;
  numberOfAnalystOpinions: number | null;
  trend: {
    period:     string;
    strongBuy:  number;
    buy:        number;
    hold:       number;
    sell:       number;
    strongSell: number;
  }[];
};

// ── Chart / 14-day price data ─────────────────────────────────────────────────
type DayBar = {
  date:   string;
  open:   number;
  close:  number;
  high:   number;
  low:    number;
  volume: number;
};

// ── Recommendation label map ──────────────────────────────────────────────────
const REC_LABELS: Record<string, { text: string; color: string; bg: string }> = {
  strong_buy:  { text: "強い買い", color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-500" },
  buy:         { text: "買い",     color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-400" },
  hold:        { text: "中立",     color: "text-amber-600  dark:text-amber-400",   bg: "bg-amber-400"   },
  sell:        { text: "売り",     color: "text-rose-600   dark:text-rose-400",    bg: "bg-rose-400"    },
  strong_sell: { text: "強い売り", color: "text-rose-700   dark:text-rose-300",    bg: "bg-rose-600"    },
};

// ── Trend period label map ────────────────────────────────────────────────────
const PERIOD_LABELS: Record<string, string> = {
  "0m": "今月",
  "-1m": "先月",
  "-2m": "2ヶ月前",
  "-3m": "3ヶ月前",
};

// ── Mini sparkline bar for 14-day chart ──────────────────────────────────────
function MiniBar({ bar, maxVol, maxRange }: { bar: DayBar; maxVol: number; maxRange: number }) {
  const up = bar.close >= bar.open;
  const heightPct = maxRange > 0 ? Math.abs(bar.close - bar.open) / maxRange : 0.3;
  const volPct    = maxVol  > 0 ? bar.volume / maxVol : 0.5;
  return (
    <div className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
      {/* Price bar */}
      <div className="w-full flex items-end justify-center" style={{ height: 32 }}>
        <div
          className={`w-full rounded-sm transition-all ${
            up ? "bg-emerald-500/90" : "bg-red-500/90"
          }`}
          style={{ height: `${Math.max(15, heightPct * 100)}%` }}
        />
      </div>
      {/* Volume bar */}
      <div className="w-full flex items-end justify-center" style={{ height: 12 }}>
        <div
          className={`w-full rounded-sm opacity-50 ${up ? "bg-emerald-500" : "bg-red-500"}`}
          style={{ height: `${Math.max(20, volPct * 100)}%` }}
        />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function BuySellSentiment({ symbol }: { symbol: string }) {
  const [analyst, setAnalyst] = useState<AnalystData | null>(null);
  const [bars,    setBars]    = useState<DayBar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setAnalyst(null);
    setBars([]);

    Promise.all([
      fetch(`/api/analyst?symbol=${encodeURIComponent(symbol)}`).then((r) => r.json()),
      fetch(`/api/chart?symbol=${encodeURIComponent(symbol)}&range=1mo`).then((r) => r.json()),
    ])
      .then(([analystData, chartData]: [AnalystData, { data?: Record<string, unknown>[] }]) => {
        if (cancelled) return;
        setAnalyst(analystData);

        const raw = (chartData.data ?? []) as Record<string, unknown>[];
        const parsed: DayBar[] = raw
          .filter((d) => d.close !== null && d.close !== undefined)
          .map((d) => ({
            date:   String(d.date ?? ""),
            open:   Number(d.open   ?? d.close),
            close:  Number(d.close),
            high:   Number(d.high   ?? d.close),
            low:    Number(d.low    ?? d.close),
            volume: Number(d.volume ?? 0),
          }));

        // Take last 14 trading days
        setBars(parsed.slice(-14));
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [symbol]);

  // ── Analyst computed ────────────────────────────────────────────────────
  const trendNow = analyst?.trend?.[0];
  const buyCount  = (trendNow?.strongBuy ?? 0) + (trendNow?.buy ?? 0);
  const sellCount = (trendNow?.sell ?? 0) + (trendNow?.strongSell ?? 0);
  const holdCount = trendNow?.hold ?? 0;
  const total     = buyCount + holdCount + sellCount;
  const buyPct    = total > 0 ? Math.round((buyCount  / total) * 100) : 0;
  const holdPct   = total > 0 ? Math.round((holdCount / total) * 100) : 0;
  const sellPct   = total > 0 ? Math.round((sellCount / total) * 100) : 0;

  const recKey  = analyst?.recommendationKey ?? "hold";
  const recLabel = REC_LABELS[recKey] ?? REC_LABELS["hold"];
  const upside   =
    analyst?.targetMean && analyst?.currentPrice
      ? ((analyst.targetMean - analyst.currentPrice) / analyst.currentPrice) * 100
      : null;

  // ── 14-day computed ─────────────────────────────────────────────────────
  const upDays   = bars.filter((b) => b.close > b.open);
  const downDays = bars.filter((b) => b.close < b.open);
  const flatDays = bars.filter((b) => b.close === b.open);

  const totalVol = bars.reduce((s, b) => s + b.volume, 0);
  const upVol    = upDays.reduce((s, b) => s + b.volume, 0);
  const downVol  = downDays.reduce((s, b) => s + b.volume, 0);
  const buyVolPct  = totalVol > 0 ? Math.round((upVol   / totalVol) * 100) : 50;
  const sellVolPct = totalVol > 0 ? Math.round((downVol / totalVol) * 100) : 50;

  const maxVol   = Math.max(...bars.map((b) => b.volume), 1);
  const maxRange = Math.max(...bars.map((b) => Math.abs(b.close - b.open)), 0.01);

  // Net momentum: weighted sum of daily returns over 14 days
  const recentReturn =
    bars.length >= 2
      ? ((bars[bars.length - 1].close - bars[0].open) / bars[0].open) * 100
      : null;

  // Dominant trend for 14-day section title pill
  const dominantTrend =
    buyVolPct >= 55 ? "buy" :
    sellVolPct >= 55 ? "sell" :
    "neutral";

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-200/60 dark:border-white/[0.07] bg-white dark:bg-zinc-900 p-4 space-y-4">
        <div className="skeleton h-4 w-40 rounded" />
        <div className="skeleton h-8 w-full rounded-full" />
        <div className="skeleton h-3 w-48 rounded" />
        <div className="skeleton h-12 w-full rounded-lg mt-2" />
      </div>
    );
  }

  const hasAnalyst = total > 0;
  const hasBars    = bars.length > 0;

  if (!hasAnalyst && !hasBars) return null;

  return (
    <div className="rounded-xl border border-zinc-200/60 dark:border-white/[0.07] bg-white dark:bg-zinc-900 overflow-hidden">

      {/* ── Section A: 14-day buy/sell trend ─────────────────────────── */}
      {hasBars && (
        <div className="px-4 pt-4 pb-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
              <span>📈</span>
              <span>直近14日間の売買動向</span>
            </h3>
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
              dominantTrend === "buy"
                ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                : dominantTrend === "sell"
                ? "bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
            }`}>
              {dominantTrend === "buy" ? "▲ 買い優勢" : dominantTrend === "sell" ? "▼ 売り優勢" : "━ 均衡"}
            </span>
          </div>

          {/* Mini bar chart */}
          <div className="flex gap-px items-end" style={{ height: 48 }}>
            {bars.map((bar, i) => (
              <MiniBar key={i} bar={bar} maxVol={maxVol} maxRange={maxRange} />
            ))}
          </div>

          {/* Date labels: first and last */}
          {bars.length >= 2 && (
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-zinc-400">{bars[0].date.slice(5, 10).replace("-", "/")}</span>
              <span className="text-[9px] text-zinc-400">{bars[bars.length - 1].date.slice(5, 10).replace("-", "/")}</span>
            </div>
          )}

          {/* Stats row */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            <StatChip
              label="上昇日"
              value={`${upDays.length}日`}
              sub={`出来高 ${buyVolPct}%`}
              color="emerald"
            />
            <StatChip
              label="横ばい日"
              value={`${flatDays.length}日`}
              sub={`全${bars.length}日中`}
              color="zinc"
            />
            <StatChip
              label="下落日"
              value={`${downDays.length}日`}
              sub={`出来高 ${sellVolPct}%`}
              color="red"
            />
          </div>

          {/* Volume-weighted trend bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1">
              <span>出来高加重 買い圧力</span>
              {recentReturn !== null && (
                <span className={`font-mono font-bold ${recentReturn >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                  {recentReturn >= 0 ? "+" : ""}{recentReturn.toFixed(2)}%
                </span>
              )}
            </div>
            <div className="flex rounded-full overflow-hidden h-4 gap-px">
              <div
                className="bg-gradient-to-r from-emerald-500 to-emerald-400 flex items-center justify-center text-white text-[9px] font-bold"
                style={{ width: `${buyVolPct}%` }}
              >
                {buyVolPct >= 20 && `${buyVolPct}%`}
              </div>
              <div
                className="bg-gradient-to-r from-red-500 to-red-400 flex items-center justify-center text-white text-[9px] font-bold"
                style={{ width: `${sellVolPct}%` }}
              >
                {sellVolPct >= 20 && `${sellVolPct}%`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Divider */}
      {hasBars && hasAnalyst && (
        <div className="mx-4 border-t border-zinc-100 dark:border-white/[0.05]" />
      )}

      {/* ── Section B: Analyst consensus ──────────────────────────────── */}
      {hasAnalyst && (
        <div className="px-4 pt-4 pb-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
              <span>🎯</span>
              <span>アナリスト予想コンセンサス</span>
            </h3>
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${recLabel.bg} text-white`}>
              {recLabel.text}
            </span>
          </div>

          {/* Consensus bar */}
          <div className="flex rounded-full overflow-hidden h-6 gap-px mb-1.5">
            <div
              className="bg-gradient-to-r from-emerald-500 to-emerald-400 flex items-center justify-center text-white text-[10px] font-bold transition-all duration-700"
              style={{ width: `${buyPct}%` }}
            >
              {buyPct >= 12 && `${buyPct}%`}
            </div>
            <div
              className="bg-gradient-to-r from-amber-400 to-yellow-300 flex items-center justify-center text-white text-[10px] font-bold transition-all duration-700"
              style={{ width: `${holdPct}%` }}
            >
              {holdPct >= 12 && `${holdPct}%`}
            </div>
            <div
              className="bg-gradient-to-r from-rose-400 to-rose-500 flex items-center justify-center text-white text-[10px] font-bold transition-all duration-700"
              style={{ width: `${sellPct}%` }}
            >
              {sellPct >= 12 && `${sellPct}%`}
            </div>
          </div>

          {/* Legend */}
          <div className="flex justify-between text-[11px] text-zinc-500 mb-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              買い {buyPct}%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              中立 {holdPct}%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              売り {sellPct}%
            </span>
          </div>

          {/* Target price */}
          {analyst?.targetMean != null && analyst?.currentPrice != null && (
            <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50 rounded-xl px-4 py-2.5 mb-3">
              <div className="space-y-0.5">
                <div className="text-[10px] uppercase tracking-wider text-zinc-400">目標株価（平均）</div>
                <div className="font-mono font-black text-lg tabular-nums text-zinc-900 dark:text-zinc-50">
                  {formatNumber(analyst.targetMean)}
                </div>
                <div className="text-[10px] text-zinc-400">
                  レンジ {formatNumber(analyst.targetLow ?? 0)} 〜 {formatNumber(analyst.targetHigh ?? 0)}
                </div>
              </div>
              {upside != null && (
                <div className={`flex items-center gap-1 text-sm font-bold px-3 py-2 rounded-xl ${
                  upside >= 0
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                }`}>
                  {upside >= 0
                    ? <TrendingUp className="w-4 h-4" />
                    : <TrendingDown className="w-4 h-4" />}
                  {upside >= 0 ? "+" : ""}{upside.toFixed(1)}%
                </div>
              )}
            </div>
          )}

          {/* Monthly trend table */}
          {(analyst?.trend?.length ?? 0) > 1 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-2">月別推移</div>
              <div className="space-y-1.5">
                {analyst!.trend.slice(0, 4).map((t) => {
                  const bCnt  = (t.strongBuy + t.buy);
                  const sCnt  = (t.sell + t.strongSell);
                  const tot   = bCnt + t.hold + sCnt;
                  const bPct  = tot > 0 ? Math.round(bCnt / tot * 100) : 0;
                  const hPct  = tot > 0 ? Math.round(t.hold / tot * 100) : 0;
                  const sPct  = tot > 0 ? Math.round(sCnt / tot * 100) : 0;
                  const label = PERIOD_LABELS[t.period] ?? t.period;
                  return (
                    <div key={t.period} className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-500 w-14 shrink-0">{label}</span>
                      <div className="flex-1 flex rounded-full overflow-hidden h-3 gap-px">
                        <div className="bg-emerald-400/80" style={{ width: `${bPct}%` }} />
                        <div className="bg-amber-300/80"   style={{ width: `${hPct}%` }} />
                        <div className="bg-rose-400/80"   style={{ width: `${sPct}%` }} />
                      </div>
                      <span className="text-[10px] text-zinc-400 w-10 text-right shrink-0">{tot}名</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-3 text-[10px] text-zinc-400 text-right">
            アナリスト {total} 名の予想
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helper sub-component ──────────────────────────────────────────────────────
function StatChip({
  label, value, sub, color,
}: {
  label: string;
  value: string;
  sub: string;
  color: "emerald" | "red" | "zinc";
}) {
  const cls = {
    emerald: "bg-emerald-50  dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300",
    red:     "bg-red-50      dark:bg-red-950/30     border-red-200/60     dark:border-red-800/40     text-red-600    dark:text-red-400",
    zinc:    "bg-zinc-50     dark:bg-zinc-800/40    border-zinc-200/60    dark:border-white/[0.07]   text-zinc-600   dark:text-zinc-400",
  }[color];
  return (
    <div className={`rounded-lg border px-2.5 py-2 text-center ${cls}`}>
      <div className="text-[9px] uppercase tracking-wide opacity-70">{label}</div>
      <div className="text-sm font-bold tabular-nums mt-0.5">{value}</div>
      <div className="text-[9px] opacity-60 mt-0.5">{sub}</div>
    </div>
  );
}
