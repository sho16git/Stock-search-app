/**
 * /api/quotes — Batch quote fetch for multiple symbols.
 *
 * Query params:
 *   symbols  comma-separated list of stock symbols (max 200)
 *
 * Returns:
 *   { quotes: Record<symbol, { price, changePercent, marketCap, currency, high52w, low52w }> }
 */
import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "@/lib/yfinance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("symbols")?.trim();
  if (!raw) {
    return NextResponse.json({ error: "symbols required" }, { status: 400 });
  }

  const symbols = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 200); // safety cap

  if (symbols.length === 0) {
    return NextResponse.json({ quotes: {} });
  }

  try {
    const rawQuotes = await (yahooFinance.quote as Function)(
      symbols,
      {},
      { validateResult: false },
    ).catch(() => []);
    const list = Array.isArray(rawQuotes) ? rawQuotes : [rawQuotes];

    const quotes: Record<string, {
      price: number | null;
      changePercent: number | null;
      marketCap: number | null;
      currency: string | null;
      high52w: number | null;
      low52w: number | null;
    }> = {};

    for (const q of list) {
      const o = q as Record<string, unknown>;
      const sym = String(o.symbol ?? "");
      if (!sym) continue;
      quotes[sym] = {
        price:         typeof o.regularMarketPrice === "number"         ? o.regularMarketPrice         : null,
        changePercent: typeof o.regularMarketChangePercent === "number" ? o.regularMarketChangePercent : null,
        marketCap:     typeof o.marketCap === "number"                  ? o.marketCap                  : null,
        currency:      typeof o.currency === "string"                   ? o.currency                   : null,
        high52w:       typeof o.fiftyTwoWeekHigh === "number"           ? o.fiftyTwoWeekHigh           : null,
        low52w:        typeof o.fiftyTwoWeekLow === "number"            ? o.fiftyTwoWeekLow            : null,
      };
    }

    return NextResponse.json({ quotes });
  } catch (err) {
    console.error("batch quotes error", err);
    return NextResponse.json({ error: "株価取得に失敗しました" }, { status: 500 });
  }
}
