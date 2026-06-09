import { NextResponse } from "next/server";
import yahooFinance from "@/lib/yfinance";
import { translateToJa } from "@/lib/translate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 300;

/**
 * ── Design notes ────────────────────────────────────────────────────────────
 *
 * Yahoo Finance's English API (query1.finance.yahoo.com) has two quirks that
 * affect JP/US separation:
 *
 * 1. lang=ja-JP returns 0 news — English API only; no locale switching for news.
 * 2. Fetching .T Japanese tickers (7203.T, 6758.T …) returns very few articles,
 *    and those articles are mostly irrelevant press releases with empty
 *    relatedTickers.  Yahoo Finance indexes English news for Japanese companies
 *    under their US ADR symbols (TM for Toyota, MUFG for Mitsubishi UFJ, etc.)
 *
 * Sources:
 *   JP — Japanese indices (^N225, ^TPX) + major JP company ADRs
 *   US — S&P/NASDAQ/Dow indices + major US company tickers
 *
 * Classification (applied in priority order):
 *   1. relatedTickers has .T / .OS suffix         → JP  (TSE/OSE exchange code)
 *   2. relatedTickers has 4-digit pure number       → JP  (TSE stock code, e.g. "7203")
 *   3. relatedTickers has a known JP ADR symbol     → JP  (e.g. TM, MUFG, NTDOY)
 *   4. relatedTickers has uppercase 1-5 char ticker → US  (NYSE / NASDAQ company)
 *   5. relatedTickers has ^N225 / ^TPX              → JP  (Japan market index)
 *   6. relatedTickers has ^GSPC / ^IXIC / ^DJI      → US  (US market index)
 *   7. relatedTickers is empty or only commodities  → DISCARD (spam / press release)
 * ────────────────────────────────────────────────────────────────────────────
 */

// ── JP sources: Japanese market indices + JP company US ADRs ─────────────
// Note: "TM" (Toyota ADR) is intentionally excluded because Yahoo Finance
// also returns news for "Telekom Malaysia (KLSE:TM)" which shares the symbol.
// Toyota articles are captured via other sources with 7203.T / "7203" tickers.
const JP_SOURCES = [
  "^N225",   // 日経平均
  "^TPX",    // TOPIX
  "MUFG",    // 三菱UFJ ADR
  "NTDOY",   // 任天堂 ADR
  "SMFG",    // 三井住友 ADR
  "MFG",     // みずほ ADR
  "HMC",     // ホンダ ADR
  "7203.T",  // トヨタ (.T — some English articles do have .T in relatedTickers)
  "9984.T",  // ソフトバンクG
  "8035.T",  // 東京エレクトロン
];

// ── US sources: US market indices + major US company tickers ─────────────
const US_SOURCES = [
  "^GSPC",   // S&P 500
  "^IXIC",   // NASDAQ
  "^DJI",    // ダウ平均
  "AAPL",    // Apple
  "MSFT",    // Microsoft
  "NVDA",    // NVIDIA
  "AMZN",    // Amazon
  "GOOGL",   // Alphabet
  "META",    // Meta
  "JPM",     // JPMorgan
];

const NEWS_PER_SOURCE = 10;
const CAP_PER_REGION  = 12;

// Known JP company ADRs: seeing these in relatedTickers signals a JP article
const JP_ADR_SET = new Set([
  "TM",     // Toyota
  "MUFG",   // Mitsubishi UFJ
  "NTDOY",  // Nintendo
  "SMFG",   // Sumitomo Mitsui
  "MFG",    // Mizuho
  "HMC",    // Honda
  "SONY",   // Sony
  "NSANY",  // Nissan
  "KCRPY",  // Keyence
  "FANUY",  // Fanuc
  "RCRUY",  // Recruit Holdings
  "TOELY",  // Tokyo Electron
]);

// Japanese market index symbols
const JP_INDEX_SET = new Set(["^N225", "^TPX", "^NKX", "^JN0U.IM"]);

// US market index symbols
const US_INDEX_SET = new Set(["^GSPC", "^IXIC", "^DJI", "^RUT", "^VIX", "^TNX", "^TYX"]);

type RawNewsItem = {
  uuid: string;
  title: string;
  publisher: string | null;
  link: string | null;
  publishedAt: string | null;
  thumbnail: string | null;
  relatedTickers: string[];
};

async function fetchNewsForSymbol(symbol: string): Promise<RawNewsItem[]> {
  try {
    const r = await yahooFinance.search(symbol, {
      quotesCount: 0,
      newsCount: NEWS_PER_SOURCE,
    });
    return (r.news ?? []).map((n) => {
      const o = n as Record<string, unknown>;
      const dt = o.providerPublishTime;
      return {
        uuid:      String(o.uuid ?? ""),
        title:     String(o.title ?? ""),
        publisher: (o.publisher as string | undefined) ?? null,
        link:      (o.link as string | undefined) ?? null,
        publishedAt:
          dt instanceof Date
            ? dt.toISOString()
            : typeof dt === "number"
              ? new Date(dt * 1000).toISOString()
              : typeof dt === "string" ? dt : null,
        thumbnail:
          ((o.thumbnail as { resolutions?: Array<{ url?: string }> } | undefined)
            ?.resolutions?.[0]?.url) ?? null,
        relatedTickers: Array.isArray(o.relatedTickers)
          ? (o.relatedTickers as unknown[])
              .filter((t): t is string => typeof t === "string")
              .slice(0, 8)
          : [],
      };
    });
  } catch {
    return [];
  }
}

/** Merge multiple lists, dedupe by uuid, sort newest-first */
function mergeAndDedupe(lists: RawNewsItem[][]): RawNewsItem[] {
  const seen = new Set<string>();
  const merged = lists.flat().filter((n) => {
    if (!n.uuid || seen.has(n.uuid)) return false;
    seen.add(n.uuid);
    return true;
  });
  merged.sort((a, b) => {
    const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return tb - ta;
  });
  return merged;
}

/**
 * Classify an article.  Returns null to discard (spam / no company context).
 *
 * Priority order (first match wins):
 *  JP: .T/.OS exchange suffix, 4-digit TSE code, known JP ADR symbol
 *  US: uppercase 1-5 char company ticker (excluding JP ADRs above)
 *  JP: Japanese market index (^N225, ^TPX)
 *  US: US market index (^GSPC, ^IXIC, ^DJI)
 * null: empty tickers, or commodity/crypto/FX only → DISCARD
 */
function classifyArticle(tickers: string[]): "JP" | "US" | null {
  if (tickers.length === 0) return null;

  for (const t of tickers) {
    // TSE / OSE exchange suffix → JP
    if (/\.(T|OS|FK|SA)$/.test(t)) return "JP";
    // 4-digit TSE stock code (stored without suffix in some articles, e.g. "7203")
    if (/^\d{4}$/.test(t)) return "JP";
    // Known JP ADR → JP
    if (JP_ADR_SET.has(t)) return "JP";
  }

  for (const t of tickers) {
    // NYSE / NASDAQ company ticker (1-5 uppercase letters, no punctuation)
    if (/^[A-Z]{1,5}$/.test(t) && !JP_ADR_SET.has(t)) return "US";
  }

  // Index-only tickers
  if (tickers.some(t => JP_INDEX_SET.has(t))) return "JP";
  if (tickers.some(t => US_INDEX_SET.has(t))) return "US";

  // Only commodities (GC=F), crypto (BTC-USD), FX, or unknown → discard
  return null;
}

const sortByDate = (a: RawNewsItem, b: RawNewsItem) => {
  const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
  const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
  return tb - ta;
};

async function buildItems(rawList: RawNewsItem[], region: "JP" | "US") {
  const titlesJa = await Promise.all(
    rawList.map((n) => translateToJa(n.title, { timeoutMs: 15_000 })),
  );
  return rawList.map((n, i) => ({
    ...n,
    region,
    titleJa: titlesJa[i] && titlesJa[i] !== n.title ? titlesJa[i] : null,
  }));
}

export async function GET() {
  try {
    // ── 1. Fetch all sources in parallel ────────────────────────────────
    const [jpRawLists, usRawLists] = await Promise.all([
      Promise.all(JP_SOURCES.map(fetchNewsForSymbol)),
      Promise.all(US_SOURCES.map(fetchNewsForSymbol)),
    ]);

    // ── 2. Merge & dedupe within each pool ───────────────────────────────
    const jpPool = mergeAndDedupe(jpRawLists);
    const usPool = mergeAndDedupe(usRawLists);

    const jpByUuid = new Map(jpPool.map(n => [n.uuid, n]));
    const usByUuid = new Map(usPool.map(n => [n.uuid, n]));

    // ── 3. Classify every article to exactly one region (or discard) ────
    const allUuids = new Set([...jpByUuid.keys(), ...usByUuid.keys()]);
    const finalJp: RawNewsItem[] = [];
    const finalUs: RawNewsItem[] = [];

    for (const uuid of allUuids) {
      const article = jpByUuid.get(uuid) ?? usByUuid.get(uuid)!;
      const region = classifyArticle(article.relatedTickers);
      if (region === "JP") finalJp.push(article);
      else if (region === "US") finalUs.push(article);
      // null → discarded (no company context / spam / commodity-only)
    }

    // ── 4. Sort and cap ─────────────────────────────────────────────────
    finalJp.sort(sortByDate);
    finalUs.sort(sortByDate);

    const jpRaw = finalJp.slice(0, CAP_PER_REGION);
    const usRaw = finalUs.slice(0, CAP_PER_REGION);

    // ── 5. Translate English titles to Japanese ──────────────────────────
    const [jpItems, usItems] = await Promise.all([
      buildItems(jpRaw, "JP"),
      buildItems(usRaw, "US"),
    ]);

    return NextResponse.json({
      jpItems,
      usItems,
      items: [...jpItems, ...usItems].sort(sortByDate).slice(0, 20),
      asOf: new Date().toISOString(),
    });
  } catch (err) {
    console.error("trend-news error", err);
    return NextResponse.json(
      { error: "トレンドニュース取得に失敗しました", items: [], jpItems: [], usItems: [] },
      { status: 500 },
    );
  }
}
