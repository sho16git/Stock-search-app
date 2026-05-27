"use client";

import { useEffect, useState } from "react";
import {
  getPortfolio,
  summarize,
  valueHolding,
  type Holding,
  type HoldingValuation,
  type PortfolioSummary,
} from "./portfolio";

type QuoteShape = {
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  currency?: string;
  dividendRate?: number;
  dividendYield?: number;
  dividendDate?: string | Date;
  exDividendDate?: string | Date;
};

function toIso(v: string | Date | undefined): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string") return v;
  return null;
}

const USD_JPY_FALLBACK = 150;

/**
 * Subscribes to portfolio mutations + fetches quotes + USD/JPY,
 * returning valuations and an aggregate summary in JPY.
 */
export function usePortfolio(): {
  holdings: Holding[];
  valuations: HoldingValuation[];
  summary: PortfolioSummary | null;
  usdJpy: number;
  loading: boolean;
  refresh: () => void;
} {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [valuations, setValuations] = useState<HoldingValuation[]>([]);
  const [usdJpy, setUsdJpy] = useState(USD_JPY_FALLBACK);
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState(0);

  const refresh = () => setVersion((v) => v + 1);

  // Listen for changes from anywhere in the app
  useEffect(() => {
    const reload = () => setHoldings(getPortfolio());
    reload();
    window.addEventListener("portfolio:change", reload);
    return () => window.removeEventListener("portfolio:change", reload);
  }, []);

  // Re-fetch quotes whenever holdings change or refresh() is called
  useEffect(() => {
    if (holdings.length === 0) {
      setValuations([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      // USD/JPY
      fetch("/api/quote?symbol=JPY%3DX")
        .then((r) => r.json())
        .then((j) => {
          const v = (j.quote as { regularMarketPrice?: number } | undefined)
            ?.regularMarketPrice;
          return typeof v === "number" && v > 0 ? v : USD_JPY_FALLBACK;
        })
        .catch(() => USD_JPY_FALLBACK),
      // Per-holding quotes
      Promise.all(
        holdings.map((h) =>
          fetch(`/api/quote?symbol=${encodeURIComponent(h.symbol)}`)
            .then((r) => r.json())
            .then((j) => [h.symbol, j.quote as QuoteShape | undefined] as const)
            .catch(() => [h.symbol, undefined] as const),
        ),
      ),
    ])
      .then(([fx, quotes]) => {
        if (cancelled) return;
        setUsdJpy(fx);
        const map = new Map<string, QuoteShape | undefined>(quotes);
        setValuations(
          holdings.map((h) => {
            const q = map.get(h.symbol);
            return valueHolding(
              h,
              q
                ? {
                    price: q.regularMarketPrice ?? null,
                    change: q.regularMarketChange ?? null,
                    changePercent: q.regularMarketChangePercent ?? null,
                    currency: q.currency,
                    dividendRate:
                      typeof q.dividendRate === "number"
                        ? q.dividendRate
                        : undefined,
                    dividendYield:
                      typeof q.dividendYield === "number"
                        ? q.dividendYield > 1
                          ? q.dividendYield / 100
                          : q.dividendYield
                        : undefined,
                    dividendDate: toIso(q.dividendDate),
                    exDividendDate: toIso(q.exDividendDate),
                  }
                : null,
              fx,
            );
          }),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [holdings, version]);

  const summary = valuations.length > 0 ? summarize(valuations) : null;

  return { holdings, valuations, summary, usdJpy, loading, refresh };
}
