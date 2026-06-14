"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Filter,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Loader2,
  Sparkles,
  KeyRound,
} from "lucide-react";
import { formatNumber, formatLargeNumber, formatPercent } from "@/lib/format";
import { GICS_SECTORS } from "@/lib/gics";
import { getJpName } from "@/lib/jp-stocks";

type Result = {
  symbol: string;
  name: string;
  nameJa: string | null;
  market: "JP" | "US";
  sector: string;
  type: string;
  price: number | null;
  changePercent: number | null;
  per: number | null;
  forwardPe: number | null;
  pbr: number | null;
  eps: number | null;
  dividendYield: number | null;
  marketCap: number | null;
  currency: string | null;
};

type SortKey =
  | "symbol"
  | "price"
  | "changePercent"
  | "per"
  | "pbr"
  | "eps"
  | "dividendYield"
  | "marketCap";

type Filters = {
  sector: string;
  market: string;
  type: string;
  priceMin: string;
  priceMax: string;
  perMin: string;
  perMax: string;
  pbrMin: string;
  pbrMax: string;
  epsMin: string;
  epsMax: string;
  yieldMin: string;
  yieldMax: string;
  mcapMin: string;
  mcapMax: string;
};

const initialFilters: Filters = {
  sector: "",
  market: "",
  type: "stock",
  priceMin: "",
  priceMax: "",
  perMin: "",
  perMax: "",
  pbrMin: "",
  pbrMax: "",
  epsMin: "",
  epsMax: "",
  yieldMin: "",
  yieldMax: "",
  mcapMin: "",
  mcapMax: "",
};

const CACHE_KEY = "screener_cache_v1";

type CacheEntry = {
  filters:      Filters;
  results:      Result[];
  total:        number;
  universeSize: number;
  sortKey:      SortKey;
  sortDir:      "asc" | "desc";
};

export default function ScreenerPage() {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [results, setResults] = useState<Result[]>([]);
  const [total, setTotal] = useState(0);
  const [universeSize, setUniverseSize] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("marketCap");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // ── 自然言語検索 (AI) ──
  const [nlQuery, setNlQuery] = useState("");
  const [aiStatus, setAiStatus] = useState<"idle" | "loading" | "no_key" | "error">("idle");
  const [aiInterpretation, setAiInterpretation] = useState<string | null>(null);

  const runAiSearch = async () => {
    if (!nlQuery.trim()) return;
    setAiStatus("loading");
    setAiInterpretation(null);
    try {
      const res = await fetch("/api/ai-screen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: nlQuery.trim() }),
      });
      if (res.status === 503) { setAiStatus("no_key"); return; }
      if (!res.ok) throw new Error("api error");
      const j = await res.json();
      if (j.error) throw new Error(j.error);

      // AIが返した条件を Filters(文字列) にマージ
      const next: Filters = { ...initialFilters };
      const af = (j.filters ?? {}) as Record<string, unknown>;
      const keys: (keyof Filters)[] = [
        "sector", "market", "type", "priceMin", "priceMax", "perMin", "perMax",
        "pbrMin", "pbrMax", "epsMin", "epsMax", "yieldMin", "yieldMax", "mcapMin", "mcapMax",
      ];
      for (const k of keys) {
        const v = af[k];
        if (v !== undefined && v !== null && v !== "") next[k] = String(v);
      }
      const sk = (j.sortKey as SortKey) ?? "marketCap";
      const sd = (j.sortDir as "asc" | "desc") ?? "desc";
      setFilters(next);
      setSortKey(sk);
      setSortDir(sd);
      setAiInterpretation(j.interpretation ?? null);
      setAiStatus("idle");
      search(next, sk, sd);
    } catch {
      setAiStatus("error");
    }
  };

  const search = (f: Filters, sk = sortKey, sd = sortDir) => {
    setLoading(true);
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(f)) {
      if (v) params.set(k, v);
    }
    // Dividend yield input in % (e.g. 3 = 3%) — convert to fraction
    const yieldMin = parseFloat(f.yieldMin);
    const yieldMax = parseFloat(f.yieldMax);
    if (Number.isFinite(yieldMin))
      params.set("yieldMin", (yieldMin / 100).toString());
    if (Number.isFinite(yieldMax))
      params.set("yieldMax", (yieldMax / 100).toString());
    fetch(`/api/screener?${params.toString()}`)
      .then((r) => r.json())
      .then((j) => {
        const res    = j.results ?? [];
        const tot    = j.total ?? 0;
        const uni    = j.universeSize ?? 0;
        setResults(res);
        setTotal(tot);
        setUniverseSize(uni);
        // 検索状態をセッションに保存 (戻り遷移で復元用)
        try {
          const entry: CacheEntry = { filters: f, results: res, total: tot, universeSize: uni, sortKey: sk, sortDir: sd };
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry));
        } catch { /* ignore */ }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  // 初回マウント: セッションキャッシュがあれば復元、なければデフォルト検索
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const c = JSON.parse(raw) as CacheEntry;
        setFilters(c.filters);
        setResults(c.results);
        setTotal(c.total);
        setUniverseSize(c.universeSize);
        setSortKey(c.sortKey);
        setSortDir(c.sortDir);
        return; // 復元成功 → API呼び出し不要
      }
    } catch { /* ignore */ }
    search(initialFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sorted = useMemo(() => {
    const arr = [...results];
    arr.sort((a, b) => {
      const va = (a[sortKey] as number | string | null) ?? null;
      const vb = (b[sortKey] as number | string | null) ?? null;
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      const dir = sortDir === "asc" ? 1 : -1;
      if (typeof va === "number" && typeof vb === "number") {
        return (va - vb) * dir;
      }
      return String(va) > String(vb) ? dir : -dir;
    });
    return arr;
  }, [results, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(k);
      setSortDir(k === "symbol" ? "asc" : "desc");
    }
  };

  const set = (k: keyof Filters, v: string) =>
    setFilters((prev) => ({ ...prev, [k]: v }));

  const reset = () => {
    setFilters(initialFilters);
    setSortKey("marketCap");
    setSortDir("desc");
    try { sessionStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
    search(initialFilters, "marketCap", "desc");
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Filter className="w-6 h-6 text-blue-500" />
          スクリーナー
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          株価・PER・PBR・EPS・配当などの条件で銘柄を絞り込み
        </p>
      </header>

      {/* AI 自然言語検索 */}
      <div className="rounded-2xl border border-violet-200/80 dark:border-violet-800/40 bg-gradient-to-br from-violet-50/70 to-white dark:from-violet-950/20 dark:to-slate-900 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-2.5">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
          </span>
          <div>
            <div className="text-sm font-bold">AIで条件を入力</div>
            <div className="text-[10px] text-slate-400">日本語で条件を書くとClaudeが自動でフィルター設定</div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={nlQuery}
            onChange={(e) => setNlQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") runAiSearch(); }}
            placeholder="例: 配当利回り4%以上の割安な日本株"
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 dark:focus:ring-violet-600 placeholder:text-slate-400"
          />
          <button
            onClick={runAiSearch}
            disabled={aiStatus === "loading" || !nlQuery.trim()}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 transition-colors shadow-sm shrink-0"
          >
            {aiStatus === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            AI検索
          </button>
        </div>
        {/* Example chips */}
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {["高配当の日本株", "割安な米国ハイテク株", "PBR1倍割れの好財務株", "成長性の高い半導体株"].map((ex) => (
            <button
              key={ex}
              onClick={() => { setNlQuery(ex); }}
              className="text-[11px] px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-violet-300 dark:hover:border-violet-600 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
        {aiInterpretation && (
          <div className="mt-2.5 flex items-start gap-1.5 text-[11px] text-violet-700 dark:text-violet-300 bg-violet-100/60 dark:bg-violet-950/40 rounded-lg px-3 py-2 border border-violet-200 dark:border-violet-800">
            <Sparkles className="w-3 h-3 shrink-0 mt-0.5" />
            <span>{aiInterpretation}</span>
          </div>
        )}
        {aiStatus === "no_key" && (
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 rounded-lg px-3 py-2 border border-amber-200 dark:border-amber-800">
            <KeyRound className="w-3 h-3 shrink-0" />
            APIキーが未設定です（.env.local の ANTHROPIC_API_KEY）
          </div>
        )}
        {aiStatus === "error" && (
          <div className="mt-2.5 text-[11px] text-rose-500">変換に失敗しました。表現を変えて再度お試しください。</div>
        )}
      </div>

      {/* Filter form */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="セクター">
            <select
              value={filters.sector}
              onChange={(e) => set("sector", e.target.value)}
              className="select"
            >
              <option value="">すべて</option>
              {GICS_SECTORS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.emoji} {s.nameJa}
                </option>
              ))}
            </select>
          </Field>
          <Field label="市場">
            <select
              value={filters.market}
              onChange={(e) => set("market", e.target.value)}
              className="select"
            >
              <option value="">日米両方</option>
              <option value="JP">🇯🇵 日本株</option>
              <option value="US">🇺🇸 米国株</option>
            </select>
          </Field>
          <Field label="種別">
            <select
              value={filters.type}
              onChange={(e) => set("type", e.target.value)}
              className="select"
            >
              <option value="stock">個別株のみ</option>
              <option value="etf">ETFのみ</option>
              <option value="all">すべて (株+ETF)</option>
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <Range
            label="株価"
            min={filters.priceMin}
            max={filters.priceMax}
            onChange={(min, max) => {
              set("priceMin", min);
              set("priceMax", max);
            }}
          />
          <Range
            label="PER (倍)"
            min={filters.perMin}
            max={filters.perMax}
            onChange={(min, max) => {
              set("perMin", min);
              set("perMax", max);
            }}
          />
          <Range
            label="PBR (倍)"
            min={filters.pbrMin}
            max={filters.pbrMax}
            onChange={(min, max) => {
              set("pbrMin", min);
              set("pbrMax", max);
            }}
          />
          <Range
            label="EPS"
            min={filters.epsMin}
            max={filters.epsMax}
            onChange={(min, max) => {
              set("epsMin", min);
              set("epsMax", max);
            }}
          />
          <Range
            label="配当利回り (%)"
            min={filters.yieldMin}
            max={filters.yieldMax}
            onChange={(min, max) => {
              set("yieldMin", min);
              set("yieldMax", max);
            }}
          />
          <Range
            label="時価総額 (億)"
            min={filters.mcapMin}
            max={filters.mcapMax}
            onChange={(min, max) => {
              set("mcapMin", min);
              set("mcapMax", max);
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <button
            onClick={() => search(filters, sortKey, sortDir)}
            disabled={loading}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Filter className="w-4 h-4" />
            )}
            検索
          </button>
          <button
            onClick={reset}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            リセット
          </button>
          {!loading && (
            <span className="text-xs text-slate-500 ml-2">
              {total.toLocaleString()} 件ヒット / 全 {universeSize.toLocaleString()}{" "}
              銘柄
            </span>
          )}
        </div>
      </div>

      {/* Results table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60">
                <SortHeader
                  label="銘柄"
                  k="symbol"
                  curKey={sortKey}
                  dir={sortDir}
                  onToggle={toggleSort}
                />
                <SortHeader
                  label="価格"
                  k="price"
                  curKey={sortKey}
                  dir={sortDir}
                  onToggle={toggleSort}
                  align="right"
                />
                <SortHeader
                  label="変動率"
                  k="changePercent"
                  curKey={sortKey}
                  dir={sortDir}
                  onToggle={toggleSort}
                  align="right"
                />
                <SortHeader
                  label="PER"
                  k="per"
                  curKey={sortKey}
                  dir={sortDir}
                  onToggle={toggleSort}
                  align="right"
                />
                <SortHeader
                  label="PBR"
                  k="pbr"
                  curKey={sortKey}
                  dir={sortDir}
                  onToggle={toggleSort}
                  align="right"
                />
                <SortHeader
                  label="EPS"
                  k="eps"
                  curKey={sortKey}
                  dir={sortDir}
                  onToggle={toggleSort}
                  align="right"
                />
                <SortHeader
                  label="配当"
                  k="dividendYield"
                  curKey={sortKey}
                  dir={sortDir}
                  onToggle={toggleSort}
                  align="right"
                />
                <SortHeader
                  label="時価総額"
                  k="marketCap"
                  curKey={sortKey}
                  dir={sortDir}
                  onToggle={toggleSort}
                  align="right"
                />
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && !loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-12 text-center text-sm text-slate-400"
                  >
                    条件に該当する銘柄が見つかりませんでした
                  </td>
                </tr>
              ) : (
                sorted.slice(0, 100).map((r) => {
                  const up = (r.changePercent ?? 0) >= 0;
                  const name = getJpName(r.symbol) ?? r.nameJa ?? r.name;
                  return (
                    <tr
                      key={r.symbol}
                      className="row-hover border-b border-slate-100 dark:border-slate-800/60 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <td className="py-3 px-4">
                        <Link
                          href={`/stock/${encodeURIComponent(r.symbol)}`}
                          className="block group"
                        >
                          <div className="font-mono font-semibold text-blue-600 dark:text-blue-400 group-hover:underline flex items-center gap-1">
                            {r.symbol}
                            {r.type === "etf" && (
                              <span className="text-[9px] px-1 py-0.5 rounded bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 font-normal">
                                ETF
                              </span>
                            )}
                            <span className="text-[9px] text-slate-400 font-normal">
                              {r.market === "JP" ? "🇯🇵" : "🇺🇸"}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 truncate max-w-[220px]">
                            {name}
                          </div>
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {formatNumber(r.price)}{" "}
                        <span className="text-xs text-slate-500">
                          {r.currency}
                        </span>
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono tabular-nums font-semibold ${
                          r.changePercent === null
                            ? "text-slate-400"
                            : up
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {r.changePercent !== null
                          ? `${up ? "+" : ""}${r.changePercent.toFixed(2)}%`
                          : "—"}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {formatNumber(r.per)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {formatNumber(r.pbr)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {formatNumber(r.eps)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {formatPercent(r.dividendYield)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                        {formatLargeNumber(r.marketCap)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {sorted.length > 100 && (
          <div className="p-3 border-t border-slate-100 dark:border-slate-800/60 text-center text-xs text-slate-500">
            先頭 100 件を表示中 (全 {sorted.length} 件)
          </div>
        )}
      </div>

      <style jsx>{`
        :global(.select) {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border-radius: 0.625rem;
          border: 1px solid;
          background: white;
          font-size: 0.875rem;
        }
        :global(.dark .select) {
          background: rgb(15 23 42);
          border-color: rgb(30 41 59);
        }
        :global(.select:not(.dark *)) {
          border-color: rgb(226 232 240);
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wider text-slate-500 mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}

function Range({
  label,
  min,
  max,
  onChange,
}: {
  label: string;
  min: string;
  max: string;
  onChange: (min: string, max: string) => void;
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">
        {label}
      </div>
      <div className="flex items-center gap-1">
        <input
          type="number"
          step="any"
          inputMode="decimal"
          value={min}
          onChange={(e) => onChange(e.target.value, max)}
          placeholder="最小"
          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        />
        <span className="text-slate-400">~</span>
        <input
          type="number"
          step="any"
          inputMode="decimal"
          value={max}
          onChange={(e) => onChange(min, e.target.value)}
          placeholder="最大"
          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        />
      </div>
    </div>
  );
}

function SortHeader({
  label,
  k,
  curKey,
  dir,
  onToggle,
  align,
}: {
  label: string;
  k: SortKey;
  curKey: SortKey;
  dir: "asc" | "desc";
  onToggle: (k: SortKey) => void;
  align?: "right";
}) {
  const active = k === curKey;
  const Icon = active ? (dir === "asc" ? ChevronUp : ChevronDown) : ArrowUpDown;
  return (
    <th
      className={`py-3 px-4 font-medium ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      <button
        onClick={() => onToggle(k)}
        className={`inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors ${
          active ? "text-slate-900 dark:text-white" : ""
        } ${align === "right" ? "flex-row-reverse" : ""}`}
      >
        <Icon className="w-3 h-3 opacity-60" />
        {label}
      </button>
    </th>
  );
}
