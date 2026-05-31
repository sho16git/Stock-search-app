/**
 * /api/ai-ranking — AI予想ランキング
 * 厳選銘柄をスコアリングし、期間別の高騰/下落予想ランキングを返す
 * Query: period = "1y" | "5y" | "10y"
 */
import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "@/lib/yfinance";
import { getJpName } from "@/lib/jp-stocks";
import { getUsKatakana } from "@/lib/us-katakana";

export const runtime = "nodejs";
export const revalidate = 3600; // 1時間キャッシュ

// ── 分析対象ユニバース ─────────────────────────────────────────────
const UNIVERSE = [
  // 🇺🇸 AI / 半導体
  { symbol: "NVDA",  market: "US", theme: "AI半導体" },
  { symbol: "AMD",   market: "US", theme: "AI半導体" },
  { symbol: "AVGO",  market: "US", theme: "AI半導体" },
  { symbol: "ARM",   market: "US", theme: "AI半導体" },
  { symbol: "SMCI",  market: "US", theme: "AIサーバー" },
  // 🇺🇸 テック大手
  { symbol: "MSFT",  market: "US", theme: "クラウド" },
  { symbol: "GOOGL", market: "US", theme: "広告・AI" },
  { symbol: "META",  market: "US", theme: "SNS・AI" },
  { symbol: "AMZN",  market: "US", theme: "Eコマース・クラウド" },
  { symbol: "AAPL",  market: "US", theme: "ハードウェア" },
  // 🇺🇸 グロース
  { symbol: "TSLA",  market: "US", theme: "EV・自動運転" },
  { symbol: "PLTR",  market: "US", theme: "防衛・政府DX" },
  { symbol: "CRWD",  market: "US", theme: "サイバーセキュリティ" },
  { symbol: "SHOP",  market: "US", theme: "EC支援" },
  { symbol: "MELI",  market: "US", theme: "ラテンアメリカEC" },
  { symbol: "COIN",  market: "US", theme: "暗号資産取引" },
  { symbol: "RKLB",  market: "US", theme: "宇宙ビジネス" },
  { symbol: "IONQ",  market: "US", theme: "量子コンピュータ" },
  // 🇺🇸 バリュー
  { symbol: "BRK-B", market: "US", theme: "コングロマリット" },
  { symbol: "JPM",   market: "US", theme: "大手銀行" },
  // 🇯🇵 日本株 テック・成長
  { symbol: "6920.T", market: "JP", theme: "半導体露光" },
  { symbol: "8035.T", market: "JP", theme: "半導体製造装置" },
  { symbol: "6857.T", market: "JP", theme: "半導体テスト" },
  { symbol: "6758.T", market: "JP", theme: "エンタメ・半導体" },
  { symbol: "9984.T", market: "JP", theme: "AI・VC" },
  { symbol: "6861.T", market: "JP", theme: "FA・センサー" },
  { symbol: "4063.T", market: "JP", theme: "半導体材料" },
  { symbol: "6098.T", market: "JP", theme: "HR・DX" },
  // 🇯🇵 日本株 バリュー・インカム
  { symbol: "7203.T", market: "JP", theme: "EV・自動車" },
  { symbol: "8306.T", market: "JP", theme: "メガバンク" },
  { symbol: "9432.T", market: "JP", theme: "通信" },
  { symbol: "7974.T", market: "JP", theme: "ゲーム・IP" },
  { symbol: "4519.T", market: "JP", theme: "製薬" },
  { symbol: "4661.T", market: "JP", theme: "テーマパーク" },
];

const raw = (o: unknown): number | null => {
  if (o == null) return null;
  if (typeof o === "number") return o;
  if (typeof o === "object" && "raw" in (o as object))
    return (o as { raw?: number }).raw ?? null;
  return null;
};

// ── スコアリング ───────────────────────────────────────────────────
function scoreStock(
  period: "1y" | "5y" | "10y",
  metrics: {
    buyPct: number;
    upside: number | null;
    rg: number | null;
    eg: number | null;
    roe: number | null;
    opm: number | null;
    pe: number | null;
    beta: number | null;
    dte: number | null;
    posFromLo: number | null;
    posFromHi: number | null;
    mktCap: number | null;
  }
): number {
  let score = 0;
  const { buyPct, upside, rg, eg, roe, opm, pe, beta, dte, posFromLo, posFromHi, mktCap } = metrics;

  if (period === "1y") {
    // 短期: モメンタム + アナリスト目標
    score += Math.min(40, buyPct * 0.4);
    if (upside != null)     score += Math.min(20, upside * 0.6);
    if (posFromLo != null)  score += Math.min(10, posFromLo * 0.15);  // 安値から上がってる = 勢い
    if (posFromHi != null && posFromHi > -10) score += 8; // 高値圏 = 上昇トレンド
    if (rg != null)         score += Math.min(10, rg * 100 * 0.1);
    if (beta != null && beta > 1.2) score += 5; // 高ベータは短期上振れ期待

  } else if (period === "5y") {
    // 中期: 成長性 + 収益品質 + バリュエーション
    score += Math.min(25, buyPct * 0.25);
    if (rg  != null) score += Math.min(25, rg  * 100 * 0.8);
    if (eg  != null) score += Math.min(15, eg  * 100 * 0.5);
    if (roe != null) score += Math.min(15, roe * 100 * 0.4);
    if (opm != null) score += Math.min(10, opm * 100 * 0.3);
    if (pe  != null && pe < 20) score += 10;
    else if (pe != null && pe > 50) score -= 8;
    if (upside != null) score += Math.min(10, upside * 0.3);

  } else { // 10y
    // 長期: 競争優位 + 財務健全 + 配当
    score += Math.min(20, buyPct * 0.2);
    if (roe != null && roe > 0.15) score += Math.min(25, roe * 100 * 0.8);
    if (opm != null && opm > 0.10) score += Math.min(20, opm * 100 * 0.6);
    if (dte != null && dte < 100)  score += 15;
    if (dte != null && dte > 300)  score -= 15;
    if (rg  != null && rg > 0.05)  score += Math.min(15, rg * 100 * 0.4);
    if (mktCap != null && mktCap > 1e11) score += 10; // 大型株の安定性
    if (pe  != null && pe < 25) score += 5;
  }

  return Math.round(score * 10) / 10;
}

// ── 予想根拠テンプレート ───────────────────────────────────────────
function buildRationale(
  period: "1y" | "5y" | "10y",
  direction: "bull" | "bear",
  metrics: {
    buyPct: number;
    upside: number | null;
    rg: number | null;
    roe: number | null;
    opm: number | null;
    pe: number | null;
    beta: number | null;
    dte: number | null;
    posFromHi: number | null;
  },
  theme: string,
  name: string
): string {
  const { buyPct, upside, rg, roe, opm, pe, beta, dte, posFromHi } = metrics;
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

  if (direction === "bull") {
    const parts: string[] = [];
    if (period === "1y") {
      if (buyPct >= 60) parts.push(`アナリスト${buyPct}%が買い推奨`);
      if (upside && upside > 5) parts.push(`目標株価まで+${upside.toFixed(1)}%の上昇余地`);
      if (posFromHi && posFromHi > -5) parts.push("52週高値圏で上昇トレンド継続中");
      parts.push(`${theme}セクターの需要拡大が直近業績を押し上げ`);
    } else if (period === "5y") {
      if (rg && rg > 0.10) parts.push(`売上成長率${pct(rg)}の高成長が5年間継続見込み`);
      if (roe && roe > 0.15) parts.push(`ROE ${pct(roe)}の高資本効率が株主価値を拡大`);
      if (opm && opm > 0.15) parts.push(`営業利益率${pct(opm)}のプレミアム収益構造`);
      parts.push(`${theme}の中長期トレンドが5年間の業績拡大を支える`);
      parts.push("競争優位性の深化でシェア拡大が持続");
    } else {
      if (roe && roe > 0.15) parts.push(`ROE ${pct(roe)}の高資本効率が複利成長を生む`);
      if (pe && pe < 20) parts.push(`PER ${pe.toFixed(1)}倍の割安バリュエーション`);
      parts.push(`${name}は${theme}分野の超長期構造的成長の恩恵を受ける`);
      parts.push("財務健全性と株主還元が10年複利リターンを支える");
    }
    return parts.slice(0, 3).join("。") + "。";
  } else {
    const parts: string[] = [];
    if (period === "1y") {
      if (posFromHi && posFromHi < -20) parts.push(`52週高値から${Math.abs(posFromHi).toFixed(0)}%下落で調整継続の懸念`);
      if (pe && pe > 50) parts.push(`PER ${pe.toFixed(1)}倍の高バリュエーションが業績悪化で収縮`);
      parts.push("短期的な業績下振れリスクと投資家心理の悪化");
    } else if (period === "5y") {
      if (dte && dte > 150) parts.push(`D/E比率${dte.toFixed(0)}の高負債が金利上昇で重荷`);
      if (beta && beta > 1.5) parts.push(`高ベータ${beta.toFixed(2)}により市場下落時の損失増幅`);
      parts.push("競合参入・技術陳腐化による競争優位性の毀損");
      parts.push("成長鈍化に伴うバリュエーションプレミアムの剥落");
    } else {
      if (dte && dte > 200) parts.push(`高負債構造が10年の長期成長制約に`);
      parts.push("業界構造変化・代替技術の台頭リスク");
      parts.push("長期的な規制強化・地政学リスクの蓄積");
    }
    return parts.slice(0, 3).join("。") + "。";
  }
}

// ── 期待リターン計算 ───────────────────────────────────────────────
function expectedReturn(
  period: "1y" | "5y" | "10y",
  direction: "bull" | "bear",
  score: number,
  metrics: { rg: number | null; upside: number | null; pe: number | null; beta: number | null }
): string {
  const { rg, upside, pe, beta } = metrics;
  let base = 0;

  if (period === "1y") {
    base = direction === "bull"
      ? Math.min(80, (upside ?? 15) * 1.2 + (rg ?? 0.1) * 100 * 0.5)
      : Math.max(-50, -(upside != null ? -upside * 0.8 : 20) - (pe && pe > 40 ? 15 : 0));
  } else if (period === "5y") {
    const yr = direction === "bull"
      ? Math.min(35, 8 + (rg ?? 0.10) * 100 * 0.8)
      : Math.max(-15, -5 - (pe && pe > 40 ? 5 : 0));
    base = Math.round((Math.pow(1 + yr / 100, 5) - 1) * 100);
  } else {
    const yr = direction === "bull"
      ? Math.min(30, 6 + (rg ?? 0.08) * 100 * 0.6 + (score > 60 ? 3 : 0))
      : Math.max(-12, -3 - (beta && beta > 1.5 ? 3 : 0));
    base = Math.round((Math.pow(1 + yr / 100, 10) - 1) * 100);
  }

  const sign = base >= 0 ? "+" : "";
  return `${sign}${base.toFixed(0)}%`;
}

export async function GET(req: NextRequest) {
  const period = (req.nextUrl.searchParams.get("period") ?? "1y") as "1y" | "5y" | "10y";

  // 全シンボルを一括取得
  const symbols = UNIVERSE.map((u) => u.symbol);
  const quoteMap = new Map<string, Record<string, unknown>>();
  const fundMap  = new Map<string, Record<string, unknown>>();
  const statMap  = new Map<string, Record<string, unknown>>();

  try {
    const quotes = await yahooFinance.quote(symbols).catch(() => []);
    const list = Array.isArray(quotes) ? quotes : [quotes];
    for (const q of list) {
      const o = q as Record<string, unknown>;
      const sym = String(o.symbol ?? "");
      if (sym) quoteMap.set(sym, o);
    }
  } catch { /* ignore */ }

  // 財務データをバッチで取得 (重要銘柄のみ10本)
  const prioritySymbols = UNIVERSE.slice(0, 10).map((u) => u.symbol);
  await Promise.allSettled(
    prioritySymbols.map(async (sym) => {
      try {
        const s = await yahooFinance.quoteSummary(sym, {
          modules: ["financialData", "defaultKeyStatistics"],
        });
        fundMap.set(sym, (s.financialData        ?? {}) as Record<string, unknown>);
        statMap.set(sym, (s.defaultKeyStatistics ?? {}) as Record<string, unknown>);
      } catch { /* ignore */ }
    })
  );

  // スコアリング
  const scored = UNIVERSE.map((u) => {
    const q = quoteMap.get(u.symbol) ?? {};
    const f = fundMap.get(u.symbol)  ?? {};
    const s = statMap.get(u.symbol)  ?? {};

    const curPrice = raw(q.regularMarketPrice) ?? 100;
    const hi52     = raw(q.fiftyTwoWeekHigh);
    const lo52     = raw(q.fiftyTwoWeekLow);

    const tMean = raw(f.targetMeanPrice);
    const upside = tMean && curPrice
      ? ((tMean - curPrice) / curPrice) * 100
      : null;

    // Analyst consensus
    const rTrend = (q.recommendationTrend as { trend?: { strongBuy?: number; buy?: number; hold?: number; sell?: number; strongSell?: number }[] } | undefined)?.trend;
    let buyPct = 50;
    if (rTrend && rTrend.length > 0) {
      const t = rTrend[0];
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
    const pe  = raw(s.forwardPE);
    const beta = raw(s.beta);
    const mktCap = raw(q.marketCap);
    const posFromLo = lo52 && curPrice ? ((curPrice - lo52) / lo52) * 100 : null;
    const posFromHi = hi52 && curPrice ? ((curPrice - hi52) / hi52) * 100 : null;

    const metrics = { buyPct, upside, rg, eg, roe, opm, pe, beta, dte, posFromLo, posFromHi, mktCap };
    const bullScore = scoreStock(period, metrics);
    const bearScore = scoreStock(period, {
      buyPct: 100 - buyPct,
      upside: upside != null ? -upside : null,
      rg: rg != null ? -rg : null,
      eg: eg != null ? -eg : null,
      roe: roe != null ? -roe : null,
      opm: opm != null ? -opm : null,
      pe: pe != null ? (pe > 30 ? pe : -pe) : null,
      beta,
      dte,
      posFromLo: posFromLo != null ? -posFromLo : null,
      posFromHi: posFromHi != null ? Math.abs(posFromHi) : null,
      mktCap,
    });

    const jpName = u.market === "JP" ? getJpName(u.symbol) : null;
    const enName = (q.longName ?? q.shortName) as string | undefined;
    const kataName = u.market === "US" ? getUsKatakana(u.symbol) : null;
    const displayName = jpName ?? kataName ?? enName ?? u.symbol;

    return {
      symbol: u.symbol,
      name: displayName,
      market: u.market,
      theme: u.theme,
      bullScore,
      bearScore,
      currentPrice: curPrice,
      currency: (q.currency as string) ?? (u.market === "JP" ? "JPY" : "USD"),
      metrics: { buyPct, upside, rg, roe, opm, pe, beta, dte, posFromHi },
    };
  });

  // 高騰ランキング (bullScore 降順)
  const bullRanking = [...scored]
    .sort((a, b) => b.bullScore - a.bullScore)
    .slice(0, 8)
    .map((s, i) => ({
      rank: i + 1,
      symbol: s.symbol,
      name: s.name,
      market: s.market,
      theme: s.theme,
      score: s.bullScore,
      currentPrice: s.currentPrice,
      currency: s.currency,
      expectedReturn: expectedReturn(period, "bull", s.bullScore, s.metrics),
      rationale: buildRationale(period, "bull", s.metrics, s.theme, s.name),
    }));

  // 下落ランキング (bearScore 降順)
  const bearRanking = [...scored]
    .sort((a, b) => b.bearScore - a.bearScore)
    .slice(0, 8)
    .map((s, i) => ({
      rank: i + 1,
      symbol: s.symbol,
      name: s.name,
      market: s.market,
      theme: s.theme,
      score: s.bearScore,
      currentPrice: s.currentPrice,
      currency: s.currency,
      expectedReturn: expectedReturn(period, "bear", s.bearScore, s.metrics),
      rationale: buildRationale(period, "bear", s.metrics, s.theme, s.name),
    }));

  return NextResponse.json({
    period,
    updatedAt: new Date().toISOString(),
    bull: bullRanking,
    bear: bearRanking,
  });
}
