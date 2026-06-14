/**
 * /api/financial-statements?symbol=AAPL
 * 損益計算書・貸借対照表・CF計算書の年次データ (最大5期)
 * uses fundamentalsTimeSeries (yahoo-finance2)
 */
import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "@/lib/yfinance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function num(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  return null;
}

function yr(date: unknown): string {
  if (!date) return "—";
  const d = date instanceof Date ? date : new Date(String(date));
  return isNaN(d.getTime()) ? "—" : String(d.getFullYear());
}

export type IncomeRow = {
  period: string;
  revenue: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  netIncome: number | null;
  eps: number | null;
};

export type BalanceRow = {
  period: string;
  totalAssets: number | null;
  totalLiabilities: number | null;
  totalEquity: number | null;
  cash: number | null;
  longTermDebt: number | null;
};

export type CashflowRow = {
  period: string;
  operatingCF: number | null;
  investingCF: number | null;
  financingCF: number | null;
  capex: number | null;
  freeCF: number | null;
};

export type FinancialStatementsResp = {
  income: IncomeRow[];
  balance: BalanceRow[];
  cashflow: CashflowRow[];
  error?: string;
};

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim();
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  try {
    const period1 = new Date(Date.now() - 6 * 365 * 86400_000); // 6 years back

    const rows = await yahooFinance.fundamentalsTimeSeries(symbol, {
      period1,
      type: "annual",
      module: "all",
    } as Parameters<typeof yahooFinance.fundamentalsTimeSeries>[1]);

    // Sort ascending by date, filter rows that have at least revenue or totalAssets
    const sorted = (rows as Record<string, unknown>[])
      .filter(r => num(r.totalRevenue) != null || num(r.totalAssets) != null)
      .sort((a, b) => {
        const da = a.date instanceof Date ? a.date.getTime() : 0;
        const db = b.date instanceof Date ? b.date.getTime() : 0;
        return da - db;
      })
      .slice(-5); // latest 5 years

    const income: IncomeRow[] = sorted.map(r => ({
      period: yr(r.date),
      revenue: num(r.totalRevenue),
      grossProfit: num(r.grossProfit),
      operatingIncome: num(r.operatingIncome),
      netIncome: num(r.netIncome),
      eps: num(r.dilutedEPS) ?? num(r.basicEPS),
    }));

    const balance: BalanceRow[] = sorted.map(r => ({
      period: yr(r.date),
      totalAssets: num(r.totalAssets),
      totalLiabilities: num(r.totalLiabilitiesNetMinorityInterest),
      totalEquity: num(r.stockholdersEquity),
      cash: num(r.cashAndCashEquivalents),
      longTermDebt: num(r.longTermDebt),
    }));

    const cashflow: CashflowRow[] = sorted.map(r => {
      const opCF  = num(r.operatingCashFlow);
      const capex = num(r.capitalExpenditure);
      const free  = num(r.freeCashFlow) ?? (opCF != null && capex != null ? opCF + capex : null);
      return {
        period: yr(r.date),
        operatingCF: opCF,
        investingCF: num(r.investingCashFlow),
        financingCF: num(r.financingCashFlow),
        capex,
        freeCF: free,
      };
    });

    return NextResponse.json(
      { income, balance, cashflow } satisfies FinancialStatementsResp,
      { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=7200" } }
    );
  } catch (err) {
    console.error("financial-statements error", err);
    return NextResponse.json(
      { error: "財務データ取得に失敗しました", income: [], balance: [], cashflow: [] },
      { status: 500 }
    );
  }
}
