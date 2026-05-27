export type GicsSectorId =
  | "energy"
  | "materials"
  | "industrials"
  | "consumer-discretionary"
  | "consumer-staples"
  | "health-care"
  | "financials"
  | "information-technology"
  | "communication-services"
  | "utilities"
  | "real-estate";

export type GicsSector = {
  id: GicsSectorId;
  name: string;
  nameJa: string;
  emoji: string;
  description: string;
  accent: string; // tailwind color slug (e.g., "amber", "blue")
};

export const GICS_SECTORS: GicsSector[] = [
  { id: "energy", name: "Energy", nameJa: "エネルギー", emoji: "⛽", description: "石油・ガス・関連サービス", accent: "amber" },
  { id: "materials", name: "Materials", nameJa: "素材", emoji: "🪨", description: "化学・金属・建材・紙・包装", accent: "stone" },
  { id: "industrials", name: "Industrials", nameJa: "資本財・サービス", emoji: "🏭", description: "機械・建設・運輸・航空宇宙", accent: "sky" },
  { id: "consumer-discretionary", name: "Consumer Discretionary", nameJa: "一般消費財", emoji: "🛍️", description: "自動車・小売・アパレル・娯楽", accent: "rose" },
  { id: "consumer-staples", name: "Consumer Staples", nameJa: "生活必需品", emoji: "🛒", description: "食品・飲料・日用品・タバコ", accent: "emerald" },
  { id: "health-care", name: "Health Care", nameJa: "ヘルスケア", emoji: "💊", description: "医薬品・医療機器・バイオ", accent: "teal" },
  { id: "financials", name: "Financials", nameJa: "金融", emoji: "🏦", description: "銀行・保険・証券・資産運用", accent: "indigo" },
  { id: "information-technology", name: "Information Technology", nameJa: "情報技術", emoji: "💻", description: "半導体・ソフトウェア・IT機器", accent: "blue" },
  { id: "communication-services", name: "Communication Services", nameJa: "コミュニケーション", emoji: "📡", description: "通信・メディア・エンタメ・SNS", accent: "violet" },
  { id: "utilities", name: "Utilities", nameJa: "公益事業", emoji: "💡", description: "電力・ガス・水道", accent: "yellow" },
  { id: "real-estate", name: "Real Estate", nameJa: "不動産", emoji: "🏢", description: "REIT・不動産デベロッパー", accent: "fuchsia" },
];

const YAHOO_SECTOR_MAP: Record<string, GicsSectorId> = {
  Energy: "energy",
  "Basic Materials": "materials",
  Materials: "materials",
  Industrials: "industrials",
  "Consumer Cyclical": "consumer-discretionary",
  "Consumer Discretionary": "consumer-discretionary",
  "Consumer Defensive": "consumer-staples",
  "Consumer Staples": "consumer-staples",
  Healthcare: "health-care",
  "Health Care": "health-care",
  "Financial Services": "financials",
  Financials: "financials",
  Technology: "information-technology",
  "Information Technology": "information-technology",
  "Communication Services": "communication-services",
  Utilities: "utilities",
  "Real Estate": "real-estate",
};

export function mapYahooSectorToGics(
  yahooSector: string | null | undefined,
): GicsSectorId | null {
  if (!yahooSector) return null;
  return YAHOO_SECTOR_MAP[yahooSector] ?? null;
}

export function getSector(id: GicsSectorId | string): GicsSector | undefined {
  return GICS_SECTORS.find((s) => s.id === id);
}
