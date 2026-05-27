const KEY = "stock-search:portfolio:v1";

export type Holding = {
  symbol: string;
  /** Cached display name (Japanese where available). */
  name?: string;
  /** Number of shares held. */
  quantity: number;
  /** Average purchase price per share, in the stock's quoted currency. */
  avgCost: number;
  /** Stock's quoted currency, cached at insertion time (e.g. "JPY", "USD"). */
  currency?: string;
  /** Optional ISO date when first bought. */
  purchaseDate?: string;
  /** Timestamp when added to the portfolio. */
  addedAt: number;
};

export function getPortfolio(): Holding[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (h): h is Holding =>
        typeof h?.symbol === "string" &&
        typeof h?.quantity === "number" &&
        typeof h?.avgCost === "number",
    );
  } catch {
    return [];
  }
}

function save(items: Holding[]) {
  window.localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("portfolio:change"));
}

export function getHolding(symbol: string): Holding | null {
  return getPortfolio().find((h) => h.symbol === symbol) ?? null;
}

export function upsertHolding(input: Omit<Holding, "addedAt"> & { addedAt?: number }) {
  const list = getPortfolio();
  const existing = list.find((h) => h.symbol === input.symbol);
  if (existing) {
    Object.assign(existing, input, { addedAt: existing.addedAt });
  } else {
    list.unshift({ ...input, addedAt: input.addedAt ?? Date.now() });
  }
  save(list);
}

export function removeHolding(symbol: string) {
  save(getPortfolio().filter((h) => h.symbol !== symbol));
}

export type HoldingValuation = {
  holding: Holding;
  currentPrice: number | null;
  dayChange: number | null;
  dayChangePercent: number | null;
  /** Position value in the stock's own currency. */
  marketValue: number | null;
  /** Cost basis in the stock's own currency. */
  costBasis: number;
  /** Gain in the stock's currency. */
  gain: number | null;
  gainPercent: number | null;
  /** Market value converted to JPY using cached FX. */
  marketValueJpy: number | null;
  /** Cost basis converted to JPY using cached FX. */
  costBasisJpy: number;
  gainJpy: number | null;
  /** Today's P/L in JPY. */
  dayChangeJpy: number | null;
  /** Annual per-share dividend (from Yahoo). */
  dividendPerShare: number | null;
  /** Annual dividend yield (decimal, e.g. 0.025 = 2.5%). */
  dividendYield: number | null;
  /** Annual total dividend for this position, in JPY. */
  annualDividendJpy: number | null;
  /** Next payment/ex-dividend date ISO. */
  dividendDate: string | null;
  exDividendDate: string | null;
};

const FX_DEFAULT = 150; // fallback USD/JPY when API fails

export function toJpy(
  value: number,
  currency: string | null | undefined,
  usdJpy: number,
): number {
  if (!currency || currency === "JPY") return value;
  if (currency === "USD") return value * usdJpy;
  // Best-effort: unknown currencies assumed USD-equivalent.
  return value * usdJpy;
}

export function valueHolding(
  holding: Holding,
  quote: {
    price: number | null;
    change: number | null;
    changePercent: number | null;
    currency?: string;
    dividendRate?: number;
    dividendYield?: number;
    dividendDate?: string | null;
    exDividendDate?: string | null;
  } | null,
  usdJpy: number = FX_DEFAULT,
): HoldingValuation {
  const currency = quote?.currency ?? holding.currency ?? null;
  const price = quote?.price ?? null;
  const dayChange = quote?.change ?? null;
  const dayChangePercent = quote?.changePercent ?? null;
  const marketValue = price !== null ? price * holding.quantity : null;
  const costBasis = holding.avgCost * holding.quantity;
  const gain = marketValue !== null ? marketValue - costBasis : null;
  const gainPercent =
    gain !== null && costBasis > 0 ? (gain / costBasis) * 100 : null;
  const dividendPerShare = quote?.dividendRate ?? null;
  const annualDividend =
    dividendPerShare !== null ? dividendPerShare * holding.quantity : null;
  return {
    holding,
    currentPrice: price,
    dayChange,
    dayChangePercent,
    marketValue,
    costBasis,
    gain,
    gainPercent,
    marketValueJpy:
      marketValue !== null ? toJpy(marketValue, currency, usdJpy) : null,
    costBasisJpy: toJpy(costBasis, currency, usdJpy),
    gainJpy: gain !== null ? toJpy(gain, currency, usdJpy) : null,
    dayChangeJpy:
      dayChange !== null
        ? toJpy(dayChange * holding.quantity, currency, usdJpy)
        : null,
    dividendPerShare,
    dividendYield: quote?.dividendYield ?? null,
    annualDividendJpy:
      annualDividend !== null ? toJpy(annualDividend, currency, usdJpy) : null,
    dividendDate: quote?.dividendDate ?? null,
    exDividendDate: quote?.exDividendDate ?? null,
  };
}

export type PortfolioSummary = {
  count: number;
  totalValueJpy: number;
  totalCostJpy: number;
  totalGainJpy: number;
  totalGainPercent: number;
  dayChangeJpy: number;
  dayChangePercent: number;
  /** Sum of annual dividends across the portfolio, in JPY. */
  annualDividendJpy: number;
  /** Annual dividend yield as a fraction of portfolio value. */
  portfolioYield: number;
  /** Holdings that actually pay dividends. */
  dividendCount: number;
};

export function summarize(
  valuations: HoldingValuation[],
): PortfolioSummary {
  let totalValueJpy = 0;
  let totalCostJpy = 0;
  let dayChangeJpy = 0;
  let annualDividendJpy = 0;
  let dividendCount = 0;
  for (const v of valuations) {
    if (v.marketValueJpy !== null) totalValueJpy += v.marketValueJpy;
    totalCostJpy += v.costBasisJpy;
    if (v.dayChangeJpy !== null) dayChangeJpy += v.dayChangeJpy;
    if (v.annualDividendJpy !== null && v.annualDividendJpy > 0) {
      annualDividendJpy += v.annualDividendJpy;
      dividendCount += 1;
    }
  }
  const totalGainJpy = totalValueJpy - totalCostJpy;
  const totalGainPercent =
    totalCostJpy > 0 ? (totalGainJpy / totalCostJpy) * 100 : 0;
  const prevValueJpy = totalValueJpy - dayChangeJpy;
  const dayChangePercent =
    prevValueJpy > 0 ? (dayChangeJpy / prevValueJpy) * 100 : 0;
  const portfolioYield =
    totalValueJpy > 0 ? (annualDividendJpy / totalValueJpy) * 100 : 0;
  return {
    count: valuations.length,
    totalValueJpy,
    totalCostJpy,
    totalGainJpy,
    totalGainPercent,
    dayChangeJpy,
    dayChangePercent,
    annualDividendJpy,
    portfolioYield,
    dividendCount,
  };
}
