import { NextResponse } from "next/server";
import yahooFinance from "@/lib/yfinance";
import { translateToJa } from "@/lib/translate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 300;

const SOURCES: Array<{ symbol: string; region: "US" | "JP" }> = [
  { symbol: "^GSPC", region: "US" }, // S&P 500
  { symbol: "^IXIC", region: "US" }, // NASDAQ
  { symbol: "^N225", region: "JP" }, // Nikkei 225
];

export async function GET() {
  try {
    const newsPerSource = await Promise.all(
      SOURCES.map(async ({ symbol, region }) => {
        try {
          const r = await yahooFinance.search(symbol, {
            quotesCount: 0,
            newsCount: 6,
          });
          return (r.news ?? []).map((n) => {
            const o = n as Record<string, unknown>;
            const dt = o.providerPublishTime;
            return {
              uuid: String(o.uuid ?? ""),
              title: String(o.title ?? ""),
              publisher: (o.publisher as string | undefined) ?? null,
              link: (o.link as string | undefined) ?? null,
              region,
              publishedAt:
                dt instanceof Date
                  ? dt.toISOString()
                  : typeof dt === "number"
                    ? new Date(dt * 1000).toISOString()
                    : typeof dt === "string"
                      ? dt
                      : null,
              thumbnail:
                ((
                  o.thumbnail as
                    | { resolutions?: Array<{ url?: string }> }
                    | undefined
                )?.resolutions?.[0]?.url ?? null) ?? null,
              relatedTickers: Array.isArray(o.relatedTickers)
                ? (o.relatedTickers as unknown[])
                    .filter((t): t is string => typeof t === "string")
                    .slice(0, 6)
                : [],
            };
          });
        } catch {
          return [];
        }
      }),
    );

    // Merge + dedupe by uuid, sort by recency, cap at 12
    const seen = new Set<string>();
    const merged = newsPerSource.flat().filter((n) => {
      if (!n.uuid || seen.has(n.uuid)) return false;
      seen.add(n.uuid);
      return true;
    });
    merged.sort((a, b) => {
      const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
      const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
      return tb - ta;
    });
    const top = merged.slice(0, 10);

    // Translate titles in parallel (cached on repeat calls).
    const titlesJa = await Promise.all(
      top.map((n) => translateToJa(n.title, { timeoutMs: 15_000 })),
    );

    const items = top.map((n, i) => ({
      ...n,
      titleJa: titlesJa[i] && titlesJa[i] !== n.title ? titlesJa[i] : null,
    }));

    return NextResponse.json({ items, asOf: new Date().toISOString() });
  } catch (err) {
    console.error("trend-news error", err);
    return NextResponse.json(
      { error: "トレンドニュース取得に失敗しました", items: [] },
      { status: 500 },
    );
  }
}
