/**
 * Static translation maps for common English terms shown in the app
 * (analyst grades, market states, exchanges, countries, industries).
 * Returns the original string when no Japanese mapping exists.
 */

const GRADE_JA: Record<string, string> = {
  "strong buy": "強い買い",
  buy: "買い",
  outperform: "アウトパフォーム",
  "sector outperform": "セクター強気",
  overweight: "強気",
  accumulate: "積み増し",
  "long-term buy": "長期買い",
  "top pick": "トップピック",
  add: "買い増し",
  hold: "中立",
  neutral: "中立",
  "equal-weight": "中立",
  "equal weight": "中立",
  "market perform": "市場並み",
  "sector perform": "市場並み",
  "in-line": "中立",
  inline: "中立",
  "peer perform": "中立",
  underperform: "アンダーパフォーム",
  "sector underperform": "セクター弱気",
  underweight: "弱気",
  reduce: "減持",
  sell: "売り",
  "strong sell": "強い売り",
  "speculative buy": "投機買い",
  "tender offer": "公開買付",
};

export function translateGrade(grade: string | null | undefined): string {
  if (!grade) return "—";
  return GRADE_JA[grade.toLowerCase().trim()] ?? grade;
}

const RECOMMENDATION_KEY_JA: Record<string, string> = {
  strong_buy: "強い買い",
  buy: "買い",
  hold: "中立",
  underperform: "売り検討",
  sell: "売り",
  strong_sell: "強い売り",
  none: "—",
};

export function translateRecommendationKey(key: string | null | undefined): string {
  if (!key) return "—";
  return RECOMMENDATION_KEY_JA[key.toLowerCase()] ?? key;
}

const MARKET_STATE_JA: Record<string, string> = {
  REGULAR: "取引中",
  PRE: "寄付前",
  PREPRE: "寄付前",
  POST: "引け後",
  POSTPOST: "引け後",
  CLOSED: "取引終了",
  CLOSE: "取引終了",
  PRELAUNCH: "上場前",
};

export function translateMarketState(state: string | null | undefined): string {
  if (!state) return "—";
  return MARKET_STATE_JA[state.toUpperCase()] ?? state;
}

const EXCHANGE_JA: Record<string, string> = {
  // US
  NMS: "NASDAQ",
  NasdaqGS: "NASDAQ",
  NasdaqCM: "NASDAQ",
  NasdaqGM: "NASDAQ",
  NCM: "NASDAQ",
  NGM: "NASDAQ",
  NYQ: "ニューヨーク証券取引所",
  NYSE: "ニューヨーク証券取引所",
  PCX: "NYSE Arca",
  ARCA: "NYSE Arca",
  ASE: "NYSE American",
  BATS: "Cboe BZX",
  // Japan
  JPX: "東京証券取引所",
  Tokyo: "東京証券取引所",
  TYO: "東京証券取引所",
  OSA: "大阪取引所",
  // Misc
  OTCPK: "OTC Markets",
  OPR: "オプション市場",
  CCC: "暗号資産",
};

export function translateExchange(ex: string | null | undefined): string {
  if (!ex) return "—";
  return EXCHANGE_JA[ex] ?? ex;
}

const COUNTRY_JA: Record<string, string> = {
  "United States": "アメリカ合衆国",
  USA: "アメリカ合衆国",
  US: "アメリカ合衆国",
  Japan: "日本",
  China: "中国",
  "Hong Kong": "香港",
  Taiwan: "台湾",
  "South Korea": "韓国",
  Korea: "韓国",
  Singapore: "シンガポール",
  "United Kingdom": "イギリス",
  UK: "イギリス",
  Germany: "ドイツ",
  France: "フランス",
  Italy: "イタリア",
  Spain: "スペイン",
  Netherlands: "オランダ",
  Switzerland: "スイス",
  Sweden: "スウェーデン",
  Norway: "ノルウェー",
  Denmark: "デンマーク",
  Finland: "フィンランド",
  Belgium: "ベルギー",
  Ireland: "アイルランド",
  Canada: "カナダ",
  Mexico: "メキシコ",
  Brazil: "ブラジル",
  Argentina: "アルゼンチン",
  Chile: "チリ",
  Australia: "オーストラリア",
  "New Zealand": "ニュージーランド",
  India: "インド",
  Indonesia: "インドネシア",
  Thailand: "タイ",
  Vietnam: "ベトナム",
  Philippines: "フィリピン",
  Malaysia: "マレーシア",
  Israel: "イスラエル",
  "Saudi Arabia": "サウジアラビア",
  "United Arab Emirates": "アラブ首長国連邦",
  Russia: "ロシア",
  "South Africa": "南アフリカ",
  Turkey: "トルコ",
  Greece: "ギリシャ",
  Portugal: "ポルトガル",
  Poland: "ポーランド",
  "Czech Republic": "チェコ",
  Austria: "オーストリア",
};

export function translateCountry(c: string | null | undefined): string {
  if (!c) return "—";
  return COUNTRY_JA[c] ?? c;
}

const INDUSTRY_JA: Record<string, string> = {
  // IT / Tech
  "Consumer Electronics": "家電",
  "Software—Application": "ソフトウェア (アプリケーション)",
  "Software - Application": "ソフトウェア (アプリケーション)",
  "Software—Infrastructure": "ソフトウェア (インフラ)",
  "Software - Infrastructure": "ソフトウェア (インフラ)",
  Semiconductors: "半導体",
  "Semiconductor Equipment & Materials": "半導体製造装置・材料",
  "Information Technology Services": "ITサービス",
  "Communication Equipment": "通信機器",
  "Computer Hardware": "コンピュータハードウェア",
  "Electronic Components": "電子部品",
  "Electronics & Computer Distribution": "電子・コンピュータ流通",
  "Scientific & Technical Instruments": "科学・技術機器",
  "Solar": "太陽光発電",
  "Internet Content & Information": "インターネットコンテンツ",
  "Internet Retail": "ネット通販",

  // Communication Services
  "Telecom Services": "通信サービス",
  "Entertainment": "エンターテインメント",
  "Electronic Gaming & Multimedia": "電子ゲーム・マルチメディア",
  "Broadcasting": "放送",
  "Publishing": "出版",
  "Advertising Agencies": "広告代理店",

  // Consumer Discretionary
  "Auto Manufacturers": "自動車製造",
  "Auto Parts": "自動車部品",
  "Auto & Truck Dealerships": "自動車販売",
  "Furnishings, Fixtures & Appliances": "家具・家電",
  "Home Improvement Retail": "ホームセンター小売",
  "Specialty Retail": "専門店小売",
  "Apparel Retail": "アパレル小売",
  "Apparel Manufacturing": "アパレル製造",
  "Footwear & Accessories": "履物・アクセサリー",
  "Luxury Goods": "高級品",
  "Leisure": "レジャー",
  "Restaurants": "飲食店",
  "Travel Services": "旅行サービス",
  "Lodging": "宿泊",
  "Resorts & Casinos": "リゾート・カジノ",
  "Gambling": "ギャンブル",
  "Residential Construction": "住宅建設",
  "Recreational Vehicles": "レクリエーション車両",
  "Department Stores": "百貨店",
  "Discount Stores": "ディスカウントストア",

  // Consumer Staples
  "Grocery Stores": "食料品店",
  "Beverages—Non-Alcoholic": "飲料 (ノンアル)",
  "Beverages - Non-Alcoholic": "飲料 (ノンアル)",
  "Beverages—Brewers": "ビール",
  "Beverages—Wineries & Distilleries": "酒類 (ワイン・蒸留酒)",
  "Tobacco": "タバコ",
  "Confectioners": "菓子",
  "Packaged Foods": "加工食品",
  "Food Distribution": "食品流通",
  "Household & Personal Products": "日用品",
  "Personal Services": "対人サービス",
  "Education & Training Services": "教育・研修",

  // Health Care
  "Drug Manufacturers—General": "医薬品 (大手)",
  "Drug Manufacturers - General": "医薬品 (大手)",
  "Drug Manufacturers—Specialty & Generic": "医薬品 (専門・ジェネリック)",
  "Drug Manufacturers - Specialty & Generic": "医薬品 (専門・ジェネリック)",
  Biotechnology: "バイオテクノロジー",
  "Medical Devices": "医療機器",
  "Medical Instruments & Supplies": "医療機器・用品",
  "Medical Care Facilities": "医療施設",
  "Medical Distribution": "医療品流通",
  "Health Information Services": "ヘルスケア情報サービス",
  "Healthcare Plans": "医療保険",
  "Diagnostics & Research": "診断・研究",
  "Pharmaceutical Retailers": "薬局",

  // Financials
  "Banks—Diversified": "銀行 (総合)",
  "Banks - Diversified": "銀行 (総合)",
  "Banks—Regional": "銀行 (地域)",
  "Banks - Regional": "銀行 (地域)",
  "Capital Markets": "資本市場",
  "Asset Management": "資産運用",
  "Financial Data & Stock Exchanges": "金融データ・取引所",
  "Credit Services": "クレジット",
  "Insurance—Diversified": "保険 (総合)",
  "Insurance - Diversified": "保険 (総合)",
  "Insurance—Life": "生命保険",
  "Insurance - Life": "生命保険",
  "Insurance—Property & Casualty": "損害保険",
  "Insurance - Property & Casualty": "損害保険",
  "Insurance—Specialty": "保険 (特殊)",
  "Insurance - Specialty": "保険 (特殊)",
  "Insurance—Reinsurance": "再保険",
  "Insurance Brokers": "保険ブローカー",
  "Mortgage Finance": "住宅ローン金融",
  "Financial Conglomerates": "金融コングロマリット",

  // Industrials
  Aerospace: "航空宇宙",
  "Aerospace & Defense": "航空宇宙・防衛",
  Airlines: "航空",
  "Airports & Air Services": "空港・航空サービス",
  "Marine Shipping": "海運",
  "Railroads": "鉄道",
  "Trucking": "トラック輸送",
  "Integrated Freight & Logistics": "物流",
  "Engineering & Construction": "エンジニアリング・建設",
  "Building Products & Equipment": "建材・設備",
  "Industrial Distribution": "産業流通",
  "Specialty Industrial Machinery": "産業機械 (特殊)",
  "Farm & Heavy Construction Machinery": "建機・農機",
  "Conglomerates": "コングロマリット",
  "Business Services": "ビジネスサービス",
  "Consulting Services": "コンサルティング",
  "Staffing & Employment Services": "人材サービス",
  "Security & Protection Services": "警備・保安",
  "Waste Management": "廃棄物処理",
  "Pollution & Treatment Controls": "汚染対策・処理",
  "Rental & Leasing Services": "レンタル・リース",

  // Materials
  "Specialty Chemicals": "特殊化学",
  Chemicals: "化学",
  "Agricultural Inputs": "農業資材",
  Steel: "鉄鋼",
  Aluminum: "アルミニウム",
  "Other Industrial Metals & Mining": "その他産業金属・鉱業",
  "Gold": "金",
  Silver: "銀",
  Copper: "銅",
  "Coking Coal": "原料炭",
  "Paper & Paper Products": "紙・紙製品",
  "Lumber & Wood Production": "木材",
  "Building Materials": "建材",
  "Packaging & Containers": "包装・容器",

  // Energy
  "Oil & Gas Integrated": "石油・ガス (統合型)",
  "Oil & Gas E&P": "石油・ガス (探鉱開発)",
  "Oil & Gas Midstream": "石油・ガス (中流)",
  "Oil & Gas Refining & Marketing": "石油・ガス (精製販売)",
  "Oil & Gas Equipment & Services": "石油・ガス機器・サービス",
  "Oil & Gas Drilling": "石油・ガス掘削",
  "Thermal Coal": "一般炭",
  "Uranium": "ウラン",

  // Utilities
  "Utilities—Regulated Electric": "電力 (規制)",
  "Utilities - Regulated Electric": "電力 (規制)",
  "Utilities—Regulated Gas": "ガス (規制)",
  "Utilities - Regulated Gas": "ガス (規制)",
  "Utilities—Regulated Water": "水道 (規制)",
  "Utilities - Regulated Water": "水道 (規制)",
  "Utilities—Diversified": "公益事業 (総合)",
  "Utilities - Diversified": "公益事業 (総合)",
  "Utilities—Renewable": "再生可能エネルギー",
  "Utilities - Renewable": "再生可能エネルギー",
  "Utilities—Independent Power Producers": "独立系発電",
  "Utilities - Independent Power Producers": "独立系発電",

  // Real Estate
  "REIT—Residential": "REIT (住宅)",
  "REIT - Residential": "REIT (住宅)",
  "REIT—Retail": "REIT (商業施設)",
  "REIT - Retail": "REIT (商業施設)",
  "REIT—Office": "REIT (オフィス)",
  "REIT - Office": "REIT (オフィス)",
  "REIT—Industrial": "REIT (物流・工業)",
  "REIT - Industrial": "REIT (物流・工業)",
  "REIT—Hotel & Motel": "REIT (ホテル)",
  "REIT - Hotel & Motel": "REIT (ホテル)",
  "REIT—Healthcare Facilities": "REIT (ヘルスケア)",
  "REIT - Healthcare Facilities": "REIT (ヘルスケア)",
  "REIT—Specialty": "REIT (特殊)",
  "REIT - Specialty": "REIT (特殊)",
  "REIT—Diversified": "REIT (総合)",
  "REIT - Diversified": "REIT (総合)",
  "REIT—Mortgage": "REIT (モーゲージ)",
  "REIT - Mortgage": "REIT (モーゲージ)",
  "Real Estate Services": "不動産サービス",
  "Real Estate—Diversified": "不動産 (総合)",
  "Real Estate - Diversified": "不動産 (総合)",
  "Real Estate—Development": "不動産開発",
  "Real Estate - Development": "不動産開発",
};

export function translateIndustry(ind: string | null | undefined): string {
  if (!ind) return "—";
  return INDUSTRY_JA[ind] ?? ind;
}
