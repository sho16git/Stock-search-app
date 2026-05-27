"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Result = {
  symbol: string;
  shortname?: string;
  longname?: string;
  jpName?: string;
  exchange?: string;
  typeDisp?: string;
  quoteType?: string;
};

type SearchResponse = {
  results: Result[];
  hint?: string;
};

export default function SearchBox({ autoFocus = false }: { autoFocus?: boolean }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [hint, setHint] = useState<string | undefined>();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 1) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        });
        const json: SearchResponse = await res.json();
        setResults(json.results ?? []);
        setHint(json.hint);
        setOpen(true);
        setActive(0);
      } catch {
        // ignored
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const go = (symbol: string) => {
    router.push(`/stock/${encodeURIComponent(symbol)}`);
    setOpen(false);
  };

  return (
    <div ref={boxRef} className="relative w-full">
      <input
        type="text"
        value={q}
        autoFocus={autoFocus}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            const r = results[active];
            if (r) go(r.symbol);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder="銘柄名・コード・ティッカー (例: トヨタ, 7203, AAPL)"
        className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-transparent shadow-sm hover:shadow-md transition-shadow"
      />
      <svg
        className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
          検索中…
        </div>
      )}
      {open && results.length > 0 && (
        <ul className="absolute z-20 left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-h-96 overflow-auto py-1">
          {results.map((r, i) => (
            <li
              key={r.symbol + i}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(r.symbol)}
              className={`mx-1 px-3 py-2.5 rounded-xl cursor-pointer flex items-center gap-3 transition-colors ${
                i === active ? "bg-slate-100 dark:bg-slate-800" : ""
              }`}
            >
              <span className="font-mono font-semibold text-blue-600 dark:text-blue-400 min-w-[80px] text-sm">
                {r.symbol}
              </span>
              <span className="flex-1 truncate text-sm">
                {r.jpName ?? r.longname ?? r.shortname ?? "—"}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-slate-400">
                {r.typeDisp ?? r.quoteType} · {r.exchange}
              </span>
            </li>
          ))}
        </ul>
      )}
      {open && !loading && q.trim().length > 0 && results.length === 0 && (
        <div className="absolute z-20 left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-sm text-slate-500 shadow-xl">
          {hint ?? "該当する銘柄が見つかりませんでした"}
        </div>
      )}
    </div>
  );
}
