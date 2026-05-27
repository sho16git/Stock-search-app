"use client";

import { useEffect, useState } from "react";

type Analysis = {
  summary:        string;
  bullPoints:     string[];
  bearPoints:     string[];
  riskLevel:      "low" | "medium" | "high";
  recommendation: string;
  oneliner:       string;
  source:         "claude" | "rule-based";
};

const REC_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  "強い買い": { bg: "from-emerald-500 to-teal-500",   text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-300 dark:border-emerald-700" },
  "買い":     { bg: "from-emerald-400 to-green-400",   text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800" },
  "中立":     { bg: "from-amber-400 to-yellow-400",    text: "text-amber-600 dark:text-amber-400",     border: "border-amber-200 dark:border-amber-800"    },
  "売り":     { bg: "from-rose-400 to-red-400",        text: "text-rose-600 dark:text-rose-400",       border: "border-rose-200 dark:border-rose-800"      },
  "強い売り": { bg: "from-rose-600 to-red-600",        text: "text-rose-700 dark:text-rose-300",       border: "border-rose-300 dark:border-rose-700"      },
};

const RISK_BADGE: Record<string, string> = {
  low:    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  high:   "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
};
const RISK_LABEL: Record<string, string> = { low: "低リスク", medium: "中リスク", high: "高リスク" };

export default function AIAnalysis({ symbol }: { symbol: string }) {
  const [data,    setData]    = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [open,    setOpen]    = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const run = () => {
    if (data || loading) return;
    setLoading(true);
    setError(null);
    fetch(`/api/ai-analysis?symbol=${encodeURIComponent(symbol)}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.error) setError(j.error);
        else setData(j);
      })
      .catch(() => setError("分析に失敗しました"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open && !data && !loading) run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const style = data ? (REC_STYLE[data.recommendation] ?? REC_STYLE["中立"]) : null;

  return (
    <div className={`rounded-2xl overflow-hidden shadow-sm border ${
      style ? style.border : "border-slate-200 dark:border-slate-800"
    } bg-white dark:bg-slate-900`}>
      {/* Header — always visible */}
      <button
        onClick={() => { setOpen((v) => !v); }}
        className="w-full px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-base shadow-md shadow-violet-500/20">
            🤖
          </span>
          <div className="text-left">
            <div className="text-sm font-bold">AI投資分析</div>
            <div className="text-[10px] text-slate-400">
              {data
                ? data.source === "claude"
                  ? "Claude AI による分析"
                  : "ルールベース分析"
                : "クリックして分析を開始"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {data && (
            <span className={`text-xs font-bold px-3 py-1 rounded-full text-white bg-gradient-to-r ${style!.bg}`}>
              {data.recommendation}
            </span>
          )}
          <span className={`text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>▼</span>
        </div>
      </button>

      {/* Expanded content */}
      {open && (
        <div className="border-t border-slate-100 dark:border-slate-800">
          {loading && (
            <div className="px-4 py-6 flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 animate-pulse" />
              <p className="text-sm text-slate-500 animate-pulse">AI が分析中…</p>
            </div>
          )}

          {error && (
            <div className="px-4 py-4 text-sm text-rose-500 text-center">{error}</div>
          )}

          {data && !loading && (
            <div className="px-4 py-4 space-y-4">
              {/* One-liner badge + risk */}
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-sm font-black px-4 py-1.5 rounded-full text-white bg-gradient-to-r ${style!.bg} shadow-md`}>
                  {data.oneliner}
                </span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${RISK_BADGE[data.riskLevel]}`}>
                  {RISK_LABEL[data.riskLevel]}
                </span>
              </div>

              {/* Summary */}
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3.5 py-3">
                {data.summary}
              </p>

              {/* Bull / Bear */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                    <span>🟢</span> 強み・ポジティブ
                  </div>
                  {data.bullPoints.map((p, i) => (
                    <div key={i} className="text-xs text-slate-700 dark:text-slate-300 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg px-3 py-2 border border-emerald-100 dark:border-emerald-900/30">
                      ✓ {p}
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1">
                    <span>🔴</span> リスク・懸念点
                  </div>
                  {data.bearPoints.map((p, i) => (
                    <div key={i} className="text-xs text-slate-700 dark:text-slate-300 bg-rose-50 dark:bg-rose-950/20 rounded-lg px-3 py-2 border border-rose-100 dark:border-rose-900/30">
                      ⚠ {p}
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-[10px] text-slate-400 text-right pt-1">
                ※ 投資判断は自己責任でお願いします。本分析は参考情報です。
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
