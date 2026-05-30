import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "@/lib/yfinance";
import {
  searchJpStocks, searchUsStocks, searchTseNames,
  type JpStock, type TseNameMatch,
} from "@/lib/jp-stocks";
import { getUsKatakana } from "@/lib/us-katakana";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JP_TEXT = /[぀-ヿ㐀-鿿]/;
/** 4-digit bare TSE code (e.g. "7203") */
const BARE_TSE_CODE = /^\d{4}$/;
/** Already has .T suffix */
const TSE_SYMBOL = /^\d{4}\.T$/i;

type Result = {
  symbol: string;
  shortname?: string;
  longname?: string;
  jpName?: string;
  exchange?: string;
  quoteType?: string;
  typeDisp?: string;
};

function jpStockToResult(s: JpStock): Result {
  return {
    symbol: s.symbol,
    longname: s.name,
    jpName: s.name,
    exchange: "TYO",
    quoteType: "EQUITY",
    typeDisp: "Equity",
  };
}

function tseNameToResult(s: TseNameMatch): Result {
  return {
    symbol: s.symbol,
    longname: s.name,
    jpName: s.name,
    exchange: "TYO",
    quoteType: "EQUITY",
    typeDisp: "Equity",
  };
}

function usStockToResult(s: JpStock): Result {
  const katakana = getUsKatakana(s.symbol);
  return {
    symbol: s.symbol,
    longname: katakana ?? s.name,
    jpName: katakana ?? undefined,
    exchange: "NYSE",
    quoteType: "EQUITY",
    typeDisp: "Equity",
  };
}

/** Fetch Yahoo Finance search results, returning [] on error */
async function yahooSearch(q: string, count = 12): Promise<Result[]> {
  try {
    const yData = await yahooFinance
      .search(q, { quotesCount: count, newsCount: 0 })
      .catch(() => ({ quotes: [] as unknown[] }));
    return (yData.quotes ?? [])
      .filter((it): it is typeof it & { symbol: string } =>
        typeof it === "object" && it !== null && "symbol" in it &&
        !!(it as { symbol: string }).symbol
      )
      .map((it) => {
        const o = it as Record<string, unknown>;
        return {
          symbol: String(o.symbol),
          shortname: typeof o.shortname === "string" ? o.shortname : undefined,
          longname: typeof o.longname === "string" ? o.longname : undefined,
          exchange: typeof o.exchange === "string" ? o.exchange : undefined,
          quoteType: typeof o.quoteType === "string" ? o.quoteType : undefined,
          typeDisp: typeof o.typeDisp === "string" ? o.typeDisp : undefined,
        };
      });
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ results: [] });
  }

  // ── Bare 4-digit TSE code (e.g. "7581") ──────────────────────────────────
  if (BARE_TSE_CODE.test(q) || TSE_SYMBOL.test(q.toUpperCase())) {
    const sym = BARE_TSE_CODE.test(q) ? `${q}.T` : q.toUpperCase();
    const [localJp, localTse, yahooResults] = await Promise.all([
      Promise.resolve(searchJpStocks(sym, 3)),
      Promise.resolve(searchTseNames(sym, 3)),
      yahooSearch(sym, 6),
    ]);

    const seen = new Set<string>();
    const merged: Result[] = [];
    for (const r of [
      ...localJp.map(jpStockToResult),
      ...localTse.map(tseNameToResult),
      ...yahooResults,
    ]) {
      if (!seen.has(r.symbol)) { seen.add(r.symbol); merged.push(r); }
    }

    // If nothing found, also try the bare number (some non-JP stocks start with digits)
    if (merged.length === 0 && BARE_TSE_CODE.test(q)) {
      const bare = await yahooSearch(q, 6);
      for (const r of bare) {
        if (!seen.has(r.symbol)) { seen.add(r.symbol); merged.push(r); }
      }
    }

    return NextResponse.json({ results: merged.slice(0, 16), source: "tse-code" });
  }

  // ── Japanese text query ───────────────────────────────────────────────────
  if (JP_TEXT.test(q)) {
    // Always run local + Yahoo in parallel for maximum coverage
    const [jpResults, tseResults, usResults, yahooResults] = await Promise.all([
      Promise.resolve(searchJpStocks(q, 10)),
      Promise.resolve(searchTseNames(q, 8)),
      Promise.resolve(searchUsStocks(q, 5)),
      yahooSearch(q, 10),
    ]);

    // Build merged list — local results take priority (have better JP names)
    const seen = new Set<string>();
    const merged: Result[] = [];

    for (const r of [
      ...jpResults.map(jpStockToResult),
      ...tseResults.map(tseNameToResult),
      ...usResults.map(usStockToResult),
    ]) {
      if (!seen.has(r.symbol)) { seen.add(r.symbol); merged.push(r); }
    }

    // Append Yahoo results not already covered by local catalog
    for (const r of yahooResults) {
      if (!seen.has(r.symbol)) {
        seen.add(r.symbol);
        merged.push(r);
      }
    }

    return NextResponse.json({ results: merged.slice(0, 16), source: "local+yahoo" });
  }

  // ── Non-Japanese query (symbol / English name) ────────────────────────────
  try {
    const [yahooData, localJp, localTse] = await Promise.all([
      yahooFinance
        .search(q, { quotesCount: 12, newsCount: 0 })
        .catch(() => ({ quotes: [] as unknown[] })),
      Promise.resolve(searchJpStocks(q, 6)),
      Promise.resolve(searchTseNames(q, 6)),
    ]);

    const yahooResults: Result[] = (yahooData.quotes ?? [])
      .filter(
        (it): it is typeof it & { symbol: string } =>
          typeof it === "object" && it !== null && "symbol" in it &&
          !!(it as { symbol: string }).symbol,
      )
      .map((it) => {
        const o = it as Record<string, unknown>;
        const sym = String(o.symbol);
        const jp = localJp.find((l) => l.symbol === sym);
        const tse = localTse.find((l) => l.symbol === sym);
        const jpName = jp?.name ?? tse?.name;
        return {
          symbol: sym,
          shortname: typeof o.shortname === "string" ? o.shortname : undefined,
          longname: typeof o.longname === "string" ? o.longname : undefined,
          jpName,
          exchange: typeof o.exchange === "string" ? o.exchange : undefined,
          quoteType: typeof o.quoteType === "string" ? o.quoteType : undefined,
          typeDisp: typeof o.typeDisp === "string" ? o.typeDisp : undefined,
        };
      });

    // Append local-only matches not already in Yahoo results
    const seen = new Set(yahooResults.map((r) => r.symbol));
    const localExtras = [
      ...localJp.filter((l) => !seen.has(l.symbol)).map(jpStockToResult),
      ...localTse.filter((l) => !seen.has(l.symbol)).map(tseNameToResult),
    ];

    return NextResponse.json({
      results: [...yahooResults, ...localExtras].slice(0, 16),
    });
  } catch (err) {
    console.error("search error", err);
    return NextResponse.json(
      { error: "検索に失敗しました", results: [] },
      { status: 500 },
    );
  }
}
