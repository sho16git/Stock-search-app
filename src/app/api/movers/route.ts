import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "@/lib/yfinance";
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

export async function GET(req: NextRequest) {
  const type = (req.nextUrl.searchParams.get("type") ?? "day_gainers") as MoverType;
  if (!VALID.has(type)) {
    return NextResponse.json({ error: "invalid type" }, { status: 400 });
  }

  try {
    const result = await yahooFinance.screener({
      scrIds: type,
      count: 15,
    });
    const base = (result.quotes ?? []).map((q) => {
      const o = q as unknown as Record<string, unknown>;
      return {
        symbol: String(o.symbol ?? ""),
        shortName:
          (o.shortName as string | undefined) ??
          (o.longName as string | undefined) ??
          null,
        longName: (o.longName as string | undefined) ?? null,
        price: (o.regularMarketPrice as number | undefined) ?? null,
        change: (o.regularMarketChange as number | undefined) ?? null,
        changePercent:
          (o.regularMarketChangePercent as number | undefined) ?? null,
        currency: (o.currency as string | undefined) ?? null,
        marketCap: (o.marketCap as number | undefined) ?? null,
        volume: (o.regularMarketVolume as number | undefined) ?? null,
      };
    });
    const namesJa = await Promise.all(
      base.map((q) => getCompanyNameJa(q.symbol, q.longName ?? q.shortName)),
    );
    const quotes = base.map((q, i) => ({ ...q, nameJa: namesJa[i] }));
    return NextResponse.json({ quotes });
  } catch (err) {
    console.error("movers error", err);
    return NextResponse.json(
      { error: "ランキング取得に失敗しました", quotes: [] },
      { status: 500 },
    );
  }
}
