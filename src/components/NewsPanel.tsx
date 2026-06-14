"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Newspaper, Globe, RefreshCw, BookOpen, ChevronUp } from "lucide-react";
import ArticleBody from "./ArticleBody";
import AINewsSummary from "./AINewsSummary";

/* ─── shared types ─── */
type NewsItem = {
  uuid: string;
  title: string;
  titleJa: string | null;
  publisher: string | null;
  link: string | null;
  publishedAt: string | null;
  thumbnail: string | null;
  relatedTickers?: string[];
  region?: "US" | "JP";
  tag?: string;
};

type Tab = "jp" | "us" | "geo";

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "今";
  if (min < 60) return `${min}分前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}時間前`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}日前`;
  return d.toLocaleDateString("ja-JP", { year: "2-digit", month: "2-digit", day: "2-digit" });
}

const TAG_COLORS: Record<string, string> = {
  "金・安全資産":    "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  "原油・エネルギー": "bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800",
  "ドル指数":        "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  "米国債金利":      "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  "恐怖指数":        "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  "半導体":          "bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800",
};

function NewsCard({
  n,
  tab,
  isExpanded,
  onToggle,
}: {
  n: NewsItem;
  tab: Tab;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const title = n.titleJa ?? n.title;
  const isGeo = tab === "geo";
  const accentExpanded = isGeo ? "border-rose-300 dark:border-rose-700"   : tab === "jp" ? "border-rose-300 dark:border-rose-700" : "border-blue-300 dark:border-blue-700";
  const accentHover    = isGeo ? "hover:border-rose-300 dark:hover:border-rose-700" : tab === "jp" ? "hover:border-rose-300 dark:hover:border-rose-700" : "hover:border-blue-300 dark:hover:border-blue-700";
  const readBtn        = isGeo
    ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100"
    : tab === "jp"
    ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100"
    : "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100";
  const hoverText = isGeo || tab === "jp"
    ? "group-hover:text-rose-600 dark:group-hover:text-rose-400"
    : "group-hover:text-blue-600 dark:group-hover:text-blue-400";

  return (
    <div className={`p-3 rounded-xl border bg-white dark:bg-slate-900 transition-all ${isExpanded ? accentExpanded + " shadow-md" : "border-slate-200 dark:border-slate-800 " + accentHover}`}>
      <button
        onClick={() => n.link && onToggle()}
        disabled={!n.link}
        className="flex gap-3 text-left w-full group disabled:cursor-default"
      >
        {n.thumbnail && (
          <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={n.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            {isGeo && n.tag && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${TAG_COLORS[n.tag] ?? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200"}`}>
                🌐 {n.tag}
              </span>
            )}
            {n.titleJa && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">翻訳</span>
            )}
          </div>
          <div className={`text-sm font-medium leading-snug line-clamp-2 ${hoverText}`}>
            {title}
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
            <span className="font-medium truncate">{n.publisher ?? "—"}</span>
            <span>·</span>
            <span>{relativeTime(n.publishedAt)}</span>
          </div>
        </div>
      </button>

      {/* Actions row */}
      <div className="flex flex-wrap items-center gap-1.5 mt-2">
        {n.link && (
          <button onClick={onToggle} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] transition-colors ${readBtn}`}>
            {isExpanded ? <><ChevronUp className="w-3 h-3" />閉じる</> : <><BookOpen className="w-3 h-3" />記事を読む</>}
          </button>
        )}
        <AINewsSummary
          title={title}
          symbol={n.relatedTickers?.[0]}
          context={isGeo ? n.tag : undefined}
        />
        {n.relatedTickers && n.relatedTickers.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {n.relatedTickers.slice(0, 5).map((ticker) => (
              <Link
                key={ticker}
                href={`/stock/${encodeURIComponent(ticker)}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-violet-100 hover:text-violet-700 dark:hover:bg-violet-900/40 dark:hover:text-violet-300 border border-slate-200 dark:border-slate-700 transition-colors"
              >
                {ticker}
              </Link>
            ))}
          </div>
        )}
      </div>
      {isExpanded && n.link && <ArticleBody link={n.link} />}
    </div>
  );
}

export default function NewsPanel() {
  const [tab, setTab] = useState<Tab>("jp");
  const [jpItems,  setJpItems]  = useState<NewsItem[] | null>(null);
  const [usItems,  setUsItems]  = useState<NewsItem[] | null>(null);
  const [geoItems, setGeoItems] = useState<NewsItem[] | null>(null);
  const [trendLoading, setTrendLoading] = useState(true);
  const [geoLoading,   setGeoLoading]   = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const didFetchGeo = useRef(false);

  const loadTrend = () => {
    setTrendLoading(true);
    fetch("/api/trend-news")
      .then((r) => r.json())
      .then((j) => {
        setJpItems(j.jpItems ?? null);
        setUsItems(j.usItems ?? null);
      })
      .catch(() => {})
      .finally(() => setTrendLoading(false));
  };

  const loadGeo = () => {
    setGeoLoading(true);
    fetch("/api/geopolitical-news")
      .then((r) => r.json())
      .then((j) => setGeoItems(j.items ?? []))
      .catch(() => setGeoItems([]))
      .finally(() => setGeoLoading(false));
  };

  useEffect(() => { loadTrend(); }, []);

  useEffect(() => {
    if (tab === "geo" && !didFetchGeo.current) {
      didFetchGeo.current = true;
      loadGeo();
    }
  }, [tab]);

  const toggle = (uuid: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(uuid)) next.delete(uuid); else next.add(uuid);
      return next;
    });
  };

  const handleTabChange = (t: Tab) => {
    setTab(t);
    setExpanded(new Set());
  };

  const activeItems   = tab === "jp" ? jpItems : tab === "us" ? usItems : geoItems;
  const activeLoading = tab === "geo" ? geoLoading : trendLoading;
  const reload        = tab === "geo" ? loadGeo : loadTrend;

  const TABS = [
    { key: "jp"  as Tab, label: "🇯🇵 日本株",   activeColor: "border-rose-500 text-rose-600 dark:text-rose-400" },
    { key: "us"  as Tab, label: "🇺🇸 米国株",   activeColor: "border-blue-500 text-blue-600 dark:text-blue-400" },
    { key: "geo" as Tab, label: "🌐 地政学",     activeColor: "border-amber-500 text-amber-600 dark:text-amber-400",
      icon: <Globe className="w-3.5 h-3.5" /> },
  ] as const;

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Header + tabs */}
      <div className="flex items-center justify-between px-3 pt-3 pb-0 border-b border-slate-100 dark:border-slate-800/60">
        <div className="flex items-center gap-1">
          <Newspaper className="w-4 h-4 text-blue-500 mr-1 shrink-0" />
          <div className="flex gap-0">
            {TABS.map(({ key, label, activeColor }) => (
              <button
                key={key}
                onClick={() => handleTabChange(key)}
                className={`flex items-center gap-1 px-2.5 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  tab === key
                    ? activeColor
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {label}
                {/* Article count badge */}
                {key !== "geo" && (
                  <span className={`text-[9px] px-1 py-0.5 rounded-full font-bold leading-none ${
                    tab === key
                      ? key === "jp"
                        ? "bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400"
                        : "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                  }`}>
                    {key === "jp" ? (jpItems?.length ?? "…") : (usItems?.length ?? "…")}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={reload}
          disabled={activeLoading}
          className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 transition-colors disabled:opacity-50 pb-1"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${activeLoading ? "animate-spin" : ""}`} />
          更新
        </button>
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        {activeLoading && !activeItems
          ? Array(4).fill(null).map((_, i) => (
              <div key={i} className="h-20 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 animate-pulse" />
            ))
          : !activeItems || activeItems.length === 0
            ? <div className="py-10 text-center text-sm text-slate-400">ニュースが取得できませんでした</div>
            : activeItems.slice(0, 10).map((n) => (
                <NewsCard
                  key={`${tab}-${n.uuid}`}
                  n={n}
                  tab={tab}
                  isExpanded={expanded.has(n.uuid)}
                  onToggle={() => toggle(n.uuid)}
                />
              ))
        }
      </div>
    </section>
  );
}
