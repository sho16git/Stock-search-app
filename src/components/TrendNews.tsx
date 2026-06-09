"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Newspaper, RefreshCw, BookOpen, ChevronUp } from "lucide-react";
import ArticleBody from "./ArticleBody";

type News = {
  uuid: string;
  title: string;
  titleJa: string | null;
  publisher: string | null;
  link: string | null;
  region: "US" | "JP";
  publishedAt: string | null;
  thumbnail: string | null;
  relatedTickers?: string[];
};

type Tab = "JP" | "US";

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
  return d.toLocaleDateString("ja-JP", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  });
}

function NewsItem({
  n,
  expanded,
  onToggle,
}: {
  n: News;
  expanded: boolean;
  onToggle: () => void;
}) {
  const title = n.titleJa ?? n.title;
  return (
    <div
      className={`p-3 rounded-xl border bg-white dark:bg-slate-900 transition-all ${
        expanded
          ? "border-blue-300 dark:border-blue-700 shadow-md"
          : "border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700"
      }`}
    >
      <button
        onClick={() => n.link && onToggle()}
        disabled={!n.link}
        className="flex gap-3 text-left w-full group disabled:cursor-default"
      >
        {n.thumbnail && (
          <div className="shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={n.thumbnail}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            {n.titleJa && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                翻訳
              </span>
            )}
          </div>
          <div className="text-sm font-medium leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 line-clamp-2">
            {title}
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
            <span className="font-medium truncate">{n.publisher ?? "—"}</span>
            <span>·</span>
            <span>{relativeTime(n.publishedAt)}</span>
          </div>
        </div>
      </button>

      {(n.link || (n.relatedTickers && n.relatedTickers.length > 0)) && (
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          {n.link && (
            <button
              onClick={onToggle}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  閉じる
                </>
              ) : (
                <>
                  <BookOpen className="w-3 h-3" />
                  記事を読む
                </>
              )}
            </button>
          )}
          {n.relatedTickers && n.relatedTickers.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {n.relatedTickers.map((ticker) => (
                <Link
                  key={ticker}
                  href={`/stock/${encodeURIComponent(ticker)}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-violet-100 hover:text-violet-700 dark:hover:bg-violet-900/40 dark:hover:text-violet-300 border border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-600 transition-colors"
                >
                  {ticker}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
      {expanded && n.link && <ArticleBody link={n.link} />}
    </div>
  );
}

export default function TrendNews() {
  const [jpItems, setJpItems] = useState<News[] | null>(null);
  const [usItems, setUsItems] = useState<News[] | null>(null);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<Tab>("JP");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = () => {
    setLoading(true);
    setExpanded(new Set());
    fetch("/api/trend-news")
      .then((r) => r.json())
      .then((j) => {
        setJpItems(j.jpItems ?? null);
        setUsItems(j.usItems ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggle = (uuid: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(uuid)) next.delete(uuid); else next.add(uuid);
      return next;
    });
  };

  const items = tab === "JP" ? jpItems : usItems;
  const isLoading = loading && !jpItems && !usItems;

  return (
    <section>
      {/* Header */}
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 className="text-base font-bold tracking-tight flex items-center gap-1.5">
            <Newspaper className="w-4 h-4 text-blue-500" />
            マーケットニュース
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            日米市場のヘッドライン (日本語訳)
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          更新
        </button>
      </div>

      {/* Tabs */}
      <div className="flex p-0.5 bg-slate-100 dark:bg-slate-800/60 rounded-xl gap-0.5 mb-3">
        {([
          { key: "JP" as Tab, label: "🇯🇵 日本株", count: jpItems?.length },
          { key: "US" as Tab, label: "🇺🇸 米国株", count: usItems?.length },
        ] as const).map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setExpanded(new Set()); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === key
                ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            {label}
            {count != null && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                tab === key
                  ? key === "JP"
                    ? "bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400"
                    : "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-500"
              }`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">
          {Array(4).fill(null).map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse"
            />
          ))}
        </div>
      ) : !items || items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center text-sm text-slate-500">
          ニュースが取得できませんでした
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <NewsItem
              key={`${n.region}-${n.uuid}`}
              n={n}
              expanded={expanded.has(n.uuid)}
              onToggle={() => toggle(n.uuid)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
