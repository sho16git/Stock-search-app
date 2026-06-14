"use client";

import { useEffect, useState } from "react";
import {
  Sparkles, TrendingUp, TrendingDown, BarChart3, Activity,
  RefreshCw, ShieldCheck, ShieldAlert, ShieldX, AlertTriangle,
  Zap, Gem, Tag, Building2, Users, Globe2, Landmark, BarChart2,
} from "lucide-react";
import { recordAiCall } from "@/lib/ai-usage-client";

/* ── 型定義 ── */
type Scores    = { growth: number; quality: number; value: number; health: number; sentiment: number };
type MacroData = {
  usYield10yr:  number | null;
  usdJpy:       number | null;
  vix:          number | null;
  rateEnv:      string;
  yenEnv:       string;
  vixEnv:       string;
  rateImpact:   string;
  yenImpact:    string;
  geoRisks:     string[];
};
type Analysis = {
  summary:            string;
  bullPoints:         string[];
  bearPoints:         string[];
  riskLevel:          "low" | "medium" | "high";
  recommendation:     string;
  oneliner:           string;
  valuationComment?:  string;
  technicalComment?:  string;
  macroComment?:      string;
  scores?:            Scores;
  contradictions?:    string[];
  epsAcceleration?:   "加速" | "安定" | "鈍化" | null;
  macroData?:         MacroData;
  source:             "claude" | "rule-based";
  name?:              string;
};

/* ── 推奨スコア (0-100) ── */
const REC_SCORE: Record<string, number> = {
  "強い買い": 90, "買い": 72, "中立": 50, "売り": 28, "強い売り": 10,
};

/* ── カラーテーマ ── */
type Theme = { grad: string; heroBg: string; fill: string; pill: string; border: string; accent: string; glow: string };
const THEME: Record<string, Theme> = {
  "強い買い": { grad:"from-emerald-500 via-teal-500 to-cyan-500",  heroBg:"from-emerald-50 to-teal-50 dark:from-emerald-950/60 dark:to-teal-950/60",   fill:"from-emerald-400 to-teal-500",   pill:"bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200", border:"border-emerald-200 dark:border-emerald-800", accent:"text-emerald-600 dark:text-emerald-400", glow:"shadow-emerald-200/60 dark:shadow-emerald-900/40" },
  "買い":     { grad:"from-green-400 via-emerald-400 to-teal-400",  heroBg:"from-green-50 to-emerald-50 dark:from-green-950/60 dark:to-emerald-950/60",    fill:"from-green-400 to-emerald-500",  pill:"bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-200",       border:"border-green-200 dark:border-green-800",   accent:"text-green-600 dark:text-green-400",   glow:"shadow-green-200/60 dark:shadow-green-900/40"   },
  "中立":     { grad:"from-amber-400 via-yellow-400 to-orange-300", heroBg:"from-amber-50 to-yellow-50 dark:from-amber-950/60 dark:to-yellow-950/60",       fill:"from-amber-400 to-yellow-400",   pill:"bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200",       border:"border-amber-200 dark:border-amber-800",   accent:"text-amber-600 dark:text-amber-400",   glow:"shadow-amber-200/60 dark:shadow-amber-900/40"   },
  "売り":     { grad:"from-orange-400 via-rose-400 to-red-400",     heroBg:"from-rose-50 to-red-50 dark:from-rose-950/60 dark:to-red-950/60",              fill:"from-rose-400 to-red-500",       pill:"bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200",           border:"border-rose-200 dark:border-rose-800",     accent:"text-rose-600 dark:text-rose-400",     glow:"shadow-rose-200/60 dark:shadow-rose-900/40"     },
  "強い売り": { grad:"from-rose-600 via-red-600 to-red-700",        heroBg:"from-rose-100 to-red-50 dark:from-rose-950/80 dark:to-red-950/80",             fill:"from-rose-500 to-red-600",       pill:"bg-rose-200 text-rose-900 dark:bg-rose-900/80 dark:text-rose-100",           border:"border-rose-300 dark:border-rose-700",     accent:"text-rose-700 dark:text-rose-400",     glow:"shadow-rose-300/60 dark:shadow-rose-900/60"     },
};

const RISK_CFG = {
  low:    { label:"低リスク",  Icon:ShieldCheck,  cls:"text-emerald-600 dark:text-emerald-400", bg:"bg-emerald-100 dark:bg-emerald-900/40" },
  medium: { label:"中リスク",  Icon:ShieldAlert,  cls:"text-amber-600 dark:text-amber-400",    bg:"bg-amber-100 dark:bg-amber-900/40"    },
  high:   { label:"高リスク",  Icon:ShieldX,      cls:"text-rose-600 dark:text-rose-400",      bg:"bg-rose-100 dark:bg-rose-900/40"      },
};

/* ── 5軸定義 ── */
const AXES = [
  { key:"growth",    label:"成長性",   Icon:Zap,       tip:"EPS実績・売上/利益成長率"     },
  { key:"quality",   label:"収益品質", Icon:Gem,       tip:"ROE・FCFイールド・利益率"     },
  { key:"value",     label:"割安度",   Icon:Tag,       tip:"PEG・PER・PBR・目標株価比"    },
  { key:"health",    label:"財務健全", Icon:Building2, tip:"D/E・流動比率・FCF"           },
  { key:"sentiment", label:"市場評価", Icon:Users,     tip:"アナリスト推奨・52週位置・空売り" },
] as const;

function scoreColor(s: number) {
  if (s >= 65) return { bar:"from-emerald-400 to-teal-500", text:"text-emerald-600 dark:text-emerald-400" };
  if (s >= 45) return { bar:"from-amber-400 to-yellow-500", text:"text-amber-600 dark:text-amber-400" };
  return           { bar:"from-rose-400 to-red-500",        text:"text-rose-600 dark:text-rose-400"   };
}

/* ── アニメーション付きスコアバー ── */
function ScoreBar({ score, fill }: { score:number; fill:string }) {
  const [w, setW] = useState(0);
  useEffect(() => { const id = setTimeout(() => setW(score), 80); return () => clearTimeout(id); }, [score]);
  return (
    <div className="relative h-2.5 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
      <div className={`h-full rounded-full bg-gradient-to-r ${fill} transition-all duration-1000 ease-out`} style={{ width:`${w}%` }} />
    </div>
  );
}

/* ── 5軸スコアパネル ── */
function ScoresPanel({ scores, epsAcceleration }: { scores: Scores; epsAcceleration?: string | null }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const id = setTimeout(() => setVisible(true), 200); return () => clearTimeout(id); }, []);

  return (
    <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
      <div className="bg-slate-50 dark:bg-slate-800/50 px-3.5 py-2 flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          5軸スコア分析
        </span>
        {epsAcceleration && (
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
            epsAcceleration === "加速" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" :
            epsAcceleration === "鈍化" ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" :
                                        "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
          }`}>
            EPS {epsAcceleration === "加速" ? "↑" : epsAcceleration === "鈍化" ? "↓" : "→"} {epsAcceleration}
          </span>
        )}
      </div>
      <div className="p-3 space-y-2">
        {AXES.map(({ key, label, Icon }) => {
          const s = scores[key];
          const { bar, text } = scoreColor(s);
          return (
            <div key={key} className="flex items-center gap-2.5">
              <Icon className={`w-3 h-3 shrink-0 ${text}`} />
              <span className="text-[10px] text-slate-500 dark:text-slate-400 w-12 shrink-0">{label}</span>
              <div className={`flex-1 h-1.5 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800`}>
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${bar} transition-all duration-700 ease-out`}
                  style={{ width: visible ? `${s}%` : "0%" }}
                />
              </div>
              <span className={`text-[10px] font-bold tabular-nums w-5 text-right ${text}`}>{s}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── 矛盾シグナル ── */
function ContradictionsPanel({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 p-3.5">
      <div className="flex items-center gap-1.5 mb-2">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
          注意: 矛盾するシグナル
        </span>
      </div>
      <ul className="space-y-1.5">
        {items.map((c, i) => (
          <li key={i} className="flex gap-2 text-xs text-amber-800 dark:text-amber-300 leading-snug">
            <span className="shrink-0 mt-0.5 text-amber-500">⚡</span>
            <span>{c}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── インパクトバッジ ── */
function ImpactBadge({ impact }: { impact: string }) {
  if (impact === "─") return null;
  const cfg =
    impact === "ポジティブ" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300" :
    impact === "ネガティブ" ? "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300" :
                              "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400";
  const arrow = impact === "ポジティブ" ? "↑" : impact === "ネガティブ" ? "↓" : "→";
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${cfg}`}>
      {arrow} {impact}
    </span>
  );
}

/* ── マクロ環境パネル ── */
function MacroPanel({ macro, macroComment }: { macro: MacroData; macroComment?: string }) {
  const rateColor =
    macro.rateEnv === "高金利" || macro.rateEnv === "やや高め"
      ? "text-rose-600 dark:text-rose-400"
      : macro.rateEnv === "低金利"
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-slate-600 dark:text-slate-300";

  const vixColor =
    macro.vixEnv === "恐怖" || macro.vixEnv === "不安"
      ? "text-rose-600 dark:text-rose-400"
      : macro.vixEnv === "楽観"
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-slate-600 dark:text-slate-300";

  const yenColor =
    macro.yenEnv === "超円安" || macro.yenEnv === "円安"
      ? "text-amber-600 dark:text-amber-400"
      : macro.yenEnv === "円高" || macro.yenEnv === "やや円高"
      ? "text-blue-600 dark:text-blue-400"
      : "text-slate-600 dark:text-slate-300";

  return (
    <div className="rounded-xl border border-sky-100 dark:border-sky-900/50 overflow-hidden">
      {/* ヘッダー */}
      <div className="bg-sky-50 dark:bg-sky-950/40 px-3.5 py-2 flex items-center gap-1.5">
        <Globe2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
        <span className="text-[10px] font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider">
          マクロ / 金利 / 地政学
        </span>
      </div>

      {/* 3列インジケーター */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-800">

        {/* 米10年債 */}
        <div className="p-3 flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <Landmark className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="text-[9px] text-slate-400 uppercase tracking-wide truncate">米10年債</span>
          </div>
          <div className={`text-sm font-black tabular-nums leading-none ${rateColor}`}>
            {macro.usYield10yr != null ? `${macro.usYield10yr.toFixed(2)}%` : "─"}
          </div>
          <div className="text-[9px] text-slate-500 dark:text-slate-400">{macro.rateEnv}</div>
          <ImpactBadge impact={macro.rateImpact} />
        </div>

        {/* USD/JPY */}
        <div className="p-3 flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <BarChart2 className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="text-[9px] text-slate-400 uppercase tracking-wide">USD/JPY</span>
          </div>
          <div className={`text-sm font-black tabular-nums leading-none ${yenColor}`}>
            {macro.usdJpy != null ? `¥${Math.round(macro.usdJpy)}` : "─"}
          </div>
          <div className="text-[9px] text-slate-500 dark:text-slate-400">{macro.yenEnv}</div>
          {macro.yenImpact !== "─" && <ImpactBadge impact={macro.yenImpact} />}
        </div>

        {/* VIX */}
        <div className="p-3 flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <Activity className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="text-[9px] text-slate-400 uppercase tracking-wide">VIX</span>
          </div>
          <div className={`text-sm font-black tabular-nums leading-none ${vixColor}`}>
            {macro.vix != null ? macro.vix.toFixed(1) : "─"}
          </div>
          <div className="text-[9px] text-slate-500 dark:text-slate-400">{macro.vixEnv}</div>
          <div className={`text-[9px] font-medium ${vixColor}`}>
            {macro.vix == null ? "" :
             macro.vix > 30 ? "高恐怖" :
             macro.vix > 22 ? "やや不安" :
             macro.vix > 15 ? "通常" : "安定"}
          </div>
        </div>

      </div>

      {/* 地政学リスク */}
      {macro.geoRisks.length > 0 && (
        <div className="px-3.5 py-2.5 bg-slate-50/60 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-1.5">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 shrink-0 mt-0.5">🌐 地政学:</span>
            <div className="flex flex-wrap gap-1">
              {macro.geoRisks.map((r, i) => (
                <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 font-medium">
                  {r}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* マクロコメント */}
      {macroComment && (
        <div className="px-3.5 py-2.5 border-t border-sky-100 dark:border-sky-900/40">
          <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">{macroComment}</p>
        </div>
      )}
    </div>
  );
}

/* ── ローディング スケルトン ── */
function Skeleton() {
  return (
    <div className="animate-pulse p-4 space-y-4">
      <div className="rounded-2xl bg-slate-100 dark:bg-slate-800 h-28" />
      <div className="rounded-xl bg-slate-100 dark:bg-slate-800 h-20" />
      <div className="space-y-2">
        {[1,0.9,0.75].map((w,i) => (
          <div key={i} className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full" style={{width:`${w*100}%`}} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[...Array(6)].map((_,i) => <div key={i} className="h-8 bg-slate-100 dark:bg-slate-800 rounded-xl" />)}
      </div>
    </div>
  );
}

/* ── メインコンポーネント ── */
export default function AIAnalysis({ symbol }: { symbol: string }) {
  const [data,    setData]    = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = () => {
    setData(null); setLoading(true); setError(null);
    fetch(`/api/ai-analysis?symbol=${encodeURIComponent(symbol)}`)
      .then(r => r.json())
      .then(j => { if (j.error) setError(j.error); else { recordAiCall("ai-analysis"); setData(j); } })
      .catch(() => setError("分析に失敗しました"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [symbol]); // eslint-disable-line react-hooks/exhaustive-deps

  const theme    = data ? (THEME[data.recommendation] ?? THEME["中立"]) : null;
  const recScore = data ? (REC_SCORE[data.recommendation] ?? 50) : 0;
  const risk     = data ? RISK_CFG[data.riskLevel] : null;
  const RiskIcon = risk?.Icon ?? ShieldAlert;
  const TrendIcon = data?.recommendation.includes("買い") ? TrendingUp
                  : data?.recommendation.includes("売り") ? TrendingDown : Activity;

  if (loading) return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800">
        <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </span>
        <span className="text-sm font-bold">AI 投資分析</span>
        <span className="ml-auto text-[10px] text-slate-400 animate-pulse">多角的分析中…</span>
      </div>
      <Skeleton />
    </div>
  );

  if (error || !data) return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 text-center text-sm text-slate-400">
      {error ?? "データを取得できませんでした"}
    </div>
  );

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl border shadow-sm overflow-hidden ${theme!.border}`}>

      {/* ── タイトルバー ── */}
      <div className="px-5 py-3.5 flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800">
        <span className={`w-7 h-7 rounded-lg bg-gradient-to-br ${theme!.grad} flex items-center justify-center shrink-0 shadow-md ${theme!.glow}`}>
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </span>
        <div className="min-w-0">
          <span className="text-sm font-bold tracking-tight">AI 投資分析</span>
          {data.name && <span className="text-[10px] text-slate-400 ml-2 truncate">{data.name}</span>}
        </div>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
            data.source === "claude"
              ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
              : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
          }`}>
            {data.source === "claude" ? "🤖 Claude AI" : "📊 定量分析"}
          </span>
          <button onClick={load} className="text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 transition-colors" title="再分析">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">

        {/* ── ヒーロー: 推奨 + 投資スコア ── */}
        <div className={`rounded-2xl bg-gradient-to-br ${theme!.heroBg} border ${theme!.border} p-4`}>
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 text-sm font-black px-4 py-1.5 rounded-full text-white bg-gradient-to-r ${theme!.grad} shadow-lg ${theme!.glow}`}>
                  <TrendIcon className="w-3.5 h-3.5" />
                  {data.recommendation}
                </span>
                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${risk!.bg} ${risk!.cls}`}>
                  <RiskIcon className="w-3 h-3" />
                  {risk!.label}
                </span>
                {data.epsAcceleration && (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    data.epsAcceleration === "加速" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" :
                    data.epsAcceleration === "鈍化" ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" :
                    "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  }`}>
                    EPS {data.epsAcceleration === "加速" ? "↑加速" : data.epsAcceleration === "鈍化" ? "↓鈍化" : "→安定"}
                  </span>
                )}
              </div>
              <p className={`text-base font-bold ${theme!.accent}`}>{data.oneliner}</p>
            </div>
            <div className="text-right shrink-0">
              <div className={`text-3xl font-black tabular-nums ${theme!.accent}`}>{recScore}</div>
              <div className="text-[10px] text-slate-400 font-medium">/ 100</div>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] text-slate-400 font-medium">
              <span>弱気</span>
              <span className={`font-semibold ${theme!.accent}`}>総合投資スコア</span>
              <span>強気</span>
            </div>
            <ScoreBar score={recScore} fill={theme!.fill} />
            <div className="flex justify-between text-[9px] text-slate-300 dark:text-slate-600">
              {[0,25,50,75,100].map(n => <span key={n}>{n}</span>)}
            </div>
          </div>
        </div>

        {/* ── 5軸スコアパネル ── */}
        {data.scores && (
          <ScoresPanel scores={data.scores} epsAcceleration={data.epsAcceleration} />
        )}

        {/* ── マクロ/金利/地政学パネル ── */}
        {data.macroData && (
          <MacroPanel macro={data.macroData} macroComment={data.macroComment} />
        )}

        {/* ── 矛盾シグナル ── */}
        {data.contradictions && data.contradictions.length > 0 && (
          <ContradictionsPanel items={data.contradictions} />
        )}

        {/* ── 総括 ── */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <BarChart3 className="w-3.5 h-3.5" />
            総括
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-3 border border-slate-100 dark:border-slate-800">
            {data.summary}
          </p>
        </div>

        {/* ── ポジティブ / リスク ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

          <div className="rounded-xl border border-emerald-100 dark:border-emerald-900/40 overflow-hidden">
            <div className="bg-emerald-50 dark:bg-emerald-950/30 px-3.5 py-2 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">ポジティブ要因</span>
              <span className="ml-auto text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded-full">{data.bullPoints.length}</span>
            </div>
            <ul className="divide-y divide-emerald-50 dark:divide-emerald-900/20">
              {data.bullPoints.map((p, i) => (
                <li key={i} className="flex items-start gap-2.5 px-3.5 py-2.5 bg-white dark:bg-slate-900 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-colors">
                  <span className="shrink-0 w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-black flex items-center justify-center mt-0.5">{i+1}</span>
                  <span className="text-xs text-slate-700 dark:text-slate-300 leading-snug">{p}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-rose-100 dark:border-rose-900/40 overflow-hidden">
            <div className="bg-rose-50 dark:bg-rose-950/30 px-3.5 py-2 flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wide">リスク・懸念点</span>
              <span className="ml-auto text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/60 px-1.5 py-0.5 rounded-full">{data.bearPoints.length}</span>
            </div>
            <ul className="divide-y divide-rose-50 dark:divide-rose-900/20">
              {data.bearPoints.map((p, i) => (
                <li key={i} className="flex items-start gap-2.5 px-3.5 py-2.5 bg-white dark:bg-slate-900 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition-colors">
                  <span className="shrink-0 w-4 h-4 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-[10px] font-black flex items-center justify-center mt-0.5">{i+1}</span>
                  <span className="text-xs text-slate-700 dark:text-slate-300 leading-snug">{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── バリュエーション & テクニカル ── */}
        {(data.valuationComment || data.technicalComment) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.valuationComment && (
              <div className="rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 p-3.5">
                <div className="flex items-center gap-1.5 mb-2">
                  <BarChart3 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">バリュエーション</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{data.valuationComment}</p>
              </div>
            )}
            {data.technicalComment && (
              <div className="rounded-xl border border-violet-100 dark:border-violet-900/40 bg-violet-50/50 dark:bg-violet-950/20 p-3.5">
                <div className="flex items-center gap-1.5 mb-2">
                  <Activity className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                  <span className="text-[10px] font-bold text-violet-700 dark:text-violet-400 uppercase tracking-wider">テクニカル / 実績</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{data.technicalComment}</p>
              </div>
            )}
          </div>
        )}

        {/* ── フッター ── */}
        <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-100 dark:border-slate-800">
          ※ 本分析は参考情報です。投資判断は必ず自己責任でお願いします。
        </p>

      </div>
    </div>
  );
}
