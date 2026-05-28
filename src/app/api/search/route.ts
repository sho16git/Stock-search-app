import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "@/lib/yfinance";
import { searchJpStocks, searchUsStocks, type JpStock } from "@/lib/jp-stocks";
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

  // Japanese query → search local JP index + US katakana (Yahoo rejects JP text)
  if (JP_TEXT.test(q)) {
    const jpResults = searchJpStocks(q, 10);
    const usResults = searchUsStocks(q, 6);
    const seen = new Set([...jpResults, ...usResults].map(r => r.symbol));

    // Try Yahoo Finance as fallback for better coverage
    let yahooExtra: Result[] = [];
    if (jpResults.length + usResults.length < 8) {
      try {
        const yData = await yahooFinance.search(q, { quotesCount: 6, newsCount: 0 }).catch(() => ({ quotes: [] as unknown[] }));
        yahooExtra = (yData.quotes ?? [])
          .filter((it): it is typeof it & { symbol: string } =>
            typeof it === "object" && it !== null && "symbol" in it && !seen.has((it as { symbol: string }).symbol)
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
      ...usResults.map(usStockToResult),
      ...yahooExtra,
    ].slice(0, 14);

    return NextResponse.json({
      results: merged,
      source: "local",
    });
  }

  // Non-Japanese: search both Yahoo and local, merge
  try {
    const [yahooData, local] = await Promise.all([
      yahooFinance
        .search(q, { quotesCount: 12, newsCount: 0 })
        .catch(() => ({ quotes: [] as unknown[] })),
      Promise.resolve(searchJpStocks(q, 8)),
    ]);

    const yahooResults: Result[] = (yahooData.quotes ?? [])
      .filter(
        (it): it is typeof it & { symbol: string } =>
          typeof it === "object" &&
          it !== null &&
          "symbol" in it &&
          !!(it as { symbol: string }).symbol,
      )
      .map((it) => {
        const o = it as Record<string, unknown>;
        const sym = String(o.symbol);
        const jp = local.find((l) => l.symbol === sym);
        return {
          symbol: sym,
          shortname: typeof o.shortname === "string" ? o.shortname : undefined,
          longname: typeof o.longname === "string" ? o.longname : undefined,
          jpName: jp?.name,
          exchange: typeof o.exchange === "string" ? o.exchange : undefined,
          quoteType:
            typeof o.quoteType === "string" ? o.quoteType : undefined,
          typeDisp: typeof o.typeDisp === "string" ? o.typeDisp : undefined,
        };
      });

    // Merge: Yahoo first, then local-only matches that aren't already present
    const seen = new Set(yahooResults.map((r) => r.symbol));
    const localExtras = local
      .filter((l) => !seen.has(l.symbol))
      .map(jpStockToResult);

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
