"use client";

import { useEffect, useState, useCallback } from "react";
import { X, TrendingUp, TrendingDown, BarChart2, Zap, Info } from "lucide-react";
import { formatNumber } from "@/lib/format";

type Scenario = {
  id: "bull" | "base" | "bear" | "surprise";
  label: string;
  icon: string;
  color: string;
  price5Y: number;
  cagr: number;
  changePercent: number;
  headline: string;
  trigger: string;
  reasoning: string[];
};

type PredictResp = {
  symbol: string;
  name: string;
  currentPrice: number;
  currency: string;
  scenarios: Scenario[];
  updatedAt: string;
};

// ── color maps ────────────────────────────────────────────────────
const COLORS: Record<string, {
  card:   string;
  badge:  string;
  text:   string;
  border: string;
  bg:     string;
  dot:    string;
  modalBg:string;
  bullet: string;
}> = {
  emerald: {
    card:    "border-emerald-200 dark:border-emerald-800/60 hover:border-emerald-400 dark:hover:border-emerald-600",
    badge:   "bg-emerald-500 text-white",
    text:    "text-emerald-600 dark:text-emerald-400",
    border:  "border-emerald-300 dark:border-emerald-700",
    bg:      "bg-emerald-50 dark:bg-emerald-950/30",
    dot:     "bg-emerald-500",
    modalBg: "from-emerald-50 to-white dark:from-emerald-950/40 dark:to-zinc-900",
    bullet:  "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300",
  },
  blue: {
    card:    "border-blue-200 dark:border-blue-800/60 hover:border-blue-400 dark:hover:border-blue-600",
    badge:   "bg-blue-500 text-white",
    text:    "text-blue-600 dark:text-blue-400",
    border:  "border-blue-300 dark:border-blue-700",
    bg:      "bg-blue-50 dark:bg-blue-950/30",
    dot:     "bg-blue-500",
    modalBg: "from-blue-50 to-white dark:from-blue-950/40 dark:to-zinc-900",
    bullet:  "bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-300",
  },
  rose: {
    card:    "border-rose-200 dark:border-rose-800/60 hover:border-rose-400 dark:hover:border-rose-600",
    badge:   "bg-rose-500 text-white",
    text:    "text-rose-600 dark:text-rose-400",
    border:  "border-rose-300 dark:border-rose-700",
    bg:      "bg-rose-50 dark:bg-rose-950/30",
    dot:     "bg-rose-500",
    modalBg: "from-rose-50 to-white dark:from-rose-950/40 dark:to-zinc-900",
    bullet:  "bg-rose-100 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-300",
  },
  violet: {
    card:    "border-violet-200 dark:border-violet-800/60 hover:border-violet-400 dark:hover:border-violet-600",
    badge:   "bg-violet-500 text-white",
    text:    "text-violet-600 dark:text-violet-400",
    border:  "border-violet-300 dark:border-violet-700",
    bg:      "bg-violet-50 dark:bg-violet-950/30",
    dot:     "bg-violet-500",
    modalBg: "from-violet-50 to-white dark:from-violet-950/40 dark:to-zinc-900",
    bullet:  "bg-violet-100 dark:bg-violet-900/30 border-violet-200 dark:border-violet-800/50 text-violet-700 dark:text-violet-300",
  },
};

const ICON_COMPONENT: Record<string, React.ElementType> = {
  bull:     TrendingUp,
  base:     BarChart2,
  bear:     TrendingDown,
  surprise: Zap,
};

// ── Modal ─────────────────────────────────────────────────────────
function ScenarioModal({
  scenario,
  currentPrice,
  currency,
  onClose,
}: {
  scenario: Scenario;
  currentPrice: number;
  currency: string;
  onClose: () => void;
}) {
  const c = COLORS[scenario.color] ?? COLORS.blue;
  const up = scenario.changePercent >= 0;
  const Icon = ICON_COMPONENT[scenario.id] ?? BarChart2;

  // Keyboard close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className={`relative w-full sm:max-w-lg bg-gradient-to-b ${c.modalBg} rounded-t-3xl sm:rounded-2xl shadow-2xl border ${c.border} max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center text-xl`}>
              {scenario.icon}
            </div>
            <div>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${c.badge}`}>
                {scenario.label}
              </span>
              <p className={`text-sm font-bold mt-0.5 ${c.text}`}>{scenario.headline}</p>
            </div>
          </div>

          {/* Price targets */}
          <div className={`rounded-xl ${c.bg} border ${c.border} p-4`}>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-[10px] text-zinc-500 mb-1">現在価格</div>
                <div className="font-mono text-sm font-bold text-zinc-800 dark:text-zinc-200">
                  {formatNumber(currentPrice)}<span className="text-[10px] font-normal ml-0.5">{currency}</span>
                </div>
              </div>
              <div>
                <div className={`text-[10px] mb-1 ${c.text} font-semibold`}>5年後予想</div>
                <div className={`font-mono text-base font-black ${c.text}`}>
                  {formatNumber(scenario.price5Y)}<span className="text-[10px] font-normal ml-0.5">{currency}</span>
                </div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500 mb-1">変動率</div>
                <div className={`font-mono text-sm font-black ${up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {up ? "+" : ""}{scenario.changePercent}%
                </div>
                <div className="text-[9px] text-zinc-400">年率{scenario.cagr}%</div>
              </div>
            </div>
          </div>

          {/* CAGR visual bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-zinc-500">期待リターン (年率)</span>
              <span className={`text-xs font-bold ${c.text}`}>{scenario.cagr > 0 ? "+" : ""}{scenario.cagr}% / 年</span>
            </div>
            <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
              <div
                className={`h-full rounded-full ${c.dot} transition-all duration-700`}
                style={{ width: `${Math.min(100, Math.max(0, Math.abs(scenario.cagr) * 2.5))}%` }}
              />
            </div>
          </div>

          {/* Trigger */}
          <div className="flex items-start gap-2 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl px-3.5 py-3 border border-zinc-200 dark:border-zinc-700">
            <Icon className={`w-4 h-4 ${c.text} shrink-0 mt-0.5`} />
            <div>
              <div className="text-[10px] text-zinc-400 mb-0.5">このシナリオが実現する条件</div>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">{scenario.trigger}</p>
            </div>
          </div>

          {/* Reasoning */}
          <div>
            <div className="flex items-center gap-1.5 mb-2.5">
              <Info className={`w-3.5 h-3.5 ${c.text}`} />
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">予想の根拠</span>
            </div>
            <div className="space-y-2">
              {scenario.reasoning.map((r, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2.5 rounded-lg px-3 py-2.5 border ${c.bullet} text-xs leading-relaxed`}
                >
                  <span className={`shrink-0 w-4 h-4 rounded-full ${c.dot} text-white text-[9px] font-black flex items-center justify-center mt-0.5`}>
                    {i + 1}
                  </span>
                  <span>{r}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[9px] text-zinc-400 text-center border-t border-zinc-200 dark:border-zinc-700 pt-3">
            ※ 本予想はルールベースAIによる試算です。実際の投資判断は自己責任でお願いします。
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Scenario Card ─────────────────────────────────────────────────
function ScenarioCard({
  scenario,
  currency,
  onClick,
}: {
  scenario: Scenario;
  currency: string;
  onClick: () => void;
}) {
  const c = COLORS[scenario.color] ?? COLORS.blue;
  const up = scenario.changePercent >= 0;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border-2 ${c.card} bg-white dark:bg-zinc-900 p-3.5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 group`}
    >
      {/* Top row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg leading-none">{scenario.icon}</span>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${c.badge}`}>
            {scenario.label}
          </span>
        </div>
        <span className="text-[9px] text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
          詳細 →
        </span>
      </div>

      {/* Price */}
      <div className={`font-mono font-black text-lg ${c.text} leading-none mb-0.5`}>
        {formatNumber(scenario.price5Y)}
        <span className="text-[10px] font-normal ml-0.5 text-zinc-500">{currency}</span>
      </div>
      <div className={`text-xs font-bold ${up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
        {up ? "▲" : "▼"} {up ? "+" : ""}{scenario.changePercent}%
        <span className="text-[10px] font-normal text-zinc-400 ml-1">年率{scenario.cagr}%</span>
      </div>

      {/* Headline */}
      <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1.5 leading-snug line-clamp-2">
        {scenario.headline}
      </p>
    </button>
  );
}

// ── Main Component ─────────────────────────────────────────────────
export default function AiScenarios({ symbol }: { symbol: string }) {
  const [data,    setData]    = useState<PredictResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [open,    setOpen]    = useState(false);
  const [modal,   setModal]   = useState<Scenario | null>(null);

  const load = useCallback(() => {
    if (data || loading) return;
    setLoading(true);
    fetch(`/api/ai-predict?symbol=${encodeURIComponent(symbol)}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [data, loading, symbol]);

  useEffect(() => {
    if (open && !data && !loading) load();
  }, [open, data, loading, load]);

  return (
    <>
      {/* Modal */}
      {modal && data && (
        <ScenarioModal
          scenario={modal}
          currentPrice={data.currentPrice}
          currency={data.currency}
          onClose={() => setModal(null)}
        />
      )}

      {/* Card */}
      <div className="rounded-2xl overflow-hidden shadow-sm border border-violet-200/80 dark:border-violet-800/40 bg-white dark:bg-zinc-900">
        {/* Header */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-violet-50 dark:hover:bg-violet-950/20 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-base shadow-md shadow-violet-500/20">
              🔮
            </span>
            <div className="text-left">
              <div className="text-sm font-bold">AI 5年後シナリオ予想</div>
              <div className="text-[10px] text-zinc-400">
                {data ? "4シナリオ · カードをタップで詳細" : "クリックして予想を表示"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {data && (
              <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300">
                4シナリオ
              </span>
            )}
            <span className={`text-zinc-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>▼</span>
          </div>
        </button>

        {/* Body */}
        {open && (
          <div className="border-t border-violet-100 dark:border-violet-900/30">
            {loading ? (
              <div className="px-4 py-8 flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 animate-pulse" />
                <p className="text-sm text-zinc-500 animate-pulse">シナリオを生成中…</p>
              </div>
            ) : data ? (
              <div className="p-4 space-y-3">
                {/* Context row */}
                <div className="flex items-center justify-between">
                  <div className="text-xs text-zinc-500">
                    現在価格:
                    <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200 ml-1">
                      {formatNumber(data.currentPrice)} {data.currency}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400">5年後 (2031年) の予想</span>
                </div>

                {/* 2×2 grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  {data.scenarios.map((s) => (
                    <ScenarioCard
                      key={s.id}
                      scenario={s}
                      currency={data.currency}
                      onClick={() => setModal(s)}
                    />
                  ))}
                </div>

                <p className="text-[9px] text-zinc-400 text-center pt-1">
                  ※ ルールベースAIによる試算。投資判断の参考情報としてご利用ください。
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </>
  );
}
