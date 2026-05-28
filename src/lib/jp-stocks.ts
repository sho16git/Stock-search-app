import { STOCKS_CATALOG, type CatalogStock } from "./stocks-catalog";
import { getUsKatakana } from "./us-katakana";

export type JpStock = CatalogStock;

const JP_STOCKS_LIST = STOCKS_CATALOG.filter((s) => s.market === "JP");
const US_STOCKS_LIST = STOCKS_CATALOG.filter((s) => s.market === "US");
const SYMBOL_INDEX = new Map(STOCKS_CATALOG.map((s) => [s.symbol, s]));

export function findJpStockBySymbol(symbol: string): JpStock | undefined {
  const s = SYMBOL_INDEX.get(symbol);
  return s?.market === "JP" ? s : undefined;
}

/**
 * Returns a Japanese-friendly display name for the symbol if known.
 * - JP stocks → official Japanese company name (from catalog)
 * - US stocks → katakana name (from us-katakana overlay) when curated
 * - Otherwise null (caller should fall back to Yahoo's English name)
 */
export function getJpName(symbol: string): string | null {
  const s = SYMBOL_INDEX.get(symbol);
  if (s?.market === "JP") return s.name;
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

function normalize(s: string): string {
  let out = s.toLowerCase().trim();
  out = hiraganaToKatakana(out);
  out = out.replace(/[ぁ-ゖァ-ヺ]/g, (ch) => KANA_SMALL_TO_LARGE[ch] ?? ch);
  out = out.replace(/[・\s\-_･.]/g, "");
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
      if (h === q) {
        rank = 3;
        break;
      } else if (h.startsWith(q)) {
        rank = Math.max(rank, 2) as 2 | 3;
      } else if (h.includes(q)) {
        rank = Math.max(rank, 1) as 1 | 2 | 3;
      }
    }
    if (rank === 3) exact.push(s);
    else if (rank === 2) startsWith.push(s);
    else if (rank === 1) contains.push(s);
  }

  return [...exact, ...startsWith, ...contains].slice(0, limit);
}

/**
 * Search US stocks by katakana name, English name, or ticker symbol.
 * Used when a Japanese query (containing katakana/kanji) needs to match US stocks.
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
      s.name,
      s.symbol,
      ...(katakana ? [katakana] : []),
      ...(s.aliases ?? []),
    ].map(normalize);

    let rank: 0 | 1 | 2 | 3 = 0;
    for (const h of haystacks) {
      if (h === q) {
        rank = 3;
        break;
      } else if (h.startsWith(q)) {
        rank = Math.max(rank, 2) as 2 | 3;
      } else if (h.includes(q)) {
        rank = Math.max(rank, 1) as 1 | 2 | 3;
      }
    }
    if (rank === 3) exact.push(s);
    else if (rank === 2) startsWith.push(s);
    else if (rank === 1) contains.push(s);
  }

  return [...exact, ...startsWith, ...contains].slice(0, limit);
}
