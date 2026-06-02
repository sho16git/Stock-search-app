"use client";

import { useEffect, useRef, useState } from "react";
import { formatNumber } from "@/lib/format";
import { TrendingUp, TrendingDown } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type AnalystData = {
  currentPrice:            number | null;
  targetMean:              number | null;
  targetHigh:              number | null;
  targetLow:               number | null;
  recommendationKey:       string | null;
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

type DayBar = {
  date:   string;
  open:   number;
  close:  number;
  high:   number;
  low:    number;
  volume: number;
};

// ── Gauge constants ────────────────────────────────────────────────────────────
const CX = 100, CY = 96, R = 76;

/** Convert buy-% (0–100) → point on the upper-semicircle arc */
function arcPoint(pct: number) {
  const angle = Math.PI * (1 - pct / 100); // 0%→π (left), 100%→0 (right)
  return {
    x: +(CX + R * Math.cos(angle)).toFixed(2),
    y: +(CY - R * Math.sin(angle)).toFixed(2),
  };
}

const P0  = arcPoint(0);   // left end  (売り = 0%)
const P35 = arcPoint(35);  // sell/neutral boundary
const P65 = arcPoint(65);  // neutral/buy boundary
const P100 = arcPoint(100);// right end (買い = 100%)

// みんかぶ verdict labels
function verdict(pct: number): { label: string; color: string; ring: string } {
  if (pct >= 70) return { label: "強い買い",  color: "text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-500" };
  if (pct >= 55) return { label: "買い",      color: "text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-400" };
  if (pct >= 45) return { label: "中立",      color: "text-amber-600   dark:text-amber-400",   ring: "ring-amber-400"   };
  if (pct >= 30) return { label: "売り",      color: "text-red-600     dark:text-red-400",     ring: "ring-red-400"     };
  return          { label: "強い売り",  color: "text-red-700     dark:text-red-300",     ring: "ring-red-600"     };
}

// REC labels for analyst
const REC_LABELS: Record<string, { text: string; bg: string }> = {
  strong_buy:  { text: "強い買い", bg: "bg-emerald-500" },
  buy:         { text: "買い",     bg: "bg-emerald-400" },
  hold:        { text: "中立",     bg: "bg-amber-400"   },
  sell:        { text: "売り",     bg: "bg-rose-400"    },
  strong_sell: { text: "強い売り", bg: "bg-rose-600"    },
};

const PERIOD_LABELS: Record<string, string> = {
  "0m": "今月", "-1m": "先月", "-2m": "2ヶ月前", "-3m": "3ヶ月前",
};

// ── Animated Gauge ─────────────────────────────────────────────────────────────
function Gauge({ buyPct }: { buyPct: number }) {
  const [displayed, setDisplayed] = useState(50);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const fromRef  = useRef(50);

  useEffect(() => {
    fromRef.current = displayed;
    startRef.current = null;
    const duration = 800;
    const to = buyPct;

    const animate = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const t = Math.min((ts - startRef.current) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayed(fromRef.current + (to - fromRef.current) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyPct]);

  const v  = verdict(buyPct);
  const np = arcPoint(displayed); // needle tip
  const pct = Math.round(displayed);

  // Needle from center to tip (shorter than arc radius)
  const nLen = R * 0.72;
  const nAngle = Math.PI * (1 - displayed / 100);
  const nx = +(CX + nLen * Math.cos(nAngle)).toFixed(2);
  const ny = +(CY - nLen * Math.sin(nAngle)).toFixed(2);

  // Indicator dot on arc
  const dotR = 5;
  void np; // suppress unused

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox="0 0 200 118"
        className="w-full max-w-[220px]"
        aria-label={`買い動向 ${pct}%`}
      >
        {/* ── Background (gray) full arc ── */}
        <path
          d={`M ${P0.x} ${P0.y} A ${R} ${R} 0 0 1 ${P100.x} ${P100.y}`}
          fill="none" stroke="#e4e4e7" strokeWidth="13"
          className="dark:[stroke:#3f3f46]"
          strokeLinecap="round"
        />

        {/* ── Zone arcs (colored) ── */}
        {/* Sell zone: 0→35% */}
        <path
          d={`M ${P0.x} ${P0.y} A ${R} ${R} 0 0 1 ${P35.x} ${P35.y}`}
          fill="none" stroke="#ef4444" strokeWidth="13" opacity="0.35"
        />
        {/* Neutral zone: 35→65% */}
        <path
          d={`M ${P35.x} ${P35.y} A ${R} ${R} 0 0 1 ${P65.x} ${P65.y}`}
          fill="none" stroke="#f59e0b" strokeWidth="13" opacity="0.35"
        />
        {/* Buy zone: 65→100% */}
        <path
          d={`M ${P65.x} ${P65.y} A ${R} ${R} 0 0 1 ${P100.x} ${P100.y}`}
          fill="none" stroke="#22c55e" strokeWidth="13" opacity="0.35"
        />

        {/* ── Active arc (solid, from edge to needle) ── */}
        {/* From right (buy side) going left to current position — shows buy portion */}
        {pct > 50 && (
          <path
            d={`M ${P100.x} ${P100.y} A ${R} ${R} 0 ${pct > 50 ? 0 : 1} 0 ${arcPoint(displayed).x} ${arcPoint(displayed).y}`}
            fill="none" stroke="#22c55e" strokeWidth="13"
            strokeLinecap="round"
          />
        )}
        {/* From left (sell side) going right to current position — shows sell portion */}
        {pct <= 50 && (
          <path
            d={`M ${P0.x} ${P0.y} A ${R} ${R} 0 0 1 ${arcPoint(displayed).x} ${arcPoint(displayed).y}`}
            fill="none" stroke="#ef4444" strokeWidth="13"
            strokeLinecap="round"
          />
        )}

        {/* ── Indicator dot on arc ── */}
        <circle
          cx={arcPoint(displayed).x}
          cy={arcPoint(displayed).y}
          r={dotR}
          fill={pct >= 50 ? "#22c55e" : "#ef4444"}
          stroke="white"
          strokeWidth="2"
        />

        {/* ── Needle ── */}
        <line
          x1={CX} y1={CY}
          x2={nx} y2={ny}
          stroke={pct >= 65 ? "#22c55e" : pct >= 45 ? "#f59e0b" : "#ef4444"}
          strokeWidth="2.5" strokeLinecap="round"
        />
        <circle cx={CX} cy={CY} r="4.5" fill="#1e293b" className="dark:fill-zinc-200" />

        {/* ── Center text ── */}
        <text
          x={CX} y={CY - 18}
          textAnchor="middle"
          fontSize="26" fontWeight="800"
          className="fill-zinc-900 dark:fill-zinc-50"
        >
          {pct}%
        </text>
        <text
          x={CX} y={CY - 4}
          textAnchor="middle"
          fontSize="9"
          className="fill-zinc-500"
        >
          {v.label}
        </text>

        {/* ── Axis labels ── */}
        <text x="16"  y={CY + 16} textAnchor="middle" fontSize="9" fontWeight="700" fill="#ef4444">売り</text>
        <text x="100" y="14"      textAnchor="middle" fontSize="9" fontWeight="600" fill="#a1a1aa">中立</text>
        <text x="184" y={CY + 16} textAnchor="middle" fontSize="9" fontWeight="700" fill="#22c55e">買い</text>
      </svg>
    </div>
  );
}

// ── Day Row ─────────────────────────────────────────────────────────────────────
function DayRow({ bar, maxVol }: { bar: DayBar; maxVol: number }) {
  const up   = bar.close > bar.open;
  const flat = bar.close === bar.open;
  const changePct = bar.open > 0 ? (bar.close - bar.open) / bar.open * 100 : 0;
  const volPct    = maxVol > 0 ? (bar.volume / maxVol) * 100 : 50;

  // Parse date display
  const dateStr = bar.date.slice(5, 10).replace("-", "/"); // "MM/DD"

  return (
    <div className="flex items-center gap-2.5 py-1.5 border-b border-zinc-100 dark:border-white/[0.04] last:border-0">
      {/* Date */}
      <span className="text-[11px] text-zinc-400 w-9 shrink-0 tabular-nums">{dateStr}</span>

      {/* Direction badge */}
      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
        flat ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
        : up  ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
             : "bg-red-100 dark:bg-red-950/40 text-red-500 dark:text-red-400"
      }`}>
        {flat ? "━" : up ? "▲" : "▼"}
      </span>

      {/* Change % */}
      <span className={`text-[11px] font-mono font-bold tabular-nums w-14 shrink-0 ${
        flat ? "text-zinc-400"
        : up  ? "text-emerald-600 dark:text-emerald-400"
             : "text-red-500 dark:text-red-400"
      }`}>
        {changePct >= 0 ? "+" : ""}{changePct.toFixed(2)}%
      </span>

      {/* Volume bar */}
      <div className="flex-1 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
        <div
          className={`h-full rounded-full ${
            flat ? "bg-zinc-400/40"
            : up  ? "bg-emerald-500/60"
                 : "bg-red-500/60"
          }`}
          style={{ width: `${Math.max(4, volPct)}%` }}
        />
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function BuySellSentiment({ symbol }: { symbol: string }) {
  const [analyst, setAnalyst] = useState<AnalystData | null>(null);
  const [bars,    setBars]    = useState<DayBar[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

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
        setBars(parsed.slice(-14));
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [symbol]);

  // ── 14-day derived stats ────────────────────────────────────────────────
  const upDays   = bars.filter((b) => b.close > b.open);
  const downDays = bars.filter((b) => b.close < b.open);
  const flatDays = bars.filter((b) => b.close === b.open);

  const totalVol   = bars.reduce((s, b) => s + b.volume, 0);
  const upVol      = upDays.reduce((s, b) => s + b.volume, 0);
  const buyVolPct  = totalVol > 0 ? Math.round((upVol / totalVol) * 100) : 50;
  const maxVol     = Math.max(...bars.map((b) => b.volume), 1);

  const recentReturn =
    bars.length >= 2
      ? ((bars[bars.length - 1].close - bars[0].open) / bars[0].open) * 100
      : null;

  // ── Analyst computed ────────────────────────────────────────────────────
  const trendNow  = analyst?.trend?.[0];
  const buyCount  = (trendNow?.strongBuy ?? 0) + (trendNow?.buy ?? 0);
  const sellCount = (trendNow?.sell ?? 0) + (trendNow?.strongSell ?? 0);
  const holdCount = trendNow?.hold ?? 0;
  const total     = buyCount + holdCount + sellCount;
  const buyPct    = total > 0 ? Math.round((buyCount  / total) * 100) : 0;
  const holdPct   = total > 0 ? Math.round((holdCount / total) * 100) : 0;
  const sellPct   = total > 0 ? Math.round((sellCount / total) * 100) : 0;

  const recKey   = analyst?.recommendationKey ?? "hold";
  const recLabel = REC_LABELS[recKey] ?? REC_LABELS["hold"];
  const upside   =
    analyst?.targetMean && analyst?.currentPrice
      ? ((analyst.targetMean - analyst.currentPrice) / analyst.currentPrice) * 100
      : null;

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-200/60 dark:border-white/[0.07] bg-white dark:bg-zinc-900 p-4 space-y-4">
        <div className="skeleton h-4 w-44 rounded" />
        <div className="skeleton h-28 w-40 rounded-full mx-auto" />
        <div className="skeleton h-3 w-full rounded" />
        <div className="skeleton h-3 w-4/5 rounded" />
      </div>
    );
  }

  const hasBars    = bars.length > 0;
  const hasAnalyst = total > 0;
  if (!hasBars && !hasAnalyst) return null;

  const v = verdict(buyVolPct);
  const displayedBars = showAll ? [...bars].reverse() : [...bars].reverse().slice(0, 7);

  return (
    <div className="space-y-3">

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* Section A: 14-day みんかぶスタイル売買動向                       */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {hasBars && (
        <div className="rounded-xl border border-zinc-200/60 dark:border-white/[0.07] bg-white dark:bg-zinc-900 overflow-hidden">

          {/* Header */}
          <div className="px-4 pt-3.5 pb-2 flex items-center justify-between border-b border-zinc-100 dark:border-white/[0.05]">
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
              <span>📊</span>
              <span>個人投資家 売買動向</span>
              <span className="text-[10px] font-normal text-zinc-400 ml-0.5">直近14日間</span>
            </h3>
            {recentReturn !== null && (
              <span className={`text-xs font-mono font-bold ${
                recentReturn >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
              }`}>
                {recentReturn >= 0 ? "+" : ""}{recentReturn.toFixed(2)}%
              </span>
            )}
          </div>

          {/* Gauge + stats */}
          <div className="px-4 pt-4 pb-3">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">

              {/* ── Gauge ── */}
              <div className="w-full sm:w-48 shrink-0">
                <Gauge buyPct={buyVolPct} />
                {/* Verdict pill */}
                <div className={`mt-1 text-center text-xs font-bold ${v.color}`}>
                  出来高加重 買い圧力: {buyVolPct}%
                </div>
              </div>

              {/* ── Right stats ── */}
              <div className="flex-1 w-full space-y-3">
                {/* Day count grid */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/30 px-3 py-2.5 text-center">
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mb-0.5">上昇日</div>
                    <div className="text-xl font-black tabular-nums text-emerald-700 dark:text-emerald-300">{upDays.length}</div>
                    <div className="text-[9px] text-emerald-500/80">日</div>
                  </div>
                  <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-white/[0.07] px-3 py-2.5 text-center">
                    <div className="text-[10px] text-zinc-500 font-medium mb-0.5">横ばい</div>
                    <div className="text-xl font-black tabular-nums text-zinc-600 dark:text-zinc-400">{flatDays.length}</div>
                    <div className="text-[9px] text-zinc-400">日</div>
                  </div>
                  <div className="rounded-xl bg-red-50 dark:bg-red-950/25 border border-red-200/60 dark:border-red-800/30 px-3 py-2.5 text-center">
                    <div className="text-[10px] text-red-500 dark:text-red-400 font-medium mb-0.5">下落日</div>
                    <div className="text-xl font-black tabular-nums text-red-600 dark:text-red-400">{downDays.length}</div>
                    <div className="text-[9px] text-red-400/80">日</div>
                  </div>
                </div>

                {/* Visual dot timeline */}
                <div>
                  <div className="text-[10px] text-zinc-400 mb-1.5">
                    {bars[0]?.date.slice(5,10).replace("-","/")} 〜 {bars[bars.length-1]?.date.slice(5,10).replace("-","/")}
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {bars.map((bar, i) => {
                      const up   = bar.close > bar.open;
                      const flat = bar.close === bar.open;
                      return (
                        <div
                          key={i}
                          title={bar.date.slice(5,10) + " " + (up ? "▲" : flat ? "━" : "▼") + " " + ((bar.close-bar.open)/bar.open*100).toFixed(2)+"%"}
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border ${
                            flat
                              ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-500"
                              : up
                                ? "bg-emerald-500 border-emerald-600 text-white"
                                : "bg-red-500 border-red-600 text-white"
                          }`}
                        >
                          {flat ? "━" : up ? "▲" : "▼"}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Volume-weighted bar */}
                <div>
                  <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
                    <span>売り圧力</span>
                    <span>買い圧力</span>
                  </div>
                  <div className="flex h-5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-red-600 to-red-400 flex items-center justify-center text-white text-[9px] font-bold"
                      style={{ width: `${100 - buyVolPct}%` }}
                    >
                      {(100 - buyVolPct) >= 20 && `${100 - buyVolPct}%`}
                    </div>
                    <div
                      className="bg-gradient-to-r from-emerald-400 to-emerald-500 flex items-center justify-center text-white text-[9px] font-bold"
                      style={{ width: `${buyVolPct}%` }}
                    >
                      {buyVolPct >= 20 && `${buyVolPct}%`}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Day-by-day list */}
          <div className="px-4 pb-1 border-t border-zinc-100 dark:border-white/[0.04]">
            <div className="flex items-center justify-between pt-2.5 pb-1">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">日次推移</span>
              <span className="text-[10px] text-zinc-400">日付 / 方向 / 騰落率 / 出来高</span>
            </div>
            <div>
              {displayedBars.map((bar, i) => (
                <DayRow key={i} bar={bar} maxVol={maxVol} />
              ))}
            </div>
            {bars.length > 7 && (
              <button
                onClick={() => setShowAll((s) => !s)}
                className="w-full py-2 text-[11px] text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
              >
                {showAll ? "▲ 折りたたむ" : `▼ 全${bars.length}日を表示`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* Section B: Analyst consensus (アナリスト予想)                   */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {hasAnalyst && (
        <div className="rounded-xl border border-zinc-200/60 dark:border-white/[0.07] bg-white dark:bg-zinc-900 overflow-hidden">
          {/* Header */}
          <div className="px-4 pt-3.5 pb-2 flex items-center justify-between border-b border-zinc-100 dark:border-white/[0.05]">
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
              <span>🎯</span>
              <span>アナリスト予想コンセンサス</span>
            </h3>
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${recLabel.bg} text-white`}>
              {recLabel.text}
            </span>
          </div>

          <div className="px-4 pt-3 pb-4 space-y-3">
            {/* Bar */}
            <div>
              <div className="flex rounded-full overflow-hidden h-7 gap-px">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-emerald-400 flex items-center justify-center text-white text-[10px] font-bold"
                  style={{ width: `${buyPct}%` }}
                >
                  {buyPct >= 12 && `${buyPct}%`}
                </div>
                <div
                  className="bg-gradient-to-r from-amber-400 to-yellow-300 flex items-center justify-center text-white text-[10px] font-bold"
                  style={{ width: `${holdPct}%` }}
                >
                  {holdPct >= 12 && `${holdPct}%`}
                </div>
                <div
                  className="bg-gradient-to-r from-rose-400 to-rose-500 flex items-center justify-center text-white text-[10px] font-bold"
                  style={{ width: `${sellPct}%` }}
                >
                  {sellPct >= 12 && `${sellPct}%`}
                </div>
              </div>
              <div className="flex justify-between mt-1.5 text-[11px] text-zinc-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"/>買い {buyPct}%</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"/>中立 {holdPct}%</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block"/>売り {sellPct}%</span>
              </div>
            </div>

            {/* Target price */}
            {analyst?.targetMean != null && analyst?.currentPrice != null && (
              <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50 rounded-xl px-4 py-3">
                <div className="space-y-0.5">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-400">目標株価（平均）</div>
                  <div className="font-mono font-black text-xl tabular-nums text-zinc-900 dark:text-zinc-50">
                    {formatNumber(analyst.targetMean)}
                  </div>
                  {analyst.targetLow != null && analyst.targetHigh != null && (
                    <div className="text-[10px] text-zinc-400">
                      レンジ {formatNumber(analyst.targetLow)} 〜 {formatNumber(analyst.targetHigh)}
                    </div>
                  )}
                </div>
                {upside != null && (
                  <div className={`flex items-center gap-1 text-sm font-bold px-3 py-2 rounded-xl ${
                    upside >= 0
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                  }`}>
                    {upside >= 0 ? <TrendingUp className="w-4 h-4"/> : <TrendingDown className="w-4 h-4"/>}
                    {upside >= 0 ? "+" : ""}{upside.toFixed(1)}%
                  </div>
                )}
              </div>
            )}

            {/* Monthly trend mini-bars */}
            {(analyst?.trend?.length ?? 0) > 1 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-2">月別推移</div>
                <div className="space-y-1.5">
                  {analyst!.trend.slice(0, 4).map((t) => {
                    const bCnt = t.strongBuy + t.buy;
                    const sCnt = t.sell + t.strongSell;
                    const tot  = bCnt + t.hold + sCnt;
                    const bP   = tot > 0 ? Math.round(bCnt / tot * 100) : 0;
                    const hP   = tot > 0 ? Math.round(t.hold / tot * 100) : 0;
                    const sP   = tot > 0 ? Math.round(sCnt / tot * 100) : 0;
                    return (
                      <div key={t.period} className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-500 w-14 shrink-0">{PERIOD_LABELS[t.period] ?? t.period}</span>
                        <div className="flex-1 flex rounded-full overflow-hidden h-3 gap-px">
                          <div className="bg-emerald-400/80" style={{ width: `${bP}%` }} />
                          <div className="bg-amber-300/80"   style={{ width: `${hP}%` }} />
                          <div className="bg-rose-400/80"   style={{ width: `${sP}%` }} />
                        </div>
                        <span className="text-[10px] text-zinc-400 w-8 text-right shrink-0">{tot}名</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="text-[10px] text-zinc-400 text-right">
              アナリスト {total} 名の予想
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
