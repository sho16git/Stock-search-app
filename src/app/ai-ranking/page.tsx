"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles, RefreshCw, Loader2, ChevronDown, ChevronUp,
  TrendingUp, Shield, BarChart2, AlertTriangle, Search, Layers,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────
type RiskLevel   = "low" | "mid" | "high";
type InvestStyle = "growth" | "value" | "income" | "speculative";

type KeyMetrics = {
  pe:              number | null;
  roe:             number | null;
  buyPct:          number;
  upside:          number | null;
  dividendYield:   number | null;
  revenueGrowth:   number | null;
  operatingMargin: number | null;
};

type RankEntry = {
  rank:           number;
  symbol:         string;
  name:           string;
  market:         "JP" | "US";
  theme:          string;
  sector:         string;
  score:          number;
  currentPrice:   number;
  changePercent:  number | null;
  currency:       string;
  riskLevel:      RiskLevel;
  investStyle:    InvestStyle;
  keyMetrics:     KeyMetrics;
  expectedReturn: string;
  rationale:      string;
  actionPoints:   string[];
  risks:          string[];
};

type ScanEntry = {
  rank:           number;
  symbol:         string;
  name:           string;
  market:         "JP" | "US";
  theme:          string;
  sector:         string;
  score:          number;
  currentPrice:   number;
  changePercent:  number | null;
  currency:       string;
  riskLevel:      RiskLevel;
  investStyle:    InvestStyle;
  keyMetrics:     KeyMetrics;
  expectedReturn: string;
};

type Perspectives = {
  growth:   ScanEntry[];
  dividend: ScanEntry[];
  value:    ScanEntry[];
  jp:       ScanEntry[];
  us:       ScanEntry[];
};

type Signals = {
  strongBuy:  ScanEntry[];
  highUpside: ScanEntry[];
  momentum:   ScanEntry[];
  contrarian: ScanEntry[];
};

type SectorScore = {
  sector:    string;
  avgScore:  number;
  count:     number;
  topSymbol: string;
};

type RankingResp = {
  period:       string;
  updatedAt:    string;
  universeSize: number;
  bull:         RankEntry[];
  bear:         RankEntry[];
  all:          ScanEntry[];
  perspectives: Perspectives;
  signals:      Signals;
  sectorScores: SectorScore[];
  sentiment:    number;
  marketNote:   string;
};

type Period       = "1y" | "5y" | "10y";
type MarketFilter = "all" | "JP" | "US";
type StyleFilter  = "all" | InvestStyle;
type ViewMode     = "ranking" | "sector";

// ── Config ─────────────────────────────────────────────────────────
const PERIOD_LABELS: Record<Period, { short: string; full: string }> = {
  "1y":  { short: "1年",  full: "短期（1年）" },
  "5y":  { short: "5年",  full: "中期（5年）" },
  "10y": { short: "10年", full: "長期（10年）" },
};

const MEDAL = ["🥇", "🥈", "🥉", "4", "5", "6", "7", "8"];

const RISK_CFG: Record<RiskLevel, { label: string; dot: string; badge: string }> = {
  low:  { label: "低リスク", dot: "bg-emerald-400", badge: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300" },
  mid:  { label: "中リスク", dot: "bg-amber-400",   badge: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-300" },
  high: { label: "高リスク", dot: "bg-rose-400",    badge: "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300" },
};

const STYLE_CFG: Record<InvestStyle, { label: string; icon: string; badge: string }> = {
  growth:      { label: "成長株", icon: "📈", badge: "bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800/40 text-violet-700 dark:text-violet-300" },
  value:       { label: "割安株", icon: "💎", badge: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/40 text-blue-700 dark:text-blue-300" },
  income:      { label: "高配当", icon: "💰", badge: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-300" },
  speculative: { label: "投機的", icon: "🎲", badge: "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300" },
};

const INVEST_STYLES: InvestStyle[] = ["growth", "value", "income", "speculative"];

// セクターメタ（route.tsのUNIVERSEのsectorフィールドに対応）
const SECTOR_META: Record<string, { emoji: string }> = {
  "情報技術":           { emoji: "💻" },
  "コミュニケーション": { emoji: "📡" },
  "一般消費財":         { emoji: "🛍️" },
  "金融":               { emoji: "🏦" },
  "ヘルスケア":         { emoji: "💊" },
  "資本財":             { emoji: "🏭" },
  "素材":               { emoji: "🪨" },
  "通信":               { emoji: "📞" },
  "不動産":             { emoji: "🏢" },
  "生活必需品":         { emoji: "🛒" },
};

// ── 株価フォーマット ───────────────────────────────────────────────
function fmtPrice(price: number, currency: string): string {
  if (currency === "JPY") {
    if (price >= 10_000) return `¥${(price / 10_000).toFixed(1)}万`;
    return `¥${Math.round(price).toLocaleString("ja-JP")}`;
  }
  if (price >= 1_000) return `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  return `$${price.toFixed(2)}`;
}

function ChangePct({ value }: { value: number | null }) {
  if (value == null) return null;
  const up = value >= 0;
  return (
    <span className={`font-mono text-[11px] font-semibold ${up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>
      {up ? "▲" : "▼"}{Math.abs(value).toFixed(2)}%
    </span>
  );
}

// ── Score Ring (SVG) ───────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const r    = 18;
  const cx   = 24;
  const cy   = 24;
  const circ = 2 * Math.PI * r;
  const fill = (Math.min(100, Math.max(0, score)) / 100) * circ;
  const color = score >= 65 ? "#10b981" : score >= 40 ? "#8b5cf6" : "#f59e0b";

  return (
    <div className="relative shrink-0 w-12 h-12">
      <svg width="48" height="48" viewBox="0 0 48 48">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth="3.5"
          className="dark:[stroke:#3f3f46]" />
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth="3.5"
          strokeDasharray={`${fill} ${circ - fill}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-black" style={{ color }}>{score.toFixed(0)}</span>
      </div>
    </div>
  );
}

// ── Return Badge ───────────────────────────────────────────────────
function ReturnBadge({ value }: { value: string }) {
  const up = !value.startsWith("-");
  return (
    <span className={`font-mono font-black text-xs px-2 py-0.5 rounded-full whitespace-nowrap inline-block ${
      up
        ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
        : "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300"
    }`}>
      {up ? "▲" : "▼"} {value}
    </span>
  );
}

// ── Rank Card ──────────────────────────────────────────────────────
function RankCard({
  entry, expanded, onToggle,
}: {
  entry: RankEntry; expanded: boolean; onToggle: () => void;
}) {
  const medal   = MEDAL[entry.rank - 1];
  const isEmoji = entry.rank <= 3;
  const risk    = RISK_CFG[entry.riskLevel];
  const style   = STYLE_CFG[entry.investStyle];
  const km      = entry.keyMetrics;

  const metricLine: string[] = [];
  if (km.pe != null) metricLine.push(`PER ${km.pe}x`);
  if (km.roe != null) metricLine.push(`ROE ${km.roe}%`);
  if (km.dividendYield != null && km.dividendYield > 0)
    metricLine.push(`配当 ${km.dividendYield}%`);
  else if (km.revenueGrowth != null)
    metricLine.push(`成長 ${km.revenueGrowth > 0 ? "+" : ""}${km.revenueGrowth}%`);

  return (
    <div className={`relative rounded-2xl border overflow-hidden shadow-sm transition-all ${
      expanded
        ? "border-violet-300 dark:border-violet-700 shadow-violet-100 dark:shadow-none"
        : "border-zinc-200 dark:border-zinc-800 hover:border-violet-200 dark:hover:border-violet-800/60"
    } bg-white dark:bg-zinc-900`}>

      {/* Gradient accent top bar */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${
        entry.rank === 1 ? "from-amber-400 via-yellow-300 to-amber-400" :
        entry.rank === 2 ? "from-zinc-400 to-zinc-300" :
        entry.rank === 3 ? "from-orange-500 to-amber-400" :
        "from-violet-400 to-fuchsia-400"
      }`} />

      {/* Clickable header */}
      <button onClick={onToggle} className="w-full text-left p-3 pt-4">

        {/* Top row: rank + theme + market */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span className={`${isEmoji ? "text-base" : "text-xs font-black text-zinc-400"} leading-none`}>
              {medal}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 truncate max-w-[90px]">
              {entry.theme}
            </span>
          </div>
          <span className="text-base leading-none">{entry.market === "JP" ? "🇯🇵" : "🇺🇸"}</span>
        </div>

        {/* Score ring + symbol + name */}
        <div className="flex items-center gap-2.5 mb-2.5">
          <ScoreRing score={entry.score} />
          <div className="min-w-0 flex-1">
            <div className="font-mono font-black text-base text-blue-600 dark:text-blue-400 leading-tight">
              {entry.symbol}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate leading-tight mt-0.5">
              {entry.name}
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1 mb-2.5">
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-semibold ${style.badge}`}>
            {style.icon} {style.label}
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-semibold inline-flex items-center gap-0.5 ${risk.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${risk.dot}`} />
            {risk.label}
          </span>
        </div>

        {/* 現在株価 + 前日比 */}
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono font-black text-sm text-zinc-800 dark:text-zinc-100">
            {fmtPrice(entry.currentPrice, entry.currency)}
          </span>
          <ChangePct value={entry.changePercent} />
        </div>

        {/* 予想リターン + 指標 */}
        <div className="flex items-center justify-between gap-2">
          <ReturnBadge value={entry.expectedReturn} />
          {metricLine.length > 0 && (
            <span className="text-[10px] text-zinc-400 font-mono truncate">{metricLine.join(" · ")}</span>
          )}
        </div>
      </button>

      {/* Chevron */}
      <div className="absolute top-4 right-3 text-zinc-300 dark:text-zinc-600 pointer-events-none">
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div className="border-t border-zinc-100 dark:border-zinc-800 px-3 pb-4 space-y-3 pt-3">

          {/* Metrics grid */}
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { label: "予想PER",   value: km.pe != null ? `${km.pe}x` : "—",     color: !km.pe ? "" : km.pe > 60 ? "text-rose-600 dark:text-rose-400" : km.pe < 18 ? "text-emerald-600 dark:text-emerald-400" : "" },
              { label: "ROE",       value: km.roe != null ? `${km.roe}%` : "—",   color: km.roe != null && km.roe > 20 ? "text-emerald-600 dark:text-emerald-400" : "" },
              { label: "買い推奨",   value: `${km.buyPct}%`,                        color: km.buyPct >= 70 ? "text-emerald-600 dark:text-emerald-400" : km.buyPct < 40 ? "text-rose-600 dark:text-rose-400" : "" },
              { label: "上昇余地",   value: km.upside != null ? `${km.upside > 0 ? "+" : ""}${km.upside}%` : "—", color: !km.upside ? "" : km.upside > 10 ? "text-emerald-600 dark:text-emerald-400" : km.upside < -5 ? "text-rose-600 dark:text-rose-400" : "" },
              { label: "売上成長",   value: km.revenueGrowth != null ? `${km.revenueGrowth > 0 ? "+" : ""}${km.revenueGrowth}%` : "—", color: !km.revenueGrowth ? "" : km.revenueGrowth > 10 ? "text-emerald-600 dark:text-emerald-400" : km.revenueGrowth < 0 ? "text-rose-600 dark:text-rose-400" : "" },
              { label: "配当利回り", value: km.dividendYield != null && km.dividendYield > 0 ? `${km.dividendYield}%` : "—", color: km.dividendYield != null && km.dividendYield > 3 ? "text-emerald-600 dark:text-emerald-400" : "" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-zinc-50 dark:bg-zinc-800/60 rounded-xl px-2 py-2 text-center">
                <div className="text-[10px] text-zinc-400 leading-tight mb-0.5">{label}</div>
                <div className={`font-mono font-bold text-sm ${color || "text-zinc-800 dark:text-zinc-100"}`}>{value}</div>
              </div>
            ))}
          </div>

          {/* Action points */}
          <div>
            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1.5 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> 注目ポイント
            </div>
            <ul className="space-y-1">
              {entry.actionPoints.map((pt, i) => (
                <li key={i} className="flex items-start gap-2 text-xs bg-emerald-50 dark:bg-emerald-950/25 text-emerald-800 dark:text-emerald-300 rounded-xl px-2.5 py-2 leading-relaxed">
                  <span className="shrink-0 mt-px">✅</span><span>{pt}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Risks */}
          <div>
            <div className="text-xs font-bold text-rose-500 dark:text-rose-400 mb-1.5 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> リスク要因
            </div>
            <ul className="space-y-1">
              {entry.risks.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-xs bg-rose-50 dark:bg-rose-950/25 text-rose-800 dark:text-rose-300 rounded-xl px-2.5 py-2 leading-relaxed">
                  <span className="shrink-0 mt-px">⚠️</span><span>{r}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end pt-1 border-t border-zinc-100 dark:border-zinc-800">
            <Link
              href={`/stock/${encodeURIComponent(entry.symbol)}`}
              className="text-xs font-semibold text-blue-500 hover:text-blue-600 dark:hover:text-blue-400"
            >
              詳細を見る →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Perspective Mini List ──────────────────────────────────────────
const PERSPECTIVE_CFG = [
  { key: "growth",   label: "成長株",   icon: "📈", desc: "売上成長率が高い銘柄",       color: "from-violet-400 to-fuchsia-400" },
  { key: "dividend", label: "高配当",   icon: "💰", desc: "配当利回りが高い銘柄",       color: "from-amber-400 to-yellow-400"  },
  { key: "value",    label: "割安株",   icon: "💎", desc: "PER低水準・高ROE銘柄",      color: "from-blue-400 to-cyan-400"     },
  { key: "jp",       label: "日本株",   icon: "🇯🇵", desc: "日本株AIスコアTOP",        color: "from-rose-400 to-pink-400"     },
  { key: "us",       label: "米国株",   icon: "🇺🇸", desc: "米国株AIスコアTOP",        color: "from-emerald-400 to-teal-400"  },
] as const;

function PerspectivePanel({ perspectives }: { perspectives: Perspectives }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-1 h-4 rounded-full bg-gradient-to-b from-amber-400 to-orange-500 shrink-0" />
        <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">🔍 視点別注目銘柄 TOP5</h2>
        <span className="text-[10px] text-zinc-400 ml-1">— 成長・配当・割安・日本株・米国株の角度から分析</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {PERSPECTIVE_CFG.map(({ key, label, icon, desc, color }) => {
          const entries = perspectives[key] ?? [];
          return (
            <div key={key} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
              {/* Header */}
              <div className={`bg-gradient-to-r ${color} p-0.5`}>
                <div className="bg-white dark:bg-zinc-900 mx-0.5 mb-0.5 rounded-t-xl px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base leading-none">{icon}</span>
                    <div>
                      <div className="font-bold text-sm text-zinc-800 dark:text-zinc-100">{label} TOP5</div>
                      <div className="text-[10px] text-zinc-400 leading-tight">{desc}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Entries */}
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                {entries.map((entry, i) => {
                  const km = entry.keyMetrics;
                  let metricVal = "";
                  if (key === "growth" && km.revenueGrowth != null)
                    metricVal = `成長 ${km.revenueGrowth > 0 ? "+" : ""}${km.revenueGrowth}%`;
                  else if (key === "dividend" && km.dividendYield != null)
                    metricVal = `配当 ${km.dividendYield}%`;
                  else if (key === "value" && km.pe != null)
                    metricVal = `PER ${km.pe}x`;
                  else if (km.upside != null)
                    metricVal = `余地 ${km.upside > 0 ? "+" : ""}${km.upside}%`;

                  return (
                    <Link
                      key={entry.symbol}
                      href={`/stock/${encodeURIComponent(entry.symbol)}`}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                    >
                      <span className="w-4 shrink-0 text-[10px] font-black text-zinc-400 text-center">
                        {i < 3 ? MEDAL[i] : i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400 truncate leading-tight">
                          {entry.symbol}
                        </div>
                        <div className="text-[10px] text-zinc-400 truncate leading-tight">{entry.name}</div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-mono font-bold text-xs text-zinc-700 dark:text-zinc-200 leading-tight">
                          {fmtPrice(entry.currentPrice, entry.currency)}
                        </div>
                        <ChangePct value={entry.changePercent} />
                        {metricVal && (
                          <div className="text-[9px] text-zinc-400 font-mono mt-0.5">{metricVal}</div>
                        )}
                      </div>
                    </Link>
                  );
                })}
                {entries.length === 0 && (
                  <div className="py-4 text-center text-xs text-zinc-400">データなし</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Signal Board ───────────────────────────────────────────────────
const SIGNAL_CFG = [
  {
    key:      "strongBuy"  as const,
    icon:     "🎯",
    label:    "アナリスト強推奨",
    desc:     "推奨率65%以上 + 目標まで10%超",
    gradient: "from-emerald-400 to-teal-500",
    metricFn: (km: KeyMetrics) => km.buyPct ? `推奨 ${km.buyPct}%` : null,
  },
  {
    key:      "highUpside" as const,
    icon:     "🚀",
    label:    "目標まで大幅上昇余地",
    desc:     "コンセンサス目標株価まで+20%以上",
    gradient: "from-violet-400 to-fuchsia-500",
    metricFn: (km: KeyMetrics) => km.upside != null ? `余地 +${km.upside}%` : null,
  },
  {
    key:      "momentum"   as const,
    icon:     "⬆️",
    label:    "上昇モメンタム",
    desc:     "52週高値-10%以内かつ当日プラス",
    gradient: "from-sky-400 to-blue-500",
    metricFn: (km: KeyMetrics) => km.upside != null ? `余地 ${km.upside > 0 ? "+" : ""}${km.upside}%` : null,
  },
  {
    key:      "contrarian" as const,
    icon:     "↩️",
    label:    "急落後の逆張り候補",
    desc:     "52週高値から-25%超も基礎力あり",
    gradient: "from-amber-400 to-orange-500",
    metricFn: (km: KeyMetrics) => km.pe != null ? `PER ${km.pe}x` : null,
  },
] as const;

function SignalBoard({ signals }: { signals: Signals }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-4 rounded-full bg-gradient-to-b from-orange-400 to-rose-500 shrink-0" />
        <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">📡 投資シグナルボード</h2>
        <span className="text-[10px] text-zinc-400 ml-1">— リアルタイム指標から自動抽出</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SIGNAL_CFG.map(({ key, icon, label, desc, gradient, metricFn }) => {
          const entries = signals[key] ?? [];
          return (
            <div key={key} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
              {/* カラーバー + ヘッダー */}
              <div className={`h-0.5 bg-gradient-to-r ${gradient}`} />
              <div className="px-3.5 pt-3 pb-2.5">
                <div className="flex items-start gap-2">
                  <span className="text-xl leading-none mt-0.5">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-zinc-800 dark:text-zinc-100">{label}</div>
                    <div className="text-[10px] text-zinc-400 leading-tight mt-0.5">{desc}</div>
                  </div>
                  <span className="text-[10px] font-bold text-zinc-400 shrink-0 mt-0.5">{entries.length}銘柄</span>
                </div>
              </div>

              {/* 銘柄リスト */}
              <div className="border-t border-zinc-100 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800/50">
                {entries.length === 0 ? (
                  <div className="py-5 text-center text-xs text-zinc-400">
                    現在このシグナルに該当する銘柄なし
                  </div>
                ) : (
                  entries.map((entry, i) => {
                    const metric = metricFn(entry.keyMetrics);
                    return (
                      <Link
                        key={entry.symbol}
                        href={`/stock/${encodeURIComponent(entry.symbol)}`}
                        className="flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                      >
                        <span className="w-4 shrink-0 text-[10px] font-black text-zinc-400 text-center">
                          {i < 3 ? MEDAL[i] : i + 1}
                        </span>
                        {/* Symbol + name */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">{entry.symbol}</span>
                            <span className="text-xs leading-none">{entry.market === "JP" ? "🇯🇵" : "🇺🇸"}</span>
                          </div>
                          <div className="text-[10px] text-zinc-400 truncate">{entry.name}</div>
                        </div>
                        {/* 株価 + metric + 予想リターン */}
                        <div className="shrink-0 text-right">
                          <div className="font-mono font-bold text-xs text-zinc-700 dark:text-zinc-200">
                            {fmtPrice(entry.currentPrice, entry.currency)}
                          </div>
                          <div className="flex items-center gap-1.5 justify-end mt-0.5">
                            <ChangePct value={entry.changePercent} />
                            {metric && (
                              <span className="text-[9px] text-zinc-400 font-mono">{metric}</span>
                            )}
                          </div>
                          <div className="mt-0.5">
                            <ReturnBadge value={entry.expectedReturn} />
                          </div>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Sector Score Board ─────────────────────────────────────────────
const SECTOR_SCORE_EMOJI: Record<string, string> = {
  "情報技術":           "💻",
  "コミュニケーション": "📡",
  "一般消費財":         "🛍️",
  "生活必需品":         "🛒",
  "ヘルスケア":         "💊",
  "金融":               "🏦",
  "資本財":             "🏭",
  "エネルギー":         "⛽",
  "素材":               "🪨",
  "公益事業":           "⚡",
  "不動産":             "🏢",
};

function SectorScoreBoard({ sectorScores }: { sectorScores: SectorScore[] }) {
  const maxScore = Math.max(...sectorScores.map(s => s.avgScore), 1);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-4 rounded-full bg-gradient-to-b from-sky-400 to-indigo-500 shrink-0" />
        <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">🏆 セクター別 AIスコアランキング</h2>
        <span className="text-[10px] text-zinc-400 ml-1">— 平均スコアが高いほど強気評価</span>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
          {sectorScores.map((s, i) => {
            const pct   = (s.avgScore / maxScore) * 100;
            const color = s.avgScore >= 50 ? "from-emerald-400 to-emerald-500"
                        : s.avgScore >= 38 ? "from-amber-400 to-amber-500"
                        : "from-rose-400 to-rose-500";
            const emoji = SECTOR_SCORE_EMOJI[s.sector] ?? "📊";
            const medal = i < 3 ? MEDAL[i] : `${i + 1}`;

            return (
              <div key={s.sector} className="flex items-center gap-3 px-4 py-3">
                {/* Rank */}
                <span className="w-5 shrink-0 text-[10px] font-black text-zinc-400 text-center">{medal}</span>
                {/* Emoji */}
                <span className="text-xl leading-none shrink-0">{emoji}</span>
                {/* Name + top */}
                <div className="w-28 shrink-0">
                  <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 truncate">{s.sector}</div>
                  <div className="text-[10px] text-zinc-400 truncate font-mono">{s.topSymbol} · {s.count}銘柄</div>
                </div>
                {/* Bar */}
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 h-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-7 text-right text-xs font-mono font-black text-zinc-600 dark:text-zinc-300 shrink-0">
                    {s.avgScore}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Sector Panel (セクター別ビュー) ────────────────────────────────
function SectorPanel({ sector, stocks }: { sector: string; stocks: ScanEntry[] }) {
  const [open, setOpen] = useState(true);
  const meta = SECTOR_META[sector] ?? { emoji: "📊" };
  const avgScore = Math.round(stocks.reduce((s, e) => s + e.score, 0) / stocks.length);
  const best = stocks[0];

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">

      {/* Sector header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
      >
        <span className="text-2xl leading-none shrink-0">{meta.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-zinc-800 dark:text-zinc-100">{sector}</div>
          <div className="text-xs text-zinc-400 mt-0.5">{stocks.length}銘柄 · 平均スコア {avgScore}</div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* Avg score bar */}
          <div className="hidden sm:flex items-center gap-2 w-28">
            <div className="flex-1 h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-400 to-emerald-400"
                style={{ width: `${Math.min(100, avgScore)}%` }}
              />
            </div>
            <span className="text-xs font-mono font-bold text-zinc-500 w-6">{avgScore}</span>
          </div>
          {best && <ReturnBadge value={best.expectedReturn} />}
          {open
            ? <ChevronUp className="w-4 h-4 text-zinc-400 shrink-0" />
            : <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />}
        </div>
      </button>

      {/* Stock list */}
      {open && (
        <div className="border-t border-zinc-100 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800/50">
          {stocks.map((entry, i) => (
            <Link
              key={entry.symbol}
              href={`/stock/${encodeURIComponent(entry.symbol)}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
            >
              {/* Rank */}
              <span className="w-6 shrink-0 text-center text-xs font-black text-zinc-400">
                {i < 3 ? MEDAL[i] : i + 1}
              </span>

              {/* Symbol + name */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">{entry.symbol}</span>
                  <span className="text-sm leading-none">{entry.market === "JP" ? "🇯🇵" : "🇺🇸"}</span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate hidden sm:inline">{entry.name}</span>
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">{entry.theme}</div>
              </div>

              {/* Style badge */}
              <div className="hidden md:flex items-center gap-1.5 shrink-0">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-semibold ${STYLE_CFG[entry.investStyle].badge}`}>
                  {STYLE_CFG[entry.investStyle].icon} {STYLE_CFG[entry.investStyle].label}
                </span>
              </div>

              {/* Score bar */}
              <div className="flex items-center gap-2 w-20 shrink-0">
                <div className="flex-1 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-violet-500"
                    style={{ width: `${Math.min(100, entry.score)}%` }}
                  />
                </div>
                <span className="text-xs font-mono font-bold text-zinc-500 w-5 text-right">{entry.score.toFixed(0)}</span>
              </div>

              {/* Return badge */}
              <div className="shrink-0">
                <ReturnBadge value={entry.expectedReturn} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sector View ────────────────────────────────────────────────────
function SectorView({ entries }: { entries: ScanEntry[] }) {
  const grouped = new Map<string, ScanEntry[]>();
  for (const e of entries) {
    const s = e.sector || "その他";
    const arr = grouped.get(s) ?? [];
    arr.push(e);
    grouped.set(s, arr);
  }

  // セクターを平均スコアの高い順にソート
  const sorted = [...grouped.entries()]
    .sort(([, a], [, b]) => {
      const avgA = a.reduce((s, x) => s + x.score, 0) / a.length;
      const avgB = b.reduce((s, x) => s + x.score, 0) / b.length;
      return avgB - avgA;
    });

  if (sorted.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center text-sm text-zinc-400">
        フィルター条件に該当するセクターがありません
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sorted.map(([sector, stocks]) => (
        <SectorPanel key={sector} sector={sector} stocks={stocks} />
      ))}
    </div>
  );
}

// ── Sentiment Bar ──────────────────────────────────────────────────
function SentimentBar({ score }: { score: number }) {
  const label = score >= 70 ? "強気🚀" : score >= 50 ? "やや強気📈" : score >= 35 ? "中立⚖️" : "弱気📉";
  const color = score >= 70 ? "from-emerald-400 to-emerald-500" :
                score >= 50 ? "from-emerald-300 to-teal-400" :
                score >= 35 ? "from-amber-300 to-amber-400" :
                              "from-rose-400 to-rose-500";

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
          <BarChart2 className="w-4 h-4 text-violet-500" />
          AIセンチメント
        </span>
        <span className="text-sm font-black text-zinc-800 dark:text-zinc-100">
          {score}<span className="text-xs text-zinc-400 font-normal">/100</span>
          <span className="text-sm font-semibold text-zinc-500 ml-2">{label}</span>
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-1000`}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs text-rose-400">弱気</span>
        <span className="text-xs text-amber-400">中立</span>
        <span className="text-xs text-emerald-400">強気</span>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────
export default function AiRankingPage() {
  const [period,       setPeriod]       = useState<Period>("1y");
  const [marketFilter, setMarketFilter] = useState<MarketFilter>("all");
  const [styleFilter,  setStyleFilter]  = useState<StyleFilter>("all");
  const [scanSearch,   setScanSearch]   = useState("");
  const [viewMode,     setViewMode]     = useState<ViewMode>("ranking");
  const [data,         setData]         = useState<RankingResp | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [lastPeriod,   setLastPeriod]   = useState<Period | null>(null);
  const [expanded,     setExpanded]     = useState<Set<number>>(new Set());

  // リアルタイム取得（キャッシュなし）
  const load = useCallback((p: Period) => {
    setLoading(true);
    setExpanded(new Set());
    fetch(`/api/ai-ranking?period=${p}`, { cache: "no-store" })
      .then(r  => r.json())
      .then(d  => { setData(d); setLastPeriod(p); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(period); }, [period]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (rank: number) =>
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(rank)) next.delete(rank); else next.add(rank);
      return next;
    });

  // フィルタリング
  const filterEntries = <T extends { market: "JP" | "US"; investStyle: InvestStyle }>(entries: T[]) =>
    entries.filter(e =>
      (marketFilter === "all" || e.market === marketFilter) &&
      (styleFilter  === "all" || e.investStyle === styleFilter)
    );

  const bullEntries = data ? filterEntries(data.bull) : [];
  const scanEntries = data
    ? filterEntries(data.all).filter(e =>
        !scanSearch ||
        e.symbol.toLowerCase().includes(scanSearch.toLowerCase()) ||
        e.name.includes(scanSearch) ||
        e.theme.includes(scanSearch) ||
        (e.sector ?? "").includes(scanSearch)
      )
    : [];

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <header>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
          <span className="inline-flex w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 items-center justify-center text-white shadow-lg shadow-violet-500/25">
            <Sparkles className="w-5 h-5" />
          </span>
          AI投資予想ランキング
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
          日米全11 GICSセクター・約95銘柄を財務データ・アナリスト推奨・テクニカルでAIスコアリング。成長・高配当・割安など多角的な視点でランキング。
        </p>
      </header>

      {/* ── AIセンチメントバー ── */}
      {!loading && data && <SentimentBar score={data.sentiment} />}

      {/* ── コントロールパネル ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap gap-3 items-start">

          {/* 表示モード */}
          <div>
            <div className="text-xs font-semibold text-zinc-400 mb-1.5">表示</div>
            <div className="flex p-0.5 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl gap-0.5">
              <button onClick={() => setViewMode("ranking")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  viewMode === "ranking" ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white" : "text-zinc-500 dark:text-zinc-400"
                }`}>
                <TrendingUp className="w-3.5 h-3.5" /> ランキング
              </button>
              <button onClick={() => setViewMode("sector")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  viewMode === "sector" ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white" : "text-zinc-500 dark:text-zinc-400"
                }`}>
                <Layers className="w-3.5 h-3.5" /> セクター別
              </button>
            </div>
          </div>

          {/* 投資期間 */}
          <div>
            <div className="text-xs font-semibold text-zinc-400 mb-1.5">期間</div>
            <div className="flex p-0.5 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl gap-0.5">
              {(["1y", "5y", "10y"] as Period[]).map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    period === p ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white" : "text-zinc-500 dark:text-zinc-400"
                  }`}>
                  {PERIOD_LABELS[p].short}
                </button>
              ))}
            </div>
          </div>

          {/* 市場 */}
          <div>
            <div className="text-xs font-semibold text-zinc-400 mb-1.5">市場</div>
            <div className="flex p-0.5 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl gap-0.5">
              {([["all","🌏 全て"],["JP","🇯🇵 日本"],["US","🇺🇸 米国"]] as [MarketFilter,string][]).map(([k,l]) => (
                <button key={k} onClick={() => setMarketFilter(k)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    marketFilter === k ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white" : "text-zinc-500 dark:text-zinc-400"
                  }`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* 投資スタイル */}
          <div>
            <div className="text-xs font-semibold text-zinc-400 mb-1.5">スタイル</div>
            <div className="flex flex-wrap gap-1">
              <button onClick={() => setStyleFilter("all")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                  styleFilter === "all" ? "bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 border-zinc-800 dark:border-zinc-200" : "border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400"
                }`}>
                全て
              </button>
              {INVEST_STYLES.map(s => (
                <button key={s} onClick={() => setStyleFilter(s)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                    styleFilter === s ? STYLE_CFG[s].badge + " border-current" : "border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400"
                  }`}>
                  {STYLE_CFG[s].icon} {STYLE_CFG[s].label}
                </button>
              ))}
            </div>
          </div>

          {/* 再分析ボタン */}
          <div className="ml-auto flex items-end gap-2 pb-0.5">
            {data && !loading && (
              <span className="text-xs text-zinc-400 hidden sm:block mb-1">更新: {fmtDate(data.updatedAt)}</span>
            )}
            <button onClick={() => load(period)} disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 hover:bg-violet-200 transition-colors disabled:opacity-40">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              再分析
            </button>
          </div>
        </div>

        {/* 免責 */}
        <p className="text-xs text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg px-3 py-2 leading-relaxed">
          ⚠️ AIルールベーススコアリングによる参考情報です。投資判断は必ず自己責任で行ってください。
        </p>
      </div>

      {/* ── AIマーケットコメント ── */}
      {!loading && data?.marketNote && (
        <div className="bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-950/20 dark:to-fuchsia-950/20 border border-violet-200 dark:border-violet-800/40 rounded-2xl px-4 py-3.5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0 text-white shadow">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-violet-800 dark:text-violet-300 mb-1">
                AIコメント · {PERIOD_LABELS[period].full}
              </div>
              <p className="text-sm text-violet-700 dark:text-violet-300 leading-relaxed">{data.marketNote}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center animate-pulse">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <p className="text-sm text-zinc-500">AIが{PERIOD_LABELS[period].short}の銘柄をリアルタイムで分析中…</p>
          <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
        </div>
      )}

      {/* ── メインコンテンツ ── */}
      {!loading && data && (
        <>
          {/* ── ランキングビュー ── */}
          {viewMode === "ranking" && (
            <>
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 rounded-full bg-gradient-to-b from-emerald-400 to-violet-500 shrink-0" />
                  <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">
                    🚀 {PERIOD_LABELS[period].full} · 高騰予想 TOP {bullEntries.length}
                  </h2>
                </div>

                {bullEntries.length === 0 ? (
                  <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center text-sm text-zinc-400">
                    フィルター条件に該当する銘柄がありません
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {bullEntries.map(entry => (
                      <RankCard
                        key={entry.symbol}
                        entry={entry}
                        expanded={expanded.has(entry.rank)}
                        onToggle={() => toggle(entry.rank)}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* ── 視点別注目銘柄 ── */}
              {data.perspectives && (
                <section>
                  <PerspectivePanel perspectives={data.perspectives} />
                </section>
              )}

              {/* ── 投資シグナルボード ── */}
              {data.signals && (
                <section>
                  <SignalBoard signals={data.signals} />
                </section>
              )}

              {/* ── セクタースコアランキング ── */}
              {data.sectorScores && data.sectorScores.length > 0 && (
                <section>
                  <SectorScoreBoard sectorScores={data.sectorScores} />
                </section>
              )}
            </>
          )}

          {/* ── セクター別ビュー ── */}
          {viewMode === "sector" && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 rounded-full bg-gradient-to-b from-sky-400 to-indigo-500 shrink-0" />
                <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 flex-1">
                  🏗️ セクター別AI予想 · {PERIOD_LABELS[period].full}
                </h2>
                <span className="text-xs text-zinc-400">{scanEntries.length}銘柄</span>
              </div>

              {/* Search in sector view */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  value={scanSearch}
                  onChange={e => setScanSearch(e.target.value)}
                  placeholder="銘柄名・コード・テーマで絞り込み…"
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-400/40 shadow-sm"
                />
              </div>

              <SectorView entries={scanEntries} />
            </section>
          )}

          {/* ── 活用ガイド ── */}
          <section>
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shrink-0 text-base">💡</span>
                ランキングの活用法
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-xl p-3.5 border border-emerald-100 dark:border-emerald-900/30">
                  <div className="font-bold text-sm text-emerald-800 dark:text-emerald-300 mb-2 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" /> 高スコア銘柄の見方
                  </div>
                  <ul className="space-y-1 text-xs text-emerald-700 dark:text-emerald-400">
                    <li>・スコア70以上 → 複数指標で強気シグナル</li>
                    <li>・アナリスト推奨70%以上 → 機関投資家も注目</li>
                    <li>・上昇余地+20%以上 → 目標株価まで余裕あり</li>
                  </ul>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl p-3.5 border border-amber-100 dark:border-amber-900/30">
                  <div className="font-bold text-sm text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> リスク管理の基本
                  </div>
                  <ul className="space-y-1 text-xs text-amber-700 dark:text-amber-400">
                    <li>・高リスク銘柄は少額・分散が原則</li>
                    <li>・PER60倍超 → 業績ミスで急落に注意</li>
                    <li>・損切りラインを事前に決めておく</li>
                  </ul>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-xl p-3.5 border border-blue-100 dark:border-blue-900/30">
                  <div className="font-bold text-sm text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-1.5">
                    <BarChart2 className="w-3.5 h-3.5" /> スコアの解釈
                  </div>
                  <ul className="space-y-1 text-xs text-blue-700 dark:text-blue-400">
                    <li>・スコアは0〜100の相対値</li>
                    <li>・データ取得できない指標は評価除外</li>
                    <li>・期間(1年/5年/10年)で重視指標が変わる</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
