import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "@/lib/yfinance";
import { getAllStocks } from "@/lib/stocks-catalog";
import { getCompanyNameJa } from "@/lib/translate-name";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 60;

type MoverType = "day_gainers" | "day_losers" | "most_actives";
const VALID: Set<MoverType> = new Set([
  "day_gainers",
  "day_losers",
  "most_actives",
]);

let cached: { at: number; quotes: Map<string, RawQuote> } | null = null;
const TTL = 60_000;

type RawQuote = {
  symbol: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  currency?: string;
  marketCap?: number;
  regularMarketVolume?: number;
};

async function loadJpQuotes(): Promise<Map<string, RawQuote>> {
  const now = Date.now();
  if (cached && now - cached.at < TTL) return cached.quotes;
  const symbols = getAllStocks(true)
    .filter((s) => s.market === "JP")
    .map((s) => s.symbol);
  const map = new Map<string, RawQuote>();
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
      console.warn("movers-jp chunk failed", err);
    }
  }
  cached = { at: now, quotes: map };
  return map;
}

export async function GET(req: NextRequest) {
  const type = (req.nextUrl.searchParams.get("type") ??
    "day_gainers") as MoverType;
  if (!VALID.has(type)) {
    return NextResponse.json({ error: "invalid type" }, { status: 400 });
  }

  try {
    const quotes = await loadJpQuotes();
    let list = Array.from(quotes.values()).filter(
      (q) =>
        typeof q.regularMarketPrice === "number" &&
        typeof q.regularMarketChangePercent === "number",
    );

    if (type === "day_gainers") {
      list.sort(
        (a, b) =>
          (b.regularMarketChangePercent ?? 0) -
          (a.regularMarketChangePercent ?? 0),
      );
    } else if (type === "day_losers") {
      list.sort(
        (a, b) =>
          (a.regularMarketChangePercent ?? 0) -
          (b.regularMarketChangePercent ?? 0),
      );
    } else if (type === "most_actives") {
      list.sort(
        (a, b) => (b.regularMarketVolume ?? 0) - (a.regularMarketVolume ?? 0),
      );
    }
    list = list.slice(0, 15);

    const namesJa = await Promise.all(
      list.map((q) =>
        getCompanyNameJa(q.symbol, q.longName ?? q.shortName ?? null),
      ),
    );

    const quotesResp = list.map((q, i) => ({
      symbol: q.symbol,
      shortName: q.shortName ?? q.longName ?? null,
      longName: q.longName ?? null,
      nameJa: namesJa[i],
      price: q.regularMarketPrice ?? null,
      change: q.regularMarketChange ?? null,
      changePercent: q.regularMarketChangePercent ?? null,
      currency: q.currency ?? null,
      marketCap: q.marketCap ?? null,
      volume: q.regularMarketVolume ?? null,
    }));

    return NextResponse.json(
      { quotes: quotesResp },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch (err) {
    console.error("movers-jp error", err);
    return NextResponse.json(
      { error: "日本株ランキング取得に失敗しました", quotes: [] },
      { status: 500 },
    );
  }
}
