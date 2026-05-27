import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "@/lib/yfinance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isoOrNull(v: unknown): string | null {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string") return v;
  if (Array.isArray(v) && v[0]) return isoOrNull(v[0]);
  return null;
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim();
  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  try {
    const summary = await yahooFinance.quoteSummary(symbol, {
      modules: ["calendarEvents", "summaryDetail", "earningsHistory", "price"],
    });
    const currency = summary.price?.currency ?? null;
    const cal = summary.calendarEvents as
      | {
          earnings?: {
            earningsDate?: unknown;
            earningsCallDate?: unknown;
            earningsAverage?: number;
            earningsLow?: number;
            earningsHigh?: number;
            revenueAverage?: number;
            isEarningsDateEstimate?: boolean;
          };
          exDividendDate?: unknown;
          dividendDate?: unknown;
        }
      | undefined;
    const sd = summary.summaryDetail;
    const earningsHistory = (summary.earningsHistory as
      | { history?: unknown[] }
      | undefined)?.history;

    const recentEarnings = Array.isArray(earningsHistory)
      ? earningsHistory.slice(-4).map((e) => {
          const o = e as Record<string, unknown>;
          return {
            quarter: isoOrNull(o.quarter),
            epsActual: (o.epsActual as number | undefined) ?? null,
            epsEstimate: (o.epsEstimate as number | undefined) ?? null,
            epsDifference: (o.epsDifference as number | undefined) ?? null,
            surprisePercent: (o.surprisePercent as number | undefined) ?? null,
          };
        })
      : [];

    return NextResponse.json({
      currency,
      nextEarningsDate: isoOrNull(cal?.earnings?.earningsDate),
      isEarningsEstimated: cal?.earnings?.isEarningsDateEstimate ?? null,
      earningsCallDate: isoOrNull(cal?.earnings?.earningsCallDate),
      epsEstimateAverage: cal?.earnings?.earningsAverage ?? null,
      epsEstimateLow: cal?.earnings?.earningsLow ?? null,
      epsEstimateHigh: cal?.earnings?.earningsHigh ?? null,
      revenueEstimateAverage: cal?.earnings?.revenueAverage ?? null,
      exDividendDate: isoOrNull(cal?.exDividendDate),
      dividendDate: isoOrNull(cal?.dividendDate),
      dividendRate: sd?.dividendRate ?? null,
      dividendYield: sd?.dividendYield ?? null,
      payoutRatio: sd?.payoutRatio ?? null,
      fiveYearAvgDividendYield: sd?.fiveYearAvgDividendYield ?? null,
      recentEarnings,
    });
  } catch (err) {
    console.error("events error", err);
    return NextResponse.json(
      { error: "決算・配当情報の取得に失敗しました" },
      { status: 500 },
    );
  }
}
