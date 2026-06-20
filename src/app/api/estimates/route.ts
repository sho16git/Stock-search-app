import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "@/lib/yfinance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Analyst consensus estimates (EPS / revenue forecasts, revisions, surprises) —
// the "業績予想 / Analysis" feature common on Yahoo Finance, 株探, みんかぶ.

const PERIOD_LABEL: Record<string, string> = {
  "0q": "今四半期",
  "+1q": "来四半期",
  "0y": "今期(通期)",
  "+1y": "来期(通期)",
};

function num(v: unknown): number | null {
  return typeof v === "number" && isFinite(v) ? v : null;
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim();
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  try {
    const summary = await yahooFinance.quoteSummary(symbol, {
      modules: ["earningsTrend", "earningsHistory", "price"],
    });

    const price = summary.price as Record<string, unknown> | undefined;
    const currency = (price?.currency as string | undefined) ?? null;

    // ── Consensus EPS / revenue estimates by period ──
    const rawTrend = Array.isArray((summary.earningsTrend as { trend?: unknown })?.trend)
      ? ((summary.earningsTrend as { trend: unknown[] }).trend as Record<string, unknown>[])
      : [];

    const estimates = rawTrend
      .filter((t) => PERIOD_LABEL[String(t.period)] !== undefined)
      .map((t) => {
        const ee = (t.earningsEstimate ?? {}) as Record<string, unknown>;
        const re = (t.revenueEstimate ?? {}) as Record<string, unknown>;
        const key = String(t.period);
        return {
          key,
          label: PERIOD_LABEL[key],
          endDate: (t.endDate as string | undefined) ?? null,
          growth: num(t.growth),
          epsAvg: num(ee.avg), epsLow: num(ee.low), epsHigh: num(ee.high),
          epsAnalysts: num(ee.numberOfAnalysts), epsYearAgo: num(ee.yearAgoEps), epsGrowth: num(ee.growth),
          revAvg: num(re.avg), revLow: num(re.low), revHigh: num(re.high),
          revAnalysts: num(re.numberOfAnalysts), revYearAgo: num(re.yearAgoRevenue), revGrowth: num(re.growth),
        };
      });

    // ── EPS estimate revision trend (current vs 7/30/60/90 days ago) ──
    const epsTrend = rawTrend
      .filter((t) => ["0q", "0y"].includes(String(t.period)))
      .map((t) => {
        const et = (t.epsTrend ?? {}) as Record<string, unknown>;
        const er = (t.epsRevisions ?? {}) as Record<string, unknown>;
        return {
          key: String(t.period),
          label: PERIOD_LABEL[String(t.period)],
          current: num(et.current),
          d7: num(et["7daysAgo"]),
          d30: num(et["30daysAgo"]),
          d60: num(et["60daysAgo"]),
          d90: num(et["90daysAgo"]),
          upLast30: num(er.upLast30days),
          downLast30: num(er.downLast30days),
        };
      });

    // ── Earnings surprise history (actual vs estimate) ──
    const rawHist = Array.isArray((summary.earningsHistory as { history?: unknown })?.history)
      ? ((summary.earningsHistory as { history: unknown[] }).history as Record<string, unknown>[])
      : [];
    const surprises = rawHist.map((h) => ({
      quarter: (h.quarter as string | undefined) ?? "",
      epsActual: num(h.epsActual),
      epsEstimate: num(h.epsEstimate),
      surprisePercent: num(h.surprisePercent),
    })).filter((s) => s.epsActual != null || s.epsEstimate != null);

    return NextResponse.json(
      { currency, estimates, epsTrend, surprises },
      { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=7200" } },
    );
  } catch (err) {
    console.error("estimates error", err);
    return NextResponse.json({ error: "業績予想の取得に失敗しました" }, { status: 500 });
  }
}
