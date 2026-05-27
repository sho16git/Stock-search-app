import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "@/lib/yfinance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RANGES: Record<string, { period: number; interval: "1d" | "1wk" | "1mo" }> = {
  "1mo": { period: 30, interval: "1d" },
  "3mo": { period: 90, interval: "1d" },
  "6mo": { period: 180, interval: "1d" },
  "1y": { period: 365, interval: "1d" },
  "5y": { period: 365 * 5, interval: "1wk" },
  "10y": { period: 365 * 10, interval: "1mo" },
};

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim();
  const range = req.nextUrl.searchParams.get("range")?.trim() ?? "1y";
  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  const cfg = RANGES[range] ?? RANGES["1y"];
  const period1 = new Date(Date.now() - cfg.period * 24 * 60 * 60 * 1000);

  try {
    const chart = await yahooFinance.chart(symbol, {
      period1,
      interval: cfg.interval,
    });
    const data = (chart.quotes ?? [])
      .filter((q) => q.close !== null && q.close !== undefined)
      .map((q) => ({
        date: q.date instanceof Date ? q.date.toISOString().slice(0, 10) : String(q.date),
        close: q.close,
        open: q.open,
        high: q.high,
        low: q.low,
        volume: q.volume,
      }));
    return NextResponse.json({ data, meta: chart.meta });
  } catch (err) {
    console.error("chart error", err);
    return NextResponse.json(
      { error: "チャート取得に失敗しました" },
      { status: 500 },
    );
  }
}
