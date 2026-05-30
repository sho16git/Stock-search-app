import { NextResponse } from "next/server";
import yahooFinance from "@/lib/yfinance";
import { GICS_SECTORS, type GicsSectorId } from "@/lib/gics";
import { getStocksBySectorAll } from "@/lib/stocks-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 60;

type SectorRank = {
  id: GicsSectorId;
  changePercent: number | null;
  count: number;
  gainers: number;
  losers: number;
  topGainer: { symbol: string; name: string; pct: number } | null;
  topLoser: { symbol: string; name: string; pct: number } | null;
};

export async function GET() {
  try {
    const tasks = GICS_SECTORS.map(async (sector) => {
      // Use every stock in the catalog for this sector — Yahoo's batch quote
      // endpoint handles 50+ symbols per call in a single round-trip.
      const stocks = getStocksBySectorAll(sector.id);
      if (stocks.length === 0) {
        return {
          id: sector.id,
          changePercent: null,
          count: 0,
          gainers: 0,
          losers: 0,
          topGainer: null,
          topLoser: null,
        } satisfies SectorRank;
      }
      const symbols = stocks.map((s) => s.symbol);
      const quotes = await yahooFinance.quote(symbols).catch(() => []);
      const quoteList = Array.isArray(quotes) ? quotes : [quotes];

      let sum = 0;
      let n = 0;
      let gainers = 0;
      let losers = 0;
      let top: { symbol: string; name: string; pct: number } | null = null;
      let bot: { symbol: string; name: string; pct: number } | null = null;

      for (const q of quoteList) {
        const pct = (q as { regularMarketChangePercent?: number })
          ?.regularMarketChangePercent;
        const sym = (q as { symbol?: string })?.symbol;
        if (typeof pct !== "number" || !sym) continue;
        const stock = stocks.find((s: { symbol: string; name: string }) => s.symbol === sym);
        const name = stock?.name ?? sym;
        sum += pct;
        n += 1;
        if (pct > 0) gainers += 1;
        else if (pct < 0) losers += 1;
        if (!top || pct > top.pct) top = { symbol: sym, name, pct };
        if (!bot || pct < bot.pct) bot = { symbol: sym, name, pct };
      }

      return {
        id: sector.id,
        changePercent: n > 0 ? sum / n : null,
        count: n,
        gainers,
        losers,
        topGainer: top,
        topLoser: bot,
      } satisfies SectorRank;
    });

    const ranks = await Promise.all(tasks);
    ranks.sort((a, b) => {
      if (a.changePercent === null) return 1;
      if (b.changePercent === null) return -1;
      return b.changePercent - a.changePercent;
    });

    return NextResponse.json({ ranks, asOf: new Date().toISOString() });
  } catch (err) {
    console.error("sector-ranking error", err);
    return NextResponse.json(
      { error: "ランキング取得に失敗しました", ranks: [] },
      { status: 500 },
    );
  }
}
