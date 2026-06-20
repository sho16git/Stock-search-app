import { NextResponse } from "next/server";
import { cached } from "@/lib/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Live economic calendar via the free FairEconomy (ForexFactory-style) JSON feed.
type RawEvent = {
  title: string; country: string; date: string; impact: string;
  forecast?: string; previous?: string; actual?: string;
};

const FEEDS = [
  "https://nfs.faireconomy.media/ff_calendar_thisweek.json",
  "https://nfs.faireconomy.media/ff_calendar_nextweek.json",
];

export async function GET() {
  try {
    const raw = await cached<RawEvent[]>("econ-calendar", 30 * 60 * 1000, async () => {
      const all: RawEvent[] = [];
      for (const url of FEEDS) {
        try {
          const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
          if (r.ok) {
            const j = await r.json();
            if (Array.isArray(j)) all.push(...(j as RawEvent[]));
          }
        } catch { /* skip this feed */ }
      }
      return all;
    });

    const seen = new Set<string>();
    const events = raw
      .filter((e) => e && e.title && e.date)
      .filter((e) => { const k = `${e.title}|${e.date}`; if (seen.has(k)) return false; seen.add(k); return true; })
      .map((e) => ({
        title: e.title,
        country: e.country,                          // currency code (USD/JPY/EUR…)
        date: e.date,                                // ISO 8601 w/ offset
        impact: e.impact || "Low",
        forecast: e.forecast || null,
        previous: e.previous || null,
        actual: e.actual || null,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return NextResponse.json(
      { events },
      { headers: { "Cache-Control": "public, max-age=1800, stale-while-revalidate=3600" } },
    );
  } catch (err) {
    console.error("economic-calendar error", err);
    return NextResponse.json({ error: "経済指標カレンダーの取得に失敗しました", events: [] }, { status: 500 });
  }
}
