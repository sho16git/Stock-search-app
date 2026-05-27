"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { getJpName } from "@/lib/jp-stocks";
import { translateExchange, translateMarketState } from "@/lib/i18n";
import WatchlistButton from "@/components/WatchlistButton";
import HoldingButton from "@/components/HoldingButton";
import SectorBadge from "@/components/SectorBadge";

type Quote = {
  symbol: string;
  shortName?: string;
  longName?: string;
  displayName?: string;
  nameJa?: string | null;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketPreviousClose?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  currency?: string;
  fullExchangeName?: string;
  marketState?: string;
  regularMarketTime?: string | number | Date;
};

export default function QuoteHeader({ symbol }: { symbol: string }) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    fetch(`/api/quote?symbol=${encodeURIComponent(symbol)}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.error) setError(j.error);
        else setQuote(j.quote);
      })
      .catch(() => setError("株価の取得に失敗しました"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    setQuote(null);
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  const jpName = getJpName(symbol);
  const name =
    jpName ??
    quote?.nameJa ??
    quote?.longName ??
    quote?.shortName ??
    quote?.displayName ??
    symbol;
  const price = quote?.regularMarketPrice;
  const change = quote?.regularMarketChange;
  const changePct = quote?.regularMarketChangePercent;
  const up = (change ?? 0) >= 0;
  const Arrow = up ? TrendingUp : TrendingDown;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <div
        className={`absolute inset-0 -z-0 opacity-60 ${
          quote
            ? up
              ? "bg-gradient-to-br from-emerald-50 via-white to-white dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-900"
              : "bg-gradient-to-br from-rose-50 via-white to-white dark:from-rose-950/30 dark:via-slate-900 dark:to-slate-900"
            : ""
        }`}
      />
      <div className="relative p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                {symbol}
              </span>
              {quote?.fullExchangeName && (
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-400">
                  {translateExchange(quote.fullExchangeName)}
                </span>
              )}
              {quote?.marketState && (
                <span className="text-xs text-slate-500">
                  {translateMarketState(quote.marketState)}
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1.5">
              {name}
            </h1>
            <SectorBadge symbol={symbol} />
          </div>
          <div className="flex flex-wrap gap-2">
            <HoldingButton
              symbol={symbol}
              name={name}
              currency={quote?.currency}
            />
            <WatchlistButton symbol={symbol} name={name} />
          </div>
        </div>

        <div className="mt-5">
          {loading && (
            <div className="h-12 flex items-end">
              <div className="text-sm text-slate-400">株価読み込み中…</div>
            </div>
          )}
          {error && <div className="text-sm text-rose-500">{error}</div>}
          {!loading && !error && quote && (
            <div className="flex flex-wrap items-end gap-4">
              <div className="font-mono font-bold tracking-tight tabular-nums">
                <span className="text-4xl md:text-5xl">
                  {formatNumber(price)}
                </span>
                <span className="ml-2 text-base text-slate-500 font-medium">
                  {quote.currency}
                </span>
              </div>
              <div
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono font-semibold tabular-nums ${
                  up
                    ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300"
                    : "bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300"
                }`}
              >
                <Arrow className="w-4 h-4" />
                {formatNumber(Math.abs(change ?? 0))} (
                {formatNumber(Math.abs(changePct ?? 0))}%)
              </div>
            </div>
          )}
        </div>

        {!loading && !error && quote && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mt-5 text-sm">
            <Stat label="前日終値" value={formatNumber(quote.regularMarketPreviousClose)} />
            <Stat label="高値" value={formatNumber(quote.regularMarketDayHigh)} />
            <Stat label="安値" value={formatNumber(quote.regularMarketDayLow)} />
            <Stat
              label="出来高"
              value={(quote.regularMarketVolume ?? 0).toLocaleString("ja-JP")}
            />
            <Stat label="52週高値" value={formatNumber(quote.fiftyTwoWeekHigh)} />
            <Stat label="52週安値" value={formatNumber(quote.fiftyTwoWeekLow)} />
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-2 rounded-xl bg-white/60 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/60 backdrop-blur-sm">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="font-mono font-semibold tabular-nums mt-0.5 text-slate-900 dark:text-slate-100">
        {value}
      </div>
    </div>
  );
}
