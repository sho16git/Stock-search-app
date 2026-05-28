import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "@/lib/yfinance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Interval = "1m" | "5m" | "15m" | "30m" | "60m" | "1h" | "1d" | "1wk" | "1mo";

const RANGES: Record<string, { period: number; interval: Interval; intraday?: boolean }> = {
  "1min": { period: 2,        interval: "1m",  intraday: true  }, // 1-minute candles
  "5min": { period: 2,        interval: "5m",  intraday: true  }, // 5-minute candles
  "30min":{ period: 5,        interval: "30m", intraday: true  }, // 30-minute candles
  "1h":   { period: 30,       interval: "60m", intraday: true  }, // 1-hour candles
  // legacy aliases (keep for MiniChart backward compat)
  "1d":   { period: 2,        interval: "5m",  intraday: true  },
  "5d":   { period: 5,        interval: "30m", intraday: true  },
  // daily+
  "1mo":  { period: 30,       interval: "1d"  },
  "3mo":  { period: 90,       interval: "1d"  },
  "6mo":  { period: 180,      interval: "1d"  },
  "1y":   { period: 365,      interval: "1d"  },
  "5y":   { period: 365 * 5,  interval: "1wk" },
  "10y":  { period: 365 * 10, interval: "1mo" },
};

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim();
  const range  = req.nextUrl.searchParams.get("range")?.trim() ?? "1y";
  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  const cfg     = RANGES[range] ?? RANGES["1y"];
  const period1 = new Date(Date.now() - cfg.period * 24 * 60 * 60 * 1000);

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chart = await (yahooFinance as any).chart(symbol, {
      period1,
      interval: cfg.interval,
    });

    const data = ((chart.quotes ?? []) as Record<string, unknown>[])
      .filter((q) => q.close !== null && q.close !== undefined)
      .map((q) => {
        const d = q.date instanceof Date ? q.date : new Date(String(q.date));
        // 分足・時間足は時刻付きで返す
        const dateStr = cfg.intraday
          ? d.toISOString()                     // "2026-05-28T09:35:00.000Z"
          : d.toISOString().slice(0, 10);       // "2026-05-28"
        return {
          date:   dateStr,
          close:  q.close  as number,
          open:   q.open   as number | undefined,
          high:   q.high   as number | undefined,
          low:    q.low    as number | undefined,
          volume: q.volume as number | undefined,
        };
      });

    return NextResponse.json({ data, meta: chart.meta, intraday: cfg.intraday ?? false });
  } catch (err) {
    console.error("chart error", err);
    return NextResponse.json({ error: "チャート取得に失敗しました" }, { status: 500 });
  }
}
