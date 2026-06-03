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
    const q = (await (yahooFinance.quote as Function)(
      symbol,
      {},
      { validateResult: false },
    )) as Record<string, unknown>;
    const englishName =
      (q?.longName as string | undefined) ??
      (q?.shortName as string | undefined) ??
      null;
    const nameJa = await getCompanyNameJa(symbol, englishName);
    return NextResponse.json({ quote: { ...q, nameJa } });
  } catch (err) {
    console.error("quote error", err);
    return NextResponse.json(
      { error: "株価取得に失敗しました" },
      { status: 500 },
    );
  }
}
