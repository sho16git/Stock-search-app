"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, RefreshCw, Trash2, ArrowLeft, Gauge } from "lucide-react";
import { readAiUsage, clearAiUsage, type AiUsageSummary } from "@/lib/ai-usage-client";

const USD_JPY_FALLBACK = 155;

function fmtModel(m: string): string {
  const l = m.toLowerCase();
  if (l.includes("haiku")) return "Haiku 4.5";
  if (l.includes("sonnet")) return "Sonnet";
  if (l.includes("opus")) return "Opus";
  return m;
}

export default function AiUsagePage() {
  const [data, setData] = useState<AiUsageSummary | null>(null);
  const [rate, setRate] = useState(USD_JPY_FALLBACK);

  const refresh = useCallback(() => { setData(readAiUsage()); }, []);

  useEffect(() => {
    refresh();
    fetch("/api/quote?symbol=JPY%3DX")
      .then((r) => r.json())
      .then((j) => {
        const fx = (j.quote?.regularMarketPrice as number | undefined) ?? USD_JPY_FALLBACK;
        setRate(fx > 0 ? fx : USD_JPY_FALLBACK);
      })
      .catch(() => {});
    // 他タブ・他コンポーネントでの記録に追随
    const onChange = () => refresh();
    window.addEventListener("ai-usage:change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("ai-usage:change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [refresh]);

  const reset = () => {
    if (!confirm("この端末のAI利用記録をすべてリセットします。よろしいですか？")) return;
    clearAiUsage();
    refresh();
  };

  const jpy = (usd: number) => `¥${(usd * rate).toLocaleString("ja-JP", { maximumFractionDigits: usd * rate < 100 ? 1 : 0 })}`;
  const maxEpCost = data?.byEndpoint[0]?.costUsd ?? 0;

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <Link href="/" className="inline-flex items-center text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white mb-1.5">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />ホーム
          </Link>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Gauge className="w-6 h-6 text-violet-500" />
            AI利用状況
          </h1>
          <p className="text-[11px] text-slate-500 mt-1">
            この端末で使ったAI機能の呼び出し回数と推定コスト (USD/JPY: {rate.toFixed(1)})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refresh}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-sm transition-colors shadow-sm">
            <RefreshCw className="w-4 h-4" />更新
          </button>
          <button onClick={reset}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900 bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-sm transition-colors shadow-sm">
            <Trash2 className="w-4 h-4" />リセット
          </button>
        </div>
      </header>

      {!data || data.totalCalls === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center shadow-sm">
          <Sparkles className="w-8 h-8 text-violet-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">まだAI機能が使われていません</p>
          <p className="text-xs text-slate-400 mt-1.5">
            ニュース解説・AI予想・決算サマリーなどを使うと、ここに使用量とコストが記録されます
          </p>
        </div>
      ) : (
        <>
          {/* サマリーカード */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <BigStat label="累計コスト(推定)" value={jpy(data.totalCostUsd)} sub={`$${data.totalCostUsd.toFixed(3)}`} tone="primary" />
            <BigStat label="累計呼び出し" value={`${data.totalCalls.toLocaleString()}回`} />
            <BigStat label="本日のコスト" value={jpy(data.todayCostUsd)} sub={`${data.todayCalls}回`} />
            <BigStat label="1回あたり平均" value={jpy(data.totalCostUsd / data.totalCalls)} sub={`全${data.byEndpoint.length}機能`} />
          </div>

          {/* 機能別 */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <h2 className="text-sm font-bold mb-3 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-violet-500" />機能別コスト
            </h2>
            <div className="space-y-2.5">
              {data.byEndpoint.map((e) => (
                <div key={e.endpoint}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {e.label}
                      <span className="text-slate-400 font-normal ml-1.5">{e.calls}回</span>
                    </span>
                    <span className="font-mono font-semibold text-violet-600 dark:text-violet-400">{jpy(e.costUsd)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                      style={{ width: `${maxEpCost > 0 ? Math.max(3, (e.costUsd / maxEpCost) * 100) : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* モデル別 */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <h2 className="text-sm font-bold mb-3">モデル別</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <th className="py-2 pr-3 font-medium">モデル</th>
                    <th className="py-2 px-3 text-right font-medium">呼び出し</th>
                    <th className="py-2 pl-3 text-right font-medium">コスト</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byModel.map((m) => (
                    <tr key={m.model} className="border-b border-slate-100 dark:border-slate-800/50 last:border-0">
                      <td className="py-2.5 pr-3 font-medium">{fmtModel(m.model)}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">{m.calls}</td>
                      <td className="py-2.5 pl-3 text-right font-mono font-semibold text-violet-600 dark:text-violet-400">{jpy(m.costUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <p className="text-[10px] text-slate-400 text-center">
            ※ コストは公開料金(Haiku $1/$5・Sonnet $3/$15 per 1M tokens)と機能ごとの典型的なトークン量からの概算です。正確な請求額は
            <a href="https://console.anthropic.com/settings/usage" target="_blank" rel="noreferrer" className="text-violet-500 hover:underline mx-1">console.anthropic.com</a>
            で確認してください。記録はこの端末のブラウザ(localStorage)にのみ保存されます。
          </p>
        </>
      )}
    </div>
  );
}

function BigStat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "primary" }) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${
      tone === "primary"
        ? "border-violet-200 dark:border-violet-800/50 bg-gradient-to-br from-violet-50 to-white dark:from-violet-950/30 dark:to-slate-900"
        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
    }`}>
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`font-bold text-xl mt-1 tabular-nums ${tone === "primary" ? "text-violet-700 dark:text-violet-300" : ""}`}>{value}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-0.5 font-mono">{sub}</div>}
    </div>
  );
}
