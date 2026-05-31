import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "@/lib/yfinance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type YearlyDividend = {
  year: number;
  total: number;       // 年間配当合計
  count: number;       // 支払回数
  change: number | null;     // 前年比（金額）
  changePct: number | null;  // 前年比（%）
};

export type DividendHistoryData = {
  history: YearlyDividend[];   // 直近 10 年（降順で返す）
  consecutive: number;         // 連続増配/減配の年数
  trend: "increase" | "decrease" | "flat" | "none";
  fiveYearGrowth: number | null;  // 5 年間の配当成長率 %
  cagr: number | null;            // 5 年 CAGR %
  currency: string | null;
};

/* ── 小数誤差を吸収するしきい値 ── */
const EPS = 0.0001;

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim();
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  try {
    /* ── 過去 16 年の配当履歴を取得 ── */
    const period1 = new Date(Date.now() - 365 * 16 * 24 * 60 * 60 * 1000);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawHistory = await (yahooFinance as any).historical(symbol, {
      period1,
      events: "dividends",
    });

    /* ── 通貨取得 ── */
    let currency: string | null = null;
    try {
      const summary = await yahooFinance.quoteSummary(symbol, { modules: ["price"] });
      currency = summary.price?.currency ?? null;
    } catch { /* ignore */ }

    if (!Array.isArray(rawHistory) || rawHistory.length === 0) {
      return NextResponse.json({
        history: [], consecutive: 0, trend: "none",
        fiveYearGrowth: null, cagr: null, currency,
      });
    }

    /* ── 年ごとに集計 ── */
    const byYear = new Map<number, { total: number; count: number }>();
    for (const row of rawHistory) {
      // yahoo-finance2 は dividends プロパティ, 一部 amount の場合もある
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const amount = (row as any).dividends ?? (row as any).amount ?? 0;
      if (typeof amount !== "number" || amount <= 0) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const year = new Date((row as any).date).getFullYear();
      if (!byYear.has(year)) byYear.set(year, { total: 0, count: 0 });
      const e = byYear.get(year)!;
      e.total += amount;
      e.count += 1;
    }

    if (byYear.size === 0) {
      return NextResponse.json({
        history: [], consecutive: 0, trend: "none",
        fiveYearGrowth: null, cagr: null, currency,
      });
    }

    /* ── 昇順ソート ── */
    const sorted = Array.from(byYear.entries()).sort((a, b) => a[0] - b[0]);

    /* ── 当年が部分データなら除外 ── */
    const currentYear = new Date().getFullYear();
    const last = sorted[sorted.length - 1];
    const prev = sorted.length >= 2 ? sorted[sorted.length - 2] : null;
    const isPartial =
      last[0] === currentYear &&
      prev !== null &&
      last[1].count < Math.max(1, prev[1].count - 1); // 前年より 2 回以上少なければ部分
    const years = isPartial ? sorted.slice(0, -1) : sorted;

    /* ── 前年比を計算 ── */
    const history: YearlyDividend[] = years.map(([year, d], i) => {
      if (i === 0) return { year, ...d, change: null, changePct: null };
      const prevTotal = years[i - 1][1].total;
      const change = d.total - prevTotal;
      const changePct = prevTotal > EPS ? (change / prevTotal) * 100 : null;
      return { year, ...d, change, changePct };
    });

    /* ── 連続ストリーク算出（直近から遡る） ── */
    const recent = [...history].reverse();
    const withChange = recent.filter(y => y.change !== null);

    let consecutive = 0;
    let trend: DividendHistoryData["trend"] = "none";

    if (withChange.length > 0) {
      const first = withChange[0];
      if (first.change! > EPS) {
        trend = "increase";
        for (const yr of withChange) {
          if (yr.change! > EPS) consecutive++;
          else break;
        }
      } else if (first.change! < -EPS) {
        trend = "decrease";
        for (const yr of withChange) {
          if (yr.change! < -EPS) consecutive++;
          else break;
        }
      } else {
        trend = "flat";
        consecutive = 1;
      }
    }

    /* ── 5年成長率 & CAGR ── */
    let fiveYearGrowth: number | null = null;
    let cagr: number | null = null;
    const fiveYearsAgo = currentYear - 6;
    const recent5 = history.filter(h => h.year >= fiveYearsAgo && h.year < currentYear);
    if (recent5.length >= 2) {
      const oldest = recent5[0].total;
      const newest = recent5[recent5.length - 1].total;
      if (oldest > EPS) {
        fiveYearGrowth = ((newest - oldest) / oldest) * 100;
        const n = recent5[recent5.length - 1].year - recent5[0].year;
        if (n > 0) cagr = (Math.pow(newest / oldest, 1 / n) - 1) * 100;
      }
    }

    return NextResponse.json({
      history: history.slice(-10).reverse(), // 直近 10 年、新しい順
      consecutive,
      trend,
      fiveYearGrowth,
      cagr,
      currency,
    } satisfies DividendHistoryData);

  } catch (err) {
    console.error("dividend-history error", err);
    return NextResponse.json({
      error: "配当履歴取得失敗",
      history: [], consecutive: 0, trend: "none",
      fiveYearGrowth: null, cagr: null, currency: null,
    });
  }
}
