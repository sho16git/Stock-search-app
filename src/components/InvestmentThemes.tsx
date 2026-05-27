"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { getJpName } from "@/lib/jp-stocks";

type ThemeStock = {
  symbol: string;
  shortName: string | null;
  longName: string | null;
  nameJa?: string | null;
  price: number | null;
  changePercent: number | null;
  currency: string | null;
};

type Theme = {
  id: string;
  label: string;
  emoji: string;
  description: string;
  quotes: ThemeStock[];
};

export default function InvestmentThemes() {
  const [themes, setThemes] = useState<Theme[] | null>(null);

  useEffect(() => {
    fetch("/api/themes")
      .then((r) => r.json())
      .then((j) => setThemes(j.themes ?? null))
      .catch(() => {});
  }, []);

  if (!themes || themes.length === 0) {
    return (
      <section>
        <h2 className="text-base font-bold tracking-tight mb-3 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-violet-500" />
          投資テーマ
        </h2>
        <div className="grid grid-cols-1 gap-2">
          {Array(2)
            .fill(null)
            .map((_, i) => (
              <div
                key={i}
                className="h-32 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse"
              />
            ))}
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-base font-bold tracking-tight mb-3 flex items-center gap-1.5">
        <Sparkles className="w-4 h-4 text-violet-500" />
        投資テーマ
      </h2>
      <div className="grid grid-cols-1 gap-2">
        {themes.map((theme) => (
          <div
            key={theme.id}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">{theme.emoji}</span>
              <span className="font-semibold text-sm">{theme.label}</span>
              <span className="text-[10px] text-slate-400">
                · {theme.description}
              </span>
            </div>
            <ul className="space-y-0.5">
              {theme.quotes.slice(0, 3).map((s) => {
                const up = (s.changePercent ?? 0) >= 0;
                const name =
                  getJpName(s.symbol) ?? s.nameJa ?? s.longName ?? s.shortName;
                return (
                  <li key={s.symbol}>
                    <Link
                      href={`/stock/${encodeURIComponent(s.symbol)}`}
                      className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group"
                    >
                      <div className="min-w-0 flex-1 flex items-center gap-2">
                        <span className="font-mono font-semibold text-sm text-blue-600 dark:text-blue-400 shrink-0">
                          {s.symbol}
                        </span>
                        <span className="text-xs text-slate-500 truncate">
                          {name}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono text-xs tabular-nums">
                          {formatNumber(s.price)}{" "}
                          <span className="text-[10px] text-slate-400">
                            {s.currency}
                          </span>
                        </div>
                        <div
                          className={`text-[10px] font-mono font-semibold ${
                            up
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {s.changePercent !== null
                            ? `${up ? "+" : ""}${s.changePercent.toFixed(2)}%`
                            : "—"}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
