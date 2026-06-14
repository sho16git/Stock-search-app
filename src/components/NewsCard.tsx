"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Newspaper, BookOpen, ChevronUp, RefreshCw } from "lucide-react";
import ArticleBody from "./ArticleBody";
import AINewsSummary from "./AINewsSummary";

type News = {
  uuid: string;
  title: string;
  titleJa?: string | null;
  publisher: string | null;
  link: string | null;
  googleSearchUrl: string;
  publishedAt: string | null;
  type: string | null;
  thumbnail: string | null;
  relatedTickers: string[];
};

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "今";
  if (min < 60) return `${min} 分前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 時間前`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} 日前`;
  return d.toLocaleDateString("ja-JP", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  });
}

const NEWS_REFRESH_MS = 3 * 60 * 1000; // 3 minutes

export default function NewsCard({ symbol, companyName }: { symbol: string; companyName?: string }) {
  const [news, setNews] = useState<News[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [refreshTick, setRefreshTick] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    // Don't reset news on refresh (keep showing old news while loading)
    if (refreshTick === 0) {
      setNews(null);
      setExpanded(new Set());
    }
    fetch(`/api/news?symbol=${encodeURIComponent(symbol)}`, {
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then((j) => {
        if (!j.error) { setNews(j.news ?? []); setUpdatedAt(new Date()); }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [symbol, refreshTick]);

  // Auto-refresh every 3 minutes
  useEffect(() => {
    const id = setInterval(() => setRefreshTick((t) => t + 1), NEWS_REFRESH_MS);
    return () => clearInterval(id);
  }, [symbol]);

  const handleManualRefresh = () => {
    setSpinning(true);
    setRefreshTick((t) => t + 1);
    setTimeout(() => setSpinning(false), 800);
  };

  const toggle = (uuid: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(uuid)) next.delete(uuid);
      else next.add(uuid);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="text-sm text-slate-400">ニュースを読み込み中…</div>
      </div>
    );
  }

  if (!news || news.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold tracking-tight flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-slate-500" />
          関連ニュース
        </h2>
        <div className="flex items-center gap-2">
          {updatedAt && !loading && (
            <span className="text-[10px] text-slate-400 tabular-nums">
              {updatedAt.getHours().toString().padStart(2,"0")}:{updatedAt.getMinutes().toString().padStart(2,"0")} 更新
            </span>
          )}
          <button
            onClick={handleManualRefresh}
            disabled={loading}
            title="ニュースを最新に更新"
            className="p-1 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${spinning ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>
      <ul className="space-y-3">
        {news.slice(0, 8).map((n) => {
          const primaryTitle = n.titleJa ?? n.title;
          const isExpanded = expanded.has(n.uuid);
          return (
            <li
              key={n.uuid}
              className="p-3 -mx-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex gap-3">
                {n.thumbnail && (
                  <div className="shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
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
                  <button
                    onClick={() => n.link && toggle(n.uuid)}
                    disabled={!n.link}
                    className="text-left w-full group disabled:cursor-default"
                  >
                    <div className="text-sm font-medium leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 line-clamp-3">
                      {primaryTitle}
                      {n.titleJa && (
                        <span className="ml-1.5 text-[10px] px-1 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 align-middle">
                          翻訳
                        </span>
                      )}
                    </div>
                    {n.titleJa && (
                      <div className="text-[11px] text-slate-400 mt-1 line-clamp-1 italic">
                        {n.title}
                      </div>
                    )}
                  </button>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
                    <span className="font-medium">{n.publisher ?? "—"}</span>
                    <span>·</span>
                    <span>{relativeTime(n.publishedAt)}</span>
                  </div>
                  {n.relatedTickers.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {n.relatedTickers.filter(t => t !== symbol).slice(0, 6).map((ticker) => (
                        <Link
                          key={ticker}
                          href={`/stock/${encodeURIComponent(ticker)}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 transition-colors"
                        >
                          {ticker}
                        </Link>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {n.link && (
                      <button
                        onClick={() => toggle(n.uuid)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                      >
                        {isExpanded ? (
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
                    <AINewsSummary title={primaryTitle} symbol={symbol} companyName={companyName} />
                  </div>
                </div>
              </div>
              {isExpanded && n.link && <ArticleBody link={n.link} />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
