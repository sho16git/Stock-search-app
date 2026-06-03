/**
 * /api/earnings-history — Quarterly earnings history.
 *
 * Japanese stocks (*.T): uses J-Quants /fins/statements (primary),
 *   falls back to Yahoo Finance earningsHistory when J-Quants unavailable.
 * US stocks: uses Yahoo Finance earningsHistory + incomeStatementHistoryQuarterly.
 *
 * Query params:
 *   symbol  — required, e.g. "7203.T" or "AAPL"
 */
import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "@/lib/yfinance";
import { isJQuantsConfigured, jquantsGet } from "@/lib/jquants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── Shared helpers ─────────────────────────────────────────────────
function numStr(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function isoDate(v: unknown): string | null {
  if (!v) return null;
  try {
    const d = v instanceof Date ? v : new Date(String(v));
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  } catch { return null; }
}

// ── J-Quants types ─────────────────────────────────────────────────
type JQStatement = Record<string, unknown>;

/** Format J-Quants period into a human-readable label */
function fmtJQPeriod(periodType: string, fyEndDate: string): string {
  try {
    const d = new Date(fyEndDate + "T00:00:00");
    const yr  = d.getFullYear();
    const mon = d.getMonth() + 1;
    const label: Record<string, string> = {
      "1Q": "第1四半期", "2Q": "第2四半期",
      "3Q": "第3四半期", "FY": "通期",
    };
    return `${yr}年${mon}月期 ${label[periodType] ?? periodType}`;
  } catch { return periodType; }
}

// ── J-Quants earnings history for JP stocks ────────────────────────
async function fetchJQHistory(code4: string) {
  type Resp = { statements?: JQStatement[]; pagination_key?: string };

  const all: JQStatement[] = [];
  let pgKey: string | undefined;

  // Fetch all pages (usually 1–2 for a single stock)
  do {
    const params: Record<string, string> = { code: code4 };
    if (pgKey) params.pagination_key = pgKey;
    const data = await jquantsGet<Resp>("/fins/statements", params);
    all.push(...(data.statements ?? []));
    pgKey = data.pagination_key;
  } while (pgKey);

  type Entry = {
    date:               string;
    period:             string;
    periodType:         string;
    epsActual:          number | null;
    epsEstimate:        number | null;  // company forecast EPS
    epsSurprise:        number | null;
    epsSurprisePercent: number | null;
    revenue:            number | null;
    operatingProfit:    number | null;
    netIncome:          number | null;
    forecastRevenue:    number | null;
    forecastNetIncome:  number | null;
    forecastEps:        number | null;
    source:             "jquants";
  };

  const entries: Entry[] = [];

  for (const s of all) {
    const disclosedDate = String(s.DisclosedDate ?? "");
    const fyEnd         = String(s.CurrentFiscalYearEndDate ?? "");
    const periodType    = String(s.TypeOfCurrentPeriod ?? "");

    if (!disclosedDate || !periodType) continue;

    const epsActual   = numStr(s.EarningsPerShare);
    const forecastEps = numStr(s.ForecastEarningsPerShare);

    // Compute EPS surprise vs company's own forecast (if both present)
    let epsSurprise: number | null = null;
    let epsSurprisePct: number | null = null;
    if (epsActual !== null && forecastEps !== null && forecastEps !== 0) {
      epsSurprise    = epsActual - forecastEps;
      epsSurprisePct = (epsSurprise / Math.abs(forecastEps)) * 100;
    }

    entries.push({
      date:               disclosedDate,
      period:             fyEnd ? fmtJQPeriod(periodType, fyEnd) : periodType,
      periodType,
      epsActual,
      epsEstimate:        forecastEps,  // company guidance = "estimate" for JP
      epsSurprise,
      epsSurprisePercent: epsSurprisePct,
      revenue:            numStr(s.NetSales),
      operatingProfit:    numStr(s.OperatingProfit),
      netIncome:          numStr(s.Profit),
      forecastRevenue:    numStr(s.ForecastNetSales),
      forecastNetIncome:  numStr(s.ForecastProfit),
      forecastEps,
      source:             "jquants",
    });
  }

  // Sort: most recent disclosure first, then deduplicate by period label
  entries.sort((a, b) => b.date.localeCompare(a.date));

  // Deduplicate: keep only most recent disclosure per (periodType, fyEnd subset)
  const seen = new Set<string>();
  return entries.filter(e => {
    const key = `${e.period}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 16); // max 4 years
}

// ── Yahoo Finance earnings history (US + fallback JP) ──────────────
async function fetchYahooHistory(symbol: string) {
  const summary = await yahooFinance.quoteSummary(symbol, {
    modules: ["earningsHistory", "price"],
  });

  const currency =
    (summary.price as Record<string, unknown> | undefined)?.currency as string | null ?? null;

  const epsHistory =
    ((summary.earningsHistory as Record<string, unknown> | undefined)
      ?.history as unknown[]) ?? [];

  type Entry = {
    date:               string;
    period:             string | null;
    periodType:         string | null;
    epsActual:          number | null;
    epsEstimate:        number | null;
    epsSurprise:        number | null;
    epsSurprisePercent: number | null;
    revenue:            number | null;
    operatingProfit:    number | null;
    netIncome:          number | null;
    forecastRevenue:    number | null;
    forecastNetIncome:  number | null;
    forecastEps:        number | null;
    source:             "yahoo";
  };

  const entryMap = new Map<string, Entry>();

  for (const e of epsHistory) {
    const o    = e as Record<string, unknown>;
    const date = isoDate(o.quarter);
    if (!date) continue;
    const key = date.slice(0, 7);
    entryMap.set(key, {
      date,
      period:             typeof o.period === "string" ? o.period : null,
      periodType:         null,
      epsActual:          numStr(o.epsActual),
      epsEstimate:        numStr(o.epsEstimate),
      epsSurprise:        numStr(o.epsDifference),
      epsSurprisePercent: numStr(o.surprisePercent),
      revenue:            null,
      operatingProfit:    null,
      netIncome:          null,
      forecastRevenue:    null,
      forecastNetIncome:  null,
      forecastEps:        null,
      source:             "yahoo",
    });
  }

  // Supplement with quarterly income statement
  try {
    const inc = await yahooFinance.quoteSummary(symbol, {
      modules: ["incomeStatementHistoryQuarterly"],
    });
    const incQ =
      ((inc.incomeStatementHistoryQuarterly as Record<string, unknown> | undefined)
        ?.incomeStatementHistory as unknown[]) ?? [];

    for (const s of incQ) {
      const o    = s as Record<string, unknown>;
      const date = isoDate(o.endDate);
      if (!date) continue;
      const key   = date.slice(0, 7);
      const entry = entryMap.get(key);
      if (entry) {
        entry.revenue   = numStr((o.totalRevenue as Record<string,unknown>)?.raw ?? o.totalRevenue);
        entry.netIncome = numStr((o.netIncome    as Record<string,unknown>)?.raw ?? o.netIncome);
      }
    }
  } catch { /* income statement is optional */ }

  const history = [...entryMap.values()]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 12);

  return { currency, history };
}

// ── Route handler ──────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim();
  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  const isJP = symbol.endsWith(".T");

  try {
    // ── Japanese stocks: J-Quants primary ──────────────────────────
    if (isJP && isJQuantsConfigured()) {
      const code4 = symbol.replace(".T", "").slice(0, 4);
      try {
        const history = await fetchJQHistory(code4);
        return NextResponse.json({ symbol, currency: "JPY", history });
      } catch (jqErr) {
        console.warn(`J-Quants statements failed for ${symbol}, falling back to Yahoo:`, jqErr);
        // Fall through to Yahoo Finance
      }
    }

    // ── US stocks (or JP fallback) ─────────────────────────────────
    const { currency, history } = await fetchYahooHistory(symbol);
    return NextResponse.json({ symbol, currency, history });
  } catch (err) {
    console.error("earnings-history error", err);
    return NextResponse.json({ error: "データ取得に失敗しました" }, { status: 500 });
  }
}
