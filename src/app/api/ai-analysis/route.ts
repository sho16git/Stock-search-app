import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { recordUsage } from "@/lib/ai-usage";
import yahooFinance from "@/lib/yfinance";
import { getJpName } from "@/lib/jp-stocks";

export const runtime  = "nodejs";
export const revalidate = 3600;

/* ── ユーティリティ ── */
function pct(v: number | null | undefined, digits = 1) {
  if (v == null) return "N/A";
  return `${(v * 100).toFixed(digits)}%`;
}
function num(v: number | null | undefined, digits = 2) {
  if (v == null) return "N/A";
  return v.toFixed(digits);
}
const raw = (o: unknown): number | null => {
  if (o == null) return null;
  if (typeof o === "number") return o;
  if (typeof o === "object" && "raw" in (o as object))
    return (o as { raw?: number }).raw ?? null;
  return null;
};
function fmtLarge(n: number) {
  if (Math.abs(n) >= 1e12) return `${(n / 1e12).toFixed(1)}兆`;
  if (Math.abs(n) >= 1e8)  return `${(n / 1e8).toFixed(1)}億`;
  if (Math.abs(n) >= 1e9)  return `${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6)  return `${(n / 1e6).toFixed(0)}M`;
  return n.toLocaleString();
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim();
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  /* ── データ収集 ── */
  let quoteData:   Record<string, unknown> = {};
  let fundData:    Record<string, unknown> = {};
  let statData:    Record<string, unknown> = {};
  let profileData: Record<string, unknown> = {};
  let analystRaw:  Record<string, unknown> = {};
  let earningsRows: Array<Record<string, unknown>> = [];

  try {
    const q = await (yahooFinance.quote as Function)(symbol, {}, { validateResult: false });
    quoteData = (q ?? {}) as Record<string, unknown>;
  } catch { /* ignore */ }

  try {
    const s = await (yahooFinance.quoteSummary as Function)(symbol, {
      modules: [
        "financialData", "defaultKeyStatistics", "recommendationTrend",
        "earningsHistory", "assetProfile", "calendarEvents", "summaryDetail",
      ],
    }, { validateResult: false });

    fundData    = (s?.financialData        ?? {}) as Record<string, unknown>;
    statData    = (s?.defaultKeyStatistics ?? {}) as Record<string, unknown>;
    profileData = (s?.assetProfile ?? s?.summaryProfile ?? {}) as Record<string, unknown>;

    const trend = s?.recommendationTrend as { trend?: unknown[] } | undefined;
    const t0    = trend?.trend?.[0] as Record<string, unknown> | undefined;
    const strongBuy  = (t0?.strongBuy  as number) ?? 0;
    const buy        = (t0?.buy        as number) ?? 0;
    const hold       = (t0?.hold       as number) ?? 0;
    const sell       = (t0?.sell       as number) ?? 0;
    const strongSell = (t0?.strongSell as number) ?? 0;
    const tot = strongBuy + buy + hold + sell + strongSell;

    const sd  = s?.summaryDetail as Record<string, unknown> | undefined;
    const cal = s?.calendarEvents as Record<string, unknown> | undefined;
    const calE = cal?.earnings as Record<string, unknown> | undefined;

    analystRaw = {
      strongBuy, buy, hold, sell, strongSell, total: tot,
      buyPct:      tot ? Math.round(((strongBuy + buy)      / tot) * 100) : null,
      holdPct:     tot ? Math.round((hold                   / tot) * 100) : null,
      sellPct:     tot ? Math.round(((sell + strongSell)    / tot) * 100) : null,
      strongBuyPct:tot ? Math.round((strongBuy              / tot) * 100) : null,
      targetMean:  raw(fundData.targetMeanPrice)  ?? null,
      targetHigh:  raw(fundData.targetHighPrice)  ?? null,
      targetLow:   raw(fundData.targetLowPrice)   ?? null,
      currentPrice:raw(fundData.currentPrice)     ?? null,
      recKey:      fundData.recommendationKey     ?? null,
      dividendYield: sd?.dividendYield ?? null,
      dividendRate:  sd?.dividendRate  ?? null,
      nextEarnings:  calE?.earningsDate ?? null,
      epsEstimate:   calE?.earningsAverage ?? null,
    };

    const eh = s?.earningsHistory as { history?: unknown[] } | undefined;
    if (Array.isArray(eh?.history)) {
      earningsRows = eh!.history.slice(-4).map(e => e as Record<string, unknown>);
    }
  } catch { /* ignore */ }

  /* ── マクロデータ取得 (並行) ── */
  let usYield10yr: number | null = null;
  let usdJpy:      number | null = null;
  let vix:         number | null = null;
  try {
    const [tnxR, jpyR, vixR] = await Promise.allSettled([
      (yahooFinance.quote as Function)('^TNX',  {}, { validateResult: false }),
      (yahooFinance.quote as Function)('JPY=X', {}, { validateResult: false }),
      (yahooFinance.quote as Function)('^VIX',  {}, { validateResult: false }),
    ]);
    if (tnxR.status === "fulfilled") usYield10yr = (tnxR.value?.regularMarketPrice as number) ?? null;
    if (jpyR.status === "fulfilled") usdJpy      = (jpyR.value?.regularMarketPrice  as number) ?? null;
    if (vixR.status === "fulfilled") vix         = (vixR.value?.regularMarketPrice  as number) ?? null;
  } catch { /* ignore */ }

  /* ── 財務指標 ── */
  const roe            = raw(fundData.returnOnEquity);
  const roa            = raw(fundData.returnOnAssets);
  const opMargin       = raw(fundData.operatingMargins);
  const profitMargin   = raw(fundData.profitMargins);
  const revenueGrowth  = raw(fundData.revenueGrowth);
  const earningsGrowth = raw(fundData.earningsGrowth);
  const debtToEquity   = raw(fundData.debtToEquity);
  const currentRatio   = raw(fundData.currentRatio);
  const freeCashflow   = raw(fundData.freeCashflow);
  const forwardPE      = raw(statData.forwardPE);
  const trailingPE     = raw(statData.trailingPE);
  const pbRatio        = raw(statData.priceToBook);
  const evToEbitda     = raw(statData.enterpriseToEbitda);
  const beta           = raw(statData.beta);
  const shortRatio     = raw(statData.shortRatio);
  const sharesShort    = raw(statData.sharesShort);

  const name      = getJpName(symbol) ?? (quoteData.longName as string) ?? symbol;
  const price     = quoteData.regularMarketPrice as number | undefined;
  const changePct = quoteData.regularMarketChangePercent as number | undefined;
  const sector    = (quoteData.sector  as string) ?? (profileData.sector  as string) ?? null;
  const industry  = (quoteData.industry as string) ?? (profileData.industry as string) ?? null;
  const currency  = quoteData.currency as string | undefined;
  const week52Hi  = quoteData.fiftyTwoWeekHigh as number | undefined;
  const week52Lo  = quoteData.fiftyTwoWeekLow  as number | undefined;
  const mktCap    = quoteData.marketCap as number | undefined;
  const employees = profileData.fullTimeEmployees as number | undefined;
  const bizSummary = typeof profileData.longBusinessSummary === "string"
    ? (profileData.longBusinessSummary as string).slice(0, 400)
    : null;

  /* ── 派生指標 ── */
  const posFromHi  = price && week52Hi ? ((price - week52Hi) / week52Hi) * 100 : null;
  const posFromLo  = price && week52Lo ? ((price - week52Lo) / week52Lo) * 100 : null;
  const week52Pct  = price && week52Hi && week52Lo && week52Hi !== week52Lo
    ? ((price - week52Lo) / (week52Hi - week52Lo)) * 100 : null;
  const upside     = (analystRaw.targetMean as number | null) && (analystRaw.currentPrice as number | null)
    ? (((analystRaw.targetMean as number) - (analystRaw.currentPrice as number))
       / (analystRaw.currentPrice as number)) * 100 : null;
  const peg        = forwardPE && earningsGrowth && earningsGrowth > 0
    ? forwardPE / (earningsGrowth * 100) : null;
  const fcfYield   = freeCashflow && mktCap ? (freeCashflow / mktCap) * 100 : null;

  /* ── EPS 実績分析 ── */
  const epsBeats   = earningsRows.filter(e => (raw(e.surprisePercent) ?? 0) > 0);
  const epsMisses  = earningsRows.filter(e => (raw(e.surprisePercent) ?? 0) < 0);
  const totalQ     = earningsRows.length;
  const avgSurprise = totalQ > 0
    ? earningsRows.reduce((s, e) => s + ((raw(e.surprisePercent) ?? 0) * 100), 0) / totalQ
    : null;
  const latestSurprise = earningsRows.length > 0
    ? (raw(earningsRows[earningsRows.length - 1].surprisePercent) ?? 0) * 100 : null;

  /* ── EPS加速度 ── */
  let epsAcceleration: "加速" | "安定" | "鈍化" | null = null;
  if (totalQ >= 4) {
    const olderAvg = (earningsRows.slice(0, 2)
      .reduce((s, e) => s + ((raw(e.surprisePercent) ?? 0) * 100), 0)) / 2;
    const newerAvg = (earningsRows.slice(2, 4)
      .reduce((s, e) => s + ((raw(e.surprisePercent) ?? 0) * 100), 0)) / 2;
    const diff = newerAvg - olderAvg;
    epsAcceleration = diff > 5 ? "加速" : diff < -5 ? "鈍化" : "安定";
  } else if (totalQ === 2) {
    const diff = ((raw(earningsRows[1].surprisePercent) ?? 0)
                - (raw(earningsRows[0].surprisePercent) ?? 0)) * 100;
    epsAcceleration = diff > 5 ? "加速" : diff < -5 ? "鈍化" : "安定";
  }

  /* ── マクロ環境・地政学分析 ── */
  const isJP      = symbol.endsWith(".T");
  const sectorRaw = ((sector ?? "") + " " + (industry ?? "")).toLowerCase();

  // 金利環境（米10年債）
  const rateEnv = usYield10yr == null ? "─"
    : usYield10yr > 4.5 ? "高金利" : usYield10yr > 3.5 ? "やや高め"
    : usYield10yr > 2.5 ? "中立"   : "低金利";

  // 為替環境（日本株のみ）
  const yenEnv = !isJP || usdJpy == null ? "─"
    : usdJpy > 155 ? "超円安" : usdJpy > 148 ? "円安"
    : usdJpy > 140 ? "中立"   : usdJpy > 130 ? "やや円高" : "円高";

  // VIX 環境
  const vixEnv = vix == null ? "─"
    : vix > 30 ? "恐怖" : vix > 22 ? "不安"
    : vix > 15 ? "中立" : "楽観";

  // セクター別 金利感応度
  type Impact = "ポジティブ" | "ニュートラル" | "ネガティブ" | "─";
  let rateImpact: Impact = usYield10yr == null ? "─" : "ニュートラル";
  if (usYield10yr != null) {
    const highRate = usYield10yr > 4.0;
    const lowRate  = usYield10yr < 3.0;
    if (/financ|bank|銀行|金融/.test(sectorRaw)) {
      rateImpact = highRate ? "ポジティブ" : "ニュートラル";
    } else if (/real.?estate|reit|不動産|util|公益/.test(sectorRaw)) {
      rateImpact = highRate ? "ネガティブ" : lowRate ? "ポジティブ" : "ニュートラル";
    } else if (/tech|software|情報技術|semiconductor|半導体/.test(sectorRaw)
               && forwardPE != null && forwardPE > 25) {
      rateImpact = highRate ? "ネガティブ" : lowRate ? "ポジティブ" : "ニュートラル";
    } else if (/consumer|消費|retail|小売/.test(sectorRaw)) {
      rateImpact = highRate ? "ネガティブ" : "ニュートラル";
    }
  }

  // 円相場感応度（日本株のみ）
  let yenImpact: Impact = "─";
  if (isJP && usdJpy != null) {
    const weakYen   = usdJpy > 148;
    const strongYen = usdJpy < 135;
    // 輸出系セクター判定
    const isExporter = /auto|motor|車|electron|electric|機械|mach|industrial|素材|化学|chemical/.test(sectorRaw);
    yenImpact = isExporter
      ? (weakYen ? "ポジティブ" : strongYen ? "ネガティブ" : "ニュートラル")
      : (weakYen ? "ネガティブ" : strongYen ? "ポジティブ" : "ニュートラル");
  }

  // 地政学リスク（最大4件）
  const geoRisks: string[] = [];
  if (/semiconductor|半導体|chip|soc/.test(sectorRaw))   geoRisks.push("米中輸出規制（半導体・AI）");
  if (/energy|石油|エネルギー|oil|gas/.test(sectorRaw))  geoRisks.push("中東情勢・原油供給リスク");
  if (/auto|motor|自動車|ev/.test(sectorRaw))            geoRisks.push("EV移行・中国市場シェア争い");
  if (/defense|aerospace|防衛/.test(sectorRaw))          geoRisks.push("防衛需要増（地政学緊張）");
  if (isJP && geoRisks.length === 0)                    geoRisks.push("台湾海峡・朝鮮半島リスク（日本市場全般）");

  /* ── 5軸スコアリング (0-100, 50=中立) ── */
  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

  // 1. 成長性
  let growthScore = 50;
  if (revenueGrowth != null) {
    if (revenueGrowth > 0.30) growthScore += 22;
    else if (revenueGrowth > 0.15) growthScore += 13;
    else if (revenueGrowth > 0.05) growthScore += 6;
    else if (revenueGrowth < -0.05) growthScore -= 15;
    else if (revenueGrowth < 0) growthScore -= 8;
  }
  if (earningsGrowth != null) {
    if (earningsGrowth > 0.30) growthScore += 18;
    else if (earningsGrowth > 0.15) growthScore += 10;
    else if (earningsGrowth > 0) growthScore += 4;
    else if (earningsGrowth < -0.15) growthScore -= 15;
    else if (earningsGrowth < 0) growthScore -= 8;
  }
  if (totalQ >= 4 && epsBeats.length === 4) growthScore += 15;
  else if (totalQ >= 3 && epsBeats.length >= 3) growthScore += 10;
  else if (totalQ >= 2 && epsMisses.length >= totalQ) growthScore -= 15;
  if (epsAcceleration === "加速") growthScore += 8;
  else if (epsAcceleration === "鈍化") growthScore -= 8;
  const scores = { growth: clamp(growthScore), quality: 0, value: 0, health: 0, sentiment: 0 };

  // 2. 収益品質
  let qualityScore = 50;
  if (roe != null) {
    if (roe > 0.25) qualityScore += 20; else if (roe > 0.15) qualityScore += 12;
    else if (roe > 0.05) qualityScore += 5; else if (roe < 0) qualityScore -= 15;
  }
  if (opMargin != null) {
    if (opMargin > 0.25) qualityScore += 15; else if (opMargin > 0.15) qualityScore += 8;
    else if (opMargin > 0.05) qualityScore += 3; else if (opMargin < 0.02) qualityScore -= 12;
  }
  if (fcfYield != null) {
    if (fcfYield > 5) qualityScore += 15; else if (fcfYield > 2) qualityScore += 8;
    else if (fcfYield < 0) qualityScore -= 15;
  } else if (freeCashflow != null && freeCashflow < 0) qualityScore -= 10;
  scores.quality = clamp(qualityScore);

  // 3. 割安度 (高いほど割安)
  let valueScore = 50;
  if (peg != null && peg > 0) {
    if (peg < 0.75) valueScore += 25; else if (peg < 1.0) valueScore += 15;
    else if (peg < 1.5) valueScore += 5; else if (peg > 3.0) valueScore -= 22;
    else if (peg > 2.0) valueScore -= 12; else if (peg > 1.5) valueScore -= 5;
  } else if (forwardPE != null) {
    if (forwardPE < 10) valueScore += 18; else if (forwardPE < 15) valueScore += 10;
    else if (forwardPE > 40) valueScore -= 18; else if (forwardPE > 25) valueScore -= 8;
  }
  if (pbRatio != null) {
    if (pbRatio < 1.0) valueScore += 12; else if (pbRatio < 2.0) valueScore += 5;
    else if (pbRatio > 5.0) valueScore -= 10;
  }
  if (upside != null) {
    if (upside > 20) valueScore += 15; else if (upside > 10) valueScore += 8;
    else if (upside < -10) valueScore -= 15; else if (upside < 0) valueScore -= 8;
  }
  // 高金利下の高PEは割安度を追加圧縮
  if (usYield10yr != null && usYield10yr > 4.5 && forwardPE != null && forwardPE > 30) {
    valueScore -= 10;
  }
  scores.value = clamp(valueScore);

  // 4. 財務健全性
  let healthScore = 50;
  if (debtToEquity != null) {
    if (debtToEquity < 20) healthScore += 22; else if (debtToEquity < 50) healthScore += 12;
    else if (debtToEquity > 200) healthScore -= 22; else if (debtToEquity > 100) healthScore -= 12;
    else if (debtToEquity > 70) healthScore -= 5;
  }
  if (currentRatio != null) {
    if (currentRatio > 2.5) healthScore += 15; else if (currentRatio > 1.5) healthScore += 8;
    else if (currentRatio < 1.0) healthScore -= 15;
  }
  if (freeCashflow != null) {
    if (fcfYield != null && fcfYield > 5) healthScore += 15;
    else if (freeCashflow > 0) healthScore += 8;
    else healthScore -= 15;
  }
  if (beta != null && beta > 2.0) healthScore -= 12;
  // 高金利 × 高レバレッジ → 追加リスク
  if (usYield10yr != null && usYield10yr > 4.0 && debtToEquity != null && debtToEquity > 80) {
    healthScore -= 8;
  }
  scores.health = clamp(healthScore);

  // 5. 需給・センチメント
  const buyPct0  = (analystRaw.buyPct  as number) ?? 0;
  const sellPct0 = (analystRaw.sellPct as number) ?? 0;
  let sentimentScore = 50;
  if (buyPct0 >= 80) sentimentScore += 25; else if (buyPct0 >= 65) sentimentScore += 15;
  else if (buyPct0 >= 50) sentimentScore += 5; else if (buyPct0 < 30) sentimentScore -= 15;
  if (upside != null) {
    if (upside > 20) sentimentScore += 15; else if (upside > 10) sentimentScore += 8;
    else if (upside < -5) sentimentScore -= 12;
  }
  if (week52Pct != null) {
    if (week52Pct < 20) sentimentScore += 10;
    else if (week52Pct > 95) sentimentScore -= 12;
    else if (week52Pct > 85) sentimentScore -= 5;
  }
  if (shortRatio != null) {
    if (shortRatio > 8) sentimentScore -= 15; else if (shortRatio > 5) sentimentScore -= 8;
    else if (shortRatio < 2) sentimentScore += 5;
  }
  // VIX による市場センチメント調整
  if (vix != null) {
    if (vix > 30)      sentimentScore -= 15;
    else if (vix > 25) sentimentScore -= 8;
    else if (vix < 15) sentimentScore += 8;
  }
  scores.sentiment = clamp(sentimentScore);

  /* ── 矛盾シグナル検出 ── */
  const contradictions: string[] = [];

  // ① 業績好調 × 株価が目標超え
  if (scores.growth >= 65 && upside != null && upside < -3)
    contradictions.push(`業績モメンタムは良好だが株価はアナリスト目標を${Math.abs(upside).toFixed(1)}%上回り「割高水準」に突入`);

  // ② アナリスト強気 × 財務脆弱
  if (scores.sentiment >= 68 && scores.health <= 35)
    contradictions.push(`アナリスト強気（${buyPct0}%が買い推奨）だが財務健全性スコアが低く（D/E${num(debtToEquity)}・FCF${freeCashflow != null && freeCashflow < 0 ? "赤字" : "要注意"}）、財務悪化時の下落リスクあり`);

  // ③ 高バリュエーション × 成長鈍化
  if (scores.value <= 35 && scores.growth <= 42)
    contradictions.push(`割安度スコアが低い（PEG${peg ? peg.toFixed(2) : "N/A"}・PER${num(forwardPE)}倍）にもかかわらず成長率が鈍化傾向—バリュエーション調整リスク`);

  // ④ EPS連続超過 × 売上減収
  if (epsBeats.length >= 3 && revenueGrowth != null && revenueGrowth < 0)
    contradictions.push(`EPS予想を${epsBeats.length}Q連続超過だが売上は前年比${pct(revenueGrowth)}の減収—コスト削減依存の可能性あり`);

  // ⑤ 52週安値圏 × 強い業績（割安機会）
  if (week52Pct != null && week52Pct < 22 && scores.growth >= 65)
    contradictions.push(`52週レンジ下位${week52Pct.toFixed(0)}%まで下落しているが業績は堅調—市場の過度な売りによる割安機会の可能性`);

  // ⑥ 高成長 × 高PEG（成長織り込み済み）
  if (scores.growth >= 70 && peg != null && peg > 2.5)
    contradictions.push(`利益成長率${pct(earningsGrowth)}の高成長だがPEG${peg.toFixed(2)}と成長期待が既に株価に反映—EPS未達で大幅調整リスク`);

  // ⑦ 高金利 × 高レバレッジ（金利コスト増大）
  if (usYield10yr != null && usYield10yr > 4.0 && debtToEquity != null && debtToEquity > 100)
    contradictions.push(`米10年債${usYield10yr.toFixed(2)}%の高金利環境でD/E${num(debtToEquity)}の高レバレッジ—利払い負担増大による収益圧迫に要注意`);

  /* ── マクロコメント生成（ルールベース） ── */
  const macroParts: string[] = [];
  if (usYield10yr != null)
    macroParts.push(`米10年債${usYield10yr.toFixed(2)}%（${rateEnv}）、当銘柄への金利影響は${rateImpact}`);
  if (isJP && usdJpy != null)
    macroParts.push(`USD/JPY ${Math.round(usdJpy)}円（${yenEnv}）は${
      yenImpact === "ポジティブ" ? "輸出収益押し上げ要因" :
      yenImpact === "ネガティブ" ? "輸入コスト圧迫要因" : "ほぼ中立"}`);
  if (!isJP && usdJpy != null)
    macroParts.push(`USD/JPY ${Math.round(usdJpy)}円（${yenEnv}）—円安は日本人投資家の米株保有額を押し上げ`);
  if (vix != null)
    macroParts.push(`VIX ${vix.toFixed(1)}（${vixEnv}）—${
      vix > 25 ? "リスクオフ地合い、ボラティリティ拡大に注意" :
      vix < 15 ? "市場は落ち着いたリスク環境" : "通常ボラティリティ水準"}`);
  if (geoRisks.length > 0)
    macroParts.push(`地政学リスク: ${geoRisks.join("・")}`);
  const macroComment = macroParts.join("。") + (macroParts.length ? "。" : "");

  /* ── データコンテキスト（Claude 用） ── */
  const epsHistoryStr = earningsRows.map((e, i) => {
    const q  = e.quarter instanceof Date ? e.quarter.toISOString().slice(0, 7)
             : typeof e.quarter === "string" ? e.quarter.slice(0, 7) : `Q${i+1}`;
    const act = raw(e.epsActual);
    const est = raw(e.epsEstimate);
    const sur = (raw(e.surprisePercent) ?? 0) * 100;
    return `${q}: 実績${act ?? "?"} 予想${est ?? "?"} 乖離${sur > 0 ? "+" : ""}${sur.toFixed(1)}%`;
  }).join(" | ");

  const context = `
■ 銘柄基本
コード:${symbol} 企業名:${name} セクター:${sector ?? "N/A"} 業種:${industry ?? "N/A"}
従業員:${employees?.toLocaleString() ?? "N/A"}人
事業概要: ${bizSummary ?? "N/A"}

■ 株価
現在値:${price ?? "N/A"} ${currency ?? ""} 時価総額:${mktCap ? fmtLarge(mktCap) : "N/A"}
本日騰落:${changePct?.toFixed(2) ?? "N/A"}%
52週: 高値${week52Hi ?? "N/A"} 安値${week52Lo ?? "N/A"} 位置${week52Pct?.toFixed(0) ?? "N/A"}%

■ バリュエーション
PER(予想):${num(forwardPE)}倍 PER(実績):${num(trailingPE)}倍
PBR:${num(pbRatio)}倍 EV/EBITDA:${num(evToEbitda)}倍
PEGレシオ:${num(peg)} ※1以下は成長考慮で割安

■ 収益性・成長
ROE:${pct(roe)} ROA:${pct(roa)}
営業利益率:${pct(opMargin)} 純利益率:${pct(profitMargin)}
売上成長率(YoY):${pct(revenueGrowth)} 利益成長率:${pct(earningsGrowth)}
FCF:${freeCashflow ? fmtLarge(freeCashflow) : "N/A"} FCFイールド:${num(fcfYield)}%

■ 財務健全性
D/E:${num(debtToEquity)} 流動比率:${num(currentRatio)}
ベータ:${num(beta)} 空売り日数:${num(shortRatio)}

■ アナリスト評価 (${analystRaw.total ?? 0}名)
強い買:${analystRaw.strongBuy ?? 0} 買:${analystRaw.buy ?? 0} 中立:${analystRaw.hold ?? 0} 売:${analystRaw.sell ?? 0} 強売:${analystRaw.strongSell ?? 0}
買い比率:${analystRaw.buyPct ?? "?"}% 目標株価 平均:${analystRaw.targetMean ?? "N/A"} 高:${analystRaw.targetHigh ?? "N/A"} 低:${analystRaw.targetLow ?? "N/A"}
アップサイド:${num(upside)}%
推奨:${analystRaw.recKey ?? "N/A"}

■ EPS実績 vs 予想 (直近${totalQ}四半期)
${epsHistoryStr || "データなし"}
直近Q乖離:${latestSurprise !== null ? (latestSurprise > 0 ? "+" : "") + latestSurprise.toFixed(1) + "%" : "N/A"}
${totalQ}Q中予想超過:${epsBeats.length}回 平均乖離:${avgSurprise !== null ? (avgSurprise > 0 ? "+" : "") + avgSurprise.toFixed(1) + "%" : "N/A"}

■ 次回決算
${analystRaw.nextEarnings ? String(analystRaw.nextEarnings) : "不明"}  次期EPS予想:${analystRaw.epsEstimate ?? "N/A"}

■ 配当
利回り:${pct(analystRaw.dividendYield as number | null)} 1株配当:${analystRaw.dividendRate ?? "N/A"}${currency ?? ""}

■ マクロ環境
米10年債利回り:${usYield10yr != null ? usYield10yr.toFixed(2) + "%" : "不明"} (${rateEnv})
VIX(恐怖指数):${vix != null ? vix.toFixed(1) : "不明"} (${vixEnv})
${isJP ? `USD/JPY:${usdJpy != null ? Math.round(usdJpy) + "円" : "不明"} (${yenEnv}) / 当銘柄への円相場影響:${yenImpact}` : `USD/JPY:${usdJpy != null ? Math.round(usdJpy) + "円" : "不明"} (${yenEnv})`}
当銘柄への金利影響:${rateImpact}
地政学リスク:${geoRisks.length > 0 ? geoRisks.join("、") : "特定リスクなし"}
`.trim();

  /* ── Claude API ── */
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (apiKey) {
    try {
      const client = new Anthropic({ apiKey });
      const msg = await client.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 2200,
        messages: [{
          role: "user",
          content: `あなたは機関投資家向けの証券アナリストです。以下の実データを使い、${name}（${symbol}）についての投資分析を日本語で作成してください。

【絶対厳守ルール】
・各ポイントは必ず提供データ内の具体的な数値を1つ以上引用すること
・「一般的な企業リスク」「マクロ経済リスク」「競合激化」など汎用文言は禁止
・EPS実績データがある場合は必ず言及すること（連続超過/未達トレンドを評価）
・PEGレシオ・FCFイールド・52週位置など計算値も積極的に活用すること
・業種固有のリスク・機会について言及すること（例: 半導体→需要サイクル、自動車→EV移行）
・アナリスト目標株価と現在値の乖離を投資判断に組み込むこと
・マクロ環境（金利水準・為替・VIX・地政学リスク）を当銘柄への具体的な影響として言及すること

${context}

以下のJSON形式のみで回答（マークダウン・説明文不要、純粋なJSONのみ）:
{
  "summary": "事業内容・財務状況・バリュエーション・成長トレンドを具体数値で説明する3〜5文。EPS実績・PEG・FCFイールドも含める",
  "bullPoints": [
    "【必須: 数値引用】具体的なポジティブ要因 (40字以内)",
    "【必須: 数値引用】具体的なポジティブ要因 (40字以内)",
    "【必須: 数値引用】具体的なポジティブ要因 (40字以内)",
    "【必須: 数値引用】具体的なポジティブ要因 (40字以内)",
    "【必須: 数値引用】具体的なポジティブ要因 (40字以内)"
  ],
  "bearPoints": [
    "【必須: 数値引用】具体的なリスク要因 (40字以内)",
    "【必須: 数値引用】具体的なリスク要因 (40字以内)",
    "【必須: 数値引用】具体的なリスク要因 (40字以内)",
    "【必須: 数値引用】具体的なリスク要因 (40字以内)",
    "【必須: 数値引用】具体的なリスク要因 (40字以内)"
  ],
  "riskLevel": "low|medium|high",
  "recommendation": "強い買い|買い|中立|売り|強い売り",
  "oneliner": "投資判断を表す15字以内のキャッチフレーズ",
  "valuationComment": "PER・PBR・PEG・EV/EBITDAを使い1〜2文で評価。割安/割高/適正の判断根拠を明示",
  "technicalComment": "52週レンジ位置・EPS実績サプライズ傾向・モメンタムを1〜2文で評価",
  "macroComment": "金利水準・為替（円相場）・VIX・地政学リスクが当銘柄に与える影響を具体的数値で1〜2文",
  "scores": {
    "growth": 0から100の整数（成長性スコア）,
    "quality": 0から100の整数（収益品質スコア）,
    "value": 0から100の整数（割安度スコア）,
    "health": 0から100の整数（財務健全性スコア）,
    "sentiment": 0から100の整数（需給センチメントスコア）
  },
  "contradictions": ["強気・弱気シグナルの重要な矛盾を1〜2文で指摘（最大3件、矛盾がなければ空配列[]）"]
}`,
        }],
      });

      const text = (msg.content[0] as { type: string; text?: string })?.text ?? "";
      recordUsage("ai-analysis", "claude-sonnet-4-5", msg.usage);
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return NextResponse.json({
          ...parsed,
          scores:        parsed.scores        ?? scores,
          contradictions:Array.isArray(parsed.contradictions) ? parsed.contradictions : contradictions,
          macroComment:  parsed.macroComment  ?? macroComment,
          epsAcceleration,
          macroData: { usYield10yr, usdJpy, vix, rateEnv, yenEnv, vixEnv, rateImpact, yenImpact, geoRisks },
          source: "claude", symbol, name,
        });
      }
    } catch (err) {
      console.error("Claude AI error:", err);
    }
  }

  /* ── ルールベース フォールバック（強化版） ── */
  const buyPct   = (analystRaw.buyPct  as number) ?? 0;
  const sellPct  = (analystRaw.sellPct as number) ?? 0;
  const total    = (analystRaw.total   as number) ?? 0;

  const bullPoints: string[] = [];
  const bearPoints: string[] = [];

  /* ── ポジティブ要因（優先度順） ── */

  // 1. EPS実績：連続超過
  if (totalQ >= 2 && epsBeats.length === totalQ && avgSurprise !== null) {
    bullPoints.push(`直近${totalQ}四半期すべてEPS予想超過（平均${avgSurprise > 0 ? "+" : ""}${avgSurprise.toFixed(1)}%上振れ）`);
  } else if (totalQ >= 2 && epsBeats.length >= totalQ - 1 && avgSurprise !== null && avgSurprise > 5) {
    bullPoints.push(`直近${totalQ}四半期中${epsBeats.length}回EPS予想超過（平均${avgSurprise > 0 ? "+" : ""}${avgSurprise.toFixed(1)}%乖離）`);
  }

  // 2. アナリスト評価 + 目標株価アップサイドの複合
  if (buyPct >= 70 && upside !== null && upside > 10) {
    bullPoints.push(`アナリスト${total}名中${buyPct}%が買い推奨、目標株価まで+${upside.toFixed(1)}%の上昇余地`);
  } else if (buyPct >= 60 && upside !== null && upside > 5) {
    bullPoints.push(`アナリスト${buyPct}%が買い推奨（${total}名）、目標株価比アップサイド+${upside.toFixed(1)}%`);
  } else if (upside !== null && upside > 15) {
    bullPoints.push(`目標株価（平均 ${analystRaw.targetMean}）まで+${upside.toFixed(1)}%の大きな上昇余地`);
  }

  // 3. PEGレシオ（成長考慮バリュエーション）
  if (peg !== null && peg < 1.0 && peg > 0) {
    bullPoints.push(`PEGレシオ${peg.toFixed(2)}（<1.0）、利益成長率を加味しても割安水準`);
  } else if (forwardPE !== null && forwardPE < 15 && earningsGrowth !== null && earningsGrowth > 0) {
    bullPoints.push(`PER${num(forwardPE)}倍×利益成長率${pct(earningsGrowth)}の成長株として割安`);
  } else if (forwardPE !== null && forwardPE < 12) {
    bullPoints.push(`予想PER${num(forwardPE)}倍と絶対水準で割安圏`);
  }

  // 4. FCFイールド（株主還元余力）
  if (fcfYield !== null && fcfYield > 4) {
    bullPoints.push(`FCFイールド${fcfYield.toFixed(1)}%、配当・自社株買い余力が高い`);
  } else if (fcfYield !== null && fcfYield > 2) {
    bullPoints.push(`FCFイールド${fcfYield.toFixed(1)}%、安定した現金創出力`);
  } else if (freeCashflow !== null && freeCashflow > 0) {
    bullPoints.push(`FCF ${fmtLarge(freeCashflow)}の黒字、自社株買い・配当への転換余地`);
  }

  // 5. 収益性（ROE）
  if (roe !== null && roe > 0.20) {
    bullPoints.push(`ROE${pct(roe)}の高い資本効率、${industry ?? "同業"}トップクラス`);
  } else if (roe !== null && roe > 0.12) {
    bullPoints.push(`ROE${pct(roe)}、株主資本の効率的活用を継続`);
  }

  // 6. 売上・利益成長
  if (revenueGrowth !== null && revenueGrowth > 0.20 && earningsGrowth !== null && earningsGrowth > 0.20) {
    bullPoints.push(`売上+${pct(revenueGrowth)}・利益+${pct(earningsGrowth)}の高成長継続`);
  } else if (revenueGrowth !== null && revenueGrowth > 0.10) {
    bullPoints.push(`売上高が前年比+${pct(revenueGrowth)}の高成長フェーズ`);
  }

  // 7. 営業利益率
  if (opMargin !== null && opMargin > 0.25) {
    bullPoints.push(`営業利益率${pct(opMargin)}の高収益構造、価格競争力を維持`);
  }

  // 8. 財務健全性（負債）
  if (debtToEquity !== null && debtToEquity < 30 && currentRatio !== null && currentRatio > 2) {
    bullPoints.push(`D/E比率${num(debtToEquity)}・流動比率${num(currentRatio)}倍の盤石な財務基盤`);
  } else if (debtToEquity !== null && debtToEquity < 50) {
    bullPoints.push(`D/E比率${num(debtToEquity)}と低負債、金利上昇局面でも耐性あり`);
  }

  // 9. 52週安値圏（反発期待）
  if (week52Pct !== null && week52Pct < 20) {
    bullPoints.push(`52週レンジの下位${week52Pct.toFixed(0)}%、底打ち反発が期待される水準`);
  }

  // 10. 配当利回り
  const divYield = raw(analystRaw.dividendYield as unknown);
  if (divYield !== null && divYield > 0.03) {
    bullPoints.push(`配当利回り${pct(divYield)}と高インカム、長期保有の魅力`);
  }

  /* ── リスク・懸念点（優先度順） ── */

  // 1. EPS実績：連続未達
  if (totalQ >= 2 && epsMisses.length === totalQ && avgSurprise !== null) {
    bearPoints.push(`直近${totalQ}四半期すべてEPS予想未達（平均${avgSurprise.toFixed(1)}%の下振れ）`);
  } else if (totalQ >= 2 && epsMisses.length >= totalQ - 1 && avgSurprise !== null && avgSurprise < -3) {
    bearPoints.push(`直近${totalQ}四半期中${epsMisses.length}回EPS未達、業績の下方修正リスク`);
  }

  // 2. 目標株価超過（上値余地なし）
  if (upside !== null && upside < -5) {
    bearPoints.push(`現在値がアナリスト目標株価平均を${Math.abs(upside).toFixed(1)}%上回り、上値余地乏しい`);
  } else if (upside !== null && upside < 0) {
    bearPoints.push(`目標株価（平均 ${analystRaw.targetMean}）を${Math.abs(upside).toFixed(1)}%すでに上回る`);
  }

  // 3. 高PEG（成長対比で割高）
  if (peg !== null && peg > 2.5) {
    bearPoints.push(`PEGレシオ${peg.toFixed(2)}（>2.5）、利益成長に対してバリュエーションが割高`);
  } else if (forwardPE !== null && forwardPE > 40) {
    bearPoints.push(`予想PER${num(forwardPE)}倍は高バリュエーション、業績悪化時の下落リスク大`);
  }

  // 4. 52週高値圏（上値重い）
  if (week52Pct !== null && week52Pct > 85) {
    bearPoints.push(`52週高値圏（レンジ上位${week52Pct.toFixed(0)}%）、短期的な達成感から上値が重い可能性`);
  } else if (posFromHi !== null && posFromHi > -5) {
    bearPoints.push(`52週高値から${Math.abs(posFromHi).toFixed(1)}%の高値圏推移、利益確定売り圧力に注意`);
  }

  // 5. 高負債
  if (debtToEquity !== null && debtToEquity > 200) {
    bearPoints.push(`D/E比率${num(debtToEquity)}と高レバレッジ、金利上昇で財務コスト増大リスク`);
  } else if (debtToEquity !== null && debtToEquity > 100) {
    bearPoints.push(`D/E比率${num(debtToEquity)}、業績悪化時の財務的な余裕が限られる`);
  }

  // 6. 売上減収
  if (revenueGrowth !== null && revenueGrowth < -0.05) {
    bearPoints.push(`売上高が前年比${pct(revenueGrowth)}の減収トレンド、需要の構造的な変化の可能性`);
  } else if (revenueGrowth !== null && revenueGrowth < 0) {
    bearPoints.push(`売上高が前年比${pct(revenueGrowth)}の微減、成長回帰の見通しが不透明`);
  }

  // 7. 低営業利益率
  if (opMargin !== null && opMargin < 0.03) {
    bearPoints.push(`営業利益率${pct(opMargin)}と極めて低く、原価・競争圧力による収益悪化リスク`);
  } else if (opMargin !== null && opMargin < 0.08) {
    bearPoints.push(`営業利益率${pct(opMargin)}にとどまり、コスト管理と価格転嫁が課題`);
  }

  // 8. 空売り比率（弱気ポジション）
  if (shortRatio !== null && shortRatio > 8) {
    bearPoints.push(`空売り日数${num(shortRatio)}日分と多く、市場の弱気ポジションが集積`);
  } else if (shortRatio !== null && shortRatio > 5) {
    bearPoints.push(`空売り日数${num(shortRatio)}日分、ショートカバー・需給悪化に注意`);
  }

  // 9. 売り推奨多い
  if (sellPct >= 30) {
    bearPoints.push(`アナリスト${sellPct}%（${Math.round((total * sellPct) / 100)}名）が売り推奨、機関投資家の慎重姿勢が強い`);
  }

  // 10. ネガティブFCF
  if (freeCashflow !== null && freeCashflow < 0) {
    bearPoints.push(`FCFが${fmtLarge(freeCashflow)}のマイナス、追加資金調達リスクに留意`);
  }

  // 11. 高ベータ
  if (beta !== null && beta > 1.8) {
    bearPoints.push(`ベータ${num(beta)}と市場より大幅に変動率が高く、下落相場での損失が拡大しやすい`);
  }

  // 12. 52週下落（モメンタム弱）
  if (posFromHi !== null && posFromHi < -30 && week52Pct !== null && week52Pct < 30) {
    bearPoints.push(`52週高値から${Math.abs(posFromHi).toFixed(0)}%下落中、下落トレンド継続の可能性`);
  }

  /* ── 重複チェック（既出キーワード判定） ── */
  const has = (list: string[], ...kw: string[]) =>
    list.some(p => kw.some(k => p.includes(k)));

  /* ── 補完候補（重複なし・閾値あり） ── */
  const candidateBull: string[] = [
    roe !== null && !has(bullPoints, "ROE")
      ? `ROE${pct(roe)}で資本を効率活用（自己資本収益性を確認）` : "",
    opMargin !== null && opMargin > 0.10 && !has(bullPoints, "営業利益率")
      ? `営業利益率${pct(opMargin)}、${opMargin > 0.2 ? "業種上位の" : ""}収益水準を維持` : "",
    currentRatio !== null && currentRatio > 2.0 && !has(bullPoints, "流動比率", "財務基盤")
      ? `流動比率${num(currentRatio)}倍、短期支払い能力に問題なし` : "",
    earningsGrowth !== null && earningsGrowth > 0.05 && !has(bullPoints, "利益成長", "成長率", "成長継続")
      ? `利益成長率${pct(earningsGrowth)}の拡大フェーズ継続` : "",
    divYield !== null && divYield > 0.01 && !has(bullPoints, "配当")
      ? `配当利回り${pct(divYield)}でインカムゲインも期待` : "",
    pbRatio !== null && pbRatio < 1.5 && !has(bullPoints, "PBR")
      ? `PBR${num(pbRatio)}倍と純資産に対して割安感あり` : "",
    roa !== null && roa > 0.08 && !has(bullPoints, "ROA")
      ? `ROA${pct(roa)}の高い総資産収益率` : "",
  ].filter(Boolean);

  const candidateBear: string[] = [
    beta !== null && !has(bearPoints, "ベータ", "変動")
      ? `ベータ${num(beta)}（${beta > 1.3 ? "市場より高ボラティリティ" : beta < 0.5 ? "超ディフェンシブ・上値限定" : "市場連動型"}）` : "",
    week52Pct !== null && week52Pct > 40 && week52Pct <= 85 && !has(bearPoints, "52週", "高値圏", "高値から")
      ? `52週レンジ${week52Pct.toFixed(0)}%位置、方向感を見極める局面` : "",
    pbRatio !== null && pbRatio > 3 && !has(bearPoints, "PBR", "純資産")
      ? `PBR${num(pbRatio)}倍と純資産比で割高水準` : "",
    forwardPE !== null && forwardPE > 20 && !has(bearPoints, "PER", "バリュエーション")
      ? `予想PER${num(forwardPE)}倍、期待値が株価に相当程度織り込み済み` : "",
    debtToEquity !== null && debtToEquity > 50 && !has(bearPoints, "D/E", "負債", "レバレッジ")
      ? `D/E比率${num(debtToEquity)}、有利子負債の水準を継続注視` : "",
    opMargin !== null && opMargin < 0.10 && !has(bearPoints, "営業利益率", "収益性")
      ? `営業利益率${pct(opMargin)}と利幅が薄く、コスト変動への耐性が低い` : "",
    shortRatio !== null && shortRatio > 3 && !has(bearPoints, "空売り")
      ? `空売り日数${num(shortRatio)}日分、機関の弱気ポジションに注意` : "",
  ].filter(Boolean);

  for (const text of candidateBull) {
    if (bullPoints.length >= 5) break;
    bullPoints.push(text);
  }
  for (const text of candidateBear) {
    if (bearPoints.length >= 5) break;
    bearPoints.push(text);
  }

  /* ── マクロ要因 bull/bear（会社固有分析の後に追加） ── */
  // Positive macro tailwinds
  if (rateImpact === "ポジティブ" && usYield10yr != null && !has(bullPoints, "金利", "利ざや")) {
    const rateLbl = /financ|bank|銀行|金融/.test(sectorRaw)
      ? "金融株の利ざや拡大に寄与" : "当セクターへの追い風として機能";
    bullPoints.push(`米10年債${usYield10yr.toFixed(2)}%の金利水準が${rateLbl}`);
  }
  if (yenImpact === "ポジティブ" && usdJpy != null && !has(bullPoints, "円安", "為替", "円換算")) {
    bullPoints.push(`円安（1USD≒¥${Math.round(usdJpy)}）が輸出収益の円換算を押し上げ、業績下支え`);
  }
  if (vix != null && vix < 15 && !has(bullPoints, "VIX", "リスクオン")) {
    bullPoints.push(`VIX${vix.toFixed(1)}と市場センチメント安定—リスクオン地合いで資金流入しやすい環境`);
  }

  // Negative macro headwinds
  if (rateImpact === "ネガティブ" && usYield10yr != null && !has(bearPoints, "金利", "PER圧縮")) {
    bearPoints.push(`米10年債${usYield10yr.toFixed(2)}%の高金利がPER圧縮・資金調達コスト上昇の逆風`);
  }
  if (yenImpact === "ネガティブ" && usdJpy != null && !has(bearPoints, "円安", "為替", "輸入コスト")) {
    bearPoints.push(`円安（1USD≒¥${Math.round(usdJpy)}）が輸入コストを押し上げ、マージン圧迫リスク`);
  }
  if (vix != null && vix > 25 && !has(bearPoints, "VIX", "リスクオフ")) {
    bearPoints.push(`VIX${vix.toFixed(1)}と市場不安高水準—リスクオフ地合いで機関売り圧力が強まりやすい`);
  }
  if (geoRisks.length > 0 && !has(bearPoints, "地政学", "輸出規制", "中東", "EV移行", "台湾")) {
    bearPoints.push(`地政学リスク: ${geoRisks.slice(0, 2).join("・")}が業績変動要因`);
  }

  // データ不足の場合のみ最終フォールバック
  if (bullPoints.length < 3) bullPoints.push("財務データが限定的。公式IR資料での確認を推奨");
  if (bearPoints.length < 3) bearPoints.push("業績データが限定的。今後の四半期決算に注目");

  /* ── 推奨判定 ── */
  let recommendation = "中立";
  let riskLevel: "low" | "medium" | "high" = "medium";

  const epsBoost = totalQ >= 3 && epsBeats.length >= 3;

  if (buyPct >= 65 && (upside ?? 0) > 5)  { recommendation = "買い";     riskLevel = "low";    }
  if (buyPct >= 75 && (upside ?? 0) > 10) { recommendation = "強い買い"; riskLevel = "low";    }
  if (epsBoost && recommendation === "中立") recommendation = "買い";
  if (sellPct >= 35)                       { recommendation = "売り";     riskLevel = "high";   }
  if (sellPct >= 50)                       { recommendation = "強い売り"; riskLevel = "high";   }
  if ((upside ?? 0) < -10 && recommendation !== "強い売り") recommendation = "売り";
  if (peg !== null && peg > 3 && riskLevel !== "high") riskLevel = "high";
  if (beta !== null && beta > 1.5) riskLevel = "high";
  if (beta !== null && beta < 0.7 && debtToEquity !== null && debtToEquity < 50 && riskLevel !== "high") riskLevel = "low";
  // 高VIX時はリスクレベルを上げる
  if (vix != null && vix > 28 && riskLevel === "low") riskLevel = "medium";

  const onelinerMap: Record<string, string> = {
    "強い買い": "強気相場、積極的に注目",
    "買い":     "上昇余地あり、投資妙味",
    "中立":     "様子見、材料待ち",
    "売り":     "リスク優位、慎重に",
    "強い売り": "売却・回避を検討",
  };

  /* ── バリュエーションコメント ── */
  let valComment = "";
  if (peg !== null && peg > 0) {
    valComment += `PEG${peg.toFixed(2)}は${peg < 1 ? "成長率を考慮すると割安" : peg > 2 ? "割高圏" : "適正水準"}。`;
  }
  if (forwardPE !== null) {
    valComment += `予想PER${num(forwardPE)}倍${forwardPE < 15 ? "（割安）" : forwardPE > 35 ? "（割高）" : "（適正）"}。`;
  }
  if (pbRatio !== null) valComment += `PBR${num(pbRatio)}倍。`;
  if (evToEbitda !== null) valComment += `EV/EBITDA${num(evToEbitda)}倍。`;
  if (!valComment) valComment = "バリュエーションデータが不足しています。";

  /* ── テクニカルコメント ── */
  let techComment = "";
  if (week52Pct !== null) {
    techComment += `52週レンジの${week52Pct.toFixed(0)}%水準で推移（${
      week52Pct > 80 ? "高値圏、上値抵抗感あり" :
      week52Pct < 20 ? "安値圏、反発機会を探る局面" :
      "中間圏、方向感を見極め中"
    }）。`;
  }
  if (totalQ > 0 && avgSurprise !== null) {
    techComment += `直近${totalQ}Q平均EPS乖離${avgSurprise > 0 ? "+" : ""}${avgSurprise.toFixed(1)}%（${
      avgSurprise > 10 ? "好調な業績モメンタム" :
      avgSurprise < -5 ? "業績下振れが続く" :
      "概ねコンセンサス通り"
    }）。`;
  }
  if (!techComment) {
    techComment = posFromHi !== null
      ? `52週高値から${Math.abs(posFromHi).toFixed(1)}%の位置で推移。`
      : "チャートデータが不足しています。";
  }

  /* ── サマリー ── */
  const summary = [
    `${name}（${sector ?? industry ?? ""}）は`,
    total > 0 ? `アナリスト${total}名中${buyPct}%が買い推奨。` : "",
    upside !== null ? `目標株価比${upside > 0 ? "+" : ""}${upside.toFixed(1)}%の余地。` : "",
    roe !== null ? `ROE${pct(roe)}` : "",
    opMargin !== null ? `・営業利益率${pct(opMargin)}` : "",
    (roe !== null || opMargin !== null) ? "の収益構造。" : "",
    revenueGrowth !== null ? `売上成長率${pct(revenueGrowth)}で推移。` : "",
    totalQ > 0 && avgSurprise !== null
      ? `直近${totalQ}四半期EPS平均乖離${avgSurprise > 0 ? "+" : ""}${avgSurprise.toFixed(1)}%。`
      : "",
  ].filter(Boolean).join("");

  return NextResponse.json({
    summary,
    bullPoints: bullPoints.slice(0, 7),
    bearPoints: bearPoints.slice(0, 7),
    riskLevel,
    recommendation,
    oneliner: onelinerMap[recommendation] ?? "慎重に判断を",
    valuationComment: valComment,
    technicalComment: techComment,
    macroComment,
    scores,
    contradictions,
    epsAcceleration,
    macroData: { usYield10yr, usdJpy, vix, rateEnv, yenEnv, vixEnv, rateImpact, yenImpact, geoRisks },
    source: "rule-based",
    symbol,
    name,
  });
}
