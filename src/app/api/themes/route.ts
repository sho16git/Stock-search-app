import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "@/lib/yfinance";
import { getCompanyNameJa } from "@/lib/translate-name";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 300;

/* ─── US テーマ (Yahoo Finance スクリーナー) ─── */
const US_THEMES: Array<{
  id: string;
  scrId:
    | "undervalued_large_caps"
    | "growth_technology_stocks"
    | "aggressive_small_caps"
    | "small_cap_gainers"
    | "undervalued_growth_stocks";
  label: string;
  emoji: string;
  description: string;
}> = [
  {
    id: "undervalued_large_caps",
    scrId: "undervalued_large_caps",
    label: "割安大型株",
    emoji: "💎",
    description: "バリュエーション低めの大型優良株",
  },
  {
    id: "growth_technology_stocks",
    scrId: "growth_technology_stocks",
    label: "成長テック株",
    emoji: "🚀",
    description: "高成長率のテクノロジー銘柄",
  },
  {
    id: "small_cap_gainers",
    scrId: "small_cap_gainers",
    label: "中小型上昇株",
    emoji: "📈",
    description: "本日上昇率上位の中小型株",
  },
  {
    id: "undervalued_growth_stocks",
    scrId: "undervalued_growth_stocks",
    label: "割安成長株",
    emoji: "🎯",
    description: "成長性と割安性を兼ね備えた銘柄",
  },
];

/* ─── 日本株テーマ (キュレーション) ─── */
const JP_THEMES: Array<{
  id: string;
  label: string;
  emoji: string;
  description: string;
  symbols: string[];
}> = [
  {
    id: "jp-semiconductor",
    label: "AI・半導体",
    emoji: "🔬",
    description: "日本の半導体・電子部品メーカー",
    symbols: ["8035.T", "6920.T", "6857.T", "6861.T", "6723.T", "6963.T"],
  },
  {
    id: "jp-high-dividend",
    label: "高配当・商社",
    emoji: "💰",
    description: "安定した高配当を誇る大手商社・金融株",
    symbols: ["8058.T", "8031.T", "8316.T", "8306.T", "9432.T", "8591.T"],
  },
  {
    id: "jp-automotive",
    label: "自動車・製造業",
    emoji: "🚗",
    description: "トヨタ等の自動車・重工業・ロボット大手",
    symbols: ["7203.T", "7267.T", "7011.T", "6301.T", "6954.T", "6367.T"],
  },
  {
    id: "jp-game-entertainment",
    label: "ゲーム・エンタメ",
    emoji: "🎮",
    description: "任天堂・ソニー等のゲーム・エンタメ企業",
    symbols: ["7974.T", "6758.T", "9697.T", "7832.T", "9766.T", "9684.T"],
  },
  {
    id: "jp-pharma-health",
    label: "製薬・ヘルスケア",
    emoji: "💊",
    description: "日本の大手製薬・医療機器メーカー",
    symbols: ["4519.T", "4568.T", "4502.T", "4543.T", "7741.T", "6869.T"],
  },
  {
    id: "jp-finance-bank",
    label: "銀行・金融",
    emoji: "🏦",
    description: "メガバンク・保険・証券大手",
    symbols: ["8306.T", "8316.T", "8411.T", "8766.T", "8591.T", "8697.T"],
  },
  {
    id: "jp-trading-stable",
    label: "通信・インフラ",
    emoji: "📡",
    description: "NTT・KDDI等の安定配当通信株",
    symbols: ["9432.T", "9433.T", "9434.T", "9984.T", "4689.T", "9613.T"],
  },
];

/* ─── US カスタムテーマ (ハードコード銘柄リスト) ─── */
const US_CUSTOM_THEMES: Array<{
  id: string;
  label: string;
  emoji: string;
  description: string;
  symbols: string[];
}> = [
  {
    id: "us-mega-tech",
    label: "メガテック",
    emoji: "💻",
    description: "FAANG+ 超大型テック株",
    symbols: ["AAPL", "MSFT", "NVDA", "GOOGL", "META", "AMZN"],
  },
  {
    id: "us-dividend",
    label: "高配当株",
    emoji: "💰",
    description: "安定した高配当の優良株",
    symbols: ["JNJ", "KO", "PG", "VZ", "T", "XOM"],
  },
  {
    id: "us-ev-clean",
    label: "EV・クリーンエネルギー",
    emoji: "⚡",
    description: "電気自動車・再生エネルギー関連株",
    symbols: ["TSLA", "RIVN", "NEE", "ENPH", "PLUG", "SEDG"],
  },
  {
    id: "us-ai-cloud",
    label: "AI・クラウド",
    emoji: "🤖",
    description: "AI・クラウド最前線の成長株",
    symbols: ["NVDA", "MSFT", "PLTR", "SNOW", "DDOG", "NET"],
  },
];

/* ─── US カスタムテーマ クォート取得 ─── */
async function fetchUsCustomQuotes(symbols: string[]) {
  return Promise.all(
    symbols.map(async (symbol) => {
      try {
        const q = await (yahooFinance as any).quote(symbol);
        const o = q as Record<string, unknown>;
        return {
          symbol,
          shortName: (o.shortName as string | undefined) ?? null,
          longName: (o.longName as string | undefined) ?? null,
          nameJa: null as string | null,
          price: (o.regularMarketPrice as number | undefined) ?? null,
          changePercent: (o.regularMarketChangePercent as number | undefined) ?? null,
          currency: (o.currency as string | undefined) ?? "USD",
        };
      } catch {
        return {
          symbol,
          shortName: null,
          longName: null,
          nameJa: null,
          price: null,
          changePercent: null,
          currency: "USD",
        };
      }
    }),
  );
}

/* ─── 日本株クォート取得 ─── */
async function fetchJpQuotes(symbols: string[]) {
  return Promise.all(
    symbols.map(async (symbol) => {
      try {
        const q = await (yahooFinance as any).quote(symbol);
        const o = q as Record<string, unknown>;
        return {
          symbol,
          shortName: (o.shortName as string | undefined) ?? null,
          longName: (o.longName as string | undefined) ?? null,
          nameJa: null as string | null,
          price: (o.regularMarketPrice as number | undefined) ?? null,
          changePercent: (o.regularMarketChangePercent as number | undefined) ?? null,
          currency: (o.currency as string | undefined) ?? null,
        };
      } catch {
        return {
          symbol,
          shortName: null,
          longName: null,
          nameJa: null,
          price: null,
          changePercent: null,
          currency: "JPY",
        };
      }
    }),
  );
}

export async function GET(req: NextRequest) {
  const market = req.nextUrl.searchParams.get("market") ?? "US";

  try {
    if (market === "JP") {
      /* ─ 日本株テーマを返す ─ */
      const results = await Promise.all(
        JP_THEMES.map(async (theme) => {
          const base = await fetchJpQuotes(theme.symbols);
          const namesJa = await Promise.all(
            base.map((b) => getCompanyNameJa(b.symbol, b.longName ?? b.shortName)),
          );
          const quotes = base.map((b, i) => ({ ...b, nameJa: namesJa[i] }));
          return { id: theme.id, label: theme.label, emoji: theme.emoji, description: theme.description, quotes };
        }),
      );
      return NextResponse.json({ themes: results });
    }

    /* ─ 米国株テーマを返す (スクリーナー + カスタム) ─ */
    const [screenerResults, customResults] = await Promise.all([
      Promise.all(
        US_THEMES.map(async (theme) => {
          try {
            const data = await yahooFinance.screener({
              scrIds: theme.scrId,
              count: 6,
            });
            const base = (data.quotes ?? []).slice(0, 6).map((q) => {
              const o = q as unknown as Record<string, unknown>;
              return {
                symbol: String(o.symbol ?? ""),
                shortName:
                  (o.shortName as string | undefined) ??
                  (o.longName as string | undefined) ??
                  null,
                longName: (o.longName as string | undefined) ?? null,
                price: (o.regularMarketPrice as number | undefined) ?? null,
                changePercent:
                  (o.regularMarketChangePercent as number | undefined) ?? null,
                currency: (o.currency as string | undefined) ?? null,
              };
            });
            const namesJa = await Promise.all(
              base.map((b) =>
                getCompanyNameJa(b.symbol, b.longName ?? b.shortName),
              ),
            );
            const quotes = base.map((b, i) => ({ ...b, nameJa: namesJa[i] }));
            return { ...theme, quotes };
          } catch {
            return { ...theme, quotes: [] };
          }
        }),
      ),
      Promise.all(
        US_CUSTOM_THEMES.map(async (theme) => {
          const base = await fetchUsCustomQuotes(theme.symbols);
          const namesJa = await Promise.all(
            base.map((b) => getCompanyNameJa(b.symbol, b.longName ?? b.shortName)),
          );
          const quotes = base.map((b, i) => ({ ...b, nameJa: namesJa[i] }));
          return { id: theme.id, label: theme.label, emoji: theme.emoji, description: theme.description, quotes };
        }),
      ),
    ]);
    const results = [...screenerResults, ...customResults];
    return NextResponse.json({ themes: results });
  } catch (err) {
    console.error("themes error", err);
    return NextResponse.json(
      { error: "投資テーマ取得に失敗しました", themes: [] },
      { status: 500 },
    );
  }
}
