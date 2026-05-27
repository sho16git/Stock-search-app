import { NextResponse } from "next/server";
import yahooFinance from "@/lib/yfinance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 60;

const CRYPTOS = [
  { symbol: "BTC-USD",  name: "ビットコイン",     nameEn: "Bitcoin",    emoji: "₿",  color: "from-orange-500 to-amber-500"   },
  { symbol: "ETH-USD",  name: "イーサリアム",     nameEn: "Ethereum",   emoji: "⟠",  color: "from-indigo-500 to-blue-500"    },
  { symbol: "BNB-USD",  name: "BNB",              nameEn: "BNB",        emoji: "🔶", color: "from-yellow-500 to-amber-400"   },
  { symbol: "SOL-USD",  name: "ソラナ",           nameEn: "Solana",     emoji: "◎",  color: "from-purple-500 to-violet-500"  },
  { symbol: "XRP-USD",  name: "リップル",         nameEn: "XRP",        emoji: "✕",  color: "from-blue-600 to-cyan-500"      },
  { symbol: "DOGE-USD", name: "ドージコイン",     nameEn: "Dogecoin",   emoji: "🐕", color: "from-yellow-400 to-orange-400"  },
  { symbol: "ADA-USD",  name: "カルダノ",         nameEn: "Cardano",    emoji: "₳",  color: "from-sky-500 to-blue-500"       },
  { symbol: "AVAX-USD", name: "アバランチ",       nameEn: "Avalanche",  emoji: "🔺", color: "from-red-500 to-rose-500"       },
  { symbol: "DOT-USD",  name: "ポルカドット",     nameEn: "Polkadot",   emoji: "●",  color: "from-pink-500 to-fuchsia-500"   },
  { symbol: "LINK-USD", name: "チェーンリンク",   nameEn: "Chainlink",  emoji: "⬡",  color: "from-blue-500 to-indigo-500"    },
  { symbol: "SHIB-USD", name: "シバイヌ",         nameEn: "Shiba Inu",  emoji: "🐶", color: "from-orange-400 to-red-400"     },
  { symbol: "LTC-USD",  name: "ライトコイン",     nameEn: "Litecoin",   emoji: "Ł",  color: "from-slate-400 to-slate-600"    },
];

export async function GET() {
  try {
    const symbols = CRYPTOS.map((c) => c.symbol);
    const rawQuotes = await yahooFinance.quote(symbols).catch(() => []);
    const quotes = (Array.isArray(rawQuotes) ? rawQuotes : [rawQuotes]) as Array<Record<string, unknown>>;

    const coins = CRYPTOS.map((info) => {
      const q = quotes.find((x) => x?.symbol === info.symbol);
      const mc = q?.marketCap as number | undefined;
      return {
        symbol:        info.symbol,
        name:          info.name,
        nameEn:        info.nameEn,
        emoji:         info.emoji,
        color:         info.color,
        price:         (q?.regularMarketPrice         as number | undefined) ?? null,
        change:        (q?.regularMarketChange         as number | undefined) ?? null,
        changePercent: (q?.regularMarketChangePercent  as number | undefined) ?? null,
        high24h:       (q?.regularMarketDayHigh        as number | undefined) ?? null,
        low24h:        (q?.regularMarketDayLow         as number | undefined) ?? null,
        volume:        (q?.regularMarketVolume         as number | undefined) ?? null,
        marketCap:     mc ?? null,
        marketCapStr:  mc
          ? mc >= 1e12 ? `$${(mc / 1e12).toFixed(2)}T`
          : mc >= 1e9  ? `$${(mc / 1e9).toFixed(1)}B`
          : mc >= 1e6  ? `$${(mc / 1e6).toFixed(0)}M`
          : `$${mc.toFixed(0)}`
          : null,
      };
    });

    return NextResponse.json({ coins });
  } catch (err) {
    console.error("crypto error", err);
    return NextResponse.json({ error: "Crypto取得失敗", coins: [] }, { status: 500 });
  }
}
