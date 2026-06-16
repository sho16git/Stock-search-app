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
  // Warmup (lead-in) bars so moving averages are computed with prior history and
  // render across the whole displayed range. The client scales MA periods to the
  // bar interval (a "200-day" MA = ~40 weekly or ~10 monthly bars), so a single
  // ~460-day buffer covers the longest MA on daily / weekly / monthly charts.
  const warmupDays = cfg.intraday ? 0 : 460;
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

    // ── Day-based MA overlay for weekly / monthly charts ──
    // On a weekly (5年) or monthly (10年/MAX) chart, a short MA like MA5 (5 days) or
    // MA25 (25 days) is shorter than one bar and can't be drawn from the display bars.
    // So we compute the TRUE day-based MAs from a daily series and sample them onto
    // each display bar's date — letting MA5/MA25/MA75/MA200 all render on long charts.
    let maOverlay: Record<string, (number | null)[]> | undefined;
    if (!cfg.intraday && cfg.interval !== "1d" && allData.length > 0) {
      try {
        const dailyP1 = new Date(Date.now() - (cfg.period + 320) * DAY);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const daily = await cached<any>(`chartdaily:${symbol}:${range}`, 300_000, () =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (yahooFinance as any).chart(symbol, { period1: dailyP1, interval: "1d" }),
        );
        const dq = ((daily.quotes ?? []) as Record<string, unknown>[])
          .filter((q) => q.close !== null && q.close !== undefined);
        const dDates  = dq.map((q) => (q.date instanceof Date ? q.date : new Date(String(q.date))).toISOString().slice(0, 10));
        const dCloses = dq.map((q) => q.close as number);
        if (dCloses.length > 0) {
          const periods = [5, 25, 75, 200];
          const sma = (p: number) =>
            dCloses.map((_, i) => {
              if (i < p - 1) return null;
              let s = 0;
              for (let k = i - p + 1; k <= i; k++) s += dCloses[k];
              return s / p;
            });
          const smaByP: Record<number, (number | null)[]> = {};
          for (const p of periods) smaByP[p] = sma(p);

          maOverlay = {};
          for (const p of periods) maOverlay[String(p)] = [];
          let di = 0;
          for (const bar of allData) {
            const bd = bar.date.slice(0, 10);
            while (di + 1 < dDates.length && dDates[di + 1] <= bd) di++;
            const ok = dDates.length > 0 && dDates[di] <= bd;
            for (const p of periods) maOverlay[String(p)].push(ok ? smaByP[p][di] : null);
          }
        }
      } catch {
        maOverlay = undefined; // fall back to client-side bar-based MA
      }
    }

    return NextResponse.json({
      data:        allData,
      meta:        chart.meta,
      intraday:    cfg.intraday ?? false,
      warmup,      // number of leading bars to trim before display (indicator context)
      maOverlay,   // day-based MA values sampled to display bars (weekly/monthly only)
      tradingDate, // e.g. "2026-06-06" — populated only for singleDay ranges
    });
  } catch (err) {
    console.error("chart error", err);
    return NextResponse.json({ error: "チャート取得に失敗しました" }, { status: 500 });
  }
}
