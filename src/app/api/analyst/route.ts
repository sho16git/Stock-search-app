import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "@/lib/yfinance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TrendPoint = {
  period: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
};

type UpgradeAction = {
  date: string;
  firm: string;
  toGrade: string | null;
  fromGrade: string | null;
  action: string | null;
  priceTargetAction: string | null;
  currentPriceTarget: number | null;
  priorPriceTarget: number | null;
};

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim();
  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  try {
    const summary = await yahooFinance.quoteSummary(symbol, {
      modules: [
        "financialData",
        "recommendationTrend",
        "upgradeDowngradeHistory",
        "price",
      ],
    });

    const fin = (summary.financialData ?? null) as Record<
      string,
      unknown
    > | null;
    const price = summary.price;

    const trend = Array.isArray(
      (summary.recommendationTrend as { trend?: unknown } | undefined)?.trend,
    )
      ? (
          (summary.recommendationTrend as { trend: unknown[] })
            .trend as unknown[]
        ).map((p) => {
          const x = p as Record<string, unknown>;
          return {
            period: String(x.period ?? ""),
            strongBuy: Number(x.strongBuy ?? 0),
            buy: Number(x.buy ?? 0),
            hold: Number(x.hold ?? 0),
            sell: Number(x.sell ?? 0),
            strongSell: Number(x.strongSell ?? 0),
          } satisfies TrendPoint;
        })
      : [];

    const history = Array.isArray(
      (summary.upgradeDowngradeHistory as { history?: unknown } | undefined)
        ?.history,
    )
      ? (
          (summary.upgradeDowngradeHistory as { history: unknown[] })
            .history as unknown[]
        )
          .slice(0, 20)
          .map((h) => {
            const x = h as Record<string, unknown>;
            const date = x.epochGradeDate;
            return {
              date:
                date instanceof Date
                  ? date.toISOString()
                  : typeof date === "string"
                    ? date
                    : "",
              firm: String(x.firm ?? ""),
              toGrade: (x.toGrade as string | undefined) ?? null,
              fromGrade: (x.fromGrade as string | undefined) ?? null,
              action: (x.action as string | undefined) ?? null,
              priceTargetAction:
                (x.priceTargetAction as string | undefined) ?? null,
              currentPriceTarget:
                (x.currentPriceTarget as number | undefined) ?? null,
              priorPriceTarget:
                (x.priorPriceTarget as number | undefined) ?? null,
            } satisfies UpgradeAction;
          })
      : [];

    return NextResponse.json({
      currentPrice: (fin?.currentPrice as number | undefined) ?? null,
      currency: price?.currency ?? null,
      targetHigh: (fin?.targetHighPrice as number | undefined) ?? null,
      targetLow: (fin?.targetLowPrice as number | undefined) ?? null,
      targetMean: (fin?.targetMeanPrice as number | undefined) ?? null,
      targetMedian: (fin?.targetMedianPrice as number | undefined) ?? null,
      recommendationKey:
        (fin?.recommendationKey as string | undefined) ?? null,
      recommendationMean:
        (fin?.recommendationMean as number | undefined) ?? null,
      numberOfAnalystOpinions:
        (fin?.numberOfAnalystOpinions as number | undefined) ?? null,
      trend,
      history,
    });
  } catch (err) {
    console.error("analyst error", err);
    return NextResponse.json(
      { error: "アナリスト情報の取得に失敗しました" },
      { status: 500 },
    );
  }
}
