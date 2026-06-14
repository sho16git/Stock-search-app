"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from "recharts";
import { ArrowLeft, GitCompareArrows, Search, X, Plus, Share2, Check } from "lucide-react";
import { formatLargeNumber } from "@/lib/format";
import AIInsight from "@/components/AIInsight";
import type { CompareRow } from "@/app/api/compare/route";

const COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#ec4899"];
const PERIODS = [
  { key: "3mo", label: "3ヶ月", api: "3mo" },
  { key: "6mo", label: "6ヶ月", api: "6mo" },
  { key: "1y",  label: "1年",   api: "1y" },
  { key: "5y",  label: "5年",   api: "5y" },
] as const;

type SearchResult = { symbol: string; name: string };

function fmtNum(v: number | null, d = 1): string {
  return v == null ? "—" : v.toFixed(d);
}
function fmtPct(v: number | null, mul = 1): string {
  return v == null ? "—" : `${(v * mul).toFixed(2)}%`;
}

/** 0..100 に正規化(min/max 範囲、invert で小さいほど高スコア=割安系) */
function normScore(v: number | null, vals: number[], invert = false): number {
  const valid = vals.filter((x) => x != null && Number.isFinite(x));
  if (v == null || valid.length === 0) return 0;
  const min = Math.min(...valid), max = Math.max(...valid);
  if (max === min) return 60;
  const s = ((v - min) / (max - min)) * 100;
  return Math.round(invert ? 100 - s : s);
}

const RADAR_AXES = [
  { key: "割安度", get: (r: CompareRow) => r.per, invert: true },        // PER低い=高スコア
  { key: "成長性", get: (r: CompareRow) => r.revenueGrowth, invert: false },
  { key: "収益性", get: (r: CompareRow) => r.roe, invert: false },
  { key: "配当", get: (r: CompareRow) => r.dividendYield, invert: false },
  { key: "モメンタム", get: (r: CompareRow) => r.week52Position, invert: false },
] as const;

export default function ComparePage() {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [rows, setRows] = useState<CompareRow[]>([]);
  const [period, setPeriod] = useState<typeof PERIODS[number]["key"]>("6mo");
  const [series, setSeries] = useState<Record<string, unknown>[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);

  // ── search picker ──
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addSymbol = (sym: string) => {
    const s = sym.toUpperCase();
    setSymbols((prev) => (prev.includes(s) || prev.length >= 4 ? prev : [...prev, s]));
    setQuery(""); setResults([]); setShowResults(false);
  };
  const removeSymbol = (sym: string) => setSymbols((prev) => prev.filter((s) => s !== sym));

  useEffect(() => {
    if (debRef.current) clearTimeout(debRef.current);
    if (!query.trim()) { setResults([]); return; }
    debRef.current = setTimeout(async () => {
      try {
        const j = await (await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`)).json();
        const list = (j.results ?? []).slice(0, 6).map((r: { symbol: string; jpName?: string; longname?: string; shortname?: string }) => ({
          symbol: r.symbol, name: r.jpName ?? r.longname ?? r.shortname ?? r.symbol,
        }));
        setResults(list); setShowResults(true);
      } catch { setResults([]); }
    }, 250);
  }, [query]);

  // ── fetch metrics (race-guarded: only the latest response applies) ──
  useEffect(() => {
    if (symbols.length === 0) { setRows([]); return; }
    let cancelled = false;
    const want = symbols.join(",");
    fetch(`/api/compare?symbols=${encodeURIComponent(want)}`)
      .then((r) => r.json())
      .then((j) => { if (!cancelled) setRows(j.rows ?? []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [symbols]);

  // ── fetch + normalize chart series (race-guarded) ──
  const chartReq = useRef(0);
  const loadChart = useCallback(async () => {
    if (symbols.length === 0) { setSeries([]); return; }
    const reqId = ++chartReq.current;
    setLoadingChart(true);
    const apiRange = PERIODS.find((p) => p.key === period)!.api;
    try {
      const all = await Promise.all(symbols.map(async (s) => {
        const j = await (await fetch(`/api/chart?symbol=${encodeURIComponent(s)}&range=${apiRange}`)).json();
        return { symbol: s, data: (j.data ?? []) as { date: string; close: number }[] };
      }));
      if (reqId !== chartReq.current) return;   // 古いレスポンスは破棄
      const minLen = Math.min(...all.map((a) => a.data.length).filter((n) => n > 0), Infinity);
      if (!Number.isFinite(minLen) || minLen === 0) { setSeries([]); return; }
      const merged: Record<string, unknown>[] = [];
      for (let i = 0; i < minLen; i++) {
        const point: Record<string, unknown> = {};
        for (const a of all) {
          const tail = a.data.slice(-minLen);
          const base = tail[0]?.close;
          const cur = tail[i]?.close;
          if (base && cur != null) point[a.symbol] = +(((cur - base) / base) * 100).toFixed(2);
          if (!point.date && tail[i]?.date) point.date = tail[i].date;
        }
        merged.push(point);
      }
      setSeries(merged);
    } catch { if (reqId === chartReq.current) setSeries([]); }
    finally { if (reqId === chartReq.current) setLoadingChart(false); }
  }, [symbols, period]);

  useEffect(() => { loadChart(); }, [loadChart]);

  // ── URL sync (?symbols=) — shareable / bookmarkable ──
  const didInit = useRef(false);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("symbols");
    if (p) setSymbols(p.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean).slice(0, 4));
  }, []);
  useEffect(() => {
    if (!didInit.current) { didInit.current = true; return; }
    const q = symbols.length ? `?symbols=${symbols.join(",")}` : "";
    window.history.replaceState(null, "", `/compare${q}`);
  }, [symbols]);

  const [copied, setCopied] = useState(false);
  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true); setTimeout(() => setCopied(false), 1800);
    } catch { /* ignore */ }
  };

  // 期間リターン(チャート最終値) と レーダースコア
  const lastPoint = series[series.length - 1] as Record<string, number> | undefined;
  const radarData = RADAR_AXES.map((ax) => {
    const vals = rows.map((r) => ax.get(r)).filter((v): v is number => v != null);
    const point: Record<string, unknown> = { axis: ax.key };
    rows.forEach((r) => { point[r.symbol] = normScore(ax.get(r), vals, ax.invert); });
    return point;
  });

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <Link href="/" className="inline-flex items-center text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white mb-1.5">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />ホーム
          </Link>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <GitCompareArrows className="w-6 h-6 text-blue-500" />
            銘柄比較
          </h1>
          <p className="text-[11px] text-slate-500 mt-1">最大4銘柄の指標・値動き・レーダー・AI判定を横並びで比較</p>
        </div>
        {symbols.length >= 2 && (
          <button onClick={share}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors shadow-sm text-xs font-semibold shrink-0">
            {copied ? <><Check className="w-3.5 h-3.5 text-emerald-500" />コピー済み</> : <><Share2 className="w-3.5 h-3.5" />共有</>}
          </button>
        )}
      </header>

      {/* Search picker */}
      <div className="relative">
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length && setShowResults(true)}
            placeholder={symbols.length >= 4 ? "上限の4銘柄に達しました" : "銘柄を追加（社名・コード・ティッカー）"}
            disabled={symbols.length >= 4}
            className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-slate-400 disabled:opacity-50"
          />
        </div>
        {showResults && results.length > 0 && (
          <div className="absolute z-20 left-0 right-0 mt-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg overflow-hidden">
            {results.map((r) => (
              <button key={r.symbol} onClick={() => addSymbol(r.symbol)}
                className="w-full flex items-center gap-2 px-3.5 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <Plus className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400 w-20 shrink-0">{r.symbol}</span>
                <span className="text-xs text-slate-600 dark:text-slate-300 truncate">{r.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected chips */}
      {symbols.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {symbols.map((s, i) => (
            <span key={s} className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-semibold border"
              style={{ borderColor: COLORS[i], color: COLORS[i] }}>
              <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />
              <Link href={`/stock/${encodeURIComponent(s)}`} className="hover:underline" title={`${s} の詳細へ`}>{s}</Link>
              <button onClick={() => removeSymbol(s)} className="hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full p-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {symbols.length < 2 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center shadow-sm">
          <GitCompareArrows className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">2銘柄以上を追加すると比較が表示されます</p>
          <p className="text-xs text-slate-400 mt-1.5">例: AAPL と MSFT、トヨタ と ホンダ</p>
        </div>
      ) : (
        <>
          {/* Metrics table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
                    <th className="py-2.5 px-3 font-medium sticky left-0 bg-slate-50/60 dark:bg-slate-900/60">指標</th>
                    {rows.map((r, i) => (
                      <th key={r.symbol} className="py-2.5 px-3 text-right font-bold whitespace-nowrap" style={{ color: COLORS[i] }}>
                        <Link href={`/stock/${encodeURIComponent(r.symbol)}`} className="inline-block hover:underline" title={`${r.symbol} の詳細ページへ`}>
                          {r.symbol}
                          <div className="text-[10px] font-normal text-slate-400 truncate max-w-[120px] ml-auto">{r.name} ↗</div>
                        </Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <MetricRow label="株価" rows={rows} render={(r) => r.price != null ? `${formatLargeNumber(r.price)} ${r.currency ?? ""}` : "—"} />
                  <MetricRow label="前日比" rows={rows} render={(r) => r.changePercent != null
                    ? <span className={r.changePercent >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}>{r.changePercent >= 0 ? "+" : ""}{r.changePercent.toFixed(2)}%</span>
                    : "—"} />
                  <MetricRow label="PER (倍)" rows={rows} render={(r) => fmtNum(r.per)} best={minOf(rows.map(r => r.per))} metricVal={(r) => r.per} />
                  <MetricRow label="PBR (倍)" rows={rows} render={(r) => fmtNum(r.pbr, 2)} best={minOf(rows.map(r => r.pbr))} metricVal={(r) => r.pbr} />
                  <MetricRow label="ROE" rows={rows} render={(r) => fmtPct(r.roe, 100)} best={maxOf(rows.map(r => r.roe))} metricVal={(r) => r.roe} />
                  <MetricRow label="営業利益率" rows={rows} render={(r) => fmtPct(r.operatingMargin, 100)} best={maxOf(rows.map(r => r.operatingMargin))} metricVal={(r) => r.operatingMargin} />
                  <MetricRow label="売上成長率" rows={rows} render={(r) => fmtPct(r.revenueGrowth, 100)} best={maxOf(rows.map(r => r.revenueGrowth))} metricVal={(r) => r.revenueGrowth} />
                  <MetricRow label="配当利回り" rows={rows} render={(r) => fmtPct(r.dividendYield, 100)} best={maxOf(rows.map(r => r.dividendYield))} metricVal={(r) => r.dividendYield} />
                  <MetricRow label="配当性向" rows={rows} render={(r) => fmtPct(r.payoutRatio, 100)} />
                  <MetricRow label="EPS" rows={rows} render={(r) => fmtNum(r.eps, 2)} />
                  <MetricRow label="ベータ" rows={rows} render={(r) => fmtNum(r.beta, 2)} />
                  <MetricRow label="目標株価乖離" rows={rows} render={(r) => r.targetUpside != null
                    ? <span className={r.targetUpside >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}>{r.targetUpside >= 0 ? "+" : ""}{r.targetUpside}%</span>
                    : "—"} best={maxOf(rows.map(r => r.targetUpside))} metricVal={(r) => r.targetUpside} />
                  <MetricRow label="52週位置" rows={rows} render={(r) => r.week52Position != null ? `${r.week52Position}%` : "—"} />
                  <MetricRow label="時価総額" rows={rows} render={(r) => r.marketCap != null ? formatLargeNumber(r.marketCap) : "—"} />
                </tbody>
              </table>
            </div>
            <div className="px-3 py-1.5 text-[9px] text-slate-400 border-t border-slate-100 dark:border-slate-800/60">
              緑=各指標で最も優位な銘柄（PER/PBRは低い方、ROE/配当は高い方）
            </div>
          </div>

          {/* Radar chart — multi-metric profile */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <h2 className="text-sm font-bold mb-1">スコア・レーダー <span className="text-[10px] font-normal text-slate-400">(銘柄間の相対スコア 0〜100)</span></h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="72%">
                  <PolarGrid stroke="#e2e8f0" strokeOpacity={0.5} />
                  <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: "#64748b" }} />
                  {rows.map((r, i) => (
                    <Radar key={r.symbol} name={r.symbol} dataKey={r.symbol} stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.12} strokeWidth={2} />
                  ))}
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[9px] text-slate-400 mt-1">割安度=PERが低いほど高 ／ 成長性=売上成長 ／ 収益性=ROE ／ 配当=利回り ／ モメンタム=52週位置</p>
          </div>

          {/* Normalized price chart */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold">値動き比較 <span className="text-[10px] font-normal text-slate-400">(期間開始=0%)</span></h2>
              <div className="flex gap-0.5 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                {PERIODS.map((p) => (
                  <button key={p.key} onClick={() => setPeriod(p.key)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                      period === p.key ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white" : "text-slate-500"
                    }`}>{p.label}</button>
                ))}
              </div>
            </div>
            <div className="h-64">
              {loadingChart ? (
                <div className="w-full h-full rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
              ) : series.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-slate-400">チャートデータなし</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series} margin={{ top: 5, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.4} vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#94a3b8" }} tickFormatter={(d) => String(d).slice(5)} minTickGap={40} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} tickFormatter={(v) => `${v}%`} width={38} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0" }}
                      formatter={(value, name) => { const v = Number(value); return [`${v >= 0 ? "+" : ""}${v}%`, String(name)]; }}
                      labelFormatter={(l) => String(l)}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} formatter={(value) => {
                      const ret = lastPoint?.[String(value)];
                      return ret != null
                        ? <span style={{ color: ret >= 0 ? "#10b981" : "#f43f5e" }}>{String(value)} ({ret >= 0 ? "+" : ""}{ret}%)</span>
                        : String(value);
                    }} />
                    {symbols.map((s, i) => (
                      <Line key={s} type="monotone" dataKey={s} stroke={COLORS[i]} dot={false} strokeWidth={2} connectNulls />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* AI verdict */}
          {rows.length >= 2 && (
            <div className="rounded-2xl border border-violet-200/80 dark:border-violet-800/40 bg-gradient-to-br from-violet-50/60 to-white dark:from-violet-950/20 dark:to-slate-900 p-4 shadow-sm">
              <div className="text-sm font-bold mb-1.5 flex items-center gap-1.5">⚖️ AIによる比較判定</div>
              <AIInsight
                label="AIでどれが魅力的か判定"
                endpoint="/api/ai-peer-verdict"
                payload={{
                  symbol: symbols[0],
                  peers: rows.map((r) => ({
                    symbol: r.symbol, name: r.name, trailingPE: r.per, priceToBook: r.pbr,
                    returnOnEquity: r.roe, dividendYield: r.dividendYield, marketCap: r.marketCap,
                  })),
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function minOf(arr: (number | null)[]): number | null {
  const v = arr.filter((x): x is number => x != null && x > 0);
  return v.length ? Math.min(...v) : null;
}
function maxOf(arr: (number | null)[]): number | null {
  const v = arr.filter((x): x is number => x != null);
  return v.length ? Math.max(...v) : null;
}

function MetricRow({
  label, rows, render, best, metricVal,
}: {
  label: string;
  rows: CompareRow[];
  render: (r: CompareRow) => React.ReactNode;
  best?: number | null;
  metricVal?: (r: CompareRow) => number | null;
}) {
  return (
    <tr className="border-b border-slate-100 dark:border-slate-800/50 last:border-0">
      <td className="py-2.5 px-3 text-xs text-slate-500 font-medium sticky left-0 bg-white dark:bg-slate-900">{label}</td>
      {rows.map((r) => {
        const isBest = best != null && metricVal != null && metricVal(r) === best;
        return (
          <td key={r.symbol} className={`py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap ${
            isBest ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-slate-700 dark:text-slate-200"
          }`}>
            {render(r)}
          </td>
        );
      })}
    </tr>
  );
}
