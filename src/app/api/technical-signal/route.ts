/**
 * /api/technical-signal?symbol=AAPL
 * Computes RSI / MACD / Bollinger Bands / MA composite signal server-side
 */
import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "@/lib/yfinance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function ema(prices: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out = [prices[0]];
  for (let i = 1; i < prices.length; i++) out.push(prices[i] * k + out[i - 1] * (1 - k));
  return out;
}

function rsi(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) avgGain += d; else avgLoss -= d;
  }
  avgGain /= period; avgLoss /= period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
  }
  return avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
}

function macd(closes: number[]): { line: number; signal: number; hist: number } {
  if (closes.length < 35) return { line: 0, signal: 0, hist: 0 };
  const e12 = ema(closes, 12);
  const e26 = ema(closes, 26);
  const macdLine = e12.map((v, i) => v - e26[i]);
  const sigLine  = ema(macdLine.slice(25), 9);
  const l = macdLine[macdLine.length - 1];
  const s = sigLine[sigLine.length - 1];
  return { line: l, signal: s, hist: l - s };
}

function bb(closes: number[], period = 20, mult = 2): { upper: number; mid: number; lower: number } {
  const slice = closes.slice(-period);
  if (slice.length < period) {
    const p = closes[closes.length - 1];
    return { upper: p * 1.05, mid: p, lower: p * 0.95 };
  }
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const std  = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period);
  return { upper: mean + mult * std, mid: mean, lower: mean - mult * std };
}

function sma(closes: number[], period: number): number {
  const slice = closes.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim();
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  try {
    const since = new Date(Date.now() - 400 * 86400_000); // 400 days for MA200
    const hist = await yahooFinance.chart(symbol, {
      period1: since,
      interval: "1d",
    });

    const quotes = hist.quotes ?? [];
    const closes = quotes
      .map((q: Record<string, unknown>) => typeof q.close === "number" ? q.close : null)
      .filter((v): v is number => v != null);

    if (closes.length < 30) {
      return NextResponse.json({ symbol, error: "insufficient data" }, { status: 422 });
    }

    const lastClose = closes[closes.length - 1];

    // ── Indicators ──────────────────────────────────────────────────
    const rsiVal  = rsi(closes);
    const macdVal = macd(closes);
    const bbVal   = bb(closes);
    const ma50    = closes.length >= 50  ? sma(closes, 50)  : null;
    const ma200   = closes.length >= 200 ? sma(closes, 200) : null;

    // Previous MACD histogram for cross detection
    const prevCloses = closes.slice(0, -1);
    const prevMacd   = macd(prevCloses);

    // ── Signals ──────────────────────────────────────────────────────
    type SigLevel = "bullish" | "neutral" | "bearish";

    // RSI
    const rsiSignal: SigLevel =
      rsiVal < 30 ? "bullish" : rsiVal > 70 ? "bearish" : "neutral";
    const rsiDesc =
      rsiVal < 30 ? "売られ過ぎ (反発期待)" :
      rsiVal > 70 ? "買われ過ぎ (反落注意)" : "中立圏";

    // MACD
    const macdCrossUp   = macdVal.hist > 0 && prevMacd.hist <= 0;
    const macdCrossDown = macdVal.hist < 0 && prevMacd.hist >= 0;
    const macdSignal: SigLevel =
      macdCrossUp   ? "bullish" :
      macdCrossDown ? "bearish" :
      macdVal.hist > 0 ? "bullish" : "bearish";
    const macdDesc =
      macdCrossUp   ? "ゴールデンクロス発生" :
      macdCrossDown ? "デッドクロス発生" :
      macdVal.hist > 0 ? "上昇トレンド中" : "下降トレンド中";

    // Bollinger Bands
    const bbPos = (lastClose - bbVal.lower) / (bbVal.upper - bbVal.lower);
    const bbSignal: SigLevel =
      bbPos < 0.15 ? "bullish" : bbPos > 0.85 ? "bearish" : "neutral";
    const bbDesc =
      bbPos < 0.15 ? "下限付近 (反発期待)" :
      bbPos > 0.85 ? "上限付近 (反落注意)" : "バンド内 中立";

    // Moving Averages
    const maSignal: SigLevel =
      (ma200 != null && lastClose > ma200 && (ma50 == null || lastClose > ma50)) ? "bullish" :
      (ma200 != null && lastClose < ma200) ? "bearish" : "neutral";
    const maDesc = (() => {
      if (ma50 != null && ma200 != null) {
        const golden = ma50 > ma200 && lastClose > ma200;
        return golden
          ? `MA50 (${ma50.toFixed(0)}) > MA200 (${ma200.toFixed(0)}) — 長期上昇トレンド`
          : lastClose < ma200
          ? `MA200 (${ma200.toFixed(0)}) 下回り — 弱気トレンド`
          : `MA200 (${ma200.toFixed(0)}) 上回り — 中立`;
      }
      if (ma50 != null) return `MA50: ${ma50.toFixed(0)}`;
      return "データ不足";
    })();

    // ── Composite ─────────────────────────────────────────────────────
    const signals: SigLevel[] = [rsiSignal, macdSignal, bbSignal, maSignal];
    const bullCount = signals.filter(s => s === "bullish").length;
    const bearCount = signals.filter(s => s === "bearish").length;

    const composite: SigLevel =
      bullCount >= 3 ? "bullish" :
      bearCount >= 3 ? "bearish" : "neutral";

    const compositeScore = bullCount * 25 + signals.filter(s => s === "neutral").length * 12;

    return NextResponse.json({
      symbol,
      lastClose,
      composite,
      compositeScore,
      bullCount,
      bearCount,
      indicators: {
        rsi:  { value: +rsiVal.toFixed(1),  signal: rsiSignal,  desc: rsiDesc },
        macd: { value: +macdVal.hist.toFixed(4), signal: macdSignal, desc: macdDesc },
        bb:   { pos: +bbPos.toFixed(2), upper: +bbVal.upper.toFixed(2), lower: +bbVal.lower.toFixed(2), signal: bbSignal, desc: bbDesc },
        ma:   { ma50: ma50 ? +ma50.toFixed(2) : null, ma200: ma200 ? +ma200.toFixed(2) : null, signal: maSignal, desc: maDesc },
      },
    }, {
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" },
    });
  } catch (err) {
    console.error("technical-signal error", err);
    return NextResponse.json({ error: "テクニカル分析に失敗しました" }, { status: 500 });
  }
}
