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

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ results: [] });
  }

  // Japanese query → search local JP index + TSE supplement + US katakana
  if (JP_TEXT.test(q)) {
    const jpResults  = searchJpStocks(q, 10);
    const tseResults = searchTseNames(q, 8);
    const usResults  = searchUsStocks(q, 5);

    const seen = new Set([
      ...jpResults.map(r => r.symbol),
      ...tseResults.map(r => r.symbol),
      ...usResults.map(r => r.symbol),
    ]);

    // Yahoo Finance fallback only when local coverage is thin
    let yahooExtra: Result[] = [];
    if (jpResults.length + tseResults.length + usResults.length < 6) {
      try {
        const yData = await yahooFinance
          .search(q, { quotesCount: 6, newsCount: 0 })
          .catch(() => ({ quotes: [] as unknown[] }));
        yahooExtra = (yData.quotes ?? [])
          .filter((it): it is typeof it & { symbol: string } =>
            typeof it === "object" && it !== null && "symbol" in it &&
            !seen.has((it as { symbol: string }).symbol)
          )
          .map((it) => {
            const o = it as Record<string, unknown>;
            const sym = String(o.symbol ?? "");
            seen.add(sym);
            return {
              symbol: sym,
              shortname: typeof o.shortname === "string" ? o.shortname : undefined,
              longname: typeof o.longname === "string" ? o.longname : undefined,
              exchange: typeof o.exchange === "string" ? o.exchange : undefined,
              quoteType: typeof o.quoteType === "string" ? o.quoteType : undefined,
              typeDisp: typeof o.typeDisp === "string" ? o.typeDisp : undefined,
            };
          });
      } catch { /* ignore */ }
    }

    const merged = [
      ...jpResults.map(jpStockToResult),
      ...tseResults.map(tseNameToResult),
      ...usResults.map(usStockToResult),
      ...yahooExtra,
    ].slice(0, 16);

    return NextResponse.json({ results: merged, source: "local" });
  }

  // Non-Japanese query: Yahoo Finance (covers all NYSE/NASDAQ/TSE by code) + local supplement
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
