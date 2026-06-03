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
import { isJQuantsConfigured } from "@/lib/jquants";
import { getJQuantsListed } from "@/lib/jquants-listed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BrowseItem = {
  symbol: string;
  name: string;        // 表示名 (JP: 日本語, US: カタカナ優先)
  nameEn?: string;     // English name (US only, for fallback)
  market: "JP" | "US";
  sector?: string;
  segment?: string;    // JP only (J-Quants): "プライム" | "スタンダード" | "グロース"
};

// ── JP stock universe ──────────────────────────────────────────────
// When J-Quants is configured we use its full listed info (~3,800 stocks).
// Otherwise we fall back to the static catalog + TSE supplement (~2,700).

let _jqJpCache: BrowseItem[] | null = null;
let _jqJpCacheTime = 0;

async function getJpUniverse(): Promise<BrowseItem[]> {
  if (!isJQuantsConfigured()) {
    // Static fallback
    return getFullJpBrowseList().map((s) => ({
      symbol: s.symbol,
      name:   s.name,
      market: "JP" as const,
      sector: s.sector,
    }));
  }

  // J-Quants: re-use cached data from jquants-listed (24 h TTL)
  if (_jqJpCache && Date.now() - _jqJpCacheTime < 23 * 60 * 60 * 1000) {
    return _jqJpCache;
  }

  const listed = await getJQuantsListed();
  const items: BrowseItem[] = listed.map((s) => ({
    symbol:  s.symbol,
    name:    s.name,
    nameEn:  s.nameEn || undefined,
    market:  "JP" as const,
    sector:  s.gicsId ?? undefined,
    segment: s.market || undefined,   // "プライム" | "スタンダード" | "グロース" 等
  }));

  _jqJpCache     = items;
  _jqJpCacheTime = Date.now();
  return items;
}

// ── US + ETF universe (static, built once) ─────────────────────────
let _usEtfUniverse: BrowseItem[] | null = null;
function getUsEtfUniverse(): BrowseItem[] {
  if (_usEtfUniverse) return _usEtfUniverse;

  const usCurated = getAllStocks(false)
    .filter((s) => s.market === "US")
    .map((s) => {
      const katakana = getUsKatakana(s.symbol);
      return {
        symbol: s.symbol,
        name:   katakana ?? s.name,
        nameEn: s.name,
        market: "US" as const,
        sector: s.sector,
      };
    });

  const etfs = getAllStocks(true)
    .filter((s) => s.type === "etf")
    .map((s) => {
      const katakana = s.market === "US" ? getUsKatakana(s.symbol) : null;
      return {
        symbol: s.symbol,
        name:   katakana ?? s.name,
        nameEn: s.market === "US" ? s.name : undefined,
        market: s.market as "JP" | "US",
        sector: s.sector,
      };
    });

  const curatedSymbols = new Set(usCurated.map((s) => s.symbol));
  const usSupply: BrowseItem[] = [];
  const seen = new Set<string>();
  for (const [sym, name] of US_STOCKS_SUPPLEMENT) {
    if (curatedSymbols.has(sym)) continue;
    if (seen.has(sym)) continue;
    if (name.includes("廃止") || name.includes("delisted")) continue;
    seen.add(sym);
    const katakana = getUsKatakana(sym);
    usSupply.push({
      symbol: sym,
      name:   katakana ?? name,
      nameEn: name,
      market: "US" as const,
    });
  }

  _usEtfUniverse = [...usCurated, ...usSupply, ...etfs];
  return _usEtfUniverse;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const page = Math.max(0, parseInt(sp.get("page") ?? "0", 10) || 0);
  const noPrices = sp.get("noPrices") === "true";
  const maxPageSize = noPrices ? 5000 : 100;
  const pageSize = Math.min(maxPageSize, Math.max(10, parseInt(sp.get("pageSize") ?? "50", 10) || 50));
  const market  = sp.get("market")  ?? "";
  const segment = sp.get("segment") ?? "";   // "プライム" | "スタンダード" | "グロース"
  const rawQ    = sp.get("q")?.trim() ?? "";

  // Build universe (async when J-Quants is active for JP stocks)
  const [jpItems, usEtfItems] = await Promise.all([
    getJpUniverse().catch(() => getFullJpBrowseList().map(s => ({
      symbol: s.symbol, name: s.name, market: "JP" as const, sector: s.sector
    }))),
    Promise.resolve(getUsEtfUniverse()),
  ]);

  // Deduplicate JP symbols (J-Quants may overlap with curated catalog)
  const jpSymbols = new Set(jpItems.map(s => s.symbol));
  // Remove JP entries from usEtfItems that accidentally have .T (shouldn't happen, but safe)
  let universe: BrowseItem[] = [
    ...jpItems,
    ...usEtfItems.filter(s => !jpSymbols.has(s.symbol)),
  ];

  // Market filter
  if (market === "JP") universe = universe.filter((s) => s.market === "JP");
  else if (market === "US") universe = universe.filter((s) => s.market === "US");

  // Segment filter (JP only — プライム/スタンダード/グロース)
  if (segment) universe = universe.filter((s) => s.segment === segment);

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

  if (!noPrices && symbols.length > 0) {
    try {
      const rawQuotes = await (yahooFinance.quote as Function)(
        symbols,
        {},
        { validateResult: false },
      ).catch(() => []);
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
      symbol:        s.symbol,
      name:          s.name,
      nameEn:        s.nameEn ?? null,
      market:        s.market,
      sector:        s.sector   ?? null,
      segment:       s.segment  ?? null,
      price:         q?.price         ?? null,
      changePercent: q?.changePercent  ?? null,
      marketCap:     q?.marketCap      ?? null,
      currency:      q?.currency       ?? null,
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
