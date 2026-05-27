import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "@/lib/yfinance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type YearRow = {
  year: number;
  eps: number | null;
  per: number | null;
  pbr: number | null;
  roe: number | null;
  netIncome: number | null;
  revenue: number | null;
  equity: number | null;
};

type TSPoint = { date: Date | string; [key: string]: unknown };

function getYear(date: unknown): number | null {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(String(date));
  if (Number.isNaN(d.getTime())) return null;
  return d.getFullYear();
}

function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  return null;
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim();
  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  try {
    const since = new Date();
    since.setFullYear(since.getFullYear() - 11);

    const [tsResult, summary] = await Promise.all([
      yahooFinance
        .fundamentalsTimeSeries(symbol, {
          period1: since,
          type: "annual",
          module: "all",
        })
        .catch(() => [] as TSPoint[]),
      yahooFinance.quoteSummary(symbol, {
        modules: [
          "defaultKeyStatistics",
          "financialData",
          "summaryDetail",
          "price",
        ],
      }),
    ]);

    const ts = (tsResult as unknown as TSPoint[]) ?? [];
    const byYear = new Map<number, YearRow>();

    for (const p of ts) {
      const y = getYear(p.date);
      if (y === null) continue;
      const row: YearRow = byYear.get(y) ?? {
        year: y,
        eps: null,
        per: null,
        pbr: null,
        roe: null,
        netIncome: null,
        revenue: null,
        equity: null,
      };
      const netIncome =
        num(p.netIncome) ?? num(p.netIncomeCommonStockholders);
      const revenue = num(p.totalRevenue) ?? num(p.operatingRevenue);
      const equity =
        num(p.stockholdersEquity) ??
        num(p.commonStockEquity) ??
        num(p.totalEquityGrossMinorityInterest);
      const eps = num(p.dilutedEPS) ?? num(p.basicEPS);
      if (netIncome !== null) row.netIncome = netIncome;
      if (revenue !== null) row.revenue = revenue;
      if (equity !== null) row.equity = equity;
      if (eps !== null) row.eps = eps;
      if (row.netIncome !== null && row.equity) {
        row.roe = row.netIncome / row.equity;
      }
      byYear.set(y, row);
    }

    const rows = Array.from(byYear.values())
      .filter(
        (r) =>
          r.revenue !== null ||
          r.netIncome !== null ||
          r.equity !== null ||
          r.eps !== null,
      )
      .sort((a, b) => b.year - a.year)
      .slice(0, 10);

    const stats = summary.defaultKeyStatistics;
    const fin = summary.financialData;
    const sd = summary.summaryDetail;
    const price = summary.price;

    const current = {
      trailingPE: sd?.trailingPE ?? null,
      forwardPE: sd?.forwardPE ?? null,
      priceToBook: stats?.priceToBook ?? null,
      trailingEps: stats?.trailingEps ?? null,
      forwardEps: stats?.forwardEps ?? null,
      returnOnEquity: fin?.returnOnEquity ?? null,
      returnOnAssets: fin?.returnOnAssets ?? null,
      profitMargins: fin?.profitMargins ?? null,
      debtToEquity: fin?.debtToEquity ?? null,
      dividendYield: sd?.dividendYield ?? null,
      marketCap: price?.marketCap ?? null,
      currency: price?.currency ?? null,
    };

    return NextResponse.json({ rows, current });
  } catch (err) {
    console.error("fundamentals error", err);
    return NextResponse.json(
      { error: "ファンダメンタルズ取得に失敗しました" },
      { status: 500 },
    );
  }
}
