import { STOCKS_CATALOG, type CatalogStock } from "./stocks-catalog";
import { getUsKatakana, US_KATAKANA } from "./us-katakana";
import { TSE_NAMES, DELISTED_JP } from "./tse-names";

export type JpStock = CatalogStock;

/** Lightweight result for supplemental TSE name matches */
export type TseNameMatch = { symbol: string; name: string };

const JP_STOCKS_LIST = STOCKS_CATALOG.filter((s) => s.market === "JP");
const US_STOCKS_LIST = STOCKS_CATALOG.filter((s) => s.market === "US");
const SYMBOL_INDEX = new Map(STOCKS_CATALOG.map((s) => [s.symbol, s]));

/** Symbols already in the curated catalog — we won't duplicate them from TSE_NAMES */
const CATALOG_JP_SYMBOLS = new Set(JP_STOCKS_LIST.map((s) => s.symbol));

/**
 * Supplemental TSE list (entries not in curated catalog).
 * Multiple entries per symbol are allowed (for brand-name aliases);
 * dedup key is symbol+name so the same entry isn't added twice.
 */
const TSE_SUPPLEMENT: TseNameMatch[] = [];
const _seenTseKeys = new Set<string>();
for (const [symbol, name] of TSE_NAMES) {
  if (CATALOG_JP_SYMBOLS.has(symbol)) continue; // already in curated catalog
  const key = `${symbol}:::${name}`;
  if (!_seenTseKeys.has(key)) {
    _seenTseKeys.add(key);
    TSE_SUPPLEMENT.push({ symbol, name });
  }
}

/** Unique symbol set for TSE supplement (primary name only, no aliases) */
const TSE_SUPPLEMENT_PRIMARY = new Map<string, string>();
for (const { symbol, name } of TSE_SUPPLEMENT) {
  if (!TSE_SUPPLEMENT_PRIMARY.has(symbol) && !DELISTED_JP.has(symbol) && !name.includes("重複")) {
    TSE_SUPPLEMENT_PRIMARY.set(symbol, name);
  }
}

/**
 * Fast O(1) lookup of TSE_NAMES entries.
 * Used by getJpName to resolve JP names for stocks not in the curated catalog.
 * First non-defunct name wins.
 */
const TSE_NAMES_MAP = new Map<string, string>();
for (const [symbol, name] of TSE_NAMES) {
  if (!TSE_NAMES_MAP.has(symbol) && !name.includes("廃止") && !name.includes("重複")) {
    TSE_NAMES_MAP.set(symbol, name);
  }
}

/**
 * Full JP stock browse list: curated catalog JP stocks +
 * supplemental TSE stocks (no aliases, no deleted/duplicate entries).
 * Used by the browse page to populate the complete JP universe.
 */
export function getFullJpBrowseList(): { symbol: string; name: string; sector?: string }[] {
  const out: { symbol: string; name: string; sector?: string }[] = [];
  // Curated catalog first (have sector info)
  for (const s of JP_STOCKS_LIST) {
    if (s.type === "etf") continue; // ETFs handled separately
    if (DELISTED_JP.has(s.symbol)) continue; // 上場廃止/非上場/非公開
    out.push({ symbol: s.symbol, name: s.name, sector: s.sector });
  }
  // TSE supplement (no sector info, no aliases, no defunct entries)
  for (const [symbol, name] of TSE_SUPPLEMENT_PRIMARY) {
    out.push({ symbol, name });
  }
  return out;
}

export function findJpStockBySymbol(symbol: string): JpStock | undefined {
  const s = SYMBOL_INDEX.get(symbol);
  return s?.market === "JP" ? s : undefined;
}

/**
 * Returns a Japanese-friendly display name for the symbol if known.
 * - JP stocks (curated catalog) → official Japanese company name
 * - JP stocks (TSE supplement) → Japanese name from tse-names
 * - US stocks → katakana name (from us-katakana overlay) when curated
 * - Otherwise null (caller should fall back to Yahoo's English name)
 */
export function getJpName(symbol: string): string | null {
  const s = SYMBOL_INDEX.get(symbol);
  if (s?.market === "JP") return s.name;
  // Fallback: check TSE supplement for stocks not in curated catalog
  if (symbol.endsWith(".T")) {
    const tseName = TSE_NAMES_MAP.get(symbol);
    if (tseName) return tseName;
  }
  return getUsKatakana(symbol);
}

const KANA_SMALL_TO_LARGE: Record<string, string> = {
  ぁ: "あ", ぃ: "い", ぅ: "う", ぇ: "え", ぉ: "お",
  っ: "つ", ゃ: "や", ゅ: "ゆ", ょ: "よ",
  ァ: "ア", ィ: "イ", ゥ: "ウ", ェ: "エ", ォ: "オ",
  ッ: "ツ", ャ: "ヤ", ュ: "ユ", ョ: "ヨ",
};

function hiraganaToKatakana(s: string): string {
  return s.replace(/[ぁ-ゖ]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60),
  );
}

export function normalize(s: string): string {
  let out = s.toLowerCase().trim();
  out = hiraganaToKatakana(out);
  out = out.replace(/[ぁ-ゖァ-ヺ]/g, (ch) => KANA_SMALL_TO_LARGE[ch] ?? ch);
  out = out.replace(/[・\s\-_･.（）()【】「」]/g, "");
  return out;
}

export function searchJpStocks(query: string, limit = 12): JpStock[] {
  const q = normalize(query);
  if (!q) return [];
  const exact: JpStock[] = [];
  const startsWith: JpStock[] = [];
  const contains: JpStock[] = [];

  for (const s of JP_STOCKS_LIST) {
    const haystacks = [s.name, s.symbol, ...(s.aliases ?? [])].map(normalize);
    let rank: 0 | 1 | 2 | 3 = 0;
    for (const h of haystacks) {
      if (h === q) { rank = 3; break; }
      else if (h.startsWith(q)) rank = Math.max(rank, 2) as 2 | 3;
      else if (h.includes(q))   rank = Math.max(rank, 1) as 1 | 2 | 3;
    }
    if (rank === 3) exact.push(s);
    else if (rank === 2) startsWith.push(s);
    else if (rank === 1) contains.push(s);
  }

  return [...exact, ...startsWith, ...contains].slice(0, limit);
}

/**
 * Search the supplemental TSE catalog (companies not in the curated catalog).
 * Returns lightweight { symbol, name } objects.
 */
export function searchTseNames(query: string, limit = 10): TseNameMatch[] {
  const q = normalize(query);
  if (!q) return [];
  const exact: TseNameMatch[] = [];
  const startsWith: TseNameMatch[] = [];
  const contains: TseNameMatch[] = [];

  for (const s of TSE_SUPPLEMENT) {
    const hn = normalize(s.name);
    const hs = normalize(s.symbol);
    // skip dummy/廃止 entries with （）in normalized name
    if (hn.includes("廃止") || hn.includes("重複")) continue;
    let rank: 0 | 1 | 2 | 3 = 0;
    for (const h of [hn, hs]) {
      if (h === q) { rank = 3; break; }
      else if (h.startsWith(q)) rank = Math.max(rank, 2) as 2 | 3;
      else if (h.includes(q))   rank = Math.max(rank, 1) as 1 | 2 | 3;
    }
    if (rank === 3) exact.push(s);
    else if (rank === 2) startsWith.push(s);
    else if (rank === 1) contains.push(s);
  }

  return [...exact, ...startsWith, ...contains].slice(0, limit);
}

/**
 * Search ALL US_KATAKANA entries directly (not limited to STOCKS_CATALOG).
 * Returns { symbol, katakana } pairs. Used to ensure full coverage of
 * ~300 US stocks even when only a subset is in the curated catalog.
 */
export function searchAllUsKatakana(
  query: string,
  limit = 10,
): { symbol: string; katakana: string }[] {
  const q = normalize(query);
  if (!q) return [];
  const exact:      { symbol: string; katakana: string }[] = [];
  const startsWith: { symbol: string; katakana: string }[] = [];
  const contains:   { symbol: string; katakana: string }[] = [];

  for (const [symbol, katakana] of Object.entries(US_KATAKANA)) {
    const h = normalize(katakana);
    const hs = normalize(symbol);
    let rank: 0 | 1 | 2 | 3 = 0;
    for (const hay of [h, hs]) {
      if (hay === q)           { rank = 3; break; }
      else if (hay.startsWith(q)) rank = Math.max(rank, 2) as 2;
      else if (hay.includes(q))   rank = Math.max(rank, 1) as 1;
    }
    const item = { symbol, katakana };
    if      (rank === 3) exact.push(item);
    else if (rank === 2) startsWith.push(item);
    else if (rank === 1) contains.push(item);
  }
  return [...exact, ...startsWith, ...contains].slice(0, limit);
}

/**
 * Search US stocks by katakana name, English name, or ticker symbol.
 */
export function searchUsStocks(query: string, limit = 8): JpStock[] {
  const q = normalize(query);
  if (!q) return [];
  const exact: JpStock[] = [];
  const startsWith: JpStock[] = [];
  const contains: JpStock[] = [];

  for (const s of US_STOCKS_LIST) {
    const katakana = getUsKatakana(s.symbol);
    const haystacks = [
      s.name, s.symbol,
      ...(katakana ? [katakana] : []),
      ...(s.aliases ?? []),
    ].map(normalize);

    let rank: 0 | 1 | 2 | 3 = 0;
    for (const h of haystacks) {
      if (h === q) { rank = 3; break; }
      else if (h.startsWith(q)) rank = Math.max(rank, 2) as 2 | 3;
      else if (h.includes(q))   rank = Math.max(rank, 1) as 1 | 2 | 3;
    }
    if (rank === 3) exact.push(s);
    else if (rank === 2) startsWith.push(s);
    else if (rank === 1) contains.push(s);
  }

  return [...exact, ...startsWith, ...contains].slice(0, limit);
}
