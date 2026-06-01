/**
 * /api/ai-ranking — AI投資予想ランキング（個人投資家向け）
 * Query: period = "1y" | "5y" | "10y"
 * revalidate = 0 → 毎回リアルタイム取得
 */
import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "@/lib/yfinance";
import { getJpName } from "@/lib/jp-stocks";
import { getUsKatakana } from "@/lib/us-katakana";

export const runtime  = "nodejs";
export const revalidate = 0; // キャッシュなし → 常にリアルタイム

// ── 分析対象ユニバース ──────────────────────────────────────────────
const UNIVERSE = [
  // 🇺🇸 AI / 半導体
  { symbol: "NVDA",   market: "US", theme: "AI半導体",            sector: "情報技術" },
  { symbol: "AMD",    market: "US", theme: "AI半導体",            sector: "情報技術" },
  { symbol: "AVGO",   market: "US", theme: "AI半導体",            sector: "情報技術" },
  { symbol: "ARM",    market: "US", theme: "AI半導体",            sector: "情報技術" },
  { symbol: "SMCI",   market: "US", theme: "AIサーバー",          sector: "情報技術" },
  // 🇺🇸 テック大手
  { symbol: "MSFT",   market: "US", theme: "クラウド",            sector: "情報技術" },
  { symbol: "GOOGL",  market: "US", theme: "広告・AI",            sector: "コミュニケーション" },
  { symbol: "META",   market: "US", theme: "SNS・AI",             sector: "コミュニケーション" },
  { symbol: "AMZN",   market: "US", theme: "EC・クラウド",        sector: "一般消費財" },
  { symbol: "AAPL",   market: "US", theme: "ハードウェア",        sector: "情報技術" },
  // 🇺🇸 グロース
  { symbol: "TSLA",   market: "US", theme: "EV・自動運転",        sector: "一般消費財" },
  { symbol: "PLTR",   market: "US", theme: "防衛・政府DX",        sector: "情報技術" },
  { symbol: "CRWD",   market: "US", theme: "サイバーセキュリティ", sector: "情報技術" },
  { symbol: "SHOP",   market: "US", theme: "EC支援",              sector: "情報技術" },
  { symbol: "MELI",   market: "US", theme: "南米EC",              sector: "一般消費財" },
  { symbol: "COIN",   market: "US", theme: "暗号資産",            sector: "金融" },
  { symbol: "RKLB",   market: "US", theme: "宇宙ビジネス",        sector: "資本財" },
  { symbol: "IONQ",   market: "US", theme: "量子コンピュータ",    sector: "情報技術" },
  // 🇺🇸 バリュー・高配当
  { symbol: "BRK-B",  market: "US", theme: "コングロマリット",    sector: "金融" },
  { symbol: "JPM",    market: "US", theme: "大手銀行",            sector: "金融" },
  { symbol: "JNJ",    market: "US", theme: "ヘルスケア",          sector: "ヘルスケア" },
  { symbol: "KO",     market: "US", theme: "生活必需品",          sector: "生活必需品" },
  { symbol: "VZ",     market: "US", theme: "通信・高配当",        sector: "通信" },
  // 🇯🇵 テック・成長
  { symbol: "6920.T", market: "JP", theme: "半導体露光",          sector: "情報技術" },
  { symbol: "8035.T", market: "JP", theme: "半導体製造装置",      sector: "情報技術" },
  { symbol: "6857.T", market: "JP", theme: "半導体テスト",        sector: "情報技術" },
  { symbol: "6758.T", market: "JP", theme: "エンタメ・半導体",    sector: "情報技術" },
  { symbol: "9984.T", market: "JP", theme: "AI・VC",              sector: "コミュニケーション" },
  { symbol: "6861.T", market: "JP", theme: "FA・センサー",        sector: "資本財" },
  { symbol: "4063.T", market: "JP", theme: "半導体材料",          sector: "素材" },
  { symbol: "6098.T", market: "JP", theme: "HR・DX",              sector: "情報技術" },
  // 🇯🇵 バリュー・高配当・安定
  { symbol: "7203.T", market: "JP", theme: "EV・自動車",          sector: "一般消費財" },
  { symbol: "8306.T", market: "JP", theme: "メガバンク",          sector: "金融" },
  { symbol: "9432.T", market: "JP", theme: "通信・高配当",        sector: "通信" },
  { symbol: "7974.T", market: "JP", theme: "ゲーム・IP",          sector: "コミュニケーション" },
  { symbol: "4519.T", market: "JP", theme: "製薬",                sector: "ヘルスケア" },
  { symbol: "4661.T", market: "JP", theme: "テーマパーク",        sector: "一般消費財" },
  { symbol: "9020.T", market: "JP", theme: "鉄道・インフラ",      sector: "資本財" },
  { symbol: "8802.T", market: "JP", theme: "不動産",              sector: "不動産" },
] as const;

type UniverseItem = { symbol: string; market: string; theme: string; sector: string };

// ── ヘルパー ───────────────────────────────────────────────────────
const raw = (o: unknown): number | null => {
  if (o == null) return null;
  if (typeof o === "number") return isFinite(o) ? o : null;
  if (typeof o === "object" && "raw" in (o as object)) {
    const v = (o as { raw?: unknown }).raw;
    return typeof v === "number" && isFinite(v) ? v : null;
  }
  return null;
};

// ── リスクレベル判定 ────────────────────────────────────────────────
function calcRiskLevel(
  beta: number | null,
  dte: number | null,
  pe: number | null,
  posFromHi: number | null,
  mktCap: number | null,
): "low" | "mid" | "high" {
  let riskScore = 0;
  if (beta != null) {
    if (beta > 1.8)        riskScore += 3;
    else if (beta > 1.3)   riskScore += 2;
    else if (beta < 0.7)   riskScore -= 1;
  }
  if (dte != null) {
    if (dte > 300)          riskScore += 3;
    else if (dte > 150)     riskScore += 2;
    else if (dte < 30)      riskScore -= 1;
  }
  if (pe != null) {
    if (pe > 100 || pe < 0) riskScore += 3;
    else if (pe > 60)       riskScore += 2;
    else if (pe > 40)       riskScore += 1;
    else if (pe < 15)       riskScore -= 1;
  } else {
    riskScore += 1;
  }
  if (posFromHi != null && posFromHi < -40) riskScore += 1;
  if (mktCap != null && mktCap > 5e11)      riskScore -= 1;

  if (riskScore >= 4) return "high";
  if (riskScore <= 0) return "low";
  return "mid";
}

// ── 投資スタイル判定 ────────────────────────────────────────────────
function calcInvestStyle(
  rg: number | null,
  pe: number | null,
  dividendYield: number | null,
  beta: number | null,
): "growth" | "value" | "income" | "speculative" {
  if ((beta != null && beta > 1.8) || (pe != null && pe > 100)) return "speculative";
  if ((dividendYield != null && dividendYield > 0.020) || (pe != null && pe > 0 && pe < 15)) return "income";
  if (rg != null && rg > 0.08) return "growth";
  if (pe != null && pe > 0 && pe < 25) return "value";
  return rg != null && rg > 0.03 ? "growth" : "value";
}

// ── スコアリング ────────────────────────────────────────────────────
function scoreStock(
  period: "1y" | "5y" | "10y",
  m: {
    buyPct: number; upside: number | null; rg: number | null; eg: number | null;
    roe: number | null; opm: number | null; pe: number | null; beta: number | null;
    dte: number | null; posFromLo: number | null; posFromHi: number | null;
    mktCap: number | null; dividendYield: number | null;
  },
): number {
  let s = 0;
  const { buyPct, upside, rg, eg, roe, opm, pe, beta, dte, posFromLo, posFromHi, mktCap, dividendYield } = m;

  if (period === "1y") {
    s += Math.min(40, buyPct * 0.4);
    if (upside  != null)         s += Math.min(20, upside * 0.6);
    if (posFromLo != null)       s += Math.min(10, posFromLo * 0.15);
    if (posFromHi != null && posFromHi > -10) s += 8;
    if (rg != null)              s += Math.min(10, rg * 100 * 0.1);
    if (beta != null && beta > 1.2) s += 5;

  } else if (period === "5y") {
    s += Math.min(25, buyPct * 0.25);
    if (rg  != null) s += Math.min(25, rg  * 100 * 0.8);
    if (eg  != null) s += Math.min(15, eg  * 100 * 0.5);
    if (roe != null) s += Math.min(15, roe * 100 * 0.4);
    if (opm != null) s += Math.min(10, opm * 100 * 0.3);
    if (pe  != null && pe > 0 && pe < 20) s += 10;
    else if (pe != null && pe > 50)       s -= 8;
    if (upside != null)          s += Math.min(10, upside * 0.3);
    if (dividendYield != null && dividendYield > 0.02) s += 5;

  } else { // 10y
    s += Math.min(20, buyPct * 0.2);
    if (roe != null && roe > 0.15)  s += Math.min(25, roe * 100 * 0.8);
    if (opm != null && opm > 0.10)  s += Math.min(20, opm * 100 * 0.6);
    if (dte != null && dte < 100)   s += 15;
    if (dte != null && dte > 300)   s -= 15;
    if (rg  != null && rg > 0.05)  s += Math.min(15, rg  * 100 * 0.4);
    if (mktCap != null && mktCap > 1e11) s += 10;
    if (pe  != null && pe > 0 && pe < 25) s += 5;
    if (dividendYield != null && dividendYield > 0.02) s += 10;
  }

  return Math.round(s * 10) / 10;
}

// ── 注目ポイント生成 ────────────────────────────────────────────────
function buildActionPoints(
  period: "1y" | "5y" | "10y",
  direction: "bull" | "bear",
  m: {
    buyPct: number; upside: number | null; rg: number | null;
    roe: number | null; opm: number | null; pe: number | null;
    beta: number | null; dte: number | null; posFromHi: number | null;
    dividendYield: number | null;
  },
  theme: string,
): string[] {
  const { buyPct, upside, rg, roe, opm, pe, beta, dte, posFromHi, dividendYield } = m;
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

  if (direction === "bull") {
    const pts: string[] = [];
    if (buyPct >= 70)
      pts.push(`アナリストの${buyPct}%が「買い」推奨。機関投資家からの支持が厚い`);
    else if (buyPct >= 50)
      pts.push(`アナリストの${buyPct}%が「買い」推奨`);
    if (upside != null && upside > 5)
      pts.push(`目標株価コンセンサスまで+${upside.toFixed(1)}%の上昇余地あり`);
    if (rg != null && rg > 0.15)
      pts.push(`売上成長率${pct(rg)}の高成長。業界平均を大きく上回る`);
    else if (rg != null && rg > 0.05)
      pts.push(`売上成長率${pct(rg)}で安定的な事業拡大が続く`);
    if (roe != null && roe > 0.20)
      pts.push(`ROE ${pct(roe)}の高効率経営。株主資本を効率よく活用`);
    else if (roe != null && roe > 0.10)
      pts.push(`ROE ${pct(roe)}の安定した収益力`);
    if (opm != null && opm > 0.20)
      pts.push(`営業利益率${pct(opm)}のプレミアム収益体質`);
    if (dividendYield != null && dividendYield > 0.02)
      pts.push(`配当利回り${pct(dividendYield)}。株価下落時の下支え効果と安定配当が魅力`);
    if (posFromHi != null && posFromHi > -5)
      pts.push("52週高値圏で推移中。上昇トレンドが継続している");
    if (pts.length < 2)
      pts.push(`${theme}分野の需要拡大が業績を継続的に押し上げている`);
    if (pts.length < 3)
      pts.push(`${period === "10y" ? "10年超の" : period === "5y" ? "中長期の" : ""}構造的成長テーマに乗っている注目銘柄`);
    return pts.slice(0, 3);
  } else {
    const pts: string[] = [];
    if (pe != null && pe > 70)
      pts.push(`PER ${pe.toFixed(0)}倍と超高バリュエーション。業績が少しでも下振れると株価急落リスクあり`);
    else if (pe != null && pe > 40)
      pts.push(`PER ${pe.toFixed(0)}倍と割高水準。業績期待の剥落に注意`);
    if (dte != null && dte > 200)
      pts.push(`D/E比率${dte.toFixed(0)}%の高負債。金利上昇局面では利息負担が急増する`);
    if (beta != null && beta > 1.5)
      pts.push(`β${beta.toFixed(2)}と値動きが激しい。市場全体が下落すると損失が拡大しやすい`);
    if (posFromHi != null && posFromHi < -30)
      pts.push(`52週高値から${Math.abs(posFromHi).toFixed(0)}%下落中。下降トレンドが続いている`);
    if (buyPct < 40)
      pts.push(`アナリストの${100 - buyPct}%が「中立/売り」評価。機関投資家の信頼が低下している`);
    if (pts.length < 2)
      pts.push("競合台頭や技術変化で競争優位性が揺らぐリスクがある");
    if (pts.length < 3)
      pts.push(`${theme}セクターの規制強化・市場環境悪化リスクに注意が必要`);
    return pts.slice(0, 3);
  }
}

// ── リスク要因 ─────────────────────────────────────────────────────
function buildRisks(
  direction: "bull" | "bear",
  m: { pe: number | null; beta: number | null; dte: number | null; posFromHi: number | null; buyPct: number },
  theme: string,
): string[] {
  const { pe, beta, dte, posFromHi, buyPct } = m;
  const risks: string[] = [];

  if (direction === "bull") {
    if (pe != null && pe > 40)
      risks.push(`高バリュエーション（PER ${pe.toFixed(0)}倍）のため、決算ミス時の下落幅が大きくなりやすい`);
    if (beta != null && beta > 1.3)
      risks.push(`値動きが大きい（β${beta.toFixed(2)}）。相場全体の調整時に大きな影響を受ける`);
    if (dte != null && dte > 100)
      risks.push(`負債水準（D/E ${dte.toFixed(0)}%）に注意。金利動向によっては財務負担が増す`);
    if (risks.length < 1)
      risks.push("市場全体が調整局面に入った際は影響を受ける可能性がある");
    if (risks.length < 2)
      risks.push(`${theme}分野での競合激化・規制リスクは常に把握しておくべき`);
  } else {
    if (posFromHi != null && posFromHi < -25)
      risks.push(`大幅下落中（高値比-${Math.abs(posFromHi).toFixed(0)}%）。底値確認前の購入は非常に危険`);
    else
      risks.push("株価トレンドが弱く、反発のタイミング見極めが難しい状況");
    if (pe != null && pe > 50)
      risks.push(`PER ${pe.toFixed(0)}倍と割高。業績悪化が株価に直撃する構造になっている`);
    else if (dte != null && dte > 150)
      risks.push(`高負債（D/E ${dte.toFixed(0)}%）が財務的な脆弱性を高めている`);
    else if (buyPct < 45)
      risks.push(`アナリスト評価が低く、機関投資家による売り圧力が続く可能性がある`);
    else
      risks.push("業績の不確実性が高く、想定より早期の下落も否定できない");
  }
  return risks.slice(0, 2);
}

// ── 予想根拠サマリー ────────────────────────────────────────────────
function buildRationale(
  period: "1y" | "5y" | "10y",
  direction: "bull" | "bear",
  m: {
    buyPct: number; upside: number | null; rg: number | null; roe: number | null;
    opm: number | null; pe: number | null; beta: number | null; dte: number | null;
    posFromHi: number | null; dividendYield: number | null;
  },
  theme: string,
  name: string,
): string {
  const { buyPct, upside, rg, roe, pe, dte, posFromHi, dividendYield } = m;
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

  if (direction === "bull") {
    const parts: string[] = [];
    if (period === "1y") {
      if (buyPct >= 60)           parts.push(`アナリスト${buyPct}%が買い推奨`);
      if (upside && upside > 5)   parts.push(`目標株価まで+${upside.toFixed(1)}%の上昇余地`);
      if (posFromHi && posFromHi > -5) parts.push("52週高値圏で上昇トレンド継続");
      parts.push(`${theme}セクターの需要拡大が業績を押し上げている`);
    } else if (period === "5y") {
      if (rg && rg > 0.08)        parts.push(`売上成長率${pct(rg)}の高成長が中期的に継続見込み`);
      if (roe && roe > 0.15)      parts.push(`ROE ${pct(roe)}の高資本効率が株主価値を拡大`);
      if (dividendYield && dividendYield > 0.02) parts.push(`配当利回り${pct(dividendYield)}で株価を下支え`);
      parts.push(`${theme}の中長期トレンドが5年間の業績拡大を支える`);
    } else {
      if (roe && roe > 0.15)      parts.push(`ROE ${pct(roe)}の高資本効率が複利成長を生む`);
      if (pe && pe > 0 && pe < 20) parts.push(`PER ${pe.toFixed(1)}倍の割安バリュエーション`);
      if (dividendYield && dividendYield > 0.02) parts.push(`配当利回り${pct(dividendYield)}の安定インカムが加わる`);
      parts.push(`${name}は${theme}分野の超長期構造的成長の恩恵を受ける`);
    }
    return parts.slice(0, 3).join("。") + "。";
  } else {
    const parts: string[] = [];
    if (period === "1y") {
      if (posFromHi && posFromHi < -20) parts.push(`52週高値から${Math.abs(posFromHi).toFixed(0)}%下落し調整継続の懸念`);
      if (pe && pe > 50)            parts.push(`PER ${pe.toFixed(1)}倍の高バリュエーションが業績悪化で収縮リスク`);
      parts.push("短期的な業績下振れリスクと投資家心理の悪化が重なる局面");
    } else if (period === "5y") {
      if (dte && dte > 150)         parts.push(`D/E比率${dte.toFixed(0)}の高負債が金利上昇で重荷`);
      parts.push("競合参入・技術陳腐化リスクによる競争優位性の毀損");
    } else {
      if (dte && dte > 200)         parts.push(`高負債構造が10年の長期成長制約となりうる`);
      parts.push("業界構造変化・代替技術の台頭リスクに長期目線で注意");
    }
    return parts.slice(0, 3).join("。") + "。";
  }
}

// ── 期待リターン計算 ────────────────────────────────────────────────
function calcExpectedReturn(
  period: "1y" | "5y" | "10y",
  direction: "bull" | "bear",
  score: number,
  m: { rg: number | null; upside: number | null; pe: number | null; beta: number | null; dividendYield: number | null },
): string {
  const { rg, upside, pe, beta, dividendYield } = m;
  let base = 0;

  if (period === "1y") {
    base = direction === "bull"
      ? Math.min(85, (upside ?? 15) * 1.2 + (rg ?? 0.08) * 100 * 0.5)
      : Math.max(-50, -((upside ?? 0) < 0 ? Math.abs(upside ?? 20) * 0.8 : 20) - (pe && pe > 40 ? 15 : 0));
  } else if (period === "5y") {
    const yr = direction === "bull"
      ? Math.min(35, 8 + (rg ?? 0.08) * 100 * 0.8 + (dividendYield ?? 0) * 100 * 0.5)
      : Math.max(-15, -5 - (pe && pe > 40 ? 5 : 0));
    base = Math.round((Math.pow(1 + yr / 100, 5) - 1) * 100);
  } else {
    const yr = direction === "bull"
      ? Math.min(30, 6 + (rg ?? 0.06) * 100 * 0.6 + (score > 60 ? 3 : 0) + (dividendYield ?? 0) * 100 * 0.3)
      : Math.max(-12, -3 - (beta && beta > 1.5 ? 3 : 0));
    base = Math.round((Math.pow(1 + yr / 100, 10) - 1) * 100);
  }

  const sign = base >= 0 ? "+" : "";
  return `${sign}${base.toFixed(0)}%`;
}

// ── マーケットコメント生成 ──────────────────────────────────────────
function buildMarketNote(
  period: "1y" | "5y" | "10y",
  allMetrics: { buyPct: number; upside: number | null }[],
): string {
  const avgBuy = allMetrics.reduce((s, x) => s + x.buyPct, 0) / allMetrics.length;
  const withUpside = allMetrics.filter(x => x.upside != null);
  const avgUpside  = withUpside.length
    ? withUpside.reduce((s, x) => s + (x.upside ?? 0), 0) / withUpside.length
    : null;
  const bullish    = avgBuy > 58;
  const upsideStr  = avgUpside != null
    ? (avgUpside > 0 ? `分析銘柄の平均上昇余地は+${avgUpside.toFixed(1)}%` : "平均上昇余地は限定的")
    : "";

  if (period === "1y") {
    return bullish
      ? `アナリスト推奨の平均は「買い」${avgBuy.toFixed(0)}%と強気。${upsideStr}。AI・半導体・DXへの機関投資家の注目が継続しています。短期は決算とFOMCに注意しながら分割購入が有効です。`
      : `アナリスト推奨平均「買い」${avgBuy.toFixed(0)}%と慎重な状況。${upsideStr}。金利・地政学リスクが高い局面では分散投資と損切りルールの徹底が重要です。`;
  } else if (period === "5y") {
    return `5年の中期視点では、AI・クラウド・半導体の構造成長と、日本株の割安・高配当銘柄に注目。${upsideStr ? upsideStr + "程度が想定されます。" : ""}成長株と高配当株を組み合わせた分散ポートフォリオが安定的なリターンを狙えます。`;
  } else {
    return `10年超の長期投資では、ROE・財務健全性・配当の継続性が高い企業への積立が有効です。複利効果を最大化するため配当再投資と長期保有が鍵。暴落局面での追加購入が長期リターンを大きく高めます。`;
  }
}

// ── メインハンドラ ──────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const period = (req.nextUrl.searchParams.get("period") ?? "1y") as "1y" | "5y" | "10y";
  const symbols = (UNIVERSE as unknown as UniverseItem[]).map((u) => u.symbol);

  const quoteMap  = new Map<string, Record<string, unknown>>();
  const fundMap   = new Map<string, Record<string, unknown>>();
  const statMap   = new Map<string, Record<string, unknown>>();
  const detailMap = new Map<string, Record<string, unknown>>();

  // ① quote を全銘柄一括取得
  try {
    const quotes = await yahooFinance.quote(symbols).catch(() => []);
    const list   = Array.isArray(quotes) ? quotes : [quotes];
    for (const q of list) {
      const o   = q as Record<string, unknown>;
      const sym = String(o.symbol ?? "");
      if (sym) quoteMap.set(sym, o);
    }
  } catch { /* ignore */ }

  // ② quoteSummary を上位25銘柄で取得（財務データ）
  const prioritySymbols = [
    ...symbols.slice(0, 12),
    "6920.T", "8035.T", "6857.T", "6758.T", "9984.T",
    "6861.T", "7203.T", "8306.T", "9432.T", "7974.T",
    "4063.T", "4519.T", "KO", "JNJ",
  ].filter((s, i, a) => a.indexOf(s) === i).slice(0, 25);

  await Promise.allSettled(
    prioritySymbols.map(async (sym) => {
      try {
        const s = await yahooFinance.quoteSummary(sym, {
          modules: ["financialData", "defaultKeyStatistics", "summaryDetail"],
        });
        fundMap.set(sym,   (s.financialData        ?? {}) as Record<string, unknown>);
        statMap.set(sym,   (s.defaultKeyStatistics ?? {}) as Record<string, unknown>);
        detailMap.set(sym, (s.summaryDetail        ?? {}) as Record<string, unknown>);
      } catch { /* ignore */ }
    })
  );

  // ③ スコアリング
  const scored = (UNIVERSE as unknown as UniverseItem[]).map((u) => {
    const q = quoteMap.get(u.symbol)  ?? {};
    const f = fundMap.get(u.symbol)   ?? {};
    const s = statMap.get(u.symbol)   ?? {};
    const d = detailMap.get(u.symbol) ?? {};

    const curPrice = raw(q.regularMarketPrice) ?? 100;
    const hi52     = raw(q.fiftyTwoWeekHigh);
    const lo52     = raw(q.fiftyTwoWeekLow);
    const mktCap   = raw(q.marketCap);

    const tMean  = raw(f.targetMeanPrice);
    const upside = tMean && curPrice > 0
      ? ((tMean - curPrice) / curPrice) * 100
      : null;

    let buyPct = 50;
    const rTrend = (q.recommendationTrend as { trend?: { strongBuy?: number; buy?: number; hold?: number; sell?: number; strongSell?: number }[] } | undefined)?.trend;
    if (rTrend && rTrend.length > 0) {
      const t    = rTrend[0];
      const buy  = (t.strongBuy ?? 0) + (t.buy ?? 0);
      const hold = t.hold ?? 0;
      const sell = (t.sell ?? 0) + (t.strongSell ?? 0);
      const tot  = buy + hold + sell;
      if (tot > 0) buyPct = Math.round((buy / tot) * 100);
    }

    const rg  = raw(f.revenueGrowth);
    const eg  = raw(f.earningsGrowth);
    const roe = raw(f.returnOnEquity);
    const opm = raw(f.operatingMargins);
    const dte = raw(f.debtToEquity);
    const pe  = raw(s.forwardPE) ?? raw(q.forwardPE as unknown);
    const beta = raw(s.beta)     ?? raw(q.beta as unknown);
    const dividendYield =
      raw(d.dividendYield) ??
      raw(q.trailingAnnualDividendYield as unknown) ??
      null;

    const posFromLo = lo52 && lo52 > 0 && curPrice > 0 ? ((curPrice - lo52) / lo52) * 100 : null;
    const posFromHi = hi52 && hi52 > 0 && curPrice > 0 ? ((curPrice - hi52) / hi52) * 100 : null;

    const metrics = { buyPct, upside, rg, eg, roe, opm, pe, beta, dte, posFromLo, posFromHi, mktCap, dividendYield };
    const bullScore = scoreStock(period, metrics);
    const bearScore = scoreStock(period, {
      buyPct: 100 - buyPct,
      upside: upside != null ? -upside : null,
      rg:     rg   != null ? -rg       : null,
      eg:     eg   != null ? -eg       : null,
      roe:    roe  != null ? -roe      : null,
      opm:    opm  != null ? -opm      : null,
      pe:     pe   != null ? (pe > 30 ? pe : -pe) : null,
      beta,
      dte,
      posFromLo: posFromLo != null ? -posFromLo : null,
      posFromHi: posFromHi != null ? Math.abs(posFromHi) : null,
      mktCap,
      dividendYield,
    });

    const riskLevel  = calcRiskLevel(beta, dte, pe, posFromHi, mktCap);
    const investStyle = calcInvestStyle(rg, pe, dividendYield, beta);

    const jpName    = u.market === "JP" ? getJpName(u.symbol) : null;
    const enName    = (q.longName ?? q.shortName) as string | undefined;
    const kataName  = u.market === "US" ? getUsKatakana(u.symbol) : null;
    const displayName = jpName ?? kataName ?? enName ?? u.symbol;

    return {
      symbol: u.symbol,
      name:   displayName,
      market: u.market,
      theme:  u.theme,
      sector: u.sector,
      bullScore,
      bearScore,
      currentPrice: curPrice,
      currency: (q.currency as string) ?? (u.market === "JP" ? "JPY" : "USD"),
      riskLevel,
      investStyle,
      keyMetrics: {
        pe:              pe          != null ? Math.round(pe  * 10) / 10                  : null,
        roe:             roe         != null ? Math.round(roe * 1000) / 10                : null,
        buyPct,
        upside:          upside      != null ? Math.round(upside * 10) / 10               : null,
        dividendYield:   dividendYield != null ? Math.round(dividendYield * 1000) / 10    : null,
        revenueGrowth:   rg          != null ? Math.round(rg  * 1000) / 10               : null,
        operatingMargin: opm         != null ? Math.round(opm * 1000) / 10               : null,
      },
      metrics: { buyPct, upside, rg, roe, opm, pe, beta, dte, posFromHi, dividendYield },
    };
  });

  // ④ ランキング生成
  const toEntry = (
    s: (typeof scored)[number],
    i: number,
    dir: "bull" | "bear",
    score: number,
  ) => ({
    rank:           i + 1,
    symbol:         s.symbol,
    name:           s.name,
    market:         s.market,
    theme:          s.theme,
    sector:         s.sector,
    score,
    currentPrice:   s.currentPrice,
    currency:       s.currency,
    riskLevel:      s.riskLevel,
    investStyle:    s.investStyle,
    keyMetrics:     s.keyMetrics,
    expectedReturn: calcExpectedReturn(period, dir, score, s.metrics),
    rationale:      buildRationale(period, dir, s.metrics, s.theme, s.name),
    actionPoints:   buildActionPoints(period, dir, s.metrics, s.theme),
    risks:          buildRisks(dir, s.metrics, s.theme),
  });

  const bullRanking = [...scored]
    .sort((a, b) => b.bullScore - a.bullScore)
    .slice(0, 8)
    .map((s, i) => toEntry(s, i, "bull", s.bullScore));

  const bearRanking = [...scored]
    .sort((a, b) => b.bearScore - a.bearScore)
    .slice(0, 8)
    .map((s, i) => toEntry(s, i, "bear", s.bearScore));

  // ⑤ 全銘柄スキャナー（bullスコア降順）
  const allRanking = [...scored]
    .sort((a, b) => b.bullScore - a.bullScore)
    .map((s, i) => ({
      rank:           i + 1,
      symbol:         s.symbol,
      name:           s.name,
      market:         s.market,
      theme:          s.theme,
      sector:         s.sector,
      score:          s.bullScore,
      riskLevel:      s.riskLevel,
      investStyle:    s.investStyle,
      keyMetrics:     s.keyMetrics,
      expectedReturn: calcExpectedReturn(period, "bull", s.bullScore, s.metrics),
    }));

  // ⑥ AIセンチメントスコア (0〜100)
  const avgScore  = scored.reduce((s, x) => s + x.bullScore, 0) / scored.length;
  const maxScore  = Math.max(...scored.map(x => x.bullScore));
  const sentiment = Math.min(100, Math.max(0, Math.round((avgScore / Math.max(maxScore, 1)) * 100)));

  const marketNote = buildMarketNote(
    period,
    scored.map(s => ({ buyPct: s.metrics.buyPct, upside: s.metrics.upside })),
  );

  return NextResponse.json({
    period,
    updatedAt: new Date().toISOString(),
    bull: bullRanking,
    bear: bearRanking,
    all: allRanking,
    sentiment,
    marketNote,
  });
}
