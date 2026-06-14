"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar, RefreshCw, TrendingUp, TrendingDown,
  ChevronDown, ChevronUp, BarChart2, Clock,
} from "lucide-react";
import { formatNumber } from "@/lib/format";
import PastEarningsView from "@/components/PastEarningsView";

// ── Types ──────────────────────────────────────────────────────────
type Stock = {
  symbol:          string;
  name:            string;
  earningsDate:    number;
  currentPrice:    number | null;
  changePercent:   number | null;
  currency:        string;
  epsEstimate:     number | null;
  epsPrev:         number | null;
  revenueEstimate: number | null;
  sector:          string | null;
};

type DayEntry = {
  date:   string;
  stocks: Stock[];
};

type CalendarResp = {
  market:    string;
  updatedAt: string;
  total:     number;
  calendar:  DayEntry[];
};

type Market  = "JP" | "US";
type ViewTab = "calendar" | "history";

// ── Helpers ────────────────────────────────────────────────────────
const WEEKDAY_JP = ["日", "月", "火", "水", "木", "金", "土"];

function parseDateInfo(iso: string) {
  const d = new Date(iso + "T00:00:00");
  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const tomorrowIso = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);
  const diffDays = Math.round((d.getTime() - now.getTime()) / 86400000);
  return {
    month:    d.getMonth() + 1,
    day:      d.getDate(),
    weekday:  WEEKDAY_JP[d.getDay()],
    isToday:    iso === todayIso,
    isTomorrow: iso === tomorrowIso,
    isWeekend:  d.getDay() === 0 || d.getDay() === 6,
    diffDays,
  };
}

function daysUntilLabel(earningsTs: number): string | null {
  const now = Date.now() / 1000;
  const diff = earningsTs - now;
  const days = Math.ceil(diff / 86400);
  if (days <= 0) return "本日";
  if (days === 1) return "明日";
  if (days <= 7) return `${days}日後`;
  return null;
}

// ── EPS bar ────────────────────────────────────────────────────────
function EpsBar({ estimate, prev }: { estimate: number | null; prev: number | null }) {
  if (estimate == null && prev == null) return null;
  const growth = estimate != null && prev != null && prev !== 0
    ? ((estimate - prev) / Math.abs(prev)) * 100
    : null;
  const isUp = growth != null ? growth >= 0 : estimate != null && estimate >= 0;

  return (
    <div className="flex items-center gap-3">
      {prev != null && (
        <div className="text-center">
          <div className="text-[9px] text-zinc-400 mb-0.5">前期EPS</div>
          <div className="font-mono text-xs font-bold text-zinc-600 dark:text-zinc-300">
            {prev >= 0 ? "+" : ""}{prev.toFixed(2)}
          </div>
        </div>
      )}
      {estimate != null && (
        <div className="text-center">
          <div className="text-[9px] text-zinc-400 mb-0.5">予想EPS</div>
          <div className={`font-mono text-xs font-bold ${estimate >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
            {estimate >= 0 ? "+" : ""}{estimate.toFixed(2)}
          </div>
        </div>
      )}
      {growth != null && (
        <div className="flex-1">
          <div className="text-[9px] text-zinc-400 mb-0.5 text-right">EPS成長率</div>
          <div className={`text-right font-mono text-xs font-bold ${isUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
            {isUp ? "▲" : "▼"}{Math.abs(growth).toFixed(1)}%
          </div>
          {/* mini bar */}
          <div className="mt-0.5 h-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
            <div
              className={`h-full rounded-full ${isUp ? "bg-emerald-400" : "bg-rose-400"}`}
              style={{ width: `${Math.min(100, Math.abs(growth) * 2)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-pulse">
          <div className="h-12 bg-zinc-100 dark:bg-zinc-800" />
          {[1, 2, 3].map(j => (
            <div key={j} className="h-11 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center gap-3 px-4">
              <div className="h-3 w-14 rounded bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-3 flex-1 rounded bg-zinc-100 dark:bg-zinc-800" />
              <div className="h-3 w-10 rounded bg-zinc-200 dark:bg-zinc-700" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Stock row ──────────────────────────────────────────────────────
function StockRow({ s, market }: { s: Stock; market: Market }) {
  const [open, setOpen] = useState(false);
  const up = (s.changePercent ?? 0) >= 0;
  const hasDetail = s.epsEstimate != null || s.epsPrev != null;
  const countdown = daysUntilLabel(s.earningsDate);

  return (
    <>
      <div
        className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
          hasDetail ? "cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/30" : ""
        }`}
        onClick={() => hasDetail && setOpen(v => !v)}
      >
        {/* Symbol + countdown */}
        <div className="shrink-0 w-[4.5rem]">
          <Link
            href={`/stock/${encodeURIComponent(s.symbol)}`}
            onClick={e => e.stopPropagation()}
            className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400 hover:underline block leading-tight"
          >
            {s.symbol}
          </Link>
          {countdown && (
            <div className="flex items-center gap-0.5 mt-0.5">
              <Clock className="w-2.5 h-2.5 text-orange-400 shrink-0" />
              <span className="text-[9px] font-bold text-orange-500 dark:text-orange-400 leading-none">{countdown}</span>
            </div>
          )}
        </div>

        {/* Name + sector */}
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate leading-tight">{s.name}</div>
          {s.sector && (
            <div className="text-[10px] text-zinc-400 truncate leading-tight mt-0.5">{s.sector}</div>
          )}
        </div>

        {/* Price */}
        <div className="text-right shrink-0 hidden sm:block">
          {s.currentPrice != null ? (
            <>
              <div className="font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-100 tabular-nums">
                {formatNumber(s.currentPrice)}
                <span className="text-[9px] text-zinc-400 ml-0.5">{s.currency}</span>
              </div>
              {s.changePercent != null && (
                <div className={`text-[10px] font-mono font-bold tabular-nums ${up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {up ? "▲" : "▼"}{Math.abs(s.changePercent).toFixed(2)}%
                </div>
              )}
            </>
          ) : (
            <div className="text-xs text-zinc-400">—</div>
          )}
        </div>

        {/* EPS preview */}
        {s.epsEstimate != null && (
          <div className={`shrink-0 hidden md:block text-xs font-mono font-semibold tabular-nums ${s.epsEstimate >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
            予想 {s.epsEstimate >= 0 ? "+" : ""}{s.epsEstimate.toFixed(2)}
          </div>
        )}

        {/* Expand */}
        <div className="shrink-0">
          {hasDetail
            ? (open
                ? <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
                : <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />)
            : <div className="w-3.5" />}
        </div>
      </div>

      {/* EPS detail */}
      {open && hasDetail && (
        <div className="px-4 pb-3 pt-1.5 bg-zinc-50/80 dark:bg-zinc-800/30 border-t border-zinc-100 dark:border-zinc-800/60">
          <EpsBar estimate={s.epsEstimate} prev={s.epsPrev} />
          <div className="mt-2 flex justify-end">
            <Link
              href={`/stock/${encodeURIComponent(s.symbol)}`}
              className="text-[10px] font-semibold text-blue-500 hover:text-blue-600 dark:hover:text-blue-400"
            >
              詳細 →
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

// ── Empty state ────────────────────────────────────────────────────
function EmptyState({ market, weeks, onExtend, onSwitch }: {
  market: Market;
  weeks: number;
  onExtend: () => void;
  onSwitch: () => void;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center shadow-sm">
      <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-3">
        <Calendar className="w-6 h-6 text-zinc-300 dark:text-zinc-600" />
      </div>
      <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
        決算予定データが見つかりません
      </p>
      <p className="text-xs text-zinc-400 mb-5 leading-relaxed">
        現在{market === "JP" ? "日本株" : "米国株"}の今後{weeks}週間分を検索中ですが、<br />
        Yahoo Financeがまだ決算日を公開していない可能性があります。
      </p>
      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        {weeks < 8 && (
          <button
            onClick={onExtend}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <Calendar className="w-3.5 h-3.5" />
            期間を8週間に延長
          </button>
        )}
        <button
          onClick={onSwitch}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        >
          {market === "JP" ? "🇺🇸 米国株を見る" : "🇯🇵 日本株を見る"}
        </button>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────
export default function EarningsPage() {
  const [tab,      setTab]      = useState<ViewTab>("calendar");
  const [market,   setMarket]   = useState<Market>("JP");
  const [data,     setData]     = useState<CalendarResp | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [weeks,    setWeeks]    = useState(4);

  const load = (m: Market, w: number) => {
    setLoading(true);
    fetch(`/api/earnings?market=${m}&weeks=${w}`)
      .then(r  => r.json())
      .then(d  => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(market, weeks); }, [market, weeks]);

  const fmtUpdated = (iso: string) =>
    new Date(iso).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const calendar = data?.calendar ?? [];

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2.5">
            <span className="inline-flex w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 items-center justify-center text-white shadow-md shadow-blue-500/25 shrink-0">
              <Calendar className="w-4 h-4" />
            </span>
            決算カレンダー
          </h1>
          <p className="text-xs text-zinc-500 mt-1 ml-10">
            {tab === "calendar"
              ? "今後の決算発表予定日を一覧で確認できます"
              : "過去の決算結果をセクター別・銘柄別に閲覧"}
          </p>
        </div>
        {data && !loading && tab === "calendar" && (
          <div className="shrink-0 text-right">
            <div className="text-[10px] text-zinc-400 leading-tight">更新</div>
            <div className="text-[10px] text-zinc-500 leading-tight tabular-nums">{fmtUpdated(data.updatedAt)}</div>
          </div>
        )}
      </header>

      {/* ── タブ切り替え ── */}
      <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl gap-1">
        <button
          onClick={() => setTab("calendar")}
          className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
            tab === "calendar"
              ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
        >
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          決算カレンダー
        </button>
        <button
          onClick={() => setTab("history")}
          className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
            tab === "history"
              ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5 shrink-0" />
          過去の決算
        </button>
      </div>

      {/* ── 過去の決算ビュー ── */}
      {tab === "history" && <PastEarningsView />}

      {/* ── カレンダービュー ── */}
      {tab === "calendar" && (
        <>
          {/* ── コントロールバー ── */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-2.5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              {/* 市場 */}
              <div className="flex p-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg gap-0.5">
                {(["JP", "US"] as Market[]).map(m => (
                  <button
                    key={m}
                    onClick={() => setMarket(m)}
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                      market === m
                        ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white"
                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                    }`}
                  >
                    <span>{m === "JP" ? "🇯🇵" : "🇺🇸"}</span>
                    <span>{m === "JP" ? "日本株" : "米株"}</span>
                  </button>
                ))}
              </div>

              {/* 期間 */}
              <div className="flex p-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg gap-0.5">
                {([2, 4, 8] as const).map(w => (
                  <button
                    key={w}
                    onClick={() => setWeeks(w)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                      weeks === w
                        ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white"
                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800"
                    }`}
                  >
                    {w}週
                  </button>
                ))}
              </div>

              {/* 件数 + 更新 */}
              <div className="ml-auto flex items-center gap-2">
                {data && !loading && (
                  <span className="text-xs text-zinc-500">
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">{data.total}</span>社予定
                  </span>
                )}
                <button
                  onClick={() => load(market, weeks)}
                  disabled={loading}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors disabled:opacity-40"
                >
                  <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
                  更新
                </button>
              </div>
            </div>
          </div>

          {/* ── カレンダー本体 ── */}
          {loading ? (
            <Skeleton />
          ) : calendar.length === 0 ? (
            <EmptyState
              market={market}
              weeks={weeks}
              onExtend={() => setWeeks(8)}
              onSwitch={() => setMarket(market === "JP" ? "US" : "JP")}
            />
          ) : (
            <div className="space-y-3">
              {calendar.map(({ date, stocks }) => {
                const { month, day, weekday, isToday, isTomorrow, isWeekend } = parseDateInfo(date);
                const upCount = stocks.filter(s => (s.changePercent ?? 0) >= 0).length;
                const dnCount = stocks.length - upCount;

                return (
                  <div
                    key={date}
                    className={`rounded-2xl border overflow-hidden shadow-sm ${
                      isToday
                        ? "border-blue-300 dark:border-blue-700 ring-1 ring-blue-200 dark:ring-blue-800"
                        : isWeekend
                        ? "border-zinc-200/60 dark:border-zinc-800/60 opacity-80"
                        : "border-zinc-200 dark:border-zinc-800"
                    } bg-white dark:bg-zinc-900`}
                  >
                    {/* 日付ヘッダー */}
                    <div className={`flex items-center gap-3 px-4 py-2 border-b ${
                      isToday
                        ? "bg-gradient-to-r from-blue-50 to-indigo-50/50 dark:from-blue-950/30 dark:to-indigo-950/20 border-blue-100 dark:border-blue-900/30"
                        : "bg-zinc-50/80 dark:bg-zinc-800/40 border-zinc-100 dark:border-zinc-800"
                    }`}>
                      {/* 日付アイコン */}
                      <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 leading-tight ${
                        isToday
                          ? "bg-blue-500 text-white shadow-sm shadow-blue-500/30"
                          : "bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300"
                      }`}>
                        <span className="text-[9px] font-semibold">{month}月</span>
                        <span className="text-sm font-black leading-none">{day}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-100">
                            {month}月{day}日（{weekday}）
                          </span>
                          {isToday && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500 text-white font-bold leading-none">今日</span>
                          )}
                          {isTomorrow && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-400 text-white font-bold leading-none">明日</span>
                          )}
                          {isWeekend && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-400 text-white font-bold leading-none">休場</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-zinc-400">{stocks.length}社が発表予定</span>
                          {upCount > 0 && <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5"><TrendingUp className="w-2.5 h-2.5" />{upCount}</span>}
                          {dnCount > 0 && <span className="text-[10px] text-rose-600 dark:text-rose-400 flex items-center gap-0.5"><TrendingDown className="w-2.5 h-2.5" />{dnCount}</span>}
                        </div>
                      </div>
                    </div>

                    {/* 銘柄一覧 */}
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                      {stocks.map(s => (
                        <StockRow key={s.symbol} s={s} market={market as Market} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 注記 */}
          {!loading && (
            <p className="text-[10px] text-zinc-400 text-center leading-relaxed pb-2">
              ※ 決算予定日はYahoo Finance APIより自動取得。実際の発表日程と異なる場合があります。
            </p>
          )}
        </>
      )}
    </div>
  );
}
