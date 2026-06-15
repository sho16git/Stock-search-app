import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "@/lib/yfinance";
import { cached } from "@/lib/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Interval = "1m" | "5m" | "15m" | "30m" | "60m" | "1h" | "1d" | "1wk" | "1mo";

const RANGES: Record<string, {
  period: number;
  interval: Interval;
  intraday?: boolean;
  /** If true, filter the result to only the most recent trading session */
  singleDay?: boolean;
}> = {
  /* ── 足種 (intraday bar sizes) ─────────────────────────────────── */
  // 1分足: 7日分取得して最新取引日のみ返す（Yahoo は直近7日まで1m対応）
  "1min":  { period: 7,        interval: "1m",  intraday: true, singleDay: true },
  "5min":  { period: 3,        interval: "5m",  intraday: true  },
  "10min": { period: 5,        interval: "15m", intraday: true  },
  "30min": { period: 5,        interval: "30m", intraday: true  },
  "1h":    { period: 30,       interval: "60m", intraday: true  },
  /* ── 期間プリセット ─────────────────────────────────────────────── */
  // 1日: 7日分取得して最新取引日のみ返す
  "1d":    { period: 7,        interval: "5m",  intraday: true, singleDay: true },
  "5d":    { period: 5,        interval: "30m", intraday: true  },
  "1mo":   { period: 30,       interval: "1d"  },
  "3mo":   { period: 90,       interval: "1d"  },
  "6mo":   { period: 180,      interval: "1d"  },
  "1y":    { period: 365,      interval: "1d"  },
  "5y":    { period: 365 * 5,  interval: "1wk" },
  "10y":   { period: 365 * 10, interval: "1mo" },
  "max":   { period: 365 * 40, interval: "1mo" },
};

/**
 * Given an ISO timestamp string, return the UTC date portion "YYYY-MM-DD".
 * Yahoo Finance quotes for intraday bars use UTC timestamps.
 * Both Tokyo (UTC+9: 0:00–6:30 UTC) and New York (UTC-4/-5: 13:30–21:00 UTC)
 * trading sessions fall within the same UTC calendar day, so UTC date grouping is safe.
 */
function utcDate(iso: string): string {
  return iso.slice(0, 10);
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim();
  const range  = req.nextUrl.searchParams.get("range")?.trim() ?? "1y";
  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  const cfg     = RANGES[range] ?? RANGES["1y"];
  // Fetch extra leading history ("warmup") so long moving averages (MA75 / MA200)
  // can be computed across the whole *displayed* range — otherwise a 3-month chart
  // (~60 bars) can never produce a 200-day average. The warmup bars are returned
  // too, with `warmup` telling the client how many to trim before display.
  const DAY = 24 * 60 * 60 * 1000;
  // Generous margins so the longest MA (200 bars) is fully covered across the
  // whole displayed range for EVERY stock — not just barely (a thin buffer can
  // dip under 200 on holiday-heavy spans and leave MA200 partially blank).
  const warmupDays =
    cfg.intraday          ? 0    :   // intraday MAs are bar-based; no calendar buffer
    cfg.interval === "1d" ? 460  :   // ~315 trading days  (need ≥200)
    cfg.interval === "1wk"? 1825 :   // ~260 weeks         (need ≥200)
    cfg.interval === "1mo"? 8000 :   // ~263 months        (need ≥200) — 10y / MAX
    0;
  const period1     = new Date(Date.now() - (cfg.period + warmupDays) * DAY);
  const displayFrom = new Date(Date.now() - cfg.period * DAY).toISOString().slice(0, 10);

  try {
    // Cache chart series: intraday refreshes often (10s), daily/weekly are stable (5min).
    const chartTtl = cfg.intraday ? 10_000 : 300_000;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chart = await cached<any>(`chart:${symbol}:${range}`, chartTtl, () =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (yahooFinance as any).chart(symbol, { period1, interval: cfg.interval }),
    );

    let allData = ((chart.quotes ?? []) as Record<string, unknown>[])
      .filter((q) => q.close !== null && q.close !== undefined)
      .map((q) => {
        const d = q.date instanceof Date ? q.date : new Date(String(q.date));
        const dateStr = cfg.intraday
          ? d.toISOString()              // "2026-06-07T09:35:00.000Z"
          : d.toISOString().slice(0, 10); // "2026-06-07"
        return {
          date:   dateStr,
          close:  q.close  as number,
          open:   q.open   as number | undefined,
          high:   q.high   as number | undefined,
          low:    q.low    as number | undefined,
          volume: q.volume as number | undefined,
        };
      });

    // For single-day views (1min / 1d): filter to the most recent trading session.
    // This ensures the chart always shows exactly one day:
    //   - During market hours  → today's live bars so far
    //   - After close / weekend → the last completed session
    let tradingDate: string | undefined;
    if (cfg.singleDay && allData.length > 0) {
      // allData is chronological; last entry belongs to the most recent session
      tradingDate = utcDate(allData[allData.length - 1].date);
      allData = allData.filter(p => utcDate(p.date) === tradingDate);
    }

    // Count leading warmup bars (those before the requested range start). These are
    // included in `data` so the client can compute indicators, then trimmed for display.
    let warmup = 0;
    if (warmupDays > 0 && allData.length > 0) {
      warmup = allData.filter(p => p.date.slice(0, 10) < displayFrom).length;
      // Always keep at least one displayed bar
      if (warmup >= allData.length) warmup = Math.max(0, allData.length - 1);
    }

    return NextResponse.json({
      data:        allData,
      meta:        chart.meta,
      intraday:    cfg.intraday ?? false,
      warmup,      // number of leading bars to trim before display (indicator context)
      tradingDate, // e.g. "2026-06-06" — populated only for singleDay ranges
    });
  } catch (err) {
    console.error("chart error", err);
    return NextResponse.json({ error: "チャート取得に失敗しました" }, { status: 500 });
  }
}
