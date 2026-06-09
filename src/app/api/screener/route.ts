/**
 * /api/screener — Stock screener with financial metric filters.
 *
 * Universe (v3): mirrors the browse page —
 *  - JP: full TSE list via getFullJpBrowseList() (~3,000 stocks)
 *  - US: curated catalog + US_STOCKS_SUPPLEMENT
 *  - ETFs: from curated catalog
 * Quote fetching uses parallel 200-symbol batches with a 10-min cache.
 */
import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "@/lib/yfinance";
import { getAllStocks } from "@/lib/stocks-catalog";
import { getFullJpBrowseList } from "@/lib/jp-stocks";
import { GICS_SECTORS, type GicsSectorId } from "@/lib/gics";
import { getCompanyNameJa } from "@/lib/translate-name";
import { US_STOCKS_SUPPLEMENT } from "@/lib/us-stocks-list";
import { US_SECTOR_MAP } from "@/lib/us-sector-supplement";
import { JP_SECTOR_MAP } from "@/lib/jp-sector-supplement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── Symbol-level quote cache: 10-min TTL ────────────────────────────────
// Each fetched symbol is cached individually so repeated requests reuse results
// without re-fetching the entire universe.
const symbolCache = new Map<string, { at: number; quote: RawQuote }>();
const CACHE_TTL_MS = 10 * 60_000;

type RawQuote = {
  symbol: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  trailingPE?: number;
  forwardPE?: number;
  priceToBook?: number;
  epsTrailingTwelveMonths?: number;
  dividendYield?: number;
  marketCap?: number;
  currency?: string;
};

type UniverseEntry = {
  symbol: string;
  name: string;
  market: "JP" | "US";
  sector: GicsSectorId | null;
  type: string;
};

// ── Cached universe (TTL 30 min to pick up catalog changes) ──────────────
let _universe: UniverseEntry[] | null = null;
let _universeAt = 0;
const UNIVERSE_TTL_MS = 30 * 60_000;

/**
 * Build screener universe — mirrors the browse page:
 *  - JP: full TSE list (curated catalog JP stocks + TSE supplement ~3,000 total)
 *        Sector resolved via JP_SECTOR_MAP for supplement stocks.
 *  - US + ETF: curated catalog US stocks, all ETFs, plus US_STOCKS_SUPPLEMENT.
 * Cache TTL: 30 min.
 */
function getScreenerUniverse(): UniverseEntry[] {
  if (_universe && Date.now() - _universeAt < UNIVERSE_TTL_MS) return _universe;

  // ── JP stocks: full browse list (curated + TSE supplement) ────────────
  const jpStocks: UniverseEntry[] = getFullJpBrowseList().map((s) => ({
    symbol: s.symbol,
    name:   s.name,
    market: "JP" as const,
    sector: ((s.sector ?? JP_SECTOR_MAP[s.symbol]) as GicsSectorId) ?? null,
    type:   "stock" as const,
  }));
  const seen = new Set(jpStocks.map((s) => s.symbol));

  // ── US stocks + ETFs from curated catalog ─────────────────────────────
  const usAndEtf: UniverseEntry[] = getAllStocks(true)
    .filter((s) => s.market === "US" || s.type === "etf")
    .map((s) => ({
      symbol: s.symbol,
      name:   s.name,
      market: s.market as "JP" | "US",
      sector: s.sector as GicsSectorId,
      type:   s.type ?? "stock",
    }))
    .filter((s) => !seen.has(s.symbol));
  for (const s of usAndEtf) seen.add(s.symbol);

  // ── US supplement stocks not already in curated catalog ───────────────
  const usSuppl: UniverseEntry[] = [];
  for (const [sym, name] of US_STOCKS_SUPPLEMENT) {
    if (seen.has(sym)) continue;
    if (name.includes("廃止") || name.includes("delisted")) continue;
    seen.add(sym);
    usSuppl.push({
      symbol: sym,
      name,
      market: "US",
      sector: (US_SECTOR_MAP[sym] as GicsSectorId) ?? null,
      type:   "stock",
    });
  }

  _universe   = [...jpStocks, ...usAndEtf, ...usSuppl];
  _universeAt = Date.now();
  return _universe;
}

// ── Fetch quotes for a list of symbols ───────────────────────────────────
async function fetchQuoteChunk(symbols: string[]): Promise<RawQuote[]> {
  try {
    // validateResult:false prevents schema-validation errors from throwing
    const raw = await (yahooFinance.quote as Function)(
      symbols,
      {},
      { validateResult: false },
    ).catch(() => [] as unknown[]);
    const list: unknown[] = Array.isArray(raw) ? raw : [raw];
    return list.filter(
      (q): q is RawQuote =>
        q !== null && typeof q === "object" && !!(q as RawQuote).symbol,
    );
  } catch {
    return [];
  }
}

/**
 * Fetch quotes for only the requested symbols.
 * - Symbols already in symbolCache (< 10 min old) are returned from cache.
 * - The remainder are batch-fetched in parallel (200 per chunk) and cached.
 * This avoids loading the full ~3,800-symbol universe on every request.
 */
async function loadQuotesForSymbols(symbols: string[]): Promise<Map<string, RawQuote>> {
  const now     = Date.now();
  const result  = new Map<string, RawQuote>();
  const toFetch: string[] = [];

  for (const sym of symbols) {
    const cached = symbolCache.get(sym);
    if (cached && now - cached.at < CACHE_TTL_MS) {
      result.set(sym, cached.quote);
    } else {
      toFetch.push(sym);
    }
  }

  if (toFetch.length > 0) {
    const BATCH = 200;
    const chunks: string[][] = [];
    for (let i = 0; i < toFetch.length; i += BATCH) {
      chunks.push(toFetch.slice(i, i + BATCH));
    }

    const chunkResults = await Promise.all(chunks.map(fetchQuoteChunk));
    for (const quotes of chunkResults) {
      for (const q of quotes) {
        if (q.symbol) {
          symbolCache.set(q.symbol, { at: now, quote: q });
          result.set(q.symbol, q);
        }
      }
    }
  }

  return result;
}

function parseNum(v: string | null): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const sector  = sp.get("sector");
  const market  = sp.get("market");  // "JP" | "US" | null
  const type    = sp.get("type");    // "stock" | "etf" | "all" | null
  const priceMin = parseNum(sp.get("priceMin"));
  const priceMax = parseNum(sp.get("priceMax"));
  const perMin   = parseNum(sp.get("perMin"));
  const perMax   = parseNum(sp.get("perMax"));
  const pbrMin   = parseNum(sp.get("pbrMin"));
  const pbrMax   = parseNum(sp.get("pbrMax"));
  const epsMin   = parseNum(sp.get("epsMin"));
  const epsMax   = parseNum(sp.get("epsMax"));
  const yieldMin = parseNum(sp.get("yieldMin")); // fraction (0.03 = 3%)
  const yieldMax = parseNum(sp.get("yieldMax"));
  const mcapMin  = parseNum(sp.get("mcapMin"));  // 億 units
  const mcapMax  = parseNum(sp.get("mcapMax"));

  const includeEtf = type === "etf" || type === "all";
  const onlyEtf    = type === "etf";

  // ── Step 1: pre-filter universe (no network) ───────────────────────────
  const universe = getScreenerUniverse().filter((s) => {
    if (sector && s.sector !== sector) return false;
    if (market === "JP" && s.market !== "JP") return false;
    if (market === "US" && s.market !== "US") return false;
    if (onlyEtf   && s.type !== "etf") return false;
    if (!includeEtf && s.type === "etf") return false;
    return true;
  });

  // ── Step 2: fetch quotes for the pre-filtered set only ───────────────
  const quotes = await loadQuotesForSymbols(universe.map((s) => s.symbol));

  const between = (
    v: number | undefined,
    min: number | null,
    max: number | null,
  ): boolean => {
    if (min !== null && (v === undefined || v < min)) return false;
    if (max !== null && (v === undefined || v > max)) return false;
    return true;
  };

  // ── Step 3: apply metric filters ─────────────────────────────────────
  const filtered = universe
    .map((stock) => ({ stock, q: quotes.get(stock.symbol) }))
    .filter(({ q }) => {
      if (!q) return false;
      if (!between(q.regularMarketPrice,       priceMin, priceMax)) return false;
      if (!between(q.trailingPE,               perMin,   perMax))   return false;
      if (!between(q.priceToBook,              pbrMin,   pbrMax))   return false;
      if (!between(q.epsTrailingTwelveMonths,  epsMin,   epsMax))   return false;
      if (!between(q.dividendYield,            yieldMin, yieldMax)) return false;
      const mcapHundredM = q.marketCap ? q.marketCap / 1e8 : undefined;
      if (!between(mcapHundredM,               mcapMin,  mcapMax))  return false;
      return true;
    });

  // ── Step 4: resolve Japanese names (parallel) ─────────────────────────
  const namesJa = await Promise.all(
    filtered.map(({ stock, q }) =>
      getCompanyNameJa(
        stock.symbol,
        q?.longName ?? q?.shortName ?? stock.name,
      ),
    ),
  );

  const results = filtered.map(({ stock, q }, i) => ({
    symbol:        stock.symbol,
    name:          stock.name,
    nameJa:        namesJa[i] ?? stock.name,
    market:        stock.market,
    sector:        stock.sector ?? null,
    type:          stock.type ?? "stock",
    price:         q?.regularMarketPrice             ?? null,
    changePercent: q?.regularMarketChangePercent      ?? null,
    per:           q?.trailingPE                     ?? null,
    forwardPe:     q?.forwardPE                      ?? null,
    pbr:           q?.priceToBook                    ?? null,
    eps:           q?.epsTrailingTwelveMonths         ?? null,
    dividendYield: q?.dividendYield                  ?? null,
    marketCap:     q?.marketCap                      ?? null,
    currency:      q?.currency                       ?? null,
  }));

  return NextResponse.json({
    total:        results.length,
    universeSize: universe.length,
    sectors:      GICS_SECTORS.map((s) => ({ id: s.id, nameJa: s.nameJa })),
    results,
  });
}
