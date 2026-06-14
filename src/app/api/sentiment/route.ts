import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 3600;

const BASE = "https://query1.finance.yahoo.com/v10/finance/quoteSummary";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  try {
    const url = `${BASE}/${encodeURIComponent(symbol)}?modules=recommendationTrend,financialData`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const json = await res.json();
    const result = json?.quoteSummary?.result?.[0];

    const trend = result?.recommendationTrend?.trend?.[0]; // 最新期
    const fin = result?.financialData;

    if (trend) {
      const strongBuy  = trend.strongBuy  ?? 0;
      const buy        = trend.buy        ?? 0;
      const hold       = trend.hold       ?? 0;
      const sell       = trend.sell       ?? 0;
      const strongSell = trend.strongSell ?? 0;

      const buyCount  = strongBuy + buy;
      const sellCount = sell + strongSell;
      const total     = buyCount + hold + sellCount;

      return NextResponse.json({
        buyPct:  total ? Math.round((buyCount  / total) * 100) : null,
        holdPct: total ? Math.round((hold      / total) * 100) : null,
        sellPct: total ? Math.round((sellCount / total) * 100) : null,
        total,
        recommendationKey: fin?.recommendationKey         ?? null,
        targetPrice:       fin?.targetMeanPrice?.raw      ?? null,
        currentPrice:      fin?.currentPrice?.raw         ?? null,
      }, {
    headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" },
  });
    }

    return NextResponse.json({ buyPct: null, sellPct: null, holdPct: null, total: 0 }, {
    headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" },
  });
  } catch (err) {
    console.error("sentiment error", err);
    return NextResponse.json(
      { error: "failed", buyPct: null, sellPct: null, holdPct: null, total: 0 },
      { status: 500 },
    );
  }
}
