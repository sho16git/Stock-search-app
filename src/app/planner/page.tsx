"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";
import { ArrowLeft, Target, TrendingUp, Flame } from "lucide-react";

type Mode = "grow" | "goal" | "fire";

function yen(v: number): string {
  if (Math.abs(v) >= 1e8) return `¥${(v / 1e8).toFixed(2)}億`;
  if (Math.abs(v) >= 1e4) return `¥${Math.round(v / 1e4).toLocaleString()}万`;
  return `¥${Math.round(v).toLocaleString()}`;
}

/** 月次積立の将来価値シミュレーション(複利) */
function simulate(initial: number, monthly: number, annualRatePct: number, years: number) {
  const r = annualRatePct / 100 / 12;
  let bal = initial;
  let contributed = initial;
  const pts: { year: number; value: number; contributed: number }[] = [{ year: 0, value: bal, contributed }];
  for (let m = 1; m <= years * 12; m++) {
    bal = bal * (1 + r) + monthly;
    contributed += monthly;
    if (m % 12 === 0) pts.push({ year: m / 12, value: Math.round(bal), contributed: Math.round(contributed) });
  }
  return { final: bal, contributed, gain: bal - contributed, pts };
}

export default function PlannerPage() {
  const [mode, setMode] = useState<Mode>("grow");

  // ── grow inputs ──
  const [initial, setInitial] = useState(1_000_000);
  const [monthly, setMonthly] = useState(50_000);
  const [rate, setRate] = useState(5);
  const [years, setYears] = useState(20);

  // ── goal inputs ──
  const [goal, setGoal] = useState(30_000_000);
  const [goalMonthly, setGoalMonthly] = useState(50_000);
  const [goalInitial, setGoalInitial] = useState(1_000_000);
  const [goalRate, setGoalRate] = useState(5);

  // ── fire inputs ──
  const [annualSpend, setAnnualSpend] = useState(3_600_000);
  const [swr, setSwr] = useState(4);

  const sim = useMemo(() => simulate(initial, monthly, rate, years), [initial, monthly, rate, years]);

  // goal: 何年で到達するか(月次シミュレーションで探索)
  const goalResult = useMemo(() => {
    const r = goalRate / 100 / 12;
    let bal = goalInitial;
    for (let m = 1; m <= 80 * 12; m++) {
      bal = bal * (1 + r) + goalMonthly;
      if (bal >= goal) return { months: m, reached: true, finalContrib: goalInitial + goalMonthly * m };
    }
    return { months: null, reached: false, finalContrib: null };
  }, [goal, goalMonthly, goalInitial, goalRate]);

  const fireTarget = annualSpend * (100 / swr);
  const fireSim = useMemo(() => simulate(initial, monthly, rate, 40), [initial, monthly, rate]);
  const fireYears = fireSim.pts.find((p) => p.value >= fireTarget)?.year ?? null;

  const num = (v: number) => v.toLocaleString();

  return (
    <div className="space-y-6">
      <header>
        <Link href="/" className="inline-flex items-center text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white mb-1.5">
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />ホーム
        </Link>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Target className="w-6 h-6 text-emerald-500" />
          資産プランナー
        </h1>
        <p className="text-[11px] text-slate-500 mt-1">積立シミュレーション・目標額逆算・FIRE試算</p>
      </header>

      {/* Mode tabs */}
      <div className="flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl gap-0.5">
        {([
          { k: "grow" as Mode, label: "積立シミュ", icon: TrendingUp },
          { k: "goal" as Mode, label: "目標額逆算", icon: Target },
          { k: "fire" as Mode, label: "FIRE試算", icon: Flame },
        ]).map(({ k, label, icon: Icon }) => (
          <button key={k} onClick={() => setMode(k)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              mode === k ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white" : "text-slate-500"
            }`}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {mode === "grow" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="初期投資額" value={initial} onChange={setInitial} step={100_000} suffix="円" />
            <Field label="毎月の積立額" value={monthly} onChange={setMonthly} step={10_000} suffix="円" />
            <Field label="想定年利" value={rate} onChange={setRate} step={1} suffix="%" min={0} max={30} />
            <Field label="積立期間" value={years} onChange={setYears} step={1} suffix="年" min={1} max={60} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="最終資産" value={yen(sim.final)} tone="primary" />
            <Stat label="元本(拠出累計)" value={yen(sim.contributed)} />
            <Stat label="運用益" value={yen(sim.gain)} tone="up" sub={`+${((sim.gain / sim.contributed) * 100).toFixed(0)}%`} />
          </div>
          <GrowthChart data={sim.pts} />
        </>
      )}

      {mode === "goal" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="目標資産額" value={goal} onChange={setGoal} step={1_000_000} suffix="円" />
            <Field label="現在の資産" value={goalInitial} onChange={setGoalInitial} step={100_000} suffix="円" />
            <Field label="毎月の積立額" value={goalMonthly} onChange={setGoalMonthly} step={10_000} suffix="円" />
            <Field label="想定年利" value={goalRate} onChange={setGoalRate} step={1} suffix="%" min={0} max={30} />
          </div>
          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/50 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-900 p-6 text-center shadow-sm">
            {goalResult.reached && goalResult.months != null ? (
              <>
                <div className="text-xs text-slate-500 mb-1">目標 {yen(goal)} 到達まで</div>
                <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  約 {Math.floor(goalResult.months / 12)}年{goalResult.months % 12}ヶ月
                </div>
                <div className="text-[11px] text-slate-400 mt-2">
                  うち拠出元本 {yen(goalResult.finalContrib ?? 0)} ／ 運用益 {yen(goal - (goalResult.finalContrib ?? 0))}
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-500">この条件では80年以内に到達しません。積立額か利回りを上げてください。</div>
            )}
          </div>
        </>
      )}

      {mode === "fire" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="年間生活費" value={annualSpend} onChange={setAnnualSpend} step={100_000} suffix="円" />
            <Field label="取り崩し率(SWR)" value={swr} onChange={setSwr} step={1} suffix="%" min={2} max={8} />
          </div>
          <div className="rounded-2xl border border-orange-200 dark:border-orange-800/50 bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-slate-900 p-6 text-center shadow-sm">
            <div className="text-xs text-slate-500 mb-1">必要なFIRE資産（{swr}%ルール）</div>
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">{yen(fireTarget)}</div>
            <div className="text-[11px] text-slate-400 mt-2">
              年間{num(annualSpend)}円を取り崩す場合（生活費 × {Math.round(100 / swr)}）
            </div>
            <div className="mt-3 pt-3 border-t border-orange-100 dark:border-orange-900/40 text-xs text-slate-600 dark:text-slate-300">
              上の「積立シミュ」の条件（初期{yen(initial)}・毎月{yen(monthly)}・年利{rate}%）なら
              {fireYears != null ? <strong className="text-orange-600 dark:text-orange-400"> 約{fireYears}年で到達</strong> : <span> 40年以内に到達しません</span>}
            </div>
          </div>
        </>
      )}

      <p className="text-[10px] text-slate-400 text-center">
        ※ 複利の概算シミュレーションです。税金・手数料・インフレは考慮していません。
      </p>
    </div>
  );
}

function Field({ label, value, onChange, step, suffix, min = 0, max }: {
  label: string; value: number; onChange: (v: number) => void; step: number; suffix: string; min?: number; max?: number;
}) {
  return (
    <label className="block rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5">
      <span className="text-[10px] text-slate-400 block mb-1">{label}</span>
      <span className="flex items-baseline gap-1">
        <input type="number" value={value} step={step} min={min} max={max}
          onChange={(e) => { const v = Number(e.target.value); onChange(Number.isFinite(v) ? Math.max(min, max != null ? Math.min(max, v) : v) : min); }}
          className="w-full bg-transparent text-base font-bold font-mono tabular-nums focus:outline-none" />
        <span className="text-[10px] text-slate-400 shrink-0">{suffix}</span>
      </span>
    </label>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "primary" | "up" }) {
  return (
    <div className={`rounded-xl border p-3 ${
      tone === "primary" ? "border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/60 dark:bg-emerald-950/30"
      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
    }`}>
      <div className="text-[10px] text-slate-400">{label}</div>
      <div className={`font-bold text-lg tabular-nums mt-0.5 ${tone === "up" ? "text-emerald-600 dark:text-emerald-400" : tone === "primary" ? "text-emerald-700 dark:text-emerald-300" : ""}`}>{value}</div>
      {sub && <div className="text-[11px] text-emerald-500 font-mono">{sub}</div>}
    </div>
  );
}

function GrowthChart({ data }: { data: { year: number; value: number; contributed: number }[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
      <h2 className="text-sm font-bold mb-3">資産の推移</h2>
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 8, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="pl-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.4} vertical={false} />
            <XAxis dataKey="year" tick={{ fontSize: 9, fill: "#94a3b8" }} tickFormatter={(y) => `${y}年`} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} tickFormatter={(v) => yen(Number(v))} width={52} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0" }}
              formatter={(v, n) => [yen(Number(v)), n === "value" ? "資産" : "元本"]}
              labelFormatter={(l) => `${l}年後`}
            />
            <ReferenceLine y={0} stroke="#e2e8f0" />
            <Area type="monotone" dataKey="contributed" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 4" fill="none" />
            <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fill="url(#pl-grad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[9px] text-slate-400 mt-1.5">緑=資産評価額 ／ 灰点線=拠出元本（差が運用益）</p>
    </div>
  );
}
