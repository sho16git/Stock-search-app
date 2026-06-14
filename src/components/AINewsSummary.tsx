"use client";

import { useState } from "react";
import { Sparkles, TrendingUp, TrendingDown, Minus, KeyRound } from "lucide-react";
import { recordAiCall } from "@/lib/ai-usage-client";

export type AISummary = {
  summary: string;
  impact: "positive" | "negative" | "neutral";
  impactReason: string;
  timeHorizon: "short" | "medium" | "long";
  confidence: number;
};

const HORIZON_LABEL: Record<string, string> = {
  short: "短期",
  medium: "中期",
  long: "長期",
};

type Status = "idle" | "loading" | "done" | "error" | "no_key";

/**
 * Reusable AI news explainer. Drop into any news item.
 * Posts the headline (+ optional context) to /api/ai-news-summary and
 * renders a colored impact panel. Distinguishes a missing API key so the
 * user gets actionable guidance instead of a silent failure.
 */
export default function AINewsSummary({
  title,
  body,
  symbol,
  companyName,
  context,
}: {
  title: string;
  body?: string;
  symbol?: string;
  companyName?: string;
  /** Extra hint for the model, e.g. a geopolitical tag ("金・安全資産") */
  context?: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [data, setData] = useState<AISummary | null>(null);

  const run = async () => {
    setStatus("loading");
    try {
      const res = await fetch("/api/ai-news-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, symbol, companyName, context }),
      });
      if (res.status === 503) {
        const j = await res.json().catch(() => ({}));
        if (j.error === "no_api_key") { setStatus("no_key"); return; }
        throw new Error("unavailable");
      }
      if (!res.ok) throw new Error("api error");
      const j = await res.json();
      if (j.error) throw new Error(j.error);
      recordAiCall("ai-news-summary");
      setData(j as AISummary);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  if (status === "idle") {
    return (
      <button
        onClick={run}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/50 border border-violet-200 dark:border-violet-800 transition-colors"
      >
        <Sparkles className="w-3 h-3" />
        AI解説
      </button>
    );
  }

  if (status === "loading") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-violet-500 dark:text-violet-400">
        <Sparkles className="w-3 h-3 animate-pulse" />
        AI解析中…
      </span>
    );
  }

  if (status === "no_key") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
        <KeyRound className="w-3 h-3" />
        APIキー未設定
      </span>
    );
  }

  if (status === "error") {
    return (
      <button
        onClick={run}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
      >
        <Sparkles className="w-3 h-3" />
        解析失敗・再試行
      </button>
    );
  }

  if (!data) return null;

  const impactColor =
    data.impact === "positive"
      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
      : data.impact === "negative"
      ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800"
      : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700";

  const ImpactIcon =
    data.impact === "positive" ? TrendingUp :
    data.impact === "negative" ? TrendingDown : Minus;

  const impactTextColor =
    data.impact === "positive" ? "text-emerald-700 dark:text-emerald-300" :
    data.impact === "negative" ? "text-rose-700 dark:text-rose-300" :
    "text-slate-600 dark:text-slate-400";

  return (
    <div className={`mt-2 w-full p-2.5 rounded-xl border text-[11px] space-y-1.5 ${impactColor}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Sparkles className="w-3 h-3 text-violet-500 shrink-0" />
        <span className="font-semibold text-violet-600 dark:text-violet-400">AI解説</span>
        <span className="ml-auto text-slate-400">信頼度 {data.confidence}%</span>
      </div>
      <p className="text-slate-700 dark:text-slate-200 leading-relaxed">{data.summary}</p>
      <div className={`flex items-center gap-1.5 font-semibold ${impactTextColor}`}>
        <ImpactIcon className="w-3 h-3 shrink-0" />
        <span>{data.impactReason}</span>
        <span className="ml-auto text-slate-400 font-normal">{HORIZON_LABEL[data.timeHorizon]}影響</span>
      </div>
    </div>
  );
}
