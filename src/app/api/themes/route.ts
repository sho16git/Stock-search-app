import { NextResponse } from "next/server";
import yahooFinance from "@/lib/yfinance";
import { getCompanyNameJa } from "@/lib/translate-name";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 300;

const THEMES: Array<{
  id: string;
  scrId:
    | "undervalued_large_caps"
    | "growth_technology_stocks"
    | "aggressive_small_caps"
    | "small_cap_gainers"
    | "undervalued_growth_stocks";
  label: string;
  emoji: string;
  description: string;
}> = [
  {
    id: "undervalued_large_caps",
    scrId: "undervalued_large_caps",
    label: "割安大型株",
    emoji: "💎",
    description: "バリュエーション低めの大型優良株",
  },
  {
    id: "growth_technology_stocks",
    scrId: "growth_technology_stocks",
    label: "成長テック株",
    emoji: "🚀",
    description: "高成長率のテクノロジー銘柄",
  },
  {
    id: "small_cap_gainers",
    scrId: "small_cap_gainers",
    label: "中小型上昇株",
    emoji: "📈",
    description: "本日上昇率上位の中小型株",
  },
  {
    id: "undervalued_growth_stocks",
    scrId: "undervalued_growth_stocks",
    label: "割安成長株",
    emoji: "🎯",
    description: "成長性と割安性を兼ね備えた銘柄",
  },
];

export async function GET() {
  try {
    const results = await Promise.all(
      THEMES.map(async (theme) => {
        try {
          const data = await yahooFinance.screener({
            scrIds: theme.scrId,
            count: 6,
          });
          const base = (data.quotes ?? []).slice(0, 6).map((q) => {
            const o = q as unknown as Record<string, unknown>;
            return {
              symbol: String(o.symbol ?? ""),
              shortName:
                (o.shortName as string | undefined) ??
                (o.longName as string | undefined) ??
                null,
              longName: (o.longName as string | undefined) ?? null,
              price: (o.regularMarketPrice as number | undefined) ?? null,
              changePercent:
                (o.regularMarketChangePercent as number | undefined) ?? null,
              currency: (o.currency as string | undefined) ?? null,
            };
          });
          const namesJa = await Promise.all(
            base.map((b) =>
              getCompanyNameJa(b.symbol, b.longName ?? b.shortName),
            ),
          );
          const quotes = base.map((b, i) => ({ ...b, nameJa: namesJa[i] }));
          return { ...theme, quotes };
        } catch {
          return { ...theme, quotes: [] };
        }
      }),
    );
    return NextResponse.json({ themes: results });
  } catch (err) {
    console.error("themes error", err);
    return NextResponse.json(
      { error: "投資テーマ取得に失敗しました", themes: [] },
      { status: 500 },
    );
  }
}
