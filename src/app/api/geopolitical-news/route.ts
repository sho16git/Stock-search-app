import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "@/lib/yfinance";
import { translateToJa } from "@/lib/translate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 600; // 10 min cache

/**
 * Geopolitical / macro news sources.
 * Mix of keyword searches and macro-sensitive tickers.
 */
const BASE_SOURCES: Array<{ query: string; tag: string }> = [
  { query: "tariff trade war China",        tag: "貿易・関税" },
  { query: "Federal Reserve interest rate", tag: "金融政策" },
  { query: "geopolitics sanctions war",     tag: "地政学リスク" },
  { query: "recession inflation economy",   tag: "景気・インフレ" },
  { query: "GC=F",                          tag: "金・安全資産" },   // Gold futures
  { query: "CL=F",                          tag: "原油" },           // Crude oil
  { query: "^VIX",                          tag: "市場リスク" },     // VIX
];

/** Sector-specific extra sources */
const SECTOR_SOURCES: Record<string, Array<{ query: string; tag: string }>> = {
  "information-technology": [
    { query: "China semiconductor technology ban",  tag: "半導体規制" },
    { query: "AI artificial intelligence regulation", tag: "AI規制" },
  ],
  "energy": [
    { query: "OPEC oil production Russia energy",  tag: "エネルギー地政学" },
  ],
  "financials": [
    { query: "banking regulation Fed stress test", tag: "金融規制" },
  ],
  "health-care": [
    { query: "drug pricing healthcare regulation", tag: "医薬品政策" },
  ],
  "consumer-discretionary": [
    { query: "tariff consumer goods import",       tag: "消費財関税" },
  ],
  "materials": [
    { query: "commodity supply chain disruption",  tag: "サプライチェーン" },
  ],
  "industrials": [
    { query: "infrastructure spending defense",    tag: "インフラ・防衛" },
  ],
};

export async function GET(req: NextRequest) {
  const sector = req.nextUrl.searchParams.get("sector") ?? null;

  const sources = [
    ...BASE_SOURCES,
    ...(sector && SECTOR_SOURCES[sector] ? SECTOR_SOURCES[sector] : []),
  ];

  try {
    const newsPerSource = await Promise.all(
      sources.map(async ({ query, tag }) => {
        try {
          const r = await (yahooFinance as any).search(query, {
            quotesCount: 0,
            newsCount: 4,
          });
          return ((r as any).news ?? []).map((n: any) => {
            const dt = n.providerPublishTime;
            return {
              uuid: String(n.uuid ?? ""),
              title: String(n.title ?? ""),
              publisher: (n.publisher as string | undefined) ?? null,
              link: (n.link as string | undefined) ?? null,
              publishedAt:
                dt instanceof Date
                  ? dt.toISOString()
                  : typeof dt === "number"
                    ? new Date(dt * 1000).toISOString()
                    : typeof dt === "string"
                      ? dt
                      : null,
              thumbnail:
                (n.thumbnail?.resolutions?.[0]?.url ?? null) ?? null,
              relatedTickers: Array.isArray(n.relatedTickers)
                ? (n.relatedTickers as string[])
                : [],
              tag,
            };
          });
        } catch {
          return [];
        }
      }),
    );

    // Deduplicate + sort by recency
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

    // Translate titles in parallel
    const titlesJa = await Promise.all(
      top.map((n) => translateToJa(n.title, { timeoutMs: 15_000 })),
    );

    const items = top.map((n, i) => ({
      ...n,
      titleJa: titlesJa[i] && titlesJa[i] !== n.title ? titlesJa[i] : null,
    }));

    return NextResponse.json({ items, asOf: new Date().toISOString() });
  } catch (err) {
    console.error("geopolitical-news error", err);
    return NextResponse.json(
      { error: "地政学ニュース取得に失敗しました", items: [] },
      { status: 500 },
    );
  }
}
