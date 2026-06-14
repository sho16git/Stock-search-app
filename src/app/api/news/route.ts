import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "@/lib/yfinance";
import { translateToJa } from "@/lib/translate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function googleSearchUrl(title: string, publisher: string | null): string {
  const q = publisher ? `${title} ${publisher}` : title;
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim();
  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  try {
    const data = await yahooFinance.search(symbol, {
      quotesCount: 0,
      newsCount: 10,
    });

    const baseItems = (data.news ?? []).map((n) => {
      const o = n as Record<string, unknown>;
      const date = o.providerPublishTime;
      return {
        uuid: String(o.uuid ?? ""),
        title: String(o.title ?? ""),
        publisher: (o.publisher as string | undefined) ?? null,
        link: (o.link as string | undefined) ?? null,
        publishedAt:
          date instanceof Date
            ? date.toISOString()
            : typeof date === "number"
              ? new Date(date * 1000).toISOString()
              : typeof date === "string"
                ? date
                : null,
        type: (o.type as string | undefined) ?? null,
        thumbnail:
          ((o.thumbnail as { resolutions?: Array<{ url?: string }> } | undefined)
            ?.resolutions?.[0]?.url ?? null) ?? null,
        relatedTickers: Array.isArray(o.relatedTickers)
          ? (o.relatedTickers as string[])
          : [],
      };
    });

    // Translate titles to Japanese in parallel (cached on repeat calls).
    const titlesJa = await Promise.all(
      baseItems.map((n) => translateToJa(n.title, { timeoutMs: 20_000 })),
    );

    const news = baseItems.map((n, i) => ({
      ...n,
      titleJa: titlesJa[i] && titlesJa[i] !== n.title ? titlesJa[i] : null,
      googleSearchUrl: googleSearchUrl(n.title, n.publisher),
    }));

    return NextResponse.json({ news }, {
    headers: { "Cache-Control": "public, max-age=180, stale-while-revalidate=360" },
  });
  } catch (err) {
    console.error("news error", err);
    return NextResponse.json(
      { error: "ニュース取得に失敗しました", news: [] },
      { status: 500 },
    );
  }
}
