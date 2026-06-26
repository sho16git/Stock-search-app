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
import { cacheGet, cacheSet } from "@/lib/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SlimQuote = {
  price: number | null;
  change: number | null;
  changePercent: number | null;
  marketCap: number | null;
  currency: string | null;
  high52w: number | null;
  low52w: number | null;
};

const QUOTE_TTL = 45_000; // 45s — fresh enough for list views, fewer Yahoo round-trips

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

  const quotes: Record<string, SlimQuote> = {};

  // Serve cached symbols immediately; only fetch the misses from Yahoo.
  const misses: string[] = [];
  for (const s of symbols) {
    const c = cacheGet<SlimQuote>(`sq:${s}`);
    if (c) quotes[s] = c;
    else misses.push(s);
  }

  try {
    if (misses.length > 0) {
      // Fetch with one retry — a single transient Yahoo failure would otherwise
      // blank out the whole batch (every row shows "—").
      const fetchQuotes = () =>
        (yahooFinance.quote as Function)(misses, {}, { validateResult: false })
          .then((r: unknown) => (Array.isArray(r) ? r : [r]))
          .catch(() => [] as unknown[]);
      let list = await fetchQuotes();
      if (list.length === 0) {
        await new Promise((r) => setTimeout(r, 400));
        list = await fetchQuotes();
      }

      for (const q of list) {
        const o = q as Record<string, unknown>;
        const sym = String(o.symbol ?? "");
        if (!sym) continue;
        const slim: SlimQuote = {
          price:         typeof o.regularMarketPrice === "number"         ? o.regularMarketPrice         : null,
          change:        typeof o.regularMarketChange === "number"        ? o.regularMarketChange        : null,
          changePercent: typeof o.regularMarketChangePercent === "number" ? o.regularMarketChangePercent : null,
          marketCap:     typeof o.marketCap === "number"                  ? o.marketCap                  : null,
          currency:      typeof o.currency === "string"                   ? o.currency                   : null,
          high52w:       typeof o.fiftyTwoWeekHigh === "number"           ? o.fiftyTwoWeekHigh           : null,
          low52w:        typeof o.fiftyTwoWeekLow === "number"            ? o.fiftyTwoWeekLow            : null,
        };
        quotes[sym] = slim;
        cacheSet(`sq:${sym}`, slim, QUOTE_TTL);
      }
    }

    return NextResponse.json(
      { quotes },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } },
    );
  } catch (err) {
    console.error("batch quotes error", err);
    return NextResponse.json({ error: "株価取得に失敗しました" }, { status: 500 });
  }
}
