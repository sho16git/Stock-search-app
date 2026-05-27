import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "@/lib/yfinance";
import { getCompanyNameJa } from "@/lib/translate-name";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim();
  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  try {
    const rec = await yahooFinance.recommendationsBySymbol(symbol);
    const symbols = (rec.recommendedSymbols ?? [])
      .map((s) => (s as { symbol?: string })?.symbol)
      .filter((x): x is string => !!x)
      .slice(0, 8);

    if (symbols.length === 0) {
      return NextResponse.json({ peers: [] });
    }

    const quotes = await yahooFinance.quote(symbols).catch(() => []);
    const quoteList = Array.isArray(quotes) ? quotes : [quotes];

    const base = symbols
      .map((sym) => {
        const q = quoteList.find(
          (x) => (x as { symbol?: string })?.symbol === sym,
        ) as
          | {
              shortName?: string;
              longName?: string;
              regularMarketPrice?: number;
              regularMarketChange?: number;
              regularMarketChangePercent?: number;
              currency?: string;
              marketCap?: number;
            }
          | undefined;
        return {
          symbol: sym,
          shortName: q?.shortName ?? null,
          longName: q?.longName ?? null,
          price: q?.regularMarketPrice ?? null,
          change: q?.regularMarketChange ?? null,
          changePercent: q?.regularMarketChangePercent ?? null,
          currency: q?.currency ?? null,
          marketCap: q?.marketCap ?? null,
        };
      })
      .filter((p) => p.price !== null);

    const namesJa = await Promise.all(
      base.map((p) => getCompanyNameJa(p.symbol, p.longName ?? p.shortName)),
    );
    const peers = base.map((p, i) => ({ ...p, nameJa: namesJa[i] }));

    return NextResponse.json({ peers });
  } catch (err) {
    console.error("peers error", err);
    return NextResponse.json(
      { error: "関連銘柄取得に失敗しました", peers: [] },
      { status: 500 },
    );
  }
}
