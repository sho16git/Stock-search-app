import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "@/lib/yfinance";
import { STOCKS_CATALOG } from "@/lib/stocks-catalog";
import { getJpName } from "@/lib/jp-stocks";
import { getUsKatakana } from "@/lib/us-katakana";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RankingType = "dividend" | "low-per" | "high-roe" | "52w-high";
type Market = "JP" | "US";

export async function GET(req: NextRequest) {
  const type   = (req.nextUrl.searchParams.get("type")  ?? "dividend") as RankingType;
  const market = (req.nextUrl.searchParams.get("market") ?? "US") as Market;

  // Get stock symbols for the given market (stocks only, no ETFs)
  const candidates = STOCKS_CATALOG
    .filter(s => s.market === market && (!s.type || s.type === "stock"))
    .slice(0, 80) // limit to avoid too many API calls
    .map(s => s.symbol);

  if (candidates.length === 0) {
    return NextResponse.json({ items: [] });
  }

  try {
    // Fetch quotes in batches of 20
    const batchSize = 20;
    const batches: string[][] = [];
    for (let i = 0; i < candidates.length; i += batchSize) {
      batches.push(candidates.slice(i, i + batchSize));
    }

    const allQuotes: Record<string, unknown>[] = [];
    await Promise.all(
      batches.map(batch =>
        yahooFinance.quote(batch)
          .then(q => {
            const list = Array.isArray(q) ? q : [q];
            allQuotes.push(...list as Record<string, unknown>[]);
          })
          .catch(() => {})
      )
    );

    type QuoteItem = {
      symbol: string;
      shortName: string | null;
      nameJa: string | null;
      price: number | null;
      changePercent: number | null;
      marketCap: number | null;
      trailingPE: number | null;
      dividendYield: number | null;
      fiftyTwoWeekHigh: number | null;
      fiftyTwoWeekLow: number | null;
      regularMarketPrice: number | null;
      roe: number | null;
    };

    const items: QuoteItem[] = allQuotes.map(q => ({
      symbol: String(q.symbol ?? ""),
      shortName: String(q.shortName ?? q.longName ?? "") || null,
      nameJa: market === "JP"
        ? (getJpName(String(q.symbol ?? "")) ?? null)
        : (getUsKatakana(String(q.symbol ?? "")) ?? null),
      price: typeof q.regularMarketPrice === "number" ? q.regularMarketPrice : null,
      changePercent: typeof q.regularMarketChangePercent === "number" ? q.regularMarketChangePercent : null,
      marketCap: typeof q.marketCap === "number" ? q.marketCap : null,
      trailingPE: typeof q.trailingPE === "number" ? q.trailingPE : null,
      dividendYield: typeof q.dividendYield === "number" ? q.dividendYield : null,
      fiftyTwoWeekHigh: typeof q.fiftyTwoWeekHigh === "number" ? q.fiftyTwoWeekHigh : null,
      fiftyTwoWeekLow: typeof q.fiftyTwoWeekLow === "number" ? q.fiftyTwoWeekLow : null,
      regularMarketPrice: typeof q.regularMarketPrice === "number" ? q.regularMarketPrice : null,
      roe: null, // filled in for high-roe type below
    })).filter(q => q.symbol && q.price != null);

    let sorted: QuoteItem[] = [];

    if (type === "dividend") {
      sorted = items
        .filter(q => q.dividendYield != null && q.dividendYield > 0)
        .sort((a, b) => (b.dividendYield ?? 0) - (a.dividendYield ?? 0));

    } else if (type === "low-per") {
      sorted = items
        .filter(q => q.trailingPE != null && q.trailingPE > 0 && q.trailingPE < 200)
        .sort((a, b) => (a.trailingPE ?? 9999) - (b.trailingPE ?? 9999));

    } else if (type === "high-roe") {
      // Fetch returnOnEquity from defaultKeyStatistics for all candidates
      // Use batches of 10 to avoid too many concurrent requests
      const roeMap: Record<string, number> = {};
      const roeBatchSize = 10;
      const symbolsToFetch = items.map(i => i.symbol);

      await Promise.all(
        Array.from({ length: Math.ceil(symbolsToFetch.length / roeBatchSize) }, (_, i) =>
          symbolsToFetch.slice(i * roeBatchSize, (i + 1) * roeBatchSize)
        ).map(batch =>
          Promise.all(
            batch.map(sym =>
              yahooFinance.quoteSummary(sym, { modules: ["defaultKeyStatistics", "financialData"] })
                .then(s => {
                  const fs = s as Record<string, Record<string, unknown>>;
                  const roe =
                    (fs.financialData?.returnOnEquity as number | undefined) ??
                    (fs.defaultKeyStatistics?.returnOnEquity as number | undefined);
                  if (typeof roe === "number" && isFinite(roe)) {
                    roeMap[sym] = roe;
                  }
                })
                .catch(() => {})
            )
          )
        )
      );

      // Merge ROE into items
      for (const item of items) {
        if (roeMap[item.symbol] != null) item.roe = roeMap[item.symbol];
      }

      sorted = items
        .filter(q => q.roe != null && q.roe > 0)
        .sort((a, b) => (b.roe ?? 0) - (a.roe ?? 0));

    } else if (type === "52w-high") {
      sorted = items
        .filter(q => q.fiftyTwoWeekHigh != null && q.regularMarketPrice != null)
        .map(q => ({
          ...q,
          // ratio of current price to 52-week high (closer to 1 = near high)
          _ratio: (q.regularMarketPrice ?? 0) / (q.fiftyTwoWeekHigh ?? 1),
        }))
        .sort((a, b) => (b as { _ratio: number })._ratio - (a as { _ratio: number })._ratio)
        .map(({ ...rest }) => rest) as QuoteItem[];
    }

    const top20 = sorted.slice(0, 20);
    return NextResponse.json({ items: top20 });
  } catch (err) {
    console.error("ranking error", err);
    return NextResponse.json({ error: "ランキング取得に失敗しました", items: [] }, { status: 500 });
  }
}
