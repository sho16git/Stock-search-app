"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type Article = {
  ok: boolean;
  title: string | null;
  titleJa: string | null;
  body: string | null;
  bodyJa: string | null;
  author: string | null;
  publishedAt: string | null;
  image: string | null;
  source: string | null;
  url: string;
  error?: string;
};

/**
 * Shared component that fetches an article URL via /api/article (with body
 * extraction + JP translation), then displays the body inline. Used by
 * NewsCard and TrendNews so Preview/sandbox environments that block
 * external URLs can still read news content.
 */
export default function ArticleBody({ link }: { link: string }) {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOriginal, setShowOriginal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/article?url=${encodeURIComponent(link)}`)
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setArticle(j);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [link]);

  if (loading) {
    return (
      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        記事を取得・翻訳中… (最大 1 分ほどかかります)
      </div>
    );
  }

  if (!article || (!article.body && !article.bodyJa)) {
    return (
      <div className="mt-3 text-xs text-slate-500">
        本文を取得できませんでした
        {article?.error && ` (${article.error})`}
      </div>
    );
  }

  const body = showOriginal || !article.bodyJa ? article.body : article.bodyJa;
  const hasTranslation = !!article.bodyJa && article.bodyJa !== article.body;

  return (
    <div className="mt-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] uppercase tracking-wider text-slate-500">
          記事本文
          {hasTranslation && !showOriginal && (
            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 normal-case tracking-normal">
              自動翻訳
            </span>
          )}
        </div>
        {hasTranslation && (
          <button
            onClick={() => setShowOriginal((s) => !s)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            {showOriginal ? "日本語で表示" : "原文 (英語) を表示"}
          </button>
        )}
      </div>
      <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
        {body}
      </div>
      {article.source && (
        <div className="text-[10px] text-slate-400 mt-3">
          出典: {article.source}
        </div>
      )}
    </div>
  );
}
