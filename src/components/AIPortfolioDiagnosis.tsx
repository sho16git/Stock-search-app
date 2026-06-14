"use client";

import { useState } from "react";
import { Sparkles, KeyRound, ShieldCheck, AlertTriangle, Lightbulb } from "lucide-react";
import { recordAiCall } from "@/lib/ai-usage-client";
import type { HoldingValuation, PortfolioSummary } from "@/lib/portfolio";
import { getJpName } from "@/lib/jp-stocks";

type Diagnosis = {
  riskLevel: "低" | "中" | "高";
  headline: string;
  diagnosis: string;
  concentration: string;
  sectorBalance: string;
  diversityScore: number;
  strengths: string[];
  warnings: string[];
  suggestions: string[];
};

type Status = "idle" | "loading" | "done" | "error" | "no_key";

const RISK_STYLE: Record<string, string> = {
  "低": "bg-emerald-500 text-white",
  "中": "bg-amber-500 text-white",
  "高": "bg-rose-500 text-white",
};

export default function AIPortfolioDiagnosis({
  valuations,
  summary,
}: {
  valuations: HoldingValuation[];
  summary: PortfolioSummary | null;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [data, setData] = useState<Diagnosis | null>(null);

  const run = async () => {
    if (!summary || valuations.length === 0) return;
    setStatus("loading");
    const total = summary.totalValueJpy || 0;
    const holdings = valuations.map((v) => ({
      symbol: v.holding.symbol,
      name: getJpName(v.holding.symbol) ?? v.holding.name ?? v.holding.symbol,
      weightPct: total > 0 && v.marketValueJpy != null ? (v.marketValueJpy / total) * 100 : null,
      gainPercent: v.gainPercent,
      dividendYieldPct: v.dividendYield != null ? v.dividendYield * 100 : null,
    }));
    // 比率の大きい順
    holdings.sort((a, b) => (b.weightPct ?? 0) - (a.weightPct ?? 0));

    try {
      const res = await fetch("/api/ai-portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holdings,
          totalValueJpy: summary.totalValueJpy,
          totalGainPercent: summary.totalGainPercent,
        }),
      });
      if (res.status === 503) { setStatus("no_key"); return; }
      if (!res.ok) throw new Error("api error");
      const j = await res.json();
      if (j.error) throw new Error(j.error);
      recordAiCall("ai-portfolio");
      setData(j as Diagnosis);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  if (!summary || valuations.length === 0) return null;

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm border border-violet-200/80 dark:border-violet-800/40 bg-gradient-to-br from-violet-50/60 to-white dark:from-violet-950/20 dark:to-zinc-900">
      <div className="px-4 py-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md shadow-violet-500/20">
            <Sparkles className="w-4 h-4" />
          </span>
          <div className="text-left">
            <div className="text-sm font-bold flex items-center gap-1.5">
              AIポートフォリオ診断
              {status === "done" && data && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${RISK_STYLE[data.riskLevel] ?? "bg-slate-500 text-white"}`}>
                  リスク{data.riskLevel}
                </span>
              )}
            </div>
            <div className="text-[10px] text-zinc-400">Claudeが集中リスク・分散・リバランスを分析</div>
          </div>
        </div>
        {status === "idle" && (
          <button
            onClick={run}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors shadow-sm shrink-0"
          >
            AI診断する
          </button>
        )}
        {status === "loading" && (
          <span className="text-xs text-violet-500 flex items-center gap-1.5 shrink-0">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />診断中…
          </span>
        )}
      </div>

      {status === "no_key" && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
            <KeyRound className="w-3.5 h-3.5 shrink-0" />
            APIキーが未設定です（.env.local の ANTHROPIC_API_KEY）
          </div>
        </div>
      )}
      {status === "error" && (
        <div className="px-4 pb-4">
          <button onClick={run} className="text-[11px] text-rose-500 hover:underline">診断に失敗しました・再試行</button>
        </div>
      )}

      {status === "done" && data && (
        <div className="border-t border-violet-100 dark:border-violet-900/30 p-4 space-y-3.5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="w-4 h-4 text-violet-500 shrink-0" />
              <span className="text-sm font-bold text-violet-700 dark:text-violet-300">{data.headline}</span>
            </div>
            <p className="text-xs text-zinc-700 dark:text-zinc-200 leading-relaxed">{data.diagnosis}</p>
          </div>

          {/* metrics row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="rounded-lg bg-white dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 px-3 py-2">
              <div className="text-[10px] text-zinc-400 mb-0.5">集中リスク</div>
              <div className="text-[11px] text-zinc-700 dark:text-zinc-200 leading-snug">{data.concentration}</div>
            </div>
            <div className="rounded-lg bg-white dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 px-3 py-2">
              <div className="text-[10px] text-zinc-400 mb-0.5">セクター/地域分散</div>
              <div className="text-[11px] text-zinc-700 dark:text-zinc-200 leading-snug">{data.sectorBalance}</div>
            </div>
          </div>

          {/* diversity score bar */}
          {typeof data.diversityScore === "number" && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-zinc-500">分散スコア</span>
                <span className="text-xs font-bold text-violet-600 dark:text-violet-400">{data.diversityScore}/100</span>
              </div>
              <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-700"
                  style={{ width: `${Math.min(100, Math.max(0, data.diversityScore))}%` }}
                />
              </div>
            </div>
          )}

          {/* strengths / warnings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.strengths?.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">強み</span>
                </div>
                <ul className="space-y-1">
                  {data.strengths.map((s, i) => (
                    <li key={i} className="text-[11px] text-zinc-600 dark:text-zinc-300 flex gap-1.5">
                      <span className="text-emerald-500">+</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.warnings?.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">注意点</span>
                </div>
                <ul className="space-y-1">
                  {data.warnings.map((s, i) => (
                    <li key={i} className="text-[11px] text-zinc-600 dark:text-zinc-300 flex gap-1.5">
                      <span className="text-amber-500">!</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* suggestions */}
          {data.suggestions?.length > 0 && (
            <div className="rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/50 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Lightbulb className="w-3.5 h-3.5 text-violet-500" />
                <span className="text-[11px] font-bold text-violet-700 dark:text-violet-300">リバランス提案</span>
              </div>
              <div className="space-y-1.5">
                {data.suggestions.map((s, i) => (
                  <div key={i} className="flex items-start gap-2 text-[11px] text-zinc-700 dark:text-zinc-200">
                    <span className="shrink-0 w-4 h-4 rounded-full bg-violet-500 text-white text-[9px] font-black flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-[9px] text-zinc-400 text-center pt-1 border-t border-zinc-100 dark:border-zinc-800">
            ※ Claude AIによる診断。投資助言ではありません。最終判断は自己責任で。
          </p>
        </div>
      )}
    </div>
  );
}
