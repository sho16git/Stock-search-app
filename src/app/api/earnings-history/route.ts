/**
 * /api/earnings-history — Quarterly earnings history for a single symbol.
 *
 * Returns up to 12 quarters of:
 *   - EPS actual / estimate / surprise
 *   - Revenue & net income (quarterly, where available)
 *
 * Query params:
 *   symbol  — required, e.g. "AAPL" or "7203.T"
 */
import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "@/lib/yfinance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "object" && v !== null) {
    const raw = (v as Record<string, unknown>).raw;
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  }
  return null;
}

function isoDate(v: unknown): string | null {
  if (!v) return null;
  try {
    const d = v instanceof Date ? v : new Date(String(v));
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

export type EarningsHistEntry = {
  date:               string;
  period:             string | null;
  epsActual:          number | null;
  epsEstimate:        number | null;
  epsSurprise:        number | null;
  epsSurprisePercent: number | null;
  revenue:            number | null;
  netIncome:          number | null;
};

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim();
  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  try {
    // ── EPS history ──────────────────────────────────────────
    const summary = await yahooFinance.quoteSummary(symbol, {
      modules: ["earningsHistory", "price"],
    });

    const currency =
      (summary.price as Record<string, unknown> | undefined)?.currency as string | null ?? null;

    const epsHistory =
      ((summary.earningsHistory as Record<string, unknown> | undefined)?.history as unknown[]) ?? [];

    const entryMap = new Map<string, EarningsHistEntry>();

    for (const e of epsHistory) {
      const o = e as Record<string, unknown>;
      const date = isoDate(o.quarter);
      if (!date) continue;
      const key = date.slice(0, 7); // YYYY-MM
      entryMap.set(key, {
        date,
        period:             typeof o.period === "string" ? o.period : null,
        epsActual:          num(o.epsActual),
        epsEstimate:        num(o.epsEstimate),
        epsSurprise:        num(o.epsDifference),
        epsSurprisePercent: num(o.surprisePercent),
        revenue:            null,
        netIncome:          null,
      });
    }

    // ── Revenue (quarterly income statement) ────────────────
    try {
      const incSummary = await yahooFinance.quoteSummary(symbol, {
        modules: ["incomeStatementHistoryQuarterly"],
      });
      const incQ =
        ((incSummary.incomeStatementHistoryQuarterly as Record<string, unknown> | undefined)
          ?.incomeStatementHistory as unknown[]) ?? [];

      for (const s of incQ) {
        const o = s as Record<string, unknown>;
        const date = isoDate(o.endDate);
        if (!date) continue;
        const key = date.slice(0, 7);
        const entry = entryMap.get(key) ?? {
          date,
          period:             null,
          epsActual:          null,
          epsEstimate:        null,
          epsSurprise:        null,
          epsSurprisePercent: null,
          revenue:            null,
          netIncome:          null,
        };
        const rev = num(o.totalRevenue) ?? num((o.totalRevenue as Record<string, unknown>)?.raw);
        const ni  = num(o.netIncome)    ?? num((o.netIncome    as Record<string, unknown>)?.raw);
        if (rev !== null) entry.revenue   = rev;
        if (ni  !== null) entry.netIncome = ni;
        entryMap.set(key, entry);
      }
    } catch {
      // Revenue is optional — carry on without it
    }

    const history = [...entryMap.values()]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 12); // max 3 years of quarters

    return NextResponse.json({ symbol, currency, history });
  } catch (err) {
    console.error("earnings-history error", err);
    return NextResponse.json({ error: "データ取得に失敗しました" }, { status: 500 });
  }
}
