"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays } from "lucide-react";

type EconEvent = {
  title: string; country: string; date: string; impact: string;
  forecast: string | null; previous: string | null; actual: string | null;
};

const COUNTRY: Record<string, { flag: string; name: string }> = {
  USD: { flag: "🇺🇸", name: "米国" },
  JPY: { flag: "🇯🇵", name: "日本" },
  EUR: { flag: "🇪🇺", name: "ユーロ圏" },
  GBP: { flag: "🇬🇧", name: "英国" },
  CNY: { flag: "🇨🇳", name: "中国" },
  AUD: { flag: "🇦🇺", name: "豪州" },
  CAD: { flag: "🇨🇦", name: "カナダ" },
  CHF: { flag: "🇨🇭", name: "スイス" },
  NZD: { flag: "🇳🇿", name: "NZ" },
  All: { flag: "🌐", name: "全体" },
};

// Keyword → Japanese name for common indicators (falls back to English).
const INDICATOR_MAP: [RegExp, string][] = [
  [/federal funds rate/i, "FF金利（政策金利）"],
  [/fomc/i, "FOMC"],
  [/core cpi/i, "コア消費者物価指数(CPI)"],
  [/\bcpi\b/i, "消費者物価指数(CPI)"],
  [/core pce/i, "コアPCE価格指数"],
  [/\bpce\b/i, "PCE価格指数"],
  [/non-?farm/i, "非農業部門雇用者数"],
  [/unemployment rate/i, "失業率"],
  [/average hourly earnings/i, "平均時給"],
  [/core retail sales/i, "小売売上高(コア)"],
  [/retail sales/i, "小売売上高"],
  [/core ppi/i, "コア生産者物価指数(PPI)"],
  [/\bppi\b/i, "生産者物価指数(PPI)"],
  [/\bgdp\b/i, "GDP(国内総生産)"],
  [/ism manufacturing/i, "ISM製造業景況指数"],
  [/ism services/i, "ISM非製造業景況指数"],
  [/flash manufacturing pmi/i, "製造業PMI(速報)"],
  [/flash services pmi/i, "サービス業PMI(速報)"],
  [/manufacturing pmi/i, "製造業PMI"],
  [/services pmi/i, "サービス業PMI"],
  [/consumer confidence/i, "消費者信頼感指数"],
  [/consumer sentiment/i, "ミシガン大消費者信頼感"],
  [/durable goods/i, "耐久財受注"],
  [/building permits/i, "建設許可件数"],
  [/housing starts/i, "住宅着工件数"],
  [/existing home sales/i, "中古住宅販売件数"],
  [/new home sales/i, "新築住宅販売件数"],
  [/(initial )?(unemployment|jobless) claims/i, "新規失業保険申請件数"],
  [/trade balance/i, "貿易収支"],
  [/industrial production/i, "鉱工業生産"],
  [/boj policy rate/i, "日銀 政策金利"],
  [/monetary policy statement/i, "金融政策声明"],
  [/\bboj\b/i, "日銀"],
  [/tankan/i, "日銀短観"],
  [/tokyo core cpi/i, "東京都区部CPI(コア)"],
  [/national core cpi/i, "全国コアCPI"],
  [/tertiary industry/i, "第三次産業活動指数"],
  [/trump speaks|president trump/i, "トランプ大統領 発言"],
  [/(fed chair|powell|fomc member).*(speak|testif)/i, "FRB高官 発言"],
  [/\becb\b.*(rate|press|statement)/i, "ECB 政策金利/会見"],
  [/rate decision|official cash rate|cash rate/i, "政策金利"],
  [/employment change/i, "雇用者数"],
  [/empire state|philly fed|philadelphia fed/i, "地区連銀 製造業景況"],
];

function indicatorJa(title: string): string {
  for (const [re, ja] of INDICATOR_MAP) {
    if (re.test(title)) {
      const suffix = /m\/m/i.test(title) ? "（前月比）" : /y\/y/i.test(title) ? "（前年比）" : /q\/q/i.test(title) ? "（前期比）" : "";
      return ja + suffix;
    }
  }
  return title;
}

const IMPACT_STYLE: Record<string, { label: string; cls: string; dot: string }> = {
  High:    { label: "高", cls: "bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300", dot: "bg-rose-500" },
  Medium:  { label: "中", cls: "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300", dot: "bg-amber-500" },
  Low:     { label: "低", cls: "bg-slate-100 dark:bg-slate-800 text-slate-500", dot: "bg-slate-400" },
  Holiday: { label: "休", cls: "bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-300", dot: "bg-blue-400" },
};

const JST = "Asia/Tokyo";
function jstDateKey(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("ja-JP", { timeZone: JST, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }).format(d);
}
function jstTime(iso: string): string {
  return new Intl.DateTimeFormat("ja-JP", { timeZone: JST, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}

type CountryFilter = "all" | "major" | "USD" | "JPY";
type ImpactFilter = "high-mid" | "high" | "all";

export default function EconomicCalendarPage() {
  const [events, setEvents] = useState<EconEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [cf, setCf] = useState<CountryFilter>("major");
  const [imf, setImf] = useState<ImpactFilter>("high-mid");

  useEffect(() => {
    setLoading(true);
    fetch("/api/economic-calendar")
      .then((r) => r.json())
      .then((j) => setEvents((j.events ?? []) as EconEvent[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const grouped = useMemo(() => {
    const majorSet = new Set(["USD", "JPY", "EUR", "GBP", "CNY"]);

    // Show the feed's week (released results + upcoming) — a calendar normally
    // includes both. (The free feed only covers one week, and on a weekend it can
    // briefly hold the just-finished week, so a strict "future-only" filter would
    // leave the page empty.)
    const filtered = events.filter((e) => {
      // country
      if (cf === "USD" && e.country !== "USD") return false;
      if (cf === "JPY" && e.country !== "JPY") return false;
      if (cf === "major" && !majorSet.has(e.country)) return false;
      // impact
      if (imf === "high" && e.impact !== "High") return false;
      if (imf === "high-mid" && !(e.impact === "High" || e.impact === "Medium")) return false;
      return true;
    });

    const map = new Map<string, EconEvent[]>();
    for (const e of filtered) {
      const k = jstDateKey(e.date);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    return [...map.entries()];
  }, [events, cf, imf]);

  const totalShown = grouped.reduce((n, [, arr]) => n + arr.length, 0);

  return (
    <div className="space-y-4">
      <header>
        <Link href="/" className="inline-flex items-center text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-2">
          <ArrowLeft className="w-4 h-4 mr-1" />ホーム
        </Link>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-indigo-500" />経済指標カレンダー
        </h1>
        <p className="text-[11px] text-slate-500 mt-1">FOMC・CPI・雇用統計・日銀会合など。時刻は日本時間(JST)。</p>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Seg label="国" opts={[["major", "主要"], ["USD", "🇺🇸 米国"], ["JPY", "🇯🇵 日本"], ["all", "全て"]]} val={cf} onChange={(v) => setCf(v as CountryFilter)} />
        <Seg label="重要度" opts={[["high-mid", "高+中"], ["high", "高のみ"], ["all", "全て"]]} val={imf} onChange={(v) => setImf(v as ImpactFilter)} />
      </div>

      {loading ? (
        <div className="text-sm text-slate-400">読み込み中…</div>
      ) : totalShown === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center text-sm text-slate-500">
          表示できる予定がありません（フィルタを変えてみてください）
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([day, list]) => (
            <section key={day} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
              <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300">
                {day}
              </div>
              <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {list.map((e, i) => {
                  const c = COUNTRY[e.country] ?? { flag: "🏳️", name: e.country };
                  const im = IMPACT_STYLE[e.impact] ?? IMPACT_STYLE.Low;
                  return (
                    <div key={i} className="px-3 py-2.5 flex items-start gap-2.5">
                      <div className="w-10 shrink-0 text-[11px] font-mono text-slate-500 tabular-nums pt-0.5">{jstTime(e.date)}</div>
                      <div className="w-6 shrink-0 text-center text-base leading-tight" title={c.name}>{c.flag}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${im.cls}`}>{im.label}</span>
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">{indicatorJa(e.title)}</span>
                        </div>
                        {(e.forecast || e.previous || e.actual) && (
                          <div className="mt-0.5 flex gap-3 text-[10px] text-slate-500 tabular-nums">
                            {e.actual   != null && <span>結果 <strong className="text-slate-800 dark:text-slate-100">{e.actual}</strong></span>}
                            {e.forecast != null && <span>予想 <strong className="text-indigo-600 dark:text-indigo-400">{e.forecast}</strong></span>}
                            {e.previous != null && <span>前回 {e.previous}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="text-[10px] text-slate-400 text-center">
        ※ データは外部の経済指標カレンダー（FairEconomy）より取得。予定・予想値は変更される場合があります。
      </p>
    </div>
  );
}

function Seg({ label, opts, val, onChange }: { label: string; opts: [string, string][]; val: string; onChange: (v: string) => void }) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <span className="text-[10px] text-slate-400">{label}</span>
      <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
        {opts.map(([v, l]) => (
          <button key={v} onClick={() => onChange(v)}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${val === v ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white" : "text-slate-500"}`}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}
