"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp, TrendingDown, RefreshCw, Loader2,
  ChevronDown, ChevronUp, Sparkles,
} from "lucide-react";
import { formatNumber } from "@/lib/format";

type RankEntry = {
  rank: number;
  symbol: string;
  name: string;
  market: "JP" | "US";
  theme: string;
  score: number;
  currentPrice: number;
  currency: string;
  expectedReturn: string;
  rationale: string;
};

type RankingResp = {
  period: string;
  updatedAt: string;
  bull: RankEntry[];
  bear: RankEntry[];
};

type Period = "1y" | "5y" | "10y";

const PERIOD_LABELS: Record<Period, string> = {
  "1y":  "1年後",
  "5y":  "5年後",
  "10y": "10年後",
};

const RANK_MEDAL = ["🥇", "🥈", "🥉"];

function ReturnBadge({ value, direction }: { value: string; direction: "bull" | "bear" }) {
  const isPos = !value.startsWith("-");
  return (
    <span className={`font-mono font-black text-sm px-2.5 py-0.5 rounded-full ${
      direction === "bull"
        ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
        : "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300"
    }`}>
      {isPos && direction === "bull" ? "▲" : "▼"} {value}
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  return (
    <div className="w-16 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-700"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function RankRow({
  entry,
  direction,
  expanded,
  onToggle,
}: {
  entry: RankEntry;
  direction: "bull" | "bear";
  expanded: boolean;
  onToggle: () => void;
}) {
  const medal = RANK_MEDAL[entry.rank - 1];
  return (
    <div className={`border-b last:border-0 border-zinc-100 dark:border-zinc-800/60 ${
      expanded ? "bg-zinc-50 dark:bg-zinc-800/30" : ""
    }`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors text-left"
      >
        {/* Rank */}
        <div className="w-7 shrink-0 text-center">
          {medal
            ? <span className="text-lg leading-none">{medal}</span>
            : <span className="text-sm font-black text-zinc-400">#{entry.rank}</span>}
        </div>

        {/* Symbol + name */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">
              {entry.symbol}
            </span>
            <span className="text-[9px]">{entry.market === "JP" ? "🇯🇵" : "🇺🇸"}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 shrink-0 hidden sm:inline">
              {entry.theme}
            </span>
          </div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400 truncate">{entry.name}</div>
        </div>

        {/* Score bar */}
        <ScoreBar score={entry.score} />

        {/* Return */}
        <div className="shrink-0">
          <ReturnBadge value={entry.expectedReturn} direction={direction} />
        </div>

        {/* Expand */}
        {expanded
          ? <ChevronUp className="w-4 h-4 text-zinc-400 shrink-0" />
          : <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />}
      </button>

      {/* Expanded rationale */}
      {expanded && (
        <div className="px-4 pb-3 pt-0">
          <div className={`rounded-xl px-3.5 py-3 text-xs leading-relaxed ${
            direction === "bull"
              ? "bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-800 dark:text-rose-300"
          }`}>
            <div className="flex items-center gap-1.5 mb-1.5">
              {direction === "bull"
                ? <TrendingUp className="w-3.5 h-3.5" />
                : <TrendingDown className="w-3.5 h-3.5" />}
              <span className="font-bold">AI予想根拠</span>
            </div>
            <p>{entry.rationale}</p>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] text-zinc-400">
              現在価格: <span className="font-mono">{formatNumber(entry.currentPrice)} {entry.currency}</span>
            </span>
            <Link
              href={`/stock/${encodeURIComponent(entry.symbol)}`}
              className="text-[10px] text-blue-500 hover:underline"
            >
              詳細を見る →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function RankingPanel({
  entries,
  direction,
  label,
  icon,
}: {
  entries: RankEntry[];
  direction: "bull" | "bear";
  label: string;
  icon: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const toggle = (rank: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(rank)) next.delete(rank);
      else next.add(rank);
      return next;
    });
  };

  return (
    <div className={`rounded-2xl border overflow-hidden shadow-sm ${
      direction === "bull"
        ? "border-emerald-200 dark:border-emerald-800/40"
        : "border-rose-200 dark:border-rose-800/40"
    } bg-white dark:bg-zinc-900`}>
      {/* Panel header */}
      <div className={`flex items-center gap-2.5 px-4 py-3 border-b ${
        direction === "bull"
          ? "border-emerald-100 dark:border-emerald-900/30 bg-emerald-50 dark:bg-emerald-950/20"
          : "border-rose-100 dark:border-rose-900/30 bg-rose-50 dark:bg-rose-950/20"
      }`}>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
          direction === "bull"
            ? "bg-emerald-500"
            : "bg-rose-500"
        } text-white shadow-sm`}>
          {icon}
        </div>
        <div>
          <div className={`text-sm font-bold ${
            direction === "bull"
              ? "text-emerald-800 dark:text-emerald-300"
              : "text-rose-800 dark:text-rose-300"
          }`}>
            {label}
          </div>
          <div className="text-[10px] text-zinc-500">行をタップで予想根拠を表示</div>
        </div>
      </div>

      {/* Rows */}
      <div>
        {entries.map((e) => (
          <RankRow
            key={e.symbol}
            entry={e}
            direction={direction}
            expanded={expanded.has(e.rank)}
            onToggle={() => toggle(e.rank)}
          />
        ))}
      </div>
    </div>
  );
}

export default function AiRankingPage() {
  const [period, setPeriod]   = useState<Period>("1y");
  const [data, setData]       = useState<RankingResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastPeriod, setLastPeriod] = useState<Period | null>(null);

  const load = useCallback((p: Period) => {
    if (loading && lastPeriod === p) return;
    setLoading(true);
    fetch(`/api/ai-ranking?period=${p}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLastPeriod(p); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [loading, lastPeriod]);

  useEffect(() => { load(period); }, [period]); // eslint-disable-line react-hooks/exhaustive-deps

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-5">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
          <span className="inline-flex w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 items-center justify-center text-white shadow-lg shadow-violet-500/25">
            <Sparkles className="w-5 h-5" />
          </span>
          AI投資予想ランキング
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          財務データをAIが分析。高騰・下落が期待される銘柄をランキング表示します。
        </p>
      </header>

      {/* Controls */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Period tabs */}
          <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl gap-1">
            {(["1y", "5y", "10y"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  period === p
                    ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800"
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {data && !loading && (
              <span className="text-[10px] text-zinc-400">
                更新: {fmtDate(data.updatedAt)}
              </span>
            )}
            <button
              onClick={() => { setData(null); load(period); }}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-900/60 transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              再分析
            </button>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="mt-3 text-[10px] text-zinc-400 leading-relaxed bg-zinc-50 dark:bg-zinc-800/50 rounded-lg px-3 py-2">
          ⚠️ 本ランキングはルールベースAIが財務データ・アナリスト評価を元に算出した参考情報です。
          実際の投資判断は自己責任でお願いします。スコアは毎時更新されます。
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center animate-pulse">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <p className="text-sm text-zinc-500">AIが{PERIOD_LABELS[period]}の銘柄を分析中…</p>
          <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
        </div>
      )}

      {/* Rankings */}
      {!loading && data && (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <RankingPanel
              entries={data.bull}
              direction="bull"
              label={`🚀 ${PERIOD_LABELS[period]} 高騰予想 TOP ${data.bull.length}`}
              icon={<TrendingUp className="w-4 h-4" />}
            />
            <RankingPanel
              entries={data.bear}
              direction="bear"
              label={`📉 ${PERIOD_LABELS[period]} 下落予想 TOP ${data.bear.length}`}
              icon={<TrendingDown className="w-4 h-4" />}
            />
          </div>

          {/* Methodology note */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
            <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
              <span className="text-base">🧠</span> スコアリング手法
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-zinc-600 dark:text-zinc-400">
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl px-3 py-2.5">
                <div className="font-bold text-zinc-800 dark:text-zinc-200 mb-1">📅 1年後スコア</div>
                アナリスト推奨・目標株価アップサイド・直近モメンタム・52週位置を重視
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl px-3 py-2.5">
                <div className="font-bold text-zinc-800 dark:text-zinc-200 mb-1">📆 5年後スコア</div>
                売上/利益成長率・ROE・営業利益率・バリュエーション適正度を重視
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl px-3 py-2.5">
                <div className="font-bold text-zinc-800 dark:text-zinc-200 mb-1">🗓️ 10年後スコア</div>
                ROE・財務健全性・配当持続性・時価総額安定性・長期構造トレンドを重視
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
