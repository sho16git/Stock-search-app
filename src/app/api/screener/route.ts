import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "@/lib/yfinance";
import { getAllStocks } from "@/lib/stocks-catalog";
import { GICS_SECTORS } from "@/lib/gics";
import { getCompanyNameJa } from "@/lib/translate-name";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Cache batch quotes for the catalog briefly so successive screener calls
// don't re-hit Yahoo for the same ~250 quotes.
let cachedQuotes: { at: number; map: Map<string, RawQuote> } | null = null;
const CACHE_TTL_MS = 60_000;

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

async function loadQuotes(): Promise<Map<string, RawQuote>> {
  const now = Date.now();
  if (cachedQuotes && now - cachedQuotes.at < CACHE_TTL_MS) {
    return cachedQuotes.map;
  }
  const symbols = getAllStocks(true).map((s) => s.symbol);
  const map = new Map<string, RawQuote>();
  // Chunk into 75-symbol batches to keep request URL/timeouts sane.
  for (let i = 0; i < symbols.length; i += 75) {
    const chunk = symbols.slice(i, i + 75);
    try {
      const quotes = await yahooFinance.quote(chunk);
      const list = Array.isArray(quotes) ? quotes : [quotes];
      for (const q of list) {
        const o = q as unknown as RawQuote;
        if (o?.symbol) map.set(o.symbol, o);
      }
    } catch (err) {
      console.warn("screener quote chunk failed", err);
    }
  }
  cachedQuotes = { at: now, map };
  return map;
}

function parseNum(v: string | null): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const sector = sp.get("sector");
  const market = sp.get("market"); // "JP" | "US" | null
  const type = sp.get("type"); // "stock" | "etf" | "all" | null
  const priceMin = parseNum(sp.get("priceMin"));
  const priceMax = parseNum(sp.get("priceMax"));
  const perMin = parseNum(sp.get("perMin"));
  const perMax = parseNum(sp.get("perMax"));
  const pbrMin = parseNum(sp.get("pbrMin"));
  const pbrMax = parseNum(sp.get("pbrMax"));
  const epsMin = parseNum(sp.get("epsMin"));
  const epsMax = parseNum(sp.get("epsMax"));
  const yieldMin = parseNum(sp.get("yieldMin")); // expressed in % (e.g. 3 = 3%)
  const yieldMax = parseNum(sp.get("yieldMax"));
  const mcapMin = parseNum(sp.get("mcapMin")); // 億円 or 100M USD
  const mcapMax = parseNum(sp.get("mcapMax"));

  const includeEtf = type === "etf" || type === "all";
  const onlyEtf = type === "etf";

  const universe = getAllStocks(true).filter((s) => {
    if (sector && s.sector !== sector) return false;
    if (market === "JP" && s.market !== "JP") return false;
    if (market === "US" && s.market !== "US") return false;
    if (onlyEtf && s.type !== "etf") return false;
    if (!includeEtf && s.type === "etf") return false;
    return true;
  });

  const quotes = await loadQuotes();

  const between = (
    v: number | undefined,
    min: number | null,
    max: number | null,
  ): boolean => {
    if (min !== null && (v === undefined || v < min)) return false;
    if (max !== null && (v === undefined || v > max)) return false;
    return true;
  };

  const filtered = universe
    .map((stock) => ({ stock, q: quotes.get(stock.symbol) }))
    .filter(({ q }) => {
      if (!q) return false;
      if (!between(q.regularMarketPrice, priceMin, priceMax)) return false;
      if (!between(q.trailingPE, perMin, perMax)) return false;
      if (!between(q.priceToBook, pbrMin, pbrMax)) return false;
      if (!between(q.epsTrailingTwelveMonths, epsMin, epsMax)) return false;
      if (!between(q.dividendYield, yieldMin, yieldMax)) return false;
      // marketCap input in 100M units to keep numbers manageable
      const mcapHundredM = q.marketCap ? q.marketCap / 1e8 : undefined;
      if (!between(mcapHundredM, mcapMin, mcapMax)) return false;
      return true;
    });

  const namesJa = await Promise.all(
    filtered.map(({ stock, q }) =>
      getCompanyNameJa(stock.symbol, q?.longName ?? q?.shortName ?? stock.name),
    ),
  );

  const results = filtered.map(({ stock, q }, i) => ({
    symbol: stock.symbol,
    name: stock.name,
    nameJa: namesJa[i] ?? stock.name,
    market: stock.market,
    sector: stock.sector,
    type: stock.type ?? "stock",
    price: q?.regularMarketPrice ?? null,
    changePercent: q?.regularMarketChangePercent ?? null,
    per: q?.trailingPE ?? null,
    forwardPe: q?.forwardPE ?? null,
    pbr: q?.priceToBook ?? null,
    eps: q?.epsTrailingTwelveMonths ?? null,
    dividendYield: q?.dividendYield ?? null,
    marketCap: q?.marketCap ?? null,
    currency: q?.currency ?? null,
  }));

  return NextResponse.json({
    total: results.length,
    universeSize: universe.length,
    sectors: GICS_SECTORS.map((s) => ({ id: s.id, nameJa: s.nameJa })),
    results,
  });
}
