"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Globe, RefreshCw, BookOpen, ChevronUp } from "lucide-react";
import ArticleBody from "./ArticleBody";

type GeoNewsItem = {
  uuid: string;
  title: string;
  titleJa: string | null;
  publisher: string | null;
  link: string | null;
  publishedAt: string | null;
  thumbnail: string | null;
  relatedTickers: string[];
  tag: string;
};

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
  "金・安全資産":    "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300",
  "原油・エネルギー": "bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300",
  "ドル指数":        "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300",
  "米国債金利":      "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300",
  "恐怖指数":        "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300",
  "半導体":          "bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300",
  "半導体ETF":       "bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300",
  "エネルギーETF":   "bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300",
  "原油ETF":         "bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300",
  "金融ETF":         "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300",
  "ヘルスケアETF":   "bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300",
  "一般消費財ETF":   "bg-pink-50 dark:bg-pink-950/50 text-pink-700 dark:text-pink-300",
  "素材ETF":         "bg-stone-50 dark:bg-stone-950/50 text-stone-700 dark:text-stone-300",
  "資本財ETF":       "bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300",
};

export default function GeopoliticalNews({ sector }: { sector?: string | null }) {
  const [items, setItems] = useState<GeoNewsItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = () => {
    setLoading(true);
    const url = sector
      ? `/api/geopolitical-news?sector=${encodeURIComponent(sector)}`
      : "/api/geopolitical-news";
    fetch(url)
      .then((r) => r.json())
      .then((j) => setItems(j.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [sector]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (uuid: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(uuid)) next.delete(uuid); else next.add(uuid);
      return next;
    });
  };

  return (
    <section>
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 className="text-base font-bold tracking-tight flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-rose-500" />
            地政学・マクロニュース
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            金利・原油・ドル指数・VIX など市場リスク指標の関連ニュース
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

      {loading && !items ? (
        <div className="space-y-2">
          {Array(4).fill(null).map((_, i) => (
            <div key={i} className="h-20 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse" />
          ))}
        </div>
      ) : !items || items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center text-sm text-slate-500">
          地政学ニュースが取得できませんでした
        </div>
      ) : (
        <div className="space-y-2">
          {items.slice(0, 6).map((n) => {
            const title = n.titleJa ?? n.title;
            const isExpanded = expanded.has(n.uuid);
            const tagColor = TAG_COLORS[n.tag] ?? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400";

            return (
              <div
                key={n.uuid}
                className={`p-3 rounded-xl border bg-white dark:bg-slate-900 transition-all ${
                  isExpanded
                    ? "border-rose-300 dark:border-rose-700 shadow-md"
                    : "border-slate-200 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-700"
                }`}
              >
                <button
                  onClick={() => n.link && toggle(n.uuid)}
                  disabled={!n.link}
                  className="flex gap-3 text-left w-full group disabled:cursor-default"
                >
                  {n.thumbnail && (
                    <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
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
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${tagColor}`}>
                        🌐 {n.tag}
                      </span>
                      {n.titleJa && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                          翻訳
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-medium leading-snug group-hover:text-rose-600 dark:group-hover:text-rose-400 line-clamp-2">
                      {title}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                      <span className="font-medium truncate">{n.publisher ?? "—"}</span>
                      <span>·</span>
                      <span>{relativeTime(n.publishedAt)}</span>
                    </div>
                    {/* Related tickers */}
                    {n.relatedTickers.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {n.relatedTickers.slice(0, 5).map((ticker) => (
                          <Link
                            key={ticker}
                            href={`/stock/${encodeURIComponent(ticker)}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 transition-colors"
                          >
                            {ticker}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </button>

                {n.link && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <button
                      onClick={() => toggle(n.uuid)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors"
                    >
                      {isExpanded ? (
                        <><ChevronUp className="w-3 h-3" />閉じる</>
                      ) : (
                        <><BookOpen className="w-3 h-3" />記事を読む</>
                      )}
                    </button>
                  </div>
                )}
                {isExpanded && n.link && <ArticleBody link={n.link} />}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
