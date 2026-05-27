/**
 * Curated shareholder benefit (株主優待) data for major Japanese-listed stocks.
 * Source: each company's IR website (as of late 2025 — may change; refer to IR for latest).
 */

export type Yutai = {
  /** Description of the benefit */
  description: string;
  /** Minimum units (typically 100 shares = 1 unit in Japan) */
  minShares: number;
  /** Approximate monetary value in JPY for the minimum holding */
  approxValueJpy?: number;
  /** Holding period requirement (e.g., "1 year") */
  holdingRequirement?: string;
  /** Record (権利確定) months */
  recordMonths?: number[];
};

export const YUTAI: Record<string, Yutai> = {
  // 一般消費財
  "9983.T": {
    description: "ユニクロ・GU等の優待割引券",
    minShares: 100,
    approxValueJpy: 1000,
    holdingRequirement: "なし",
    recordMonths: [2, 8],
  },
  "4661.T": {
    description: "東京ディズニーリゾート 1デーパスポート",
    minShares: 100,
    approxValueJpy: 8400,
    holdingRequirement: "1年以上",
    recordMonths: [3, 9],
  },
  "8267.T": {
    description: "イオン オーナーズカード (3〜7%キャッシュバック)",
    minShares: 100,
    approxValueJpy: 3000,
    recordMonths: [2, 8],
  },
  "9831.T": {
    description: "ヤマダ電機 お買物優待券",
    minShares: 100,
    approxValueJpy: 500,
    recordMonths: [3, 9],
  },
  "3086.T": {
    description: "J.フロント・大丸松坂屋カード (10%割引)",
    minShares: 100,
    recordMonths: [2, 8],
  },
  "8233.T": {
    description: "高島屋 株主優待カード (10%割引)",
    minShares: 100,
    recordMonths: [2, 8],
  },
  "8252.T": {
    description: "丸井グループ お買物券・ネット買物券",
    minShares: 100,
    approxValueJpy: 2000,
    recordMonths: [3, 9],
  },
  "3099.T": {
    description: "三越伊勢丹 株主優待カード (10%割引)",
    minShares: 100,
    recordMonths: [3, 9],
  },
  "3092.T": {
    description: "ZOZOTOWN 割引クーポン",
    minShares: 100,
    approxValueJpy: 2000,
    recordMonths: [3],
  },
  "2670.T": {
    description: "ABC-MART 商品割引券",
    minShares: 100,
    approxValueJpy: 2000,
    recordMonths: [2, 8],
  },

  // 生活必需品
  "2914.T": {
    description: "JT 自社グループ商品セット (食品・飲料)",
    minShares: 100,
    approxValueJpy: 2500,
    holdingRequirement: "1年以上",
    recordMonths: [12],
  },
  "2502.T": {
    description: "アサヒビール 自社製品 (ビール・ノンアル等)",
    minShares: 100,
    approxValueJpy: 1000,
    recordMonths: [12],
  },
  "2503.T": {
    description: "キリン 自社製品 (ビール・飲料等)",
    minShares: 100,
    approxValueJpy: 1000,
    recordMonths: [12],
  },
  "2802.T": {
    description: "味の素 自社グループ商品",
    minShares: 100,
    approxValueJpy: 1500,
    recordMonths: [3],
  },
  "2269.T": {
    description: "明治HD 自社グループ商品 (チョコ・乳製品)",
    minShares: 100,
    approxValueJpy: 2000,
    recordMonths: [3],
  },
  "2897.T": {
    description: "日清食品 自社製品セット (即席麺)",
    minShares: 100,
    approxValueJpy: 1500,
    recordMonths: [3],
  },
  "2801.T": {
    description: "キッコーマン 自社商品 (醤油等)",
    minShares: 100,
    approxValueJpy: 1500,
    holdingRequirement: "1年以上",
    recordMonths: [3],
  },
  "4452.T": {
    description: "花王 自社製品 (化粧品・日用品)",
    minShares: 100,
    approxValueJpy: 3000,
    holdingRequirement: "3年以上",
    recordMonths: [12],
  },
  "4911.T": {
    description: "資生堂 自社化粧品",
    minShares: 100,
    approxValueJpy: 3000,
    holdingRequirement: "3年以上",
    recordMonths: [12],
  },
  "3382.T": {
    description: "セブン&アイ 食事優待券・サービス券",
    minShares: 100,
    approxValueJpy: 1000,
    recordMonths: [2, 8],
  },
  "2811.T": {
    description: "カゴメ 自社商品セット (野菜飲料)",
    minShares: 100,
    approxValueJpy: 2000,
    holdingRequirement: "6か月以上",
    recordMonths: [6],
  },
  "3088.T": {
    description: "マツキヨココカラ 商品割引券",
    minShares: 100,
    approxValueJpy: 2000,
    recordMonths: [3, 9],
  },

  // 運輸 / 旅行
  "9201.T": {
    description: "JAL 国内線割引券 (50%割引)",
    minShares: 100,
    approxValueJpy: 3000,
    recordMonths: [3, 9],
  },
  "9202.T": {
    description: "ANA 国内線割引券 (50%割引)",
    minShares: 100,
    approxValueJpy: 3000,
    recordMonths: [3, 9],
  },
  "9020.T": {
    description: "JR東日本 株主優待割引券 (運賃4割引)",
    minShares: 100,
    approxValueJpy: 2000,
    recordMonths: [3],
  },
  "9022.T": {
    description: "JR東海 株主優待割引券 (運賃1割引)",
    minShares: 100,
    approxValueJpy: 1500,
    recordMonths: [3, 9],
  },
  "9021.T": {
    description: "JR西日本 株主優待割引券 (運賃5割引)",
    minShares: 100,
    approxValueJpy: 2000,
    recordMonths: [3],
  },

  // 通信
  "9433.T": {
    description: "KDDI カタログギフト (Pontaポイント等)",
    minShares: 100,
    approxValueJpy: 3000,
    holdingRequirement: "1年以上",
    recordMonths: [3],
  },
  "9434.T": {
    description: "ソフトバンク PayPayポイント",
    minShares: 100,
    approxValueJpy: 1000,
    holdingRequirement: "1年以上",
    recordMonths: [3],
  },

  // エンターテインメント
  "7974.T": {
    description: "株主優待制度なし",
    minShares: 0,
  },
  "9684.T": {
    description: "スクエニ 自社ゲーム関連 (一部キャンペーン)",
    minShares: 100,
  },
  "7832.T": {
    description: "バンナム 自社プラモデル・カタログギフト",
    minShares: 100,
    approxValueJpy: 5000,
    recordMonths: [3],
  },
  "9697.T": {
    description: "カプコン 自社ゲーム関連 (オリジナルグッズ等)",
    minShares: 100,
    approxValueJpy: 2000,
    recordMonths: [3],
  },
  "9766.T": {
    description: "コナミ 自社グループ商品・割引券",
    minShares: 100,
    approxValueJpy: 1500,
    recordMonths: [3],
  },

  // 金融
  "8591.T": {
    description: "オリックス カタログギフト (廃止予定)",
    minShares: 100,
    approxValueJpy: 5000,
    recordMonths: [3],
  },
  "8473.T": {
    description: "SBI 暗号資産 (XRP) ・株主優待ポイント",
    minShares: 100,
    approxValueJpy: 1000,
    recordMonths: [3],
  },

  // 不動産・建設
  "1928.T": {
    description: "積水ハウス 自社米 (5kg)",
    minShares: 1000,
    approxValueJpy: 2000,
    recordMonths: [1],
  },
  "1925.T": {
    description: "大和ハウス 株主優待カード (リゾート割引等)",
    minShares: 100,
    recordMonths: [3],
  },

  // その他
  "2587.T": {
    description: "サントリー食品 自社商品 (清涼飲料水)",
    minShares: 100,
    approxValueJpy: 3000,
    holdingRequirement: "3年以上",
    recordMonths: [12],
  },
  "8113.T": {
    description: "ユニ・チャーム 自社製品セット",
    minShares: 100,
    approxValueJpy: 2000,
    holdingRequirement: "3年以上",
    recordMonths: [12],
  },
  "4578.T": {
    description: "大塚HD 自社グループ商品 (ボンカレー等)",
    minShares: 100,
    approxValueJpy: 3000,
    recordMonths: [12],
  },
  "4901.T": {
    description: "富士フイルム 自社製品優待販売",
    minShares: 100,
    recordMonths: [3, 9],
  },

  // ゲーム・小売
  "9602.T": {
    description: "東宝 映画招待券・宝塚観劇券",
    minShares: 100,
    approxValueJpy: 2000,
    recordMonths: [2, 8],
  },
  "7751.T": {
    description: "キヤノン 株主優待制度なし",
    minShares: 0,
  },
  "8001.T": {
    description: "伊藤忠商事 株主優待制度なし",
    minShares: 0,
  },
  "8058.T": {
    description: "三菱商事 株主優待制度なし",
    minShares: 0,
  },
  "8031.T": {
    description: "三井物産 株主優待制度なし",
    minShares: 0,
  },
};

export function getYutai(symbol: string): Yutai | null {
  return YUTAI[symbol] ?? null;
}
