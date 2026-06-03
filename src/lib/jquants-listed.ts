/**
 * J-Quants listed company info — module-level 24 h cache.
 *
 * Sources all ~3,800 TSE-listed stocks from /listed/info and maps
 * J-Quants Sector17 codes to GICS sector IDs used throughout the app.
 */

import { jquantsGet, isJQuantsConfigured } from "./jquants";

// ── Sector17 (TSE official 17 sectors) → GICS sector ID ───────────
const SECTOR17_GICS: Record<string, string> = {
  "1":  "consumer-staples",       // 食品
  "2":  "energy",                 // エネルギー資源
  "3":  "materials",              // 建設・資材
  "4":  "materials",              // 素材・化学
  "5":  "health-care",            // 医薬品・バイオ
  "6":  "consumer-discretionary", // 自動車・輸送機
  "7":  "materials",              // 鉄鋼・非鉄
  "8":  "industrials",            // 機械
  "9":  "information-technology", // 電機・精密
  "10": "communication-services", // 情報通信・サービスその他
  "11": "utilities",              // 電力・ガス
  "12": "industrials",            // 運輸・物流
  "13": "industrials",            // 商社・卸売
  "14": "consumer-discretionary", // 小売
  "15": "financials",             // 銀行
  "16": "financials",             // 金融（除く銀行）
  "17": "real-estate",            // 不動産
};

// ── Types ──────────────────────────────────────────────────────────
type RawInfo = {
  Code:               string;
  CompanyName:        string;
  CompanyNameEnglish: string;
  Sector17Code:       string;
  Sector17CodeName:   string;
  Sector33Code:       string;
  Sector33CodeName:   string;
  MarketCodeName:     string;
  ScaleCategory:      string;
};

export type JQuantsStock = {
  code:         string;  // 4-digit (e.g. "7203")
  symbol:       string;  // Yahoo Finance format (e.g. "7203.T")
  name:         string;  // Japanese company name
  nameEn:       string;  // English company name
  sector17:     string;  // Sector17 code (1–17)
  sector17Name: string;  // Sector17 Japanese name
  sector33Name: string;  // Sector33 Japanese name (more granular)
  gicsId:       string | null; // mapped GICS ID
  market:       string;  // "プライム" | "スタンダード" | "グロース"
};

// ── Module-level cache ─────────────────────────────────────────────
let _cache:      JQuantsStock[] | null = null;
let _cacheTime   = 0;
const CACHE_TTL  = 24 * 60 * 60 * 1000; // 24 hours

// ── Public API ─────────────────────────────────────────────────────

/**
 * Returns all TSE-listed stocks from J-Quants (cached for 24 h).
 * Returns empty array when J-Quants is not configured.
 */
export async function getJQuantsListed(): Promise<JQuantsStock[]> {
  if (!isJQuantsConfigured()) return [];
  if (_cache && Date.now() - _cacheTime < CACHE_TTL) return _cache;

  const data = await jquantsGet<{ info?: RawInfo[] }>("/listed/info");
  const items: JQuantsStock[] = [];

  for (const r of data.info ?? []) {
    if (!r.Code || !r.CompanyName) continue;
    // Filter to 4-digit numeric stock codes only (skip non-stock entries)
    const code4 = r.Code.replace(/0$/, "").slice(0, 4);
    if (!/^\d{4}$/.test(code4)) continue;
    // Skip entries with no market (unlisted / suspended)
    if (!r.MarketCodeName) continue;

    items.push({
      code:         code4,
      symbol:       `${code4}.T`,
      name:         r.CompanyName,
      nameEn:       r.CompanyNameEnglish ?? "",
      sector17:     r.Sector17Code ?? "",
      sector17Name: r.Sector17CodeName ?? "",
      sector33Name: r.Sector33CodeName ?? "",
      gicsId:       SECTOR17_GICS[r.Sector17Code] ?? null,
      market:       r.MarketCodeName ?? "",
    });
  }

  _cache     = items;
  _cacheTime = Date.now();
  return items;
}

/** Force invalidate the listed cache (e.g. after market open) */
export function invalidateListedCache(): void {
  _cache     = null;
  _cacheTime = 0;
}
