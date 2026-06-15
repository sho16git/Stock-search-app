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
    note: "日経平均株価 全225構成銘柄（2025年構成・四半期定期見直し反映）",
    components: [
      "9202.T",   // ANAホールディングス
      "9201.T",   // 日本航空
      "543A.T",   // ARCHION（日野・三菱ふそう持株会社）
      "7267.T",   // 本田技研工業
      "7202.T",   // いすゞ自動車
      "7261.T",   // マツダ
      "7211.T",   // 三菱自動車工業
      "7201.T",   // 日産自動車
      "7270.T",   // SUBARU
      "7269.T",   // スズキ
      "7203.T",   // トヨタ自動車
      "7272.T",   // ヤマハ発動機
      "8304.T",   // あおぞら銀行
      "8331.T",   // 千葉銀行
      "8354.T",   // ふくおかフィナンシャルグループ
      "8306.T",   // 三菱UFJフィナンシャル・グループ
      "8411.T",   // みずほフィナンシャルグループ
      "8308.T",   // りそなホールディングス
      "5831.T",   // しずおかフィナンシャルグループ
      "8316.T",   // 三井住友フィナンシャルグループ
      "8309.T",   // 三井住友トラスト・ホールディングス
      "7186.T",   // コンコルディア・フィナンシャルグループ
      "3407.T",   // 旭化成
      "4061.T",   // デンカ
      "4901.T",   // 富士フイルムホールディングス
      "4452.T",   // 花王
      "3405.T",   // クラレ
      "4188.T",   // 三菱ケミカルグループ
      "4183.T",   // 三井化学
      "4021.T",   // 日産化学
      "6988.T",   // 日東電工
      "4004.T",   // レゾナック・ホールディングス
      "4063.T",   // 信越化学工業
      "4911.T",   // 資生堂
      "4005.T",   // 住友化学
      "4043.T",   // トクヤマ
      "4042.T",   // 東ソー
      "4208.T",   // UBE
      "9433.T",   // KDDI
      "9432.T",   // 日本電信電話
      "9434.T",   // ソフトバンク
      "9984.T",   // ソフトバンクグループ
      "1721.T",   // コムシスホールディングス
      "1925.T",   // 大和ハウス工業
      "1808.T",   // 長谷工コーポレーション
      "1963.T",   // 日揮ホールディングス
      "1812.T",   // 鹿島建設
      "1802.T",   // 大林組
      "1928.T",   // 積水ハウス
      "1803.T",   // 清水建設
      "1801.T",   // 大成建設
      "6857.T",   // アドバンテスト
      "6770.T",   // アルプスアルパイン
      "7751.T",   // キヤノン
      "6902.T",   // デンソー
      "6954.T",   // ファナック
      "6504.T",   // 富士電機
      "6702.T",   // 富士通
      "6501.T",   // 日立製作所
      "6861.T",   // キーエンス
      "285A.T",   // キオクシアホールディングス
      "6971.T",   // 京セラ
      "6920.T",   // レーザーテック
      "6479.T",   // ミネベアミツミ
      "6503.T",   // 三菱電機
      "6981.T",   // 村田製作所
      "6701.T",   // NEC
      "6594.T",   // ニデック
      "6645.T",   // オムロン
      "6752.T",   // パナソニックホールディングス
      "6723.T",   // ルネサスエレクトロニクス
      "7752.T",   // リコー
      "6963.T",   // ローム
      "7735.T",   // SCREENホールディングス
      "6724.T",   // セイコーエプソン
      "6753.T",   // シャープ
      "6758.T",   // ソニーグループ
      "6526.T",   // ソシオネクスト
      "6976.T",   // 太陽誘電
      "6762.T",   // TDK
      "8035.T",   // 東京エレクトロン
      "6506.T",   // 安川電機
      "6841.T",   // 横河電機
      "9502.T",   // 中部電力
      "9503.T",   // 関西電力
      "9501.T",   // 東京電力ホールディングス
      "1332.T",   // ニッスイ
      "2802.T",   // 味の素
      "2502.T",   // アサヒグループホールディングス
      "2914.T",   // 日本たばこ産業
      "2801.T",   // キッコーマン
      "2503.T",   // キリンホールディングス
      "2269.T",   // 明治ホールディングス
      "2282.T",   // 日本ハム
      "2871.T",   // ニチレイ
      "2002.T",   // 日清製粉グループ本社
      "2501.T",   // サッポロホールディングス
      "9532.T",   // 大阪ガス
      "9531.T",   // 東京ガス
      "5201.T",   // AGC
      "5333.T",   // 日本ガイシ
      "5214.T",   // 日本電気硝子
      "5233.T",   // 太平洋セメント
      "5301.T",   // 東海カーボン
      "5332.T",   // TOTO
      "8750.T",   // 第一生命ホールディングス
      "8725.T",   // MS&ADインシュアランスグループHD
      "8630.T",   // SOMPOホールディングス
      "8795.T",   // T&Dホールディングス
      "8766.T",   // 東京海上ホールディングス
      "9147.T",   // NIPPON EXPRESSホールディングス
      "9064.T",   // ヤマトホールディングス
      "6113.T",   // アマダ
      "6367.T",   // ダイキン工業
      "6361.T",   // 荏原製作所
      "6305.T",   // 日立建機
      "7004.T",   // カナデビア
      "7013.T",   // IHI
      "5631.T",   // 日本製鋼所
      "6473.T",   // ジェイテクト
      "6301.T",   // コマツ
      "6326.T",   // クボタ
      "7011.T",   // 三菱重工業
      "6471.T",   // 日本精工
      "6472.T",   // NTN
      "6103.T",   // オークマ
      "6302.T",   // 住友重機械工業
      "6273.T",   // SMC
      "9107.T",   // 川崎汽船
      "9104.T",   // 商船三井
      "9101.T",   // 日本郵船
      "1605.T",   // INPEX
      "5714.T",   // DOWAホールディングス
      "5803.T",   // フジクラ
      "5801.T",   // 古河電気工業
      "5711.T",   // 三菱マテリアル
      "5706.T",   // 三井金属鉱業
      "3436.T",   // SUMCO
      "5802.T",   // 住友電気工業
      "5713.T",   // 住友金属鉱山
      "8253.T",   // クレディセゾン
      "8697.T",   // 日本取引所グループ
      "8591.T",   // オリックス
      "7832.T",   // バンダイナムコホールディングス
      "7912.T",   // 大日本印刷
      "7911.T",   // TOPPANホールディングス
      "7951.T",   // ヤマハ
      "5020.T",   // ENEOSホールディングス
      "5019.T",   // 出光興産
      "4503.T",   // アステラス製薬
      "4519.T",   // 中外製薬
      "4568.T",   // 第一三共
      "4523.T",   // エーザイ
      "4151.T",   // 協和キリン
      "4578.T",   // 大塚ホールディングス
      "4506.T",   // 住友ファーマ
      "4507.T",   // 塩野義製薬
      "4502.T",   // 武田薬品工業
      "6146.T",   // ディスコ
      "7741.T",   // HOYA
      "4902.T",   // コニカミノルタ
      "7731.T",   // ニコン
      "7733.T",   // オリンパス
      "4543.T",   // テルモ
      "3861.T",   // 王子ホールディングス
      "9022.T",   // 東海旅客鉄道
      "9020.T",   // 東日本旅客鉄道
      "9008.T",   // 京王電鉄
      "9009.T",   // 京成電鉄
      "9007.T",   // 小田急電鉄
      "9001.T",   // 東武鉄道
      "9005.T",   // 東急
      "9021.T",   // 西日本旅客鉄道
      "8802.T",   // 三菱地所
      "8801.T",   // 三井不動産
      "8830.T",   // 住友不動産
      "8804.T",   // 東京建物
      "3289.T",   // 東急不動産ホールディングス
      "8267.T",   // イオン
      "9983.T",   // ファーストリテイリング
      "3099.T",   // 三越伊勢丹ホールディングス
      "3086.T",   // Jフロントリテイリング
      "8252.T",   // 丸井グループ
      "7453.T",   // 良品計画
      "9843.T",   // ニトリホールディングス
      "7532.T",   // パン・パシフィック・インターナショナルHD
      "3382.T",   // セブン&アイ・ホールディングス
      "8233.T",   // 髙島屋
      "3092.T",   // ZOZO
      "5108.T",   // ブリヂストン
      "5101.T",   // 横浜ゴム
      "8601.T",   // 大和証券グループ本社
      "8604.T",   // 野村ホールディングス
      "6532.T",   // ベイカレント
      "4751.T",   // サイバーエージェント
      "2432.T",   // ディー・エヌ・エー
      "4324.T",   // 電通グループ
      "6178.T",   // 日本郵政
      "9766.T",   // コナミグループ
      "4689.T",   // LINEヤフー
      "4385.T",   // メルカリ
      "2413.T",   // エムスリー
      "3659.T",   // ネクソン
      "7974.T",   // 任天堂
      "4307.T",   // 野村総合研究所
      "4661.T",   // オリエンタルランド
      "4755.T",   // 楽天グループ
      "6098.T",   // リクルートホールディングス
      "9735.T",   // セコム
      "3697.T",   // SHIFT
      "9602.T",   // 東宝
      "4704.T",   // トレンドマイクロ
      "7012.T",   // 川崎重工業
      "5411.T",   // JFEホールディングス
      "5406.T",   // 神戸製鋼所
      "5401.T",   // 日本製鉄
      "3401.T",   // 帝人
      "3402.T",   // 東レ
      "8001.T",   // 伊藤忠商事
      "8002.T",   // 丸紅
      "8058.T",   // 三菱商事
      "8031.T",   // 三井物産
      "2768.T",   // 双日
      "8053.T",   // 住友商事
      "8015.T",   // 豊田通商
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
    note: "S&P 500 全構成銘柄（503ティッカー・複数株式クラス含む）",
    components: [
      "MMM", "AOS", "ABT", "ABBV", "ACN", "ADBE", "AMD", "AES", "AFL", "A",
      "APD", "ABNB", "AKAM", "ALB", "ARE", "ALGN", "ALLE", "LNT", "ALL", "GOOGL",
      "GOOG", "MO", "AMZN", "AMCR", "AEE", "AEP", "AXP", "AIG", "AMT", "AWK",
      "AMP", "AME", "AMGN", "APH", "ADI", "AON", "APA", "APO", "AAPL", "AMAT",
      "APP", "APTV", "ACGL", "ADM", "ARES", "ANET", "AJG", "AIZ", "T", "ATO",
      "ADSK", "ADP", "AZO", "AVB", "AVY", "AXON", "BKR", "BALL", "BAC", "BAX",
      "BDX", "BRK-B", "BBY", "TECH", "BIIB", "BLK", "BX", "XYZ", "BNY", "BA",
      "BKNG", "BSX", "BMY", "AVGO", "BR", "BRO", "BF-B", "BLDR", "BG", "BXP",
      "CHRW", "CDNS", "CPT", "CPB", "COF", "CAH", "CCL", "CARR", "CVNA", "CASY",
      "CAT", "CBOE", "CBRE", "CDW", "COR", "CNC", "CNP", "CF", "CRL", "SCHW",
      "CHTR", "CVX", "CMG", "CB", "CHD", "CIEN", "CI", "CINF", "CTAS", "CSCO",
      "C", "CFG", "CLX", "CME", "CMS", "KO", "CTSH", "COHR", "COIN", "CL",
      "CMCSA", "FIX", "CAG", "COP", "ED", "STZ", "CEG", "COO", "CPRT", "GLW",
      "CPAY", "CTVA", "CSGP", "COST", "CRH", "CRWD", "CCI", "CSX", "CMI", "CVS",
      "DHR", "DRI", "DDOG", "DVA", "DECK", "DE", "DELL", "DAL", "DVN", "DXCM",
      "FANG", "DLR", "DG", "DLTR", "D", "DPZ", "DASH", "DOV", "DOW", "DHI",
      "DTE", "DUK", "DD", "ETN", "EBAY", "SATS", "ECL", "EIX", "EW", "EA",
      "ELV", "EME", "EMR", "ETR", "EOG", "EQT", "EFX", "EQIX", "EQR", "ERIE",
      "ESS", "EL", "EG", "EVRG", "ES", "EXC", "EXE", "EXPE", "EXPD", "EXR",
      "XOM", "FFIV", "FDS", "FICO", "FAST", "FRT", "FDX", "FIS", "FITB",
      "FSLR", "FE", "FI", "F", "FTNT", "FTV", "FOXA", "FOX", "BEN", "FCX",
      "GRMN", "IT", "GE", "GEHC", "GEV", "GEN", "GNRC", "GD", "GIS", "GM",
      "GPC", "GILD", "GPN", "GL", "GDDY", "GS", "HAL", "HIG", "HAS", "HCA",
      "DOC", "HSIC", "HSY", "HPE", "HLT", "HD", "HON", "HRL", "HST", "HWM",
      "HPQ", "HUBB", "HUM", "HBAN", "HII", "IBM", "IEX", "IDXX", "ITW", "INCY",
      "IR", "PODD", "INTC", "IBKR", "ICE", "IFF", "IP", "INTU", "ISRG", "IVZ",
      "INVH", "IQV", "IRM", "JBHT", "JBL", "JKHY", "J", "JNJ", "JCI", "JPM",
      "KVUE", "KDP", "KEY", "KEYS", "KMB", "KIM", "KMI", "KKR", "KLAC", "KHC",
      "KR", "LHX", "LH", "LRCX", "LVS", "LDOS", "LEN", "LII", "LLY", "LIN",
      "LYV", "LMT", "L", "LOW", "LULU", "LITE", "LYB", "MTB", "MPC", "MAR",
      "MRSH", "MLM", "MAS", "MA", "MKC", "MCD", "MCK", "MDT", "MRK", "META",
      "MET", "MTD", "MGM", "MCHP", "MU", "MSFT", "MAA", "MRNA", "TAP", "MDLZ",
      "MPWR", "MNST", "MCO", "MS", "MOS", "MSI", "MSCI", "NDAQ", "NTAP", "NFLX",
      "NEM", "NWSA", "NWS", "NEE", "NKE", "NI", "NDSN", "NSC", "NTRS", "NOC",
      "NCLH", "NRG", "NUE", "NVDA", "NVR", "NXPI", "ORLY", "OXY", "ODFL", "OMC",
      "ON", "OKE", "ORCL", "OTIS", "PCAR", "PKG", "PLTR", "PANW", "PSKY", "PH",
      "PAYX", "PYPL", "PNR", "PEP", "PFE", "PCG", "PM", "PSX", "PNW", "PNC",
      "POOL", "PPG", "PPL", "PFG", "PG", "PGR", "PLD", "PRU", "PEG", "PTC",
      "PSA", "PHM", "PWR", "QCOM", "DGX", "Q", "RL", "RJF", "RTX", "O",
      "REG", "REGN", "RF", "RSG", "RMD", "RVTY", "HOOD", "ROK", "ROL", "ROP",
      "ROST", "RCL", "SPGI", "CRM", "SNDK", "SBAC", "SLB", "STX", "SRE", "NOW",
      "SHW", "SPG", "SWKS", "SJM", "SW", "SNA", "SOLV", "SO", "LUV", "SWK",
      "SBUX", "STT", "STLD", "STE", "SYK", "SMCI", "SYF", "SNPS", "SYY", "TMUS",
      "TROW", "TTWO", "TPR", "TRGP", "TGT", "TEL", "TDY", "TER", "TSLA", "TXN",
      "TPL", "TXT", "TMO", "TJX", "TKO", "TTD", "TSCO", "TT", "TDG", "TRV",
      "TRMB", "TFC", "TYL", "TSN", "USB", "UBER", "UDR", "ULTA", "UNP", "UAL",
      "UPS", "URI", "UNH", "UHS", "VLO", "VEEV", "VTR", "VLTO", "VRSN", "VRSK",
      "VZ", "VRTX", "VRT", "VTRS", "VICI", "V", "VST", "VMC", "WRB", "GWW",
      "WAB", "WMT", "DIS", "WBD", "WM", "WAT", "WEC", "WFC", "WELL", "WST",
      "WDC", "WY", "WSM", "WMB", "WTW", "WDAY", "WYNN", "XEL", "XYL", "YUM",
      "ZBRA", "ZBH", "ZTS",
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
