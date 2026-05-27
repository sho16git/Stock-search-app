/**
 * Translate a company's English name to a Japanese display name (katakana
 * for foreign companies). Resolution order:
 *   1. Static catalog (JP_STOCKS / US_KATAKANA via getJpName) — instant, curated
 *   2. Google Translate (with server-side cache) — for everything else
 * Returns null if no translation is available.
 */

import { translateToJa } from "./translate";
import { getJpName } from "./jp-stocks";

// Strip common corporate suffixes ("Inc.", "Corporation", ", Ltd." etc.)
// so the katakana result is shorter and cleaner.
const SUFFIX_PATTERN =
  /[,\s]+(Incorporated|Inc\.?|Corporation|Corp\.?|Company|Co\.?|Limited|Ltd\.?|Holdings?|HoldingsInc|LLC|LP|PLC|N\.V\.?|S\.A\.?|S\.p\.A\.?|GmbH|AG|SE|SA|SAS|Sàrl|ADR)\.?$/i;

function stripCorpSuffix(name: string): string {
  let cur = name.trim();
  // Apply repeatedly for "Holdings Ltd." style chains
  for (let i = 0; i < 3; i++) {
    const next = cur.replace(SUFFIX_PATTERN, "").trim().replace(/[,\.]$/, "");
    if (next === cur || next.length === 0) break;
    cur = next;
  }
  return cur || name.trim();
}

export async function getCompanyNameJa(
  symbol: string | null | undefined,
  englishName: string | null | undefined,
): Promise<string | null> {
  // 1. Static catalog hit (catalog Japanese name or US katakana dict).
  if (symbol) {
    const curated = getJpName(symbol);
    if (curated) return curated;
  }

  if (!englishName || !englishName.trim()) return null;

  // 2. Google Translate (with cache). Strip "Inc."/"Corp." for nicer output.
  const stripped = stripCorpSuffix(englishName);
  return translateToJa(stripped);
}

/**
 * Resolve multiple names at once. Static-catalog hits are free, only
 * uncatalogued names hit the network (in parallel, dedup'd by cache).
 */
export async function getCompanyNamesJa(
  items: Array<{ symbol: string; name: string | null | undefined }>,
): Promise<Record<string, string | null>> {
  const results = await Promise.all(
    items.map(async (it) => {
      const ja = await getCompanyNameJa(it.symbol, it.name);
      return [it.symbol, ja] as const;
    }),
  );
  const out: Record<string, string | null> = {};
  for (const [sym, ja] of results) {
    out[sym] = ja;
  }
  return out;
}
