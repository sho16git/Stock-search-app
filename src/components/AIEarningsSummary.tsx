"use client";

import { useState } from "react";
import { Sparkles, TrendingUp, TrendingDown, Minus, KeyRound, AlertCircle } from "lucide-react";

type EarningsAI = {
  headline: string;
  revenueTrend: "増収" | "減収" | "横ばい";
  profitTrend: "増益" | "減益" | "横ばい" | "赤字";
  surprise: string;
  comment: string;
  watchPoints: string[];
  verdict: "好決算" | "無難" | "やや弱い" | "弱い";
  name?: string;
  currency?: string;
};

type Status = "idle" | "loading" | "done" | "error" | "no_key" | "no_data";

const VERDICT_STYLE: Record<string, string> = {
  "好決算": "bg-emerald-500 text-white",
  "無難": "bg-blue-500 text-white",
  "やや弱い": "bg-amber-500 text-white",
  "弱い": "bg-rose-500 text-white",
};

function TrendChip({ label, value }: { label: string; value: string }) {
  const positive = value.includes("増");
  const negative = value.includes("減") || value.includes("赤");
  const Icon = positive ? TrendingUp : negative ? TrendingDown : Minus;
  const color = positive
    ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
    : negative
    ? "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800"
    : "text-slate-500 bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700";
  return (
    <div className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold ${color}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span className="text-[10px] text-slate-400 font-normal">{label}</span>
      <span>{value}</span>
    </div>
  );
}

export default function AIEarningsSummary({ symbol }: { symbol: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [data, setData] = useState<EarningsAI | null>(null);

  const run = async () => {
    setStatus("loading");
    try {
      const res = await fetch(`/api/ai-earnings-summary?symbol=${encodeURIComponent(symbol)}`);
      if (res.status === 503) { setStatus("no_key"); return; }
      if (res.status === 404) { setStatus("no_data"); return; }
      if (!res.ok) throw new Error("api error");
      const j = await res.json();
      if (j.error) throw new Error(j.error);
      setData(j as EarningsAI);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm border border-violet-200/80 dark:border-violet-800/40 bg-white dark:bg-zinc-900">
      <div className="px-4 py-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md shadow-violet-500/20">
            <Sparkles className="w-4 h-4" />
          </span>
          <div className="text-left">
            <div className="text-sm font-bold">AI決算サマリー</div>
            <div className="text-[10px] text-zinc-400">Claudeが決算を数値付きで要約</div>
          </div>
        </div>
        {status === "idle" && (
          <button
            onClick={run}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-900/60 transition-colors"
          >
            要約する
          </button>
        )}
        {status === "loading" && (
          <span className="text-xs text-violet-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />解析中…
          </span>
        )}
        {status === "done" && data && (
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${VERDICT_STYLE[data.verdict] ?? "bg-slate-500 text-white"}`}>
            {data.verdict}
          </span>
        )}
      </div>

      {status === "no_key" && (
        <div className="px-4 pb-4 -mt-1">
          <div className="flex items-center gap-2 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
            <KeyRound className="w-3.5 h-3.5 shrink-0" />
            APIキーが未設定です（.env.local の ANTHROPIC_API_KEY）
          </div>
        </div>
      )}
      {status === "no_data" && (
        <div className="px-4 pb-4 -mt-1">
          <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            この銘柄の決算データが取得できませんでした
          </div>
        </div>
      )}
      {status === "error" && (
        <div className="px-4 pb-4 -mt-1">
          <button onClick={run} className="text-[11px] text-rose-500 hover:underline">解析に失敗しました・再試行</button>
        </div>
      )}

      {status === "done" && data && (
        <div className="border-t border-violet-100 dark:border-violet-900/30 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-500 shrink-0" />
            <span className="text-sm font-bold text-violet-700 dark:text-violet-300">{data.headline}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <TrendChip label="売上" value={data.revenueTrend} />
            <TrendChip label="利益" value={data.profitTrend} />
          </div>

          <p className="text-xs text-zinc-700 dark:text-zinc-200 leading-relaxed">{data.comment}</p>

          {data.surprise && (
            <div className="text-[11px] text-zinc-500 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-700">
              <span className="font-semibold text-zinc-600 dark:text-zinc-300">予想との比較: </span>{data.surprise}
            </div>
          )}

          {data.watchPoints?.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300 mb-1.5">次決算の注目点</div>
              <div className="space-y-1.5">
                {data.watchPoints.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 text-[11px] text-zinc-600 dark:text-zinc-300">
                    <span className="shrink-0 w-4 h-4 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 text-[9px] font-black flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-[9px] text-zinc-400 text-center pt-1 border-t border-zinc-100 dark:border-zinc-800">
            ※ Claude AIによる決算要約。投資判断は自己責任でお願いします。
          </p>
        </div>
      )}
    </div>
  );
}
