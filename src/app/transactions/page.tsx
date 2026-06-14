"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, BookText, Plus, Trash2, Search, Wallet } from "lucide-react";
import {
  getTransactions, addTransaction, removeTransaction, computeRealized, computeNisaUsage,
  ACCOUNT_LABEL, NISA, type Transaction, type TxAccount, type TxSide,
} from "@/lib/transactions";
import { getJpName } from "@/lib/jp-stocks";
import { getUsKatakana } from "@/lib/us-katakana";

const USD_JPY_FALLBACK = 155;
const yen = (v: number) => `¥${Math.round(v).toLocaleString("ja-JP")}`;
const dispName = (s: string, fallback?: string) => getJpName(s) ?? getUsKatakana(s) ?? fallback ?? s;

export default function TransactionsPage() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [usdJpy, setUsdJpy] = useState(USD_JPY_FALLBACK);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const reload = () => setTxns(getTransactions());
    reload();
    window.addEventListener("transactions:change", reload);
    fetch("/api/quote?symbol=JPY%3DX").then((r) => r.json())
      .then((j) => { const v = j.quote?.regularMarketPrice; if (typeof v === "number" && v > 0) setUsdJpy(v); })
      .catch(() => {});
    return () => window.removeEventListener("transactions:change", reload);
  }, []);

  const fxToJpy = (cur: string) => (cur === "JPY" ? 1 : usdJpy);
  const realized = useMemo(() => computeRealized(txns), [txns]);
  const nisa = useMemo(() => computeNisaUsage(txns, fxToJpy), [txns, usdJpy]); // eslint-disable-line react-hooks/exhaustive-deps
  const realizedJpy = Object.entries(realized.totalByCurrency).reduce((a, [c, v]) => a + v * fxToJpy(c), 0);

  const sorted = [...txns].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <Link href="/portfolio" className="inline-flex items-center text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white mb-1.5">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />ポートフォリオ
          </Link>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookText className="w-6 h-6 text-indigo-500" />取引記録 ・ NISA枠
          </h1>
          <p className="text-[11px] text-slate-500 mt-1">売買履歴から実現損益とNISA枠の使用状況を管理</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm shrink-0">
          <Plus className="w-4 h-4" />取引を追加
        </button>
      </header>

      {showForm && <TxForm onDone={() => setShowForm(false)} />}

      {/* NISA quota */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
        <h2 className="text-sm font-bold flex items-center gap-1.5 mb-3">
          <Wallet className="w-4 h-4 text-emerald-500" />新NISA枠 ({nisa.year}年)
        </h2>
        <div className="space-y-3">
          <Quota label="成長投資枠（年間）" used={nisa.growthAnnualUsed} total={NISA.growthAnnual} color="#10b981" />
          <Quota label="つみたて投資枠（年間）" used={nisa.tsumitateAnnualUsed} total={NISA.tsumitateAnnual} color="#3b82f6" />
          <Quota label="生涯投資枠（簿価ベース）" used={nisa.lifetimeUsed} total={NISA.lifetimeTotal} color="#8b5cf6"
            sub={`うち成長枠 ${yen(nisa.growthLifetimeUsed)} / 上限 ${yen(NISA.growthLifetime)}`} />
        </div>
        <p className="text-[9px] text-slate-400 mt-2.5">※ 外貨建ては現在レート(USD/JPY {usdJpy.toFixed(1)})で円換算した概算。生涯枠は売却分をFIFOで控除。</p>
      </section>

      {/* Realized P/L */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold">実現損益（確定）</h2>
          <span className={`font-mono font-bold text-lg tabular-nums ${realizedJpy >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
            {realizedJpy >= 0 ? "+" : ""}{yen(realizedJpy)}
          </span>
        </div>
        {realized.rows.length === 0 ? (
          <p className="text-sm text-slate-400 py-3 text-center">売却取引を記録すると実現損益が表示されます</p>
        ) : (
          <div className="space-y-1.5">
            {realized.rows.map((r) => (
              <div key={r.symbol} className="flex items-center justify-between text-sm">
                <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">{r.symbol}
                  <span className="text-slate-400 font-normal ml-1.5 text-xs">{dispName(r.symbol)}</span>
                </span>
                <span className={`font-mono font-bold tabular-nums ${r.realized >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
                  {r.realized >= 0 ? "+" : ""}{r.realized.toLocaleString(undefined, { maximumFractionDigits: 0 })} {r.currency}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* History */}
      <section>
        <h2 className="text-sm font-bold mb-2.5">取引履歴 <span className="text-xs font-normal text-slate-400">({txns.length}件)</span></h2>
        {sorted.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center shadow-sm">
            <BookText className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">取引がまだありません</p>
            <p className="text-xs text-slate-400 mt-1.5">「取引を追加」から売買を記録しましょう</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm divide-y divide-slate-100 dark:divide-slate-800/60">
            {sorted.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${t.side === "buy" ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" : "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300"}`}>
                  {t.side === "buy" ? "買" : "売"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-mono font-semibold text-blue-600 dark:text-blue-400 truncate">{t.symbol}
                    <span className="text-slate-400 font-normal ml-1.5 text-xs">{dispName(t.symbol, t.name)}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">{t.date} · {ACCOUNT_LABEL[t.account]}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-mono tabular-nums">{t.quantity}株 × {t.price.toLocaleString()} {t.currency}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{(t.price * t.quantity).toLocaleString()} {t.currency}</div>
                </div>
                <button onClick={() => removeTransaction(t.id)} className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Quota({ label, used, total, color, sub }: { label: string; used: number; total: number; color: string; sub?: string }) {
  const pct = Math.min(100, (used / total) * 100);
  const over = used > total;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="font-medium text-slate-600 dark:text-slate-300">{label}</span>
        <span className="font-mono tabular-nums">
          <span className={over ? "text-rose-500 font-bold" : "font-semibold"}>{yen(used)}</span>
          <span className="text-slate-400"> / {yen(total)}</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: over ? "#ef4444" : color }} />
      </div>
      {sub && <div className="text-[10px] text-slate-400 mt-1">{sub} · 残り {yen(Math.max(0, total - used))}</div>}
    </div>
  );
}

type SearchResult = { symbol: string; name: string };

function TxForm({ onDone }: { onDone: () => void }) {
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [side, setSide] = useState<TxSide>("buy");
  const [account, setAccount] = useState<TxAccount>("growth");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("JPY");
  const [fee, setFee] = useState("");
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debRef.current) clearTimeout(debRef.current);
    if (!query.trim()) { setResults([]); return; }
    debRef.current = setTimeout(async () => {
      try {
        const j = await (await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`)).json();
        setResults((j.results ?? []).slice(0, 5).map((r: { symbol: string; jpName?: string; longname?: string; shortname?: string }) => ({
          symbol: r.symbol, name: r.jpName ?? r.longname ?? r.shortname ?? r.symbol,
        })));
      } catch { setResults([]); }
    }, 250);
  }, [query]);

  const pick = (r: SearchResult) => {
    setSymbol(r.symbol); setName(r.name); setQuery(`${r.symbol} ${r.name}`); setResults([]);
    setCurrency(r.symbol.toUpperCase().endsWith(".T") ? "JPY" : "USD");
  };

  const submit = () => {
    const qn = Number(quantity), pn = Number(price);
    if (!symbol || !(qn > 0) || !(pn > 0)) return;
    addTransaction({
      symbol: symbol.toUpperCase(), name: name || undefined, side, account, date,
      quantity: qn, price: pn, currency, fee: fee ? Number(fee) : undefined,
    });
    onDone();
  };

  return (
    <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/40 dark:bg-indigo-950/20 p-4 shadow-sm space-y-3">
      {/* symbol search */}
      <div className="relative">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input value={query} onChange={(e) => { setQuery(e.target.value); setSymbol(""); }} placeholder="銘柄を検索（社名・コード・ティッカー）"
            className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-slate-400" />
        </div>
        {results.length > 0 && (
          <div className="absolute z-20 left-0 right-0 mt-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg overflow-hidden">
            {results.map((r) => (
              <button key={r.symbol} onClick={() => pick(r)} className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800">
                <span className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400 w-20 shrink-0">{r.symbol}</span>
                <span className="text-xs text-slate-600 dark:text-slate-300 truncate">{r.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex p-0.5 bg-white dark:bg-slate-800 rounded-lg gap-0.5 border border-slate-200 dark:border-slate-700">
          {(["buy", "sell"] as TxSide[]).map((s) => (
            <button key={s} onClick={() => setSide(s)} className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${side === s ? (s === "buy" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white") : "text-slate-500"}`}>
              {s === "buy" ? "買い" : "売り"}
            </button>
          ))}
        </div>
        <select value={account} onChange={(e) => setAccount(e.target.value as TxAccount)} className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
          <option value="growth">NISA成長枠</option>
          <option value="tsumitate">NISAつみたて枠</option>
          <option value="taxable">特定/一般口座</option>
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Input label="数量(株)" value={quantity} onChange={setQuantity} type="number" />
        <Input label="単価" value={price} onChange={setPrice} type="number" />
        <div>
          <label className="text-[10px] text-slate-400 block mb-1">通貨</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
            <option>JPY</option><option>USD</option>
          </select>
        </div>
        <Input label="日付" value={date} onChange={setDate} type="date" />
      </div>
      <Input label="手数料(任意)" value={fee} onChange={setFee} type="number" />

      <div className="flex gap-2 pt-1">
        <button onClick={submit} disabled={!symbol || !quantity || !price}
          className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 transition-colors">記録する</button>
        <button onClick={onDone} className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">キャンセル</button>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type }: { label: string; value: string; onChange: (v: string) => void; type: string }) {
  return (
    <label className="block">
      <span className="text-[10px] text-slate-400 block mb-1">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400" />
    </label>
  );
}
