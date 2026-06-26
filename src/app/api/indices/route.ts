import { NextResponse } from "next/server";
import yahooFinance from "@/lib/yfinance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 60;

const INDICES: Array<{ symbol: string; name: string; flag?: string }> = [
  { symbol: "^N225", name: "日経平均", flag: "🇯🇵" },
  { symbol: "^TPX", name: "TOPIX", flag: "🇯🇵" },
  { symbol: "^GSPC", name: "S&P 500", flag: "🇺🇸" },
  { symbol: "^DJI", name: "ダウ平均", flag: "🇺🇸" },
  { symbol: "^IXIC", name: "NASDAQ", flag: "🇺🇸" },
  { symbol: "JPY=X", name: "USD/JPY", flag: "💱" },
];

export async function GET() {
  try {
    const symbols = INDICES.map((i) => i.symbol);
    const quotes = await yahooFinance.quote(symbols).catch(() => []);
    const quoteList = Array.isArray(quotes) ? quotes : [quotes];

    const result = INDICES.map((info) => {
      const q = quoteList.find(
        (x) => (x as { symbol?: string })?.symbol === info.symbol,
      ) as
        | {
            regularMarketPrice?: number;
            regularMarketChange?: number;
            regularMarketChangePercent?: number;
            regularMarketTime?: Date | string | number;
          }
        | undefined;
      return {
        symbol: info.symbol,
        name: info.name,
        flag: info.flag,
        price: q?.regularMarketPrice ?? null,
        change: q?.regularMarketChange ?? null,
        changePercent: q?.regularMarketChangePercent ?? null,
      };
    });

    return NextResponse.json(
      { indices: result },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } },
    );
  } catch (err) {
    console.error("indices error", err);
    return NextResponse.json(
      { error: "指数取得に失敗しました", indices: [] },
      { status: 500 },
    );
  }
}
