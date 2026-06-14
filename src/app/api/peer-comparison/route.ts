/**
 * /api/peer-comparison?symbol=AAPL
 * 競合比較データ: 自銘柄 + 関連銘柄の主要指標を一括取得
 */
import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "@/lib/yfinance";
import { getCompanyNameJa } from "@/lib/translate-name";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function num(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  return null;
}

export type PeerRow = {
  symbol: string;
  nameJa: string | null;
  name: string | null;
  price: number | null;
  changePercent: number | null;
  marketCap: number | null;
  trailingPE: number | null;
  priceToBook: number | null;
  returnOnEquity: number | null;
  dividendYield: number | null;
  currency: string | null;
};

async function fetchROE(symbol: string): Promise<number | null> {
  try {
    const s = await yahooFinance.quoteSummary(symbol, { modules: ["financialData"] });
    return num(s.financialData?.returnOnEquity);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim();
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  try {
    // 1. Get peer symbols
    let peerSymbols: string[] = [];
    try {
      const rec = await yahooFinance.recommendationsBySymbol(symbol);
      peerSymbols = ((rec.recommendedSymbols ?? []) as { symbol?: string }[])
        .map(s => s.symbol)
        .filter((s): s is string => typeof s === "string" && s.length > 0)
        .slice(0, 4);
    } catch {
      // recommendationsBySymbol may fail for JP stocks — return only target
    }

    const allSymbols = [symbol, ...peerSymbols];

    // 2. Batch fetch quote (price, PE, PBR, market cap, dividend yield)
    const quotes = await yahooFinance.quote(allSymbols, {
      fields: [
        "symbol", "shortName", "longName", "currency",
        "regularMarketPrice", "regularMarketChangePercent",
        "marketCap", "trailingPE", "priceToBook",
        "trailingAnnualDividendYield",
      ],
    }).catch(() => [] as unknown[]);

    const quoteList = (Array.isArray(quotes) ? quotes : [quotes]) as Record<string, unknown>[];
    const quoteMap = new Map(quoteList.map(q => [q.symbol as string, q]));

    // 3. Fetch ROE for all symbols in parallel
    const roeList = await Promise.all(allSymbols.map(s => fetchROE(s)));
    const roeMap = new Map(allSymbols.map((s, i) => [s, roeList[i]]));

    // 4. Fetch Japanese names
    const namesList = await Promise.all(
      allSymbols.map(s => {
        const q = quoteMap.get(s);
        const en = (q?.longName ?? q?.shortName ?? null) as string | null;
        return getCompanyNameJa(s, en).catch(() => null);
      })
    );
    const namesMap = new Map(allSymbols.map((s, i) => [s, namesList[i]]));

    // 5. Build result rows
    const peers: PeerRow[] = allSymbols.map(s => {
      const q = quoteMap.get(s);
      return {
        symbol: s,
        nameJa: namesMap.get(s) ?? null,
        name: (q?.longName ?? q?.shortName ?? null) as string | null,
        price: num(q?.regularMarketPrice),
        changePercent: num(q?.regularMarketChangePercent),
        marketCap: num(q?.marketCap),
        trailingPE: num(q?.trailingPE),
        priceToBook: num(q?.priceToBook),
        returnOnEquity: roeMap.get(s) ?? null,
        dividendYield: num(q?.trailingAnnualDividendYield),
        currency: (q?.currency ?? null) as string | null,
      };
    });

    return NextResponse.json(
      { peers },
      { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" } }
    );
  } catch (err) {
    console.error("peer-comparison error", err);
    return NextResponse.json({ error: "競合比較データ取得に失敗しました", peers: [] }, { status: 500 });
  }
}
