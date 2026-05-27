import { NextResponse } from "next/server";
import yahooFinance from "@/lib/yfinance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 60;

const FX_PAIRS = [
  { symbol: "JPY=X",    name: "米ドル/円",        from: "USD", to: "JPY", flag: "🇺🇸" },
  { symbol: "EURJPY=X", name: "ユーロ/円",        from: "EUR", to: "JPY", flag: "🇪🇺" },
  { symbol: "GBPJPY=X", name: "英ポンド/円",      from: "GBP", to: "JPY", flag: "🇬🇧" },
  { symbol: "AUDJPY=X", name: "豪ドル/円",        from: "AUD", to: "JPY", flag: "🇦🇺" },
  { symbol: "CADJPY=X", name: "カナダドル/円",    from: "CAD", to: "JPY", flag: "🇨🇦" },
  { symbol: "CHFJPY=X", name: "スイスフラン/円",  from: "CHF", to: "JPY", flag: "🇨🇭" },
  { symbol: "CNHJPY=X", name: "人民元/円",        from: "CNH", to: "JPY", flag: "🇨🇳" },
  { symbol: "NZDJPY=X", name: "NZドル/円",        from: "NZD", to: "JPY", flag: "🇳🇿" },
  { symbol: "EURUSD=X", name: "ユーロ/米ドル",    from: "EUR", to: "USD", flag: "🇪🇺" },
  { symbol: "GBPUSD=X", name: "英ポンド/米ドル",  from: "GBP", to: "USD", flag: "🇬🇧" },
  { symbol: "AUDUSD=X", name: "豪ドル/米ドル",    from: "AUD", to: "USD", flag: "🇦🇺" },
  { symbol: "USDCNH=X", name: "米ドル/人民元",    from: "USD", to: "CNH", flag: "🇺🇸" },
];

export async function GET() {
  try {
    const symbols = FX_PAIRS.map((p) => p.symbol);
    const rawQuotes = await yahooFinance.quote(symbols).catch(() => []);
    const quotes = (Array.isArray(rawQuotes) ? rawQuotes : [rawQuotes]) as Array<Record<string, unknown>>;

    const pairs = FX_PAIRS.map((info) => {
      const q = quotes.find((x) => x?.symbol === info.symbol);
      return {
        symbol:        info.symbol,
        name:          info.name,
        from:          info.from,
        to:            info.to,
        flag:          info.flag,
        price:         (q?.regularMarketPrice         as number | undefined) ?? null,
        change:        (q?.regularMarketChange         as number | undefined) ?? null,
        changePercent: (q?.regularMarketChangePercent  as number | undefined) ?? null,
        high:          (q?.regularMarketDayHigh        as number | undefined) ?? null,
        low:           (q?.regularMarketDayLow         as number | undefined) ?? null,
        open:          (q?.regularMarketOpen           as number | undefined) ?? null,
      };
    });

    return NextResponse.json({ pairs });
  } catch (err) {
    console.error("fx error", err);
    return NextResponse.json({ error: "FX取得失敗", pairs: [] }, { status: 500 });
  }
}
