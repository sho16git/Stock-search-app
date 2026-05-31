/**
 * /api/browse — Full stock browse with page-based price loading.
 *
 * Merges STOCKS_CATALOG + TSE_SUPPLEMENT + US catalog.
 * Fetches live Yahoo Finance quotes for only the requested page (50 stocks).
 *
 * Query params:
 *   page      number (0-based, default 0)
 *   pageSize  number (default 50, max 100)
 *   market    "JP" | "US" | "" (default all)
 *   q         search string (name or symbol prefix match)
 */
import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "@/lib/yfinance";
import { getFullJpBrowseList } from "@/lib/jp-stocks";
import { getAllStocks } from "@/lib/stocks-catalog";
import { normalize } from "@/lib/jp-stocks";
import { US_STOCKS_SUPPLEMENT } from "@/lib/us-stocks-list";
import { getUsKatakana } from "@/lib/us-katakana";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BrowseItem = {
  symbol: string;
  name: string;        // 表示名 (JP: 日本語, US: カタカナ優先)
  nameEn?: string;     // English name (US only, for fallback)
  market: "JP" | "US";
  sector?: string;
};

/** Build the complete universe once per server process (it's static data). */
let _universe: BrowseItem[] | null = null;
function getUniverse(): BrowseItem[] {
  if (_universe) return _universe;

  const jpList = getFullJpBrowseList().map((s) => ({
    symbol: s.symbol,
    name: s.name,
    market: "JP" as const,
    sector: s.sector,
  }));

  // US stocks from the curated catalog (no ETFs)
  const usCurated = getAllStocks(false)
    .filter((s) => s.market === "US")
    .map((s) => {
      const katakana = getUsKatakana(s.symbol);
      return {
        symbol: s.symbol,
        name: katakana ?? s.name,   // カタカナ優先
        nameEn: s.name,
        market: "US" as const,
        sector: s.sector,
      };
    });

  // ETFs
  const etfs = getAllStocks(true)
    .filter((s) => s.type === "etf")
    .map((s) => {
      const katakana = s.market === "US" ? getUsKatakana(s.symbol) : null;
      return {
        symbol: s.symbol,
        name: katakana ?? s.name,
        nameEn: s.market === "US" ? s.name : undefined,
        market: s.market as "JP" | "US",
        sector: s.sector,
      };
    });

  // Merge US supplement — skip duplicates and stale/廃止 entries
  const curatedUsSymbols = new Set(usCurated.map((s) => s.symbol));
  const usSupply: BrowseItem[] = [];
  const seenSuppSymbols = new Set<string>();
  for (const [sym, name] of US_STOCKS_SUPPLEMENT) {
    if (curatedUsSymbols.has(sym)) continue;          // already in curated catalog
    if (seenSuppSymbols.has(sym)) continue;           // dedup within supplement
    if (name.includes("廃止") || name.includes("delisted")) continue;
    seenSuppSymbols.add(sym);
    const katakana = getUsKatakana(sym);
    usSupply.push({
      symbol: sym,
      name: katakana ?? name,   // カタカナ優先
      nameEn: name,
      market: "US" as const,
    });
  }

  _universe = [...jpList, ...usCurated, ...usSupply, ...etfs];
  return _universe;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const page = Math.max(0, parseInt(sp.get("page") ?? "0", 10) || 0);
  const pageSize = Math.min(100, Math.max(10, parseInt(sp.get("pageSize") ?? "50", 10) || 50));
  const market = sp.get("market") ?? "";
  const rawQ = sp.get("q")?.trim() ?? "";

  let universe = getUniverse();

  // Market filter
  if (market === "JP") universe = universe.filter((s) => s.market === "JP");
  else if (market === "US") universe = universe.filter((s) => s.market === "US");

  // Search filter — support Japanese/katakana and Roman text
  if (rawQ) {
    const q = normalize(rawQ);
    const ql = rawQ.toLowerCase();
    universe = universe.filter((s) => {
      const normName = normalize(s.name);
      const normSym  = normalize(s.symbol);
      const normEn   = s.nameEn ? normalize(s.nameEn) : "";
      return (
        normName.includes(q) ||
        normSym.includes(q) ||
        normEn.includes(q) ||
        s.symbol.toLowerCase().includes(ql) ||
        s.name.toLowerCase().includes(ql) ||
        (s.nameEn ?? "").toLowerCase().includes(ql)
      );
    });
  }

  const total = universe.length;
  const slice = universe.slice(page * pageSize, (page + 1) * pageSize);

  // Fetch live prices for this page only
  const symbols = slice.map((s) => s.symbol);
  const quoteMap = new Map<string, {
    price: number | null;
    changePercent: number | null;
    marketCap: number | null;
    currency: string | null;
  }>();

  if (symbols.length > 0) {
    try {
      const rawQuotes = await yahooFinance
        .quote(symbols)
        .catch(() => []);
      const list = Array.isArray(rawQuotes) ? rawQuotes : [rawQuotes];
      for (const q of list) {
        const o = q as Record<string, unknown>;
        const sym = String(o.symbol ?? "");
        if (sym) {
          quoteMap.set(sym, {
            price: typeof o.regularMarketPrice === "number" ? o.regularMarketPrice : null,
            changePercent: typeof o.regularMarketChangePercent === "number" ? o.regularMarketChangePercent : null,
            marketCap: typeof o.marketCap === "number" ? o.marketCap : null,
            currency: typeof o.currency === "string" ? o.currency : null,
          });
        }
      }
    } catch {
      // prices are optional — return without them
    }
  }

  const results = slice.map((s) => {
    const q = quoteMap.get(s.symbol);
    return {
      symbol: s.symbol,
      name: s.name,         // カタカナ (US) or 日本語 (JP)
      nameEn: s.nameEn ?? null,
      market: s.market,
      sector: s.sector ?? null,
      price: q?.price ?? null,
      changePercent: q?.changePercent ?? null,
      marketCap: q?.marketCap ?? null,
      currency: q?.currency ?? null,
    };
  });

  return NextResponse.json({
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    results,
  });
}
