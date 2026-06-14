import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "@/lib/yfinance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clamp(v: number): number { return Math.max(0, Math.min(100, Math.round(v))); }
function num(v: unknown): number | null {
  return typeof v === "number" && isFinite(v) ? v : null;
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim();
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  try {
    const [quote, summary] = await Promise.all([
      yahooFinance.quote(symbol).catch(() => null),
      yahooFinance.quoteSummary(symbol, {
        modules: ["defaultKeyStatistics", "financialData", "summaryDetail"],
      }).catch(() => null),
    ]);

    const stats = summary?.defaultKeyStatistics as Record<string, unknown> | undefined;
    const fin   = summary?.financialData   as Record<string, unknown> | undefined;
    const sd    = summary?.summaryDetail   as Record<string, unknown> | undefined;
    const q     = quote as Record<string, unknown> | null;

    // ── Value ────────────────────────────────────────────────────────
    const pe      = num(sd?.trailingPE) ?? num(sd?.forwardPE);
    const pbr     = num(stats?.priceToBook);
    const divYield= num(sd?.dividendYield); // fraction: 0.06 = 6%
    const pegRatio= num(stats?.pegRatio);

    const vScores: number[] = [];
    if (pe != null && pe > 0 && pe < 200) vScores.push(clamp(100 - (pe - 5) * 1.5));
    if (pbr != null && pbr > 0)           vScores.push(clamp(100 - pbr * 14));
    if (divYield != null)                  vScores.push(clamp(20 + divYield * 1333));
    if (pegRatio != null && pegRatio > 0 && pegRatio < 10)
      vScores.push(clamp(100 - pegRatio * 10));
    const valueScore = vScores.length ? vScores.reduce((a,b)=>a+b,0)/vScores.length : 50;

    // ── Growth ───────────────────────────────────────────────────────
    const epsGrowth = num(fin?.earningsGrowth);
    const revGrowth = num(fin?.revenueGrowth);
    const fwdEps    = num(stats?.forwardEps);
    const trailEps  = num(stats?.trailingEps);

    const gScores: number[] = [];
    if (epsGrowth != null) gScores.push(clamp(40 + epsGrowth * 200));
    if (revGrowth != null) gScores.push(clamp(40 + revGrowth * 200));
    if (fwdEps != null && trailEps != null && trailEps > 0)
      gScores.push(clamp(50 + ((fwdEps - trailEps) / trailEps) * 200));
    const growthScore = gScores.length ? gScores.reduce((a,b)=>a+b,0)/gScores.length : 50;

    // ── Quality ──────────────────────────────────────────────────────
    const roe          = num(fin?.returnOnEquity);
    const roa          = num(fin?.returnOnAssets);
    const profitMargin = num(fin?.profitMargins);
    const opMargin     = num(fin?.operatingMargins);

    const qScores: number[] = [];
    if (roe != null)          qScores.push(clamp(20 + roe * 267));
    if (roa != null)          qScores.push(clamp(20 + roa * 400));
    if (profitMargin != null) qScores.push(clamp(20 + profitMargin * 200));
    if (opMargin != null)     qScores.push(clamp(20 + opMargin * 150));
    const qualityScore = qScores.length ? qScores.reduce((a,b)=>a+b,0)/qScores.length : 50;

    // ── Momentum ─────────────────────────────────────────────────────
    const hi52  = num(q?.fiftyTwoWeekHigh);
    const lo52  = num(q?.fiftyTwoWeekLow);
    const price = num(q?.regularMarketPrice);
    const chg   = num(q?.regularMarketChangePercent);

    const mScores: number[] = [];
    if (hi52 != null && lo52 != null && price != null && hi52 > lo52)
      mScores.push(clamp(((price - lo52) / (hi52 - lo52)) * 100));
    if (chg != null) mScores.push(clamp(50 + chg * 8));
    const momentumScore = mScores.length ? mScores.reduce((a,b)=>a+b,0)/mScores.length : 50;

    // ── Financial Health ─────────────────────────────────────────────
    const currentRatio = num(fin?.currentRatio);
    const debtToEquity = num(fin?.debtToEquity);
    const quickRatio   = num(fin?.quickRatio);

    const hScores: number[] = [];
    if (currentRatio != null && currentRatio > 0)
      hScores.push(clamp(currentRatio < 1 ? currentRatio * 50 : Math.min(100, 50 + (currentRatio - 1) * 25)));
    if (debtToEquity != null && debtToEquity >= 0)
      hScores.push(clamp(100 - debtToEquity * 0.2));
    if (quickRatio != null && quickRatio > 0)
      hScores.push(clamp(quickRatio < 1 ? quickRatio * 40 : Math.min(100, 40 + (quickRatio - 1) * 30)));
    const healthScore = hScores.length ? hScores.reduce((a,b)=>a+b,0)/hScores.length : 50;

    // ── Composite ────────────────────────────────────────────────────
    const total = Math.round(
      valueScore * 0.25 + growthScore * 0.25 +
      qualityScore * 0.25 + momentumScore * 0.15 + healthScore * 0.10
    );

    return NextResponse.json({
      symbol,
      total,
      factors: {
        value:    Math.round(valueScore),
        growth:   Math.round(growthScore),
        quality:  Math.round(qualityScore),
        momentum: Math.round(momentumScore),
        health:   Math.round(healthScore),
      },
      meta: {
        pe, pbr,
        divYield: divYield != null ? +(divYield * 100).toFixed(2) : null,
        epsGrowth: epsGrowth != null ? +(epsGrowth * 100).toFixed(1) : null,
        revGrowth: revGrowth != null ? +(revGrowth * 100).toFixed(1) : null,
        roe: roe != null ? +(roe * 100).toFixed(1) : null,
        currentRatio, debtToEquity,
      },
    }, {
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" },
    });
  } catch (err) {
    console.error("quant-score error", err);
    return NextResponse.json({ error: "スコア計算に失敗しました" }, { status: 500 });
  }
}
