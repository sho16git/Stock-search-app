// ── Market Index Constituent Data ───────────────────────────────────────────
//
// Constituent lists for major market indices.
// Note: Since yahoo-finance2 has no index-component API endpoint,
// these lists are maintained as static data.
// Nikkei 225 / S&P 500 lists are representative (major) constituents.

export type MarketIndexId =
  | "nikkei225"
  | "topix-core30"
  | "dow30"
  | "nasdaq100"
  | "sp500";

export type MarketIndex = {
  id: MarketIndexId;
  nameJa: string;
  nameEn: string;
  symbol: string; // Index ticker symbol for price display
  emoji: string;
  description: string;
  market: "JP" | "US";
  note?: string;
  components: string[];
};

export const MARKET_INDICES: MarketIndex[] = [
  // ── 日経平均株価 ────────────────────────────────────────────────────────
  {
    id: "nikkei225",
    nameJa: "日経平均株価",
    nameEn: "Nikkei 225",
    symbol: "^N225",
    emoji: "🇯🇵",
    description: "東京証券取引所プライム市場を代表する225銘柄で構成される日本の主要株価指数",
    market: "JP",
    note: "主要構成銘柄（代表的な銘柄を掲載）",
    components: [
      // 電気機器・精密機器
      "6758.T",  // ソニーグループ
      "8035.T",  // 東京エレクトロン
      "6861.T",  // キーエンス
      "6857.T",  // アドバンテスト
      "6920.T",  // レーザーテック
      "6981.T",  // 村田製作所
      "6762.T",  // TDK
      "6971.T",  // 京セラ
      "6702.T",  // 富士通
      "6701.T",  // NEC
      "6752.T",  // パナソニックHD
      "6501.T",  // 日立製作所
      "7751.T",  // キヤノン
      "7741.T",  // HOYA
      "7731.T",  // ニコン
      "6841.T",  // 横河電機
      "6645.T",  // オムロン
      "6724.T",  // セイコーエプソン
      "6723.T",  // ルネサスエレクトロニクス
      "6506.T",  // 安川電機
      "6954.T",  // ファナック
      "7735.T",  // SCREENホールディングス
      "6988.T",  // 日東電工
      "6479.T",  // ミネベアミツミ
      "6503.T",  // 三菱電機
      "6383.T",  // ダイフク
      "6674.T",  // ジーエス・ユアサコーポレーション
      "6718.T",  // アズビル
      "6594.T",  // ニデック
      "6526.T",  // ソシオネクスト
      // 半導体素材
      "4063.T",  // 信越化学工業
      // 輸送用機器
      "7203.T",  // トヨタ自動車
      "7267.T",  // 本田技研工業
      "7201.T",  // 日産自動車
      "7270.T",  // SUBARU
      "7269.T",  // スズキ
      "7272.T",  // ヤマハ発動機
      "6902.T",  // デンソー
      "5108.T",  // ブリヂストン
      "6201.T",  // トヨタ紡織(トヨタ自動車工業)
      "7011.T",  // 三菱重工業
      // 医薬品・医療機器
      "4502.T",  // 武田薬品工業
      "4519.T",  // 中外製薬
      "4568.T",  // 第一三共
      "4503.T",  // アステラス製薬
      "4523.T",  // エーザイ
      "4528.T",  // 小野薬品工業
      "4507.T",  // 塩野義製薬
      "4151.T",  // 協和キリン
      "4543.T",  // テルモ
      "7733.T",  // オリンパス
      // 銀行・金融
      "8306.T",  // 三菱UFJフィナンシャル・グループ
      "8316.T",  // 三井住友フィナンシャルグループ
      "8411.T",  // みずほフィナンシャルグループ
      "8604.T",  // 野村ホールディングス
      "8766.T",  // 東京海上ホールディングス
      "8750.T",  // 第一生命ホールディングス
      "8630.T",  // MS&ADインシュアランスグループHD
      "8795.T",  // T&Dホールディングス
      "8308.T",  // りそなホールディングス
      // 小売・消費財
      "9983.T",  // ファーストリテイリング
      "3382.T",  // セブン&アイ・ホールディングス
      "8267.T",  // イオン
      "3099.T",  // 三越伊勢丹ホールディングス
      "3086.T",  // Jフロントリテイリング
      "4661.T",  // オリエンタルランド
      "4452.T",  // 花王
      "2914.T",  // 日本たばこ産業
      "2802.T",  // 味の素
      "2502.T",  // アサヒグループホールディングス
      "2503.T",  // キリンホールディングス
      "2269.T",  // 明治ホールディングス
      "2282.T",  // 日本ハム
      "2801.T",  // キッコーマン
      // 商社
      "8058.T",  // 三菱商事
      "8053.T",  // 住友商事
      "8001.T",  // 伊藤忠商事
      "8031.T",  // 三井物産
      "8002.T",  // 丸紅
      "8015.T",  // 豊田通商
      // 不動産
      "8801.T",  // 三井不動産
      "8802.T",  // 三菱地所
      "8830.T",  // 住友不動産
      "1925.T",  // 大和ハウス工業
      "1928.T",  // 積水ハウス
      // 通信・情報
      "9432.T",  // 日本電信電話
      "9433.T",  // KDDI
      "9984.T",  // ソフトバンクグループ
      "9613.T",  // NTTデータグループ
      "4307.T",  // 野村総合研究所
      "6098.T",  // リクルートホールディングス
      "4385.T",  // メルカリ
      "4704.T",  // トレンドマイクロ
      "2413.T",  // エムスリー
      // 鉄道・交通
      "9020.T",  // 東日本旅客鉄道
      "9022.T",  // 東海旅客鉄道
      "9201.T",  // 日本航空
      "9202.T",  // ANAホールディングス
      "9101.T",  // 日本郵船
      "9104.T",  // 商船三井
      "9001.T",  // 東武鉄道
      "9005.T",  // 東急
      "9735.T",  // セコム
      // 化学・素材
      "3402.T",  // 東レ
      "4901.T",  // 富士フイルムホールディングス
      "4188.T",  // 三菱ケミカルグループ
      "3407.T",  // 旭化成
      "4183.T",  // 三井化学
      "4005.T",  // 住友化学
      "5401.T",  // 日本製鉄
      "5713.T",  // 住友金属鉱山
      "5201.T",  // AGC
      "5802.T",  // 住友電気工業
      "5233.T",  // 太平洋セメント
      "5332.T",  // TOTO
      "4004.T",  // レゾナック・ホールディングス
      // 機械・建設
      "6326.T",  // クボタ
      "6301.T",  // コマツ
      "6367.T",  // ダイキン工業
      "6113.T",  // アマダ
      // エネルギー・電力
      "9531.T",  // 東京ガス
      "9503.T",  // 関西電力
      "9502.T",  // 中部電力
      "9501.T",  // 東京電力ホールディングス
      "1605.T",  // INPEX
      // エンターテインメント・メディア
      "7974.T",  // 任天堂
      "7832.T",  // バンダイナムコホールディングス
      "9684.T",  // スクウェア・エニックス・ホールディングス
      "6460.T",  // セガサミーホールディングス
      "4324.T",  // 電通グループ
      "9766.T",  // コナミグループ
      // 印刷・紙
      "7912.T",  // 大日本印刷
      "3861.T",  // 王子ホールディングス
      // 建設
      "1801.T",  // 大成建設
      "1802.T",  // 大林組
      "1803.T",  // 清水建設
      "1808.T",  // 長谷工コーポレーション
      // 精密機器
      "6471.T",  // 日本精工
      "6472.T",  // NTN
      "4021.T",  // 日産化学
      "6370.T",  // 栗田工業
    ],
  },

  // ── TOPIX Core30 ────────────────────────────────────────────────────────
  {
    id: "topix-core30",
    nameJa: "TOPIX Core30",
    nameEn: "TOPIX Core30",
    symbol: "^TPX",
    emoji: "🗼",
    description: "TOPIXの中でも流動性・時価総額が最大の30銘柄。日本の超大型株を代表する指数",
    market: "JP",
    components: [
      "7203.T",  // トヨタ自動車
      "6758.T",  // ソニーグループ
      "8306.T",  // 三菱UFJフィナンシャル・グループ
      "8035.T",  // 東京エレクトロン
      "6861.T",  // キーエンス
      "9984.T",  // ソフトバンクグループ
      "9432.T",  // 日本電信電話
      "8316.T",  // 三井住友フィナンシャルグループ
      "7974.T",  // 任天堂
      "6367.T",  // ダイキン工業
      "4063.T",  // 信越化学工業
      "6501.T",  // 日立製作所
      "8058.T",  // 三菱商事
      "8001.T",  // 伊藤忠商事
      "8031.T",  // 三井物産
      "6902.T",  // デンソー
      "7267.T",  // 本田技研工業
      "4502.T",  // 武田薬品工業
      "4519.T",  // 中外製薬
      "4568.T",  // 第一三共
      "6981.T",  // 村田製作所
      "6857.T",  // アドバンテスト
      "8766.T",  // 東京海上ホールディングス
      "9433.T",  // KDDI
      "6098.T",  // リクルートホールディングス
      "8411.T",  // みずほフィナンシャルグループ
      "6920.T",  // レーザーテック
      "4661.T",  // オリエンタルランド
      "9983.T",  // ファーストリテイリング
      "8053.T",  // 住友商事
    ],
  },

  // ── ダウ平均 ─────────────────────────────────────────────────────────────
  {
    id: "dow30",
    nameJa: "ダウ平均株価",
    nameEn: "Dow Jones Industrial Average",
    symbol: "^DJI",
    emoji: "🏛️",
    description: "ニューヨーク証券取引所・NASDAQに上場する米国を代表する30銘柄で構成される株価指数",
    market: "US",
    components: [
      "AAPL",  // Apple
      "AMGN",  // Amgen
      "AMZN",  // Amazon
      "AXP",   // American Express
      "BA",    // Boeing
      "CAT",   // Caterpillar
      "CRM",   // Salesforce
      "CSCO",  // Cisco Systems
      "CVX",   // Chevron
      "DIS",   // Walt Disney
      "DOW",   // Dow Inc
      "GS",    // Goldman Sachs
      "HD",    // Home Depot
      "HON",   // Honeywell
      "IBM",   // IBM
      "JNJ",   // Johnson & Johnson
      "JPM",   // JPMorgan Chase
      "KO",    // Coca-Cola
      "MCD",   // McDonald's
      "MMM",   // 3M
      "MRK",   // Merck
      "MSFT",  // Microsoft
      "NKE",   // Nike
      "NVDA",  // NVIDIA
      "PG",    // Procter & Gamble
      "TRV",   // Travelers Companies
      "UNH",   // UnitedHealth Group
      "V",     // Visa
      "VZ",    // Verizon
      "WMT",   // Walmart
    ],
  },

  // ── NASDAQ 100 ───────────────────────────────────────────────────────────
  {
    id: "nasdaq100",
    nameJa: "NASDAQ 100",
    nameEn: "NASDAQ-100",
    symbol: "^NDX",
    emoji: "💻",
    description: "NASDAQ上場の大型非金融株上位100銘柄。テクノロジー株が中心の成長株指数",
    market: "US",
    note: "主要構成銘柄（2025年現在）",
    components: [
      "AAPL",   // Apple
      "MSFT",   // Microsoft
      "NVDA",   // NVIDIA
      "AMZN",   // Amazon
      "META",   // Meta Platforms
      "GOOGL",  // Alphabet Class A
      "GOOG",   // Alphabet Class C
      "TSLA",   // Tesla
      "AVGO",   // Broadcom
      "COST",   // Costco
      "NFLX",   // Netflix
      "ASML",   // ASML Holding
      "AMD",    // Advanced Micro Devices
      "QCOM",   // Qualcomm
      "ADBE",   // Adobe
      "PEP",    // PepsiCo
      "CSCO",   // Cisco Systems
      "INTC",   // Intel
      "INTU",   // Intuit
      "AMAT",   // Applied Materials
      "CMCSA",  // Comcast
      "TXN",    // Texas Instruments
      "BKNG",   // Booking Holdings
      "GILD",   // Gilead Sciences
      "ISRG",   // Intuitive Surgical
      "VRTX",   // Vertex Pharmaceuticals
      "REGN",   // Regeneron Pharmaceuticals
      "LRCX",   // Lam Research
      "ADI",    // Analog Devices
      "PANW",   // Palo Alto Networks
      "SNPS",   // Synopsys
      "CDNS",   // Cadence Design Systems
      "KLAC",   // KLA Corp
      "MDLZ",   // Mondelez International
      "SBUX",   // Starbucks
      "MU",     // Micron Technology
      "PYPL",   // PayPal
      "MAR",    // Marriott International
      "CRWD",   // CrowdStrike
      "MELI",   // MercadoLibre
      "KDP",    // Keurig Dr Pepper
      "FTNT",   // Fortinet
      "WDAY",   // Workday
      "ON",     // ON Semiconductor
      "ORLY",   // O'Reilly Automotive
      "CHTR",   // Charter Communications
      "NXPI",   // NXP Semiconductors
      "ODFL",   // Old Dominion Freight
      "PCAR",   // PACCAR
      "PAYX",   // Paychex
      "DXCM",   // DexCom
      "BIIB",   // Biogen
      "IDXX",   // IDEXX Laboratories
      "FANG",   // Diamondback Energy
      "EA",     // Electronic Arts
      "XEL",    // Xcel Energy
      "TEAM",   // Atlassian
      "ILMN",   // Illumina
      "VRSK",   // Verisk Analytics
      "CTSH",   // Cognizant
      "FAST",   // Fastenal
      "DLTR",   // Dollar Tree
      "ROST",   // Ross Stores
      "ZS",     // Zscaler
      "ALGN",   // Align Technology
      "MRNA",   // Moderna
      "AEP",    // American Electric Power
      "MNST",   // Monster Beverage
      "MRVL",   // Marvell Technology
      "MCHP",   // Microchip Technology
      "CTAS",   // Cintas
      "CEG",    // Constellation Energy
      "ADSK",   // Autodesk
      "DDOG",   // Datadog
      "LULU",   // Lululemon Athletica
      "GEHC",   // GE HealthCare
      "TTWO",   // Take-Two Interactive
      "WBD",    // Warner Bros. Discovery
      "KHC",    // Kraft Heinz
      "ABNB",   // Airbnb
      "EBAY",   // eBay
      "ANSS",   // Ansys
      "CDW",    // CDW Corp
      "ROP",    // Roper Technologies
      "CSGP",   // CoStar Group
      "PDD",    // PDD Holdings
      "ARM",    // Arm Holdings
      "PLTR",   // Palantir Technologies
      "AZN",    // AstraZeneca
      "MDB",    // MongoDB
      "HON",    // Honeywell
      "AMGN",   // Amgen
      "TMUS",   // T-Mobile US
      "SMCI",   // Super Micro Computer
      "GFS",    // GlobalFoundries
      "SPLK",   // Splunk (acquired by Cisco, may be delisted)
      "ZM",     // Zoom Video
      "OKTA",   // Okta
      "EXPE",   // Expedia Group
      "MTCH",   // Match Group
    ],
  },

  // ── S&P 500 ─────────────────────────────────────────────────────────────
  {
    id: "sp500",
    nameJa: "S&P 500",
    nameEn: "S&P 500",
    symbol: "^GSPC",
    emoji: "🇺🇸",
    description: "米国の主要取引所に上場する時価総額上位500銘柄で構成。米国市場全体の指標として最も広く使われる",
    market: "US",
    note: "主要構成銘柄（代表的な銘柄を掲載）",
    components: [
      // Mega cap / 超大型株
      "AAPL",   // Apple
      "MSFT",   // Microsoft
      "NVDA",   // NVIDIA
      "AMZN",   // Amazon
      "GOOGL",  // Alphabet Class A
      "GOOG",   // Alphabet Class C
      "META",   // Meta Platforms
      "TSLA",   // Tesla
      "BRK-B",  // Berkshire Hathaway B
      "AVGO",   // Broadcom
      "JPM",    // JPMorgan Chase
      "LLY",    // Eli Lilly
      "V",      // Visa
      "UNH",    // UnitedHealth Group
      "XOM",    // ExxonMobil
      "MA",     // Mastercard
      "COST",   // Costco
      "JNJ",    // Johnson & Johnson
      "ORCL",   // Oracle
      "HD",     // Home Depot
      "NFLX",   // Netflix
      "BAC",    // Bank of America
      "ABBV",   // AbbVie
      "KO",     // Coca-Cola
      "PLTR",   // Palantir
      "CRM",    // Salesforce
      "CVX",    // Chevron
      "AMD",    // Advanced Micro Devices
      "TMO",    // Thermo Fisher Scientific
      "WMT",    // Walmart
      "MRK",    // Merck
      "AMGN",   // Amgen
      "CSCO",   // Cisco Systems
      "PEP",    // PepsiCo
      "ABT",    // Abbott Laboratories
      "IBM",    // IBM
      "ACN",    // Accenture
      "ISRG",   // Intuitive Surgical
      "GS",     // Goldman Sachs
      "CAT",    // Caterpillar
      "T",      // AT&T
      "NOW",    // ServiceNow
      "QCOM",   // Qualcomm
      "ADBE",   // Adobe
      "TXN",    // Texas Instruments
      "AMAT",   // Applied Materials
      // Information Technology
      "INTC",   // Intel
      "INTU",   // Intuit
      "LRCX",   // Lam Research
      "KLAC",   // KLA Corp
      "SNPS",   // Synopsys
      "CDNS",   // Cadence Design Systems
      "ADI",    // Analog Devices
      "MU",     // Micron Technology
      "PANW",   // Palo Alto Networks
      "FTNT",   // Fortinet
      "NXPI",   // NXP Semiconductors
      "MCHP",   // Microchip Technology
      "HPQ",    // HP Inc
      "HPE",    // Hewlett Packard Enterprise
      "WDC",    // Western Digital
      "STX",    // Seagate Technology
      "NTAP",   // NetApp
      "KEYS",   // Keysight Technologies
      "TEL",    // TE Connectivity
      "TDY",    // Teledyne Technologies
      "ZBRA",   // Zebra Technologies
      "VRSN",   // VeriSign
      "PTC",    // PTC Inc
      "CTSH",   // Cognizant
      "CDW",    // CDW Corp
      "ANSS",   // Ansys
      "ROP",    // Roper Technologies
      "ADSK",   // Autodesk
      "CRWD",   // CrowdStrike
      "ZS",     // Zscaler
      "DDOG",   // Datadog
      "MDB",    // MongoDB
      "OKTA",   // Okta
      // Consumer Discretionary / 一般消費財
      "TSLA",   // Tesla (already above, kept for sector clarity)
      "AMZN",   // Amazon (already above)
      "HD",     // Home Depot (already above)
      "MCD",    // McDonald's
      "NKE",    // Nike
      "SBUX",   // Starbucks
      "LOW",    // Lowe's
      "TJX",    // TJX Companies
      "BKNG",   // Booking Holdings
      "HLT",    // Hilton Worldwide
      "MAR",    // Marriott International
      "ROST",   // Ross Stores
      "CMG",    // Chipotle
      "DPZ",    // Domino's Pizza
      "YUM",    // Yum! Brands
      "EXPE",   // Expedia
      "ABNB",   // Airbnb
      "F",      // Ford Motor
      "GM",     // General Motors
      "LULU",   // Lululemon
      "EBAY",   // eBay
      "PYPL",   // PayPal
      // Consumer Staples / 生活必需品
      "PG",     // Procter & Gamble
      "WMT",    // Walmart (already above)
      "PM",     // Philip Morris International
      "MO",     // Altria Group
      "CL",     // Colgate-Palmolive
      "MDLZ",   // Mondelez International
      "KHC",    // Kraft Heinz
      "STZ",    // Constellation Brands
      "GIS",    // General Mills
      "HSY",    // Hershey
      "HRL",    // Hormel Foods
      "KMB",    // Kimberly-Clark
      "SJM",    // JM Smucker
      "SYY",    // Sysco
      "MNST",   // Monster Beverage
      "KDP",    // Keurig Dr Pepper
      "ADM",    // Archer-Daniels-Midland
      // Health Care / ヘルスケア
      "UNH",    // UnitedHealth (already above)
      "LLY",    // Eli Lilly (already above)
      "JNJ",    // J&J (already above)
      "ABBV",   // AbbVie (already above)
      "MRK",    // Merck (already above)
      "TMO",    // Thermo Fisher (already above)
      "ABT",    // Abbott (already above)
      "DHR",    // Danaher
      "BMY",    // Bristol-Myers Squibb
      "PFE",    // Pfizer
      "AMGN",   // Amgen (already above)
      "GILD",   // Gilead Sciences
      "ISRG",   // Intuitive Surgical (already above)
      "MDT",    // Medtronic
      "ELV",    // Elevance Health
      "CI",     // Cigna Group
      "CVS",    // CVS Health
      "HUM",    // Humana
      "SYK",    // Stryker
      "BSX",    // Boston Scientific
      "REGN",   // Regeneron
      "VRTX",   // Vertex Pharmaceuticals
      "BIIB",   // Biogen
      "IDXX",   // IDEXX Laboratories
      "DXCM",   // DexCom
      "MOH",    // Molina Healthcare
      "ZBH",    // Zimmer Biomet
      "ZTS",    // Zoetis
      "MRNA",   // Moderna
      // Financials / 金融
      "JPM",    // JPMorgan (already above)
      "BAC",    // Bank of America (already above)
      "WFC",    // Wells Fargo
      "GS",     // Goldman Sachs (already above)
      "MS",     // Morgan Stanley
      "BLK",    // BlackRock
      "C",      // Citigroup
      "AXP",    // American Express
      "SCHW",   // Charles Schwab
      "MCO",    // Moody's
      "SPGI",   // S&P Global
      "CME",    // CME Group
      "ICE",    // Intercontinental Exchange
      "USB",    // U.S. Bancorp
      "PNC",    // PNC Financial
      "TRV",    // Travelers Companies
      "AIG",    // American International Group
      "MET",    // MetLife
      "PRU",    // Prudential Financial
      "AFL",    // Aflac
      "ALL",    // Allstate
      "PGR",    // Progressive
      "CB",     // Chubb
      "MMC",    // Marsh & McLennan
      "AON",    // Aon
      "TROW",   // T. Rowe Price
      "BK",     // Bank of New York Mellon
      "STT",    // State Street
      "COF",    // Capital One
      "DFS",    // Discover Financial
      "SYF",    // Synchrony Financial
      "FITB",   // Fifth Third Bancorp
      "KEY",    // KeyCorp
      "HBAN",   // Huntington Bancshares
      "CFG",    // Citizens Financial
      // Energy / エネルギー
      "XOM",    // ExxonMobil (already above)
      "CVX",    // Chevron (already above)
      "COP",    // ConocoPhillips
      "EOG",    // EOG Resources
      "PSX",    // Phillips 66
      "VLO",    // Valero Energy
      "SLB",    // Schlumberger
      "MPC",    // Marathon Petroleum
      "OXY",    // Occidental Petroleum
      "HAL",    // Halliburton
      "DVN",    // Devon Energy
      "BKR",    // Baker Hughes
      "FANG",   // Diamondback Energy
      "KMI",    // Kinder Morgan
      "OKE",    // ONEOK
      "WMB",    // Williams Companies
      // Materials / 素材
      "LIN",    // Linde
      "APD",    // Air Products
      "ECL",    // Ecolab
      "SHW",    // Sherwin-Williams
      "PPG",    // PPG Industries
      "NEM",    // Newmont
      "FCX",    // Freeport-McMoRan
      "NUE",    // Nucor
      "VMC",    // Vulcan Materials
      "MLM",    // Martin Marietta Materials
      "ALB",    // Albemarle
      "CE",     // Celanese
      "LYB",    // LyondellBasell
      "IP",     // International Paper
      "PKG",    // Packaging Corp of America
      "CF",     // CF Industries
      "MOS",    // Mosaic
      // Industrials / 資本財
      "CAT",    // Caterpillar (already above)
      "DE",     // Deere & Company
      "HON",    // Honeywell
      "GE",     // GE Aerospace
      "RTX",    // RTX Corp (Raytheon)
      "LMT",    // Lockheed Martin
      "BA",     // Boeing
      "NOC",    // Northrop Grumman
      "ETN",    // Eaton
      "EMR",    // Emerson Electric
      "PH",     // Parker Hannifin
      "AME",    // AMETEK
      "ROK",    // Rockwell Automation
      "XYL",    // Xylem
      "ITW",    // Illinois Tool Works
      "WM",     // Waste Management
      "RSG",    // Republic Services
      "CTAS",   // Cintas
      "FAST",   // Fastenal
      "GWW",    // W.W. Grainger
      "PCAR",   // PACCAR
      "ODFL",   // Old Dominion Freight
      "VRSK",   // Verisk Analytics
      "HII",    // Huntington Ingalls Industries
      "FTV",    // Fortive
      "CARR",   // Carrier Global
      "OTIS",   // Otis Worldwide
      "IR",     // Ingersoll Rand
      "TT",     // Trane Technologies
      "SWK",    // Stanley Black & Decker
      "PNR",    // Pentair
      // Communication Services / コミュニケーション
      "GOOGL",  // Alphabet (already above)
      "META",   // Meta (already above)
      "NFLX",   // Netflix (already above)
      "DIS",    // Walt Disney
      "CMCSA",  // Comcast
      "VZ",     // Verizon
      "T",      // AT&T (already above)
      "TMUS",   // T-Mobile US
      "EA",     // Electronic Arts
      "TTWO",   // Take-Two Interactive
      "ATVI",   // Activision Blizzard (acquired by MSFT)
      "WBD",    // Warner Bros. Discovery
      "PARA",   // Paramount Global
      "OMC",    // Omnicom Group
      "IPG",    // Interpublic Group
      "LYV",    // Live Nation
      // Utilities / 公益事業
      "NEE",    // NextEra Energy
      "DUK",    // Duke Energy
      "SO",     // Southern Company
      "D",      // Dominion Energy
      "EXC",    // Exelon
      "PCG",    // Pacific Gas & Electric
      "XEL",    // Xcel Energy
      "AEP",    // American Electric Power
      "ED",     // Consolidated Edison
      "SRE",    // Sempra Energy
      "CEG",    // Constellation Energy
      "ETR",    // Entergy
      "PPL",    // PPL Corp
      "EIX",    // Edison International
      "FE",     // FirstEnergy
      "AES",    // AES Corp
      "AWK",    // American Water Works
      "WEC",    // WEC Energy Group
      "NI",     // NiSource
      "CMS",    // CMS Energy
      // Real Estate / 不動産
      "AMT",    // American Tower
      "PLD",    // Prologis
      "EQIX",   // Equinix
      "CCI",    // Crown Castle
      "PSA",    // Public Storage
      "SPG",    // Simon Property Group
      "O",      // Realty Income
      "WELL",   // Welltower
      "AVB",    // AvalonBay Communities
      "EQR",    // Equity Residential
      "DLR",    // Digital Realty
      "IRM",    // Iron Mountain
      "VICI",   // VICI Properties
      "WY",     // Weyerhaeuser
      "ARE",    // Alexandria Real Estate
      "BXP",    // BXP (Boston Properties)
      "KIM",    // Kimco Realty
      "NNN",    // NNN REIT
      "VTR",    // Ventas
      "HST",    // Host Hotels
    ],
  },
];

/** Look up an index by ID */
export function getMarketIndex(id: string): MarketIndex | undefined {
  return MARKET_INDICES.find((i) => i.id === id);
}

/** All valid index IDs */
export const MARKET_INDEX_IDS = MARKET_INDICES.map((i) => i.id);

/** Map from Yahoo Finance symbol → market index page ID */
export const SYMBOL_TO_INDEX_ID: Record<string, MarketIndexId> = {
  "^N225": "nikkei225",
  "^TPX":  "topix-core30",
  "^GSPC": "sp500",
  "^IXIC": "nasdaq100",
  "^DJI":  "dow30",
};
