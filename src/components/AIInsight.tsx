"use client";

import { useState } from "react";
import { Sparkles, KeyRound } from "lucide-react";
import { recordAiCall } from "@/lib/ai-usage-client";

export type AIInsightData = {
  headline: string;
  comment: string;
  bullets?: string[];
  tag?: string;
};

type Status = "idle" | "loading" | "done" | "error" | "no_key";

/**
 * Reusable on-demand AI insight. POSTs `payload` to `endpoint`, expects
 * { headline, comment, bullets?, tag? }, and renders a violet insight panel.
 * Shared by analyst commentary, peer-comparison verdict, ranking commentary, etc.
 */
export default function AIInsight({
  label = "AI解説",
  endpoint,
  payload,
  buttonClassName,
}: {
  label?: string;
  endpoint: string;
  payload: unknown;
  buttonClassName?: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [data, setData] = useState<AIInsightData | null>(null);

  const run = async () => {
    setStatus("loading");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 503) { setStatus("no_key"); return; }
      if (!res.ok) throw new Error("api error");
      const j = await res.json();
      if (j.error) throw new Error(j.error);
      recordAiCall(endpoint.replace("/api/", ""));
      setData(j as AIInsightData);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  if (status === "idle") {
    return (
      <button
        onClick={run}
        className={
          buttonClassName ??
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-900/60 transition-colors"
        }
      >
        <Sparkles className="w-3.5 h-3.5" />
        {label}
      </button>
    );
  }

  if (status === "loading") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-violet-500">
        <Sparkles className="w-3.5 h-3.5 animate-pulse" />
        AI解析中…
      </span>
    );
  }

  if (status === "no_key") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
        <KeyRound className="w-3.5 h-3.5" />
        APIキー未設定
      </span>
    );
  }

  if (status === "error") {
    return (
      <button onClick={run} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-500 hover:underline">
        <Sparkles className="w-3.5 h-3.5" />
        解析失敗・再試行
      </button>
    );
  }

  if (!data) return null;

  return (
    <div className="mt-3 p-3 rounded-xl bg-gradient-to-br from-violet-50 to-fuchsia-50/60 dark:from-violet-950/30 dark:to-fuchsia-950/20 border border-violet-200 dark:border-violet-800/50 text-xs space-y-2">
      <div className="flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-violet-500 shrink-0" />
        <span className="font-bold text-violet-700 dark:text-violet-300">{data.headline}</span>
        {data.tag && (
          <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300">
            {data.tag}
          </span>
        )}
      </div>
      <p className="text-slate-700 dark:text-slate-200 leading-relaxed">{data.comment}</p>
      {data.bullets && data.bullets.length > 0 && (
        <ul className="space-y-1 pt-0.5">
          {data.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="text-violet-500 shrink-0">•</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[9px] text-slate-400 pt-1 border-t border-violet-100 dark:border-violet-900/40">
        ※ Claude AIによる解説。投資判断は自己責任で。
      </p>
    </div>
  );
}
