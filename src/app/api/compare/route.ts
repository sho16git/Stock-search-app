/**
 * /api/compare?symbols=AAPL,MSFT,7203.T
 * 複数銘柄の比較指標(株価・前日比・PER・PBR・ROE・配当利回り・時価総額・52週位置)をまとめて返す。
 */
import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "@/lib/yfinance";
import { getJpName } from "@/lib/jp-stocks";
import { getUsKatakana } from "@/lib/us-katakana";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const num = (v: unknown): number | null => {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "object" && "raw" in (v as object)) {
    const r = (v as { raw?: number }).raw;
    return typeof r === "number" && Number.isFinite(r) ? r : null;
  }
  return null;
};

function name(symbol: string, longName?: string | null): string {
  return getJpName(symbol) ?? getUsKatakana(symbol) ?? longName ?? symbol;
}

export type CompareRow = {
  symbol: string;
  name: string;
  price: number | null;
  changePercent: number | null;
  currency: string | null;
  per: number | null;
  pbr: number | null;
  roe: number | null;
  operatingMargin: number | null; // 営業利益率
  revenueGrowth: number | null;   // 売上成長率
  eps: number | null;
  beta: number | null;
  payoutRatio: number | null;     // 配当性向
  dividendYield: number | null;
  marketCap: number | null;
  targetMeanPrice: number | null; // アナリスト平均目標
  targetUpside: number | null;    // 現在値からの乖離 %
  week52Position: number | null;  // 0..100
};

const emptyRow = (s: string): CompareRow => ({
  symbol: s, name: s, price: null, changePercent: null, currency: null,
  per: null, pbr: null, roe: null, operatingMargin: null, revenueGrowth: null,
  eps: null, beta: null, payoutRatio: null, dividendYield: null, marketCap: null,
  targetMeanPrice: null, targetUpside: null, week52Position: null,
});

async function fetchRow(symbol: string): Promise<CompareRow> {
  let q: Record<string, unknown> = {};
  let fin: Record<string, unknown> = {};
  let stat: Record<string, unknown> = {};
  try {
    q = (await (yahooFinance.quote as (s: string) => Promise<Record<string, unknown>>)(symbol)) ?? {};
  } catch { /* ignore */ }
  try {
    const s = await (yahooFinance.quoteSummary as (s: string, o: object) => Promise<Record<string, unknown>>)(
      symbol, { modules: ["financialData", "defaultKeyStatistics", "summaryDetail"] });
    fin = (s.financialData ?? {}) as Record<string, unknown>;
    stat = (s.defaultKeyStatistics ?? {}) as Record<string, unknown>;
    const det = (s.summaryDetail ?? {}) as Record<string, unknown>;
    if (q.payoutRatio == null) q.payoutRatio = det.payoutRatio;
  } catch { /* ignore */ }

  const price = num(q.regularMarketPrice);
  const hi = num(q.fiftyTwoWeekHigh);
  const lo = num(q.fiftyTwoWeekLow);
  const pos = price != null && hi != null && lo != null && hi !== lo
    ? Math.round(((price - lo) / (hi - lo)) * 100)
    : null;
  const target = num(fin.targetMeanPrice);
  const upside = target != null && price != null && price > 0
    ? Math.round(((target - price) / price) * 1000) / 10
    : null;

  // 配当利回り: q.dividendYield は%値(例 4.96)、trailingAnnualDividendYield は比率(例 0.0496)。
  // ADRなどで trailing が壊れる(配当が現地通貨・株価がドル)ため、% フィールドを優先し
  // 異常値(>30%)は無効化する。
  const divPct = num(q.dividendYield);            // percentage
  let dividendYield = divPct != null ? divPct / 100 : num(q.trailingAnnualDividendYield);
  if (dividendYield != null && (dividendYield > 0.30 || dividendYield < 0)) dividendYield = null;

  return {
    symbol,
    name: name(symbol, (q.longName ?? q.shortName) as string | undefined),
    price,
    changePercent: num(q.regularMarketChangePercent),
    currency: (q.currency as string) ?? null,
    per: num(q.trailingPE),
    pbr: num(q.priceToBook),
    roe: num(fin.returnOnEquity),
    operatingMargin: num(fin.operatingMargins),
    revenueGrowth: num(fin.revenueGrowth),
    eps: num(q.epsTrailingTwelveMonths) ?? num(stat.trailingEps),
    beta: num(stat.beta),
    payoutRatio: num(q.payoutRatio),
    dividendYield,
    marketCap: num(q.marketCap),
    targetMeanPrice: target,
    targetUpside: upside,
    week52Position: pos,
  };
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("symbols")?.trim();
  if (!raw) return NextResponse.json({ rows: [] });
  const symbols = [...new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))].slice(0, 4);

  const rows = await Promise.all(symbols.map((s) => fetchRow(s).catch(() => emptyRow(s))));

  return NextResponse.json({ rows });
}
