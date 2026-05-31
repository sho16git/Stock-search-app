import { NextResponse } from "next/server";
import yahooFinance from "@/lib/yfinance";
import { GICS_SECTORS, type GicsSectorId } from "@/lib/gics";
import { getStocksBySectorAll } from "@/lib/stocks-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 60;

export type SectorRank = {
  id: GicsSectorId;
  /** 全銘柄平均 */
  changePercent: number | null;
  /** 日本株のみ平均 */
  jpChangePercent: number | null;
  /** 米国株のみ平均 */
  usChangePercent: number | null;
  count: number;
  jpCount: number;
  usCount: number;
  gainers: number;
  losers: number;
  jpGainers: number;
  usGainers: number;
  topGainer: { symbol: string; name: string; pct: number } | null;
  topLoser:  { symbol: string; name: string; pct: number } | null;
};

/* ─── batch quote helper ───
   Yahoo Finance の quote() は一度に大量のシンボルを渡すとサイレントに失敗することがある。
   100 シンボルずつに分割し、CONCURRENCY 本まで並列実行する。           */
const CHUNK       = 100;
const CONCURRENCY = 5;

async function batchQuoteAll(symbols: string[]): Promise<Map<string, number>> {
  const chunks: string[][] = [];
  for (let i = 0; i < symbols.length; i += CHUNK) {
    chunks.push(symbols.slice(i, i + CHUNK));
  }

  const result = new Map<string, number>();

  for (let i = 0; i < chunks.length; i += CONCURRENCY) {
    const window = chunks.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      window.map((chunk) =>
        yahooFinance
          .quote(chunk)
          .then((r) => (Array.isArray(r) ? r : [r]))
          .catch(() => []),
      ),
    );
    for (const list of batchResults) {
      for (const q of list) {
        const sym = (q as { symbol?: string })?.symbol;
        const pct = (q as { regularMarketChangePercent?: number })
          ?.regularMarketChangePercent;
        if (sym && typeof pct === "number") result.set(sym, pct);
      }
    }
  }

  return result;
}

export async function GET() {
  try {
    /* ── 全セクターのシンボルを一括収集（セクター別マップも保持）── */
    type StockEntry = { name: string; market: "JP" | "US" };
    const allStocksMap  = new Map<string, StockEntry>();
    const sectorStocks  = new Map<
      GicsSectorId,
      { symbol: string; name: string; market: "JP" | "US" }[]
    >();

    for (const sector of GICS_SECTORS) {
      const stocks = getStocksBySectorAll(sector.id);
      sectorStocks.set(sector.id, stocks);
      for (const s of stocks) {
        if (!allStocksMap.has(s.symbol)) {
          allStocksMap.set(s.symbol, { name: s.name, market: s.market });
        }
      }
    }

    /* ── 全シンボルを一括 batch quote ── */
    const allSymbols = Array.from(allStocksMap.keys());
    const quoteMap   = await batchQuoteAll(allSymbols);

    /* ── セクター別集計 ── */
    const ranks: SectorRank[] = GICS_SECTORS.map((sector) => {
      const stocks = sectorStocks.get(sector.id) ?? [];

      let sum = 0, n = 0, gainers = 0, losers = 0;
      let jpSum = 0, jpN = 0, jpGainers = 0;
      let usSum = 0, usN = 0, usGainers = 0;
      let top: { symbol: string; name: string; pct: number } | null = null;
      let bot: { symbol: string; name: string; pct: number } | null = null;

      for (const stock of stocks) {
        const pct = quoteMap.get(stock.symbol);
        if (typeof pct !== "number") continue;

        sum += pct; n++;
        if (pct > 0) gainers++;
        else if (pct < 0) losers++;

        if (stock.market === "JP") {
          jpSum += pct; jpN++;
          if (pct > 0) jpGainers++;
        } else {
          usSum += pct; usN++;
          if (pct > 0) usGainers++;
        }

        if (!top || pct > top.pct) top = { symbol: stock.symbol, name: stock.name, pct };
        if (!bot || pct < bot.pct) bot = { symbol: stock.symbol, name: stock.name, pct };
      }

      return {
        id:               sector.id,
        changePercent:    n    > 0 ? sum    / n    : null,
        jpChangePercent:  jpN  > 0 ? jpSum  / jpN  : null,
        usChangePercent:  usN  > 0 ? usSum  / usN  : null,
        count:     n,
        jpCount:   jpN,
        usCount:   usN,
        gainers,
        losers,
        jpGainers,
        usGainers,
        topGainer: top,
        topLoser:  bot,
      } satisfies SectorRank;
    });

    /* ── 全体騰落率でソート ── */
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
