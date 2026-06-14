import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "@/lib/yfinance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FinRow = {
  period: string;
  revenue: number | null;
  netIncome: number | null;
  eps: number | null;
};

function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  return null;
}

function fmtPeriod(date: unknown, quarterly: boolean): string {
  if (!date) return "—";
  const d = date instanceof Date ? date : new Date(String(date));
  if (Number.isNaN(d.getTime())) return "—";
  if (quarterly) {
    const q = Math.ceil((d.getMonth() + 1) / 3);
    return `${d.getFullYear()}Q${q}`;
  }
  return String(d.getFullYear());
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim();
  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  try {
    const summary = await yahooFinance.quoteSummary(symbol, {
      modules: ["incomeStatementHistory", "incomeStatementHistoryQuarterly"],
    });

    // Annual
    const annualStatements =
      (summary.incomeStatementHistory as { incomeStatementHistory?: unknown[] } | null)
        ?.incomeStatementHistory ?? [];

    const annual: FinRow[] = (annualStatements as Record<string, unknown>[])
      .slice(0, 4)
      .map((s) => ({
        period: fmtPeriod(s.endDate, false),
        revenue: num(s.totalRevenue),
        netIncome: num(s.netIncome),
        eps: null,
      }))
      .reverse();

    // Quarterly
    const quarterlyStatements =
      (summary.incomeStatementHistoryQuarterly as { incomeStatementHistory?: unknown[] } | null)
        ?.incomeStatementHistory ?? [];

    const quarterly: FinRow[] = (quarterlyStatements as Record<string, unknown>[])
      .slice(0, 4)
      .map((s) => ({
        period: fmtPeriod(s.endDate, true),
        revenue: num(s.totalRevenue),
        netIncome: num(s.netIncome),
        eps: null,
      }))
      .reverse();

    return NextResponse.json({ annual, quarterly }, {
    headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" },
  });
  } catch (err) {
    console.error("financials error", err);
    return NextResponse.json(
      { error: "財務データ取得に失敗しました", annual: [], quarterly: [] },
      { status: 500 },
    );
  }
}
