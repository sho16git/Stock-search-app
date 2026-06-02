"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, RefreshCw, TrendingUp, TrendingDown, ChevronDown, ChevronUp, BarChart2 } from "lucide-react";
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
  return {
    month:    d.getMonth() + 1,
    day:      d.getDate(),
    weekday:  WEEKDAY_JP[d.getDay()],
    isToday:    iso === todayIso,
    isTomorrow: iso === tomorrowIso,
    isWeekend:  d.getDay() === 0 || d.getDay() === 6,
  };
}

// ── Skeleton ───────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-pulse">
          <div className="h-14 bg-zinc-100 dark:bg-zinc-800" />
          {[1, 2, 3].map(j => (
            <div key={j} className="h-12 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center gap-3 px-4">
              <div className="h-3 w-16 rounded bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-3 flex-1 rounded bg-zinc-100 dark:bg-zinc-800" />
              <div className="h-3 w-12 rounded bg-zinc-200 dark:bg-zinc-700" />
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

  return (
    <>
      <div
        className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors cursor-pointer"
        onClick={() => setOpen(v => !v)}
      >
        {/* Symbol */}
        <div className="shrink-0 w-20">
          <Link
            href={`/stock/${encodeURIComponent(s.symbol)}`}
            onClick={e => e.stopPropagation()}
            className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {s.symbol}
          </Link>
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <div className="text-sm text-zinc-700 dark:text-zinc-300 truncate">{s.name}</div>
          {s.sector && (
            <div className="text-xs text-zinc-400 truncate">{s.sector}</div>
          )}
        </div>

        {/* Price / Change */}
        <div className="text-right shrink-0">
          {s.currentPrice != null ? (
            <>
              <div className="font-mono text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                {formatNumber(s.currentPrice)}
                <span className="text-xs text-zinc-400 ml-0.5">{s.currency}</span>
              </div>
              {s.changePercent != null && (
                <div className={`text-xs font-mono font-bold ${up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {up ? "▲" : "▼"}{Math.abs(s.changePercent).toFixed(2)}%
                </div>
              )}
            </>
          ) : (
            <div className="text-xs text-zinc-400">—</div>
          )}
        </div>

        {/* Expand */}
        <div className="shrink-0">
          {(s.epsEstimate != null || s.epsPrev != null)
            ? (open ? <ChevronUp className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />)
            : <div className="w-3.5" />}
        </div>
      </div>

      {/* EPS 詳細 */}
      {open && (s.epsEstimate != null || s.epsPrev != null) && (
        <div className="px-4 pb-3 pt-1 bg-zinc-50/80 dark:bg-zinc-800/30 border-t border-zinc-100 dark:border-zinc-800/60">
          <div className="flex gap-4 text-xs">
            {s.epsEstimate != null && (
              <div>
                <div className="text-[10px] text-zinc-400 uppercase tracking-wider">予想EPS</div>
                <div className={`font-mono font-bold ${s.epsEstimate >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {s.epsEstimate >= 0 ? "+" : ""}{s.epsEstimate.toFixed(2)}
                  {market === "JP" ? "円" : "USD"}
                </div>
              </div>
            )}
            {s.epsPrev != null && (
              <div>
                <div className="text-[10px] text-zinc-400 uppercase tracking-wider">前期EPS</div>
                <div className={`font-mono font-bold ${s.epsPrev >= 0 ? "text-zinc-700 dark:text-zinc-300" : "text-rose-600 dark:text-rose-400"}`}>
                  {s.epsPrev >= 0 ? "+" : ""}{s.epsPrev.toFixed(2)}
                  {market === "JP" ? "円" : "USD"}
                </div>
              </div>
            )}
            {s.epsEstimate != null && s.epsPrev != null && s.epsPrev !== 0 && (
              <div>
                <div className="text-[10px] text-zinc-400 uppercase tracking-wider">成長率</div>
                <div className={`font-mono font-bold ${s.epsEstimate > s.epsPrev ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {s.epsEstimate > s.epsPrev ? "▲" : "▼"}
                  {Math.abs(((s.epsEstimate - s.epsPrev) / Math.abs(s.epsPrev)) * 100).toFixed(1)}%
                </div>
              </div>
            )}
            <div className="ml-auto">
              <Link
                href={`/stock/${encodeURIComponent(s.symbol)}`}
                className="text-xs font-semibold text-blue-500 hover:text-blue-600 dark:hover:text-blue-400"
              >
                詳細 →
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
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
    <div className="space-y-5">

      {/* ── Header ── */}
      <header>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
          <span className="inline-flex w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 items-center justify-center text-white shadow-lg shadow-blue-500/25">
            <Calendar className="w-5 h-5" />
          </span>
          決算カレンダー
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          {tab === "calendar"
            ? "今後の決算発表予定日を一覧で確認できます。タップで詳細を表示。"
            : "アプリ内銘柄の過去の決算結果をセクター別・銘柄別に閲覧できます。"}
        </p>
      </header>

      {/* ── タブ切り替え ── */}
      <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800/60 rounded-2xl gap-1 max-w-sm">
        <button
          onClick={() => setTab("calendar")}
          className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            tab === "calendar"
              ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
        >
          <Calendar className="w-4 h-4 shrink-0" />
          決算カレンダー
        </button>
        <button
          onClick={() => setTab("history")}
          className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            tab === "history"
              ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
        >
          <BarChart2 className="w-4 h-4 shrink-0" />
          過去の決算
        </button>
      </div>

      {/* ── 過去の決算ビュー ── */}
      {tab === "history" && <PastEarningsView />}

      {/* ── カレンダービュー (tab === "calendar" のみ表示) ── */}
      {tab === "calendar" && (<>

      {/* ── コントロール ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* 市場 */}
          <div className="flex p-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl gap-0.5">
            {(["JP", "US"] as Market[]).map(m => (
              <button
                key={m}
                onClick={() => setMarket(m)}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
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
          <div className="flex p-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl gap-0.5">
            {([2, 4, 8] as const).map(w => (
              <button
                key={w}
                onClick={() => setWeeks(w)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  weeks === w
                    ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800"
                }`}
              >
                {w}週間
              </button>
            ))}
          </div>

          {/* 更新 */}
          <div className="ml-auto flex items-center gap-2">
            {data && !loading && (
              <span className="text-xs text-zinc-400 hidden sm:block">
                更新: {fmtUpdated(data.updatedAt)}
              </span>
            )}
            <button
              onClick={() => load(market, weeks)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
              更新
            </button>
          </div>
        </div>

        {/* 概要 */}
        {data && !loading && (
          <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-4 text-xs text-zinc-500">
            <span>今後{weeks}週間の決算予定: <strong className="text-zinc-800 dark:text-zinc-200">{data.total}社</strong></span>
            <span className="text-xs text-zinc-400">※ Yahoo Financeのデータに基づく参考値です</span>
          </div>
        )}
      </div>

      {/* ── カレンダー ── */}
      {loading ? (
        <Skeleton />
      ) : calendar.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-10 text-center shadow-sm">
          <Calendar className="w-10 h-10 text-zinc-200 dark:text-zinc-700 mx-auto mb-3" />
          <p className="text-sm font-semibold text-zinc-500 mb-1">決算予定データが見つかりませんでした</p>
          <p className="text-xs text-zinc-400">
            Yahoo Financeが決算日を公開していない銘柄は表示されません。<br />
            期間を延長するか、後でもう一度お試しください。
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {calendar.map(({ date, stocks }) => {
            const { month, day, weekday, isToday, isTomorrow, isWeekend } = parseDateInfo(date);
            return (
              <div
                key={date}
                className={`rounded-2xl border overflow-hidden shadow-sm ${
                  isToday
                    ? "border-blue-300 dark:border-blue-700"
                    : isWeekend
                    ? "border-zinc-200/60 dark:border-zinc-800/60 opacity-75"
                    : "border-zinc-200 dark:border-zinc-800"
                } bg-white dark:bg-zinc-900`}
              >
                {/* 日付ヘッダー */}
                <div className={`flex items-center gap-3 px-4 py-2.5 border-b ${
                  isToday
                    ? "bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30"
                    : "bg-zinc-50/80 dark:bg-zinc-800/40 border-zinc-100 dark:border-zinc-800"
                }`}>
                  {/* 日付アイコン */}
                  <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 leading-tight ${
                    isToday
                      ? "bg-blue-500 text-white shadow-sm shadow-blue-500/30"
                      : "bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300"
                  }`}>
                    <span className="text-[10px] font-semibold">{month}月</span>
                    <span className="text-base font-black">{day}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100">
                        {month}月{day}日（{weekday}）
                      </span>
                      {isToday && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-500 text-white font-bold">
                          今日
                        </span>
                      )}
                      {isTomorrow && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-orange-400 text-white font-bold">
                          明日
                        </span>
                      )}
                      {isWeekend && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-zinc-400 text-white font-bold">
                          休場
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5">
                      {stocks.length}社が決算発表予定
                    </div>
                  </div>

                  {/* 市場トレンド簡易サマリ */}
                  {stocks.length > 0 && (
                    <div className="shrink-0 hidden sm:flex items-center gap-2 text-xs text-zinc-400">
                      {(() => {
                        const up = stocks.filter(s => (s.changePercent ?? 0) >= 0).length;
                        const dn = stocks.length - up;
                        return (
                          <div className="flex items-center gap-1">
                            {up > 0 && <span className="flex items-center gap-0.5 text-emerald-600"><TrendingUp className="w-3 h-3" />{up}</span>}
                            {dn > 0 && <span className="flex items-center gap-0.5 text-rose-600"><TrendingDown className="w-3 h-3" />{dn}</span>}
                          </div>
                        );
                      })()}
                    </div>
                  )}
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
      <p className="text-xs text-zinc-400 text-center leading-relaxed pb-2">
        ※ 決算予定日はYahoo Finance APIより自動取得。実際の発表日程と異なる場合があります。<br />
        決算翌日の株価変動に備え、前日中のポジション確認を推奨します。
      </p>

      </>)}
    </div>
  );
}
