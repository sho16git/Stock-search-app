/**
 * /api/ai-predict — 5年後シナリオ予想
 * Yahoo Finance データを元に 強気/中立/弱気/サプライズ の4シナリオを生成
 */
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { recordUsage } from "@/lib/ai-usage";
import yahooFinance from "@/lib/yfinance";
import { getJpName } from "@/lib/jp-stocks";

export const runtime = "nodejs";
export const revalidate = 3600;

// セクター別 年複利成長率 (CAGR) 仮定
const SECTOR_CAGR: Record<string, { bull: number; base: number; bear: number }> = {
  "Technology":             { bull: 0.22, base: 0.12, bear: -0.06 },
  "Consumer Cyclical":      { bull: 0.18, base: 0.09, bear: -0.09 },
  "Healthcare":             { bull: 0.15, base: 0.08, bear: -0.04 },
  "Financial Services":     { bull: 0.14, base: 0.07, bear: -0.07 },
  "Communication Services": { bull: 0.18, base: 0.10, bear: -0.06 },
  "Industrials":            { bull: 0.14, base: 0.08, bear: -0.06 },
  "Consumer Defensive":     { bull: 0.10, base: 0.05, bear: -0.02 },
  "Energy":                 { bull: 0.13, base: 0.04, bear: -0.12 },
  "Basic Materials":        { bull: 0.13, base: 0.06, bear: -0.09 },
  "Real Estate":            { bull: 0.10, base: 0.05, bear: -0.05 },
  "Utilities":              { bull: 0.08, base: 0.04, bear: -0.02 },
};

const raw = (o: unknown): number | null => {
  if (o == null) return null;
  if (typeof o === "number") return o;
  if (typeof o === "object" && "raw" in (o as object))
    return (o as { raw?: number }).raw ?? null;
  return null;
};

function price5Y(cur: number, cagr: number) {
  return Math.round(cur * Math.pow(1 + cagr, 5) * 100) / 100;
}
function changePct(cur: number, tgt: number) {
  return Math.round(((tgt - cur) / cur) * 1000) / 10;
}
function pctStr(v: number) { return `${(v * 100).toFixed(1)}%`; }

// ──────────────── headline builders ────────────────
function headline(id: string, sector: string, rg: number | null, pe: number | null): string {
  const map: Record<string, Record<string, string>> = {
    bull: {
      Technology:             "AI・クラウド拡大でシェア獲得・高成長継続",
      "Consumer Cyclical":    "消費回復サイクルと新製品ラインで強拡大",
      Healthcare:             "新薬上市・高齢化需要で安定高成長実現",
      "Financial Services":   "金利環境改善と事業多角化で収益拡大",
      "Communication Services":"デジタル広告・サブスクが複数年加速",
      Industrials:            "インフラ投資増大と効率化で利益倍増",
      Energy:                 "資源価格高騰と脱炭素需要で収益急拡大",
      _default:               rg ? `売上成長率${pctStr(rg)}が5年持続し株価大幅上昇` : "業績超過と市場拡大で株価大幅上昇",
    },
    base: {
      Technology:             "堅調なIT需要で着実に成長継続",
      "Consumer Cyclical":    "景気連動しながら緩やかに拡大",
      Healthcare:             "規制環境を乗り越え中成長を維持",
      _default:               "現状のトレンドが継続する想定内シナリオ",
    },
    bear: {
      Technology:             "競合激化・規制強化でバリュエーション圧縮",
      "Consumer Cyclical":    "景気後退・消費減速で業績悪化",
      Healthcare:             "特許切れ・薬価引き下げで収益圧迫",
      Energy:                 "再エネ移行加速で化石燃料需要が急減",
      _default:               pe && pe > 40
        ? `PER${pe.toFixed(0)}倍の高バリュエーションが業績悪化で急収縮`
        : "マクロ逆風とバリュエーション調整が重複",
    },
  };
  return (map[id][sector] ?? map[id]["_default"]) as string;
}

// ──────────────── reasoning builders ────────────────
type M = {
  sector: string;
  rg: number | null;   // revenueGrowth
  eg: number | null;   // earningsGrowth
  roe: number | null;
  opm: number | null;  // operatingMargins
  pe: number | null;   // forwardPE
  beta: number | null;
  dte: number | null;  // debtToEquity
  fcf: number | null;  // freeCashflow
  tHigh: number | null;
  tMean: number | null;
  tLow: number | null;
  cur: number;
  isBullSurprise: boolean;
};

function reasons(id: string, m: M): string[] {
  const r: string[] = [];
  if (id === "bull") {
    if (m.rg && m.rg > 0)   r.push(`現在の売上成長率${pctStr(m.rg)}が5年間持続・加速するシナリオ`);
    if (m.roe && m.roe > 0.12) r.push(`ROE ${pctStr(m.roe)}の高資本効率が投資→利益の好循環を生む`);
    if (m.opm && m.opm > 0.10) r.push(`営業利益率${pctStr(m.opm)}にスケールメリットが加わり収益性向上`);
    if (m.tHigh)               r.push(`アナリスト高値目標${m.tHigh.toFixed(1)}を超え長期株価上昇が継続`);
    if (m.fcf && m.fcf > 0)    r.push("潤沢なFCFで自社株買い・配当増・M&Aが加速しEPS向上");
    r.push("AI・デジタル化の追い風を受け新規市場の開拓と収益化を実現");
    r.push("主要競合との差別化が深まりプレミアムバリュエーションを維持");
  } else if (id === "base") {
    if (m.rg)   r.push(`売上成長率${pctStr(m.rg)}程度のペースで安定的に拡大が続く`);
    if (m.tMean && m.cur) {
      const up = ((m.tMean - m.cur) / m.cur * 100).toFixed(1);
      r.push(`アナリスト平均目標${m.tMean.toFixed(1)}まで+${up}%、業績に連動して到達`);
    }
    if (m.roe)  r.push(`ROE ${pctStr(m.roe)}水準を維持しつつ着実な株主還元を継続`);
    if (m.pe)   r.push(`PER ${m.pe.toFixed(1)}倍のバリュエーションが業績成長に応じ正当化`);
    r.push("マクロ環境の正常化とともに緩やかな成長トレンドが持続");
    r.push("配当再投資と株価上昇の複利効果が5年間で着実に蓄積");
  } else if (id === "bear") {
    if (m.dte && m.dte > 100) r.push(`D/E比率${m.dte.toFixed(0)}の高負債が金利上昇でコスト増大・利益圧迫`);
    if (m.pe && m.pe > 30)    r.push(`PER ${m.pe.toFixed(1)}倍の高バリュエーションが業績悪化時に急速収縮`);
    if (m.rg && m.rg < 0.05)  r.push("成長鈍化により成長株プレミアムが剥落するリスク顕在化");
    if (m.tLow && m.cur)      r.push(`最悲観シナリオでアナリスト最低目標${m.tLow.toFixed(1)}を下回る可能性`);
    if (m.beta && m.beta > 1.4) r.push(`ベータ${m.beta.toFixed(2)}の高ボラで下落局面の損失が増幅`);
    r.push("競合他社の台頭・技術革新により競争優位性が毀損");
    r.push("規制強化・地政学リスクが業績の長期的重荷となる");
  } else { // surprise
    if (m.isBullSurprise) {
      r.push("業界を根本から変える破壊的技術の開発・独占的取得");
      r.push("競合大手との電撃的M&Aにより市場支配力が急上昇");
      r.push("新興市場での爆発的成長でTAM（市場規模）が数倍に拡大");
      r.push("著名ファンドによる大量取得・インデックス採用で需給が激変");
      r.push("予想を大幅に超える利益成長でマルチプルが急拡大");
    } else {
      r.push("主力事業の急速な陳腐化・代替技術の予想外な台頭");
      r.push("経営陣交代・会計不正の発覚による信用失墜と株価急落");
      r.push("主要市場での規制禁止・強制事業撤退という極端シナリオ");
      r.push("金融危機・信用収縮による流動性リスクの顕在化");
      r.push("複数の悪材料が同時発生するパーフェクトストーム");
    }
  }
  // guarantee 5 items
  const fallback = [
    "グローバル経済環境の変化が業績に反映",
    "為替・商品市況の変動がコスト構造に波及",
    "長期的な人口動態・消費トレンドの変化",
  ];
  while (r.length < 5) r.push(fallback[r.length % fallback.length]);
  return r.slice(0, 5);
}

type AiScenarioText = { headline: string; trigger: string; reasoning: string[] };
type AiEnhance = {
  overall: string;
  bull: AiScenarioText;
  base: AiScenarioText;
  bear: AiScenarioText;
  surprise: AiScenarioText;
};

/**
 * Rewrites the rule-based scenario narratives into company-specific text using
 * Claude, grounded in the real fundamentals + the deterministically computed
 * price targets. Returns null on any failure so the caller keeps rule-based text.
 */
async function enhanceWithClaude(
  name: string,
  symbol: string,
  sector: string,
  currency: string,
  m: M,
  scenarios: { id: string; cagr: number; price5Y: number; changePercent: number }[],
): Promise<AiEnhance | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.includes("xxxx")) return null;

  const fmtPct = (v: number | null) => (v == null ? "N/A" : `${(v * 100).toFixed(1)}%`);
  const sc = Object.fromEntries(scenarios.map((s) => [s.id, s]));
  const context = `
銘柄: ${name} (${symbol})  セクター: ${sector || "不明"}  通貨: ${currency}
現在値: ${m.cur}
売上成長率: ${fmtPct(m.rg)}  利益成長率: ${fmtPct(m.eg)}  ROE: ${fmtPct(m.roe)}  営業利益率: ${fmtPct(m.opm)}
予想PER: ${m.pe ?? "N/A"}  ベータ: ${m.beta ?? "N/A"}  D/E: ${m.dte ?? "N/A"}  FCF: ${m.fcf ?? "N/A"}
アナリスト目標株価: 高値${m.tHigh ?? "N/A"} / 平均${m.tMean ?? "N/A"} / 安値${m.tLow ?? "N/A"}
■ 定量モデルが算出した5年後の価格目標（この数値は固定。これに整合する根拠を述べること）
強気: ${sc.bull?.price5Y}（年率${sc.bull?.cagr}% / ${sc.bull?.changePercent}%）
中立: ${sc.base?.price5Y}（年率${sc.base?.cagr}% / ${sc.base?.changePercent}%）
弱気: ${sc.bear?.price5Y}（年率${sc.bear?.cagr}% / ${sc.bear?.changePercent}%）
サプライズ: ${sc.surprise?.price5Y}（年率${sc.surprise?.cagr}% / ${sc.surprise?.changePercent}%）`.trim();

  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1600,
      messages: [{
        role: "user",
        content: `あなたは証券アナリストです。${name}の5年後シナリオ予想について、提供データに基づき各シナリオの解説を日本語で作成してください。

【ルール】
・提供された財務数値・アナリスト目標を具体的に引用すること（汎用文言禁止）
・価格目標は定量モデルの値で固定。それを正当化する根拠を述べること
・セクター・事業特性に固有の論点を含めること（例: 半導体→需要サイクル）
・各 reasoning は40字以内、5項目ちょうど

${context}

以下のJSON形式のみで回答（マークダウン・説明文不要）:
{
  "overall": "4シナリオを俯瞰した総括を2〜3文で。現在のバリュエーションと最も現実的なシナリオに言及",
  "bull": { "headline": "強気シナリオの要約(25字以内)", "trigger": "実現条件(40字以内)", "reasoning": ["根拠1","根拠2","根拠3","根拠4","根拠5"] },
  "base": { "headline": "中立シナリオの要約(25字以内)", "trigger": "実現条件(40字以内)", "reasoning": ["根拠1","根拠2","根拠3","根拠4","根拠5"] },
  "bear": { "headline": "弱気シナリオの要約(25字以内)", "trigger": "実現条件(40字以内)", "reasoning": ["根拠1","根拠2","根拠3","根拠4","根拠5"] },
  "surprise": { "headline": "サプライズシナリオの要約(25字以内)", "trigger": "実現条件(40字以内)", "reasoning": ["根拠1","根拠2","根拠3","根拠4","根拠5"] }
}`,
      }],
    });
    const rawTxt = (msg.content[0] as { type: string; text?: string })?.text ?? "";
    recordUsage("ai-predict", "claude-sonnet-4-5", msg.usage);
    const match = rawTxt.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]) as AiEnhance;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim();
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  let quoteData: Record<string, unknown> = {};
  let fundData:  Record<string, unknown> = {};
  let statData:  Record<string, unknown> = {};

  try {
    const q = await yahooFinance.quote(symbol);
    quoteData = q as unknown as Record<string, unknown>;
  } catch { /* ignore */ }

  try {
    const s = await yahooFinance.quoteSummary(symbol, {
      modules: ["financialData", "defaultKeyStatistics"],
    });
    fundData = (s.financialData        ?? {}) as Record<string, unknown>;
    statData = (s.defaultKeyStatistics ?? {}) as Record<string, unknown>;
  } catch { /* ignore */ }

  const name     = getJpName(symbol) ?? (quoteData.longName as string) ?? symbol;
  const cur      = raw(quoteData.regularMarketPrice) ?? raw(fundData.currentPrice) ?? 100;
  const currency = (quoteData.currency as string) ?? "USD";
  const sector   = (quoteData.sector as string) ?? "";

  const tHigh = raw(fundData.targetHighPrice);
  const tMean = raw(fundData.targetMeanPrice);
  const tLow  = raw(fundData.targetLowPrice);
  const rg    = raw(fundData.revenueGrowth);
  const eg    = raw(fundData.earningsGrowth);
  const roe   = raw(fundData.returnOnEquity);
  const opm   = raw(fundData.operatingMargins);
  const dte   = raw(fundData.debtToEquity);
  const fcf   = raw(fundData.freeCashflow);
  const pe    = raw(statData.forwardPE);
  const beta  = raw(statData.beta) ?? 1.0;

  const base = SECTOR_CAGR[sector] ?? { bull: 0.16, base: 0.09, bear: -0.05 };

  // Fine-tune CAGRs
  let bullC = base.bull;
  let baseC = base.base;
  let bearC = base.bear;

  if (rg != null) {
    if (rg > 0.25) { bullC += 0.06; baseC += 0.03; }
    else if (rg > 0.10) { bullC += 0.03; baseC += 0.01; }
    else if (rg < 0) { bullC -= 0.03; bearC -= 0.03; }
  }
  if (roe  != null && roe  > 0.25) { bullC += 0.03; baseC += 0.02; }
  if (opm  != null && opm  > 0.25) { bullC += 0.02; baseC += 0.01; }
  if (dte  != null && dte  > 200)  { bearC -= 0.03; baseC -= 0.01; }
  if (pe   != null && pe   > 50)   { bearC -= 0.02; }
  if (pe   != null && pe   < 15)   { bullC += 0.02; baseC += 0.01; }

  // Calibrate with analyst targets when available
  if (tMean && cur > 0) {
    const aBase = Math.pow(tMean / cur, 0.2) - 1;
    baseC = (baseC + aBase) / 2;
  }
  if (tHigh && cur > 0) {
    const aBull = Math.pow(tHigh / cur, 0.2) - 1 + 0.05;
    bullC = (bullC + aBull) / 2;
  }
  if (tLow && cur > 0) {
    const aBear = Math.pow(tLow / cur, 0.2) - 1 - 0.02;
    bearC = (bearC + aBear) / 2;
  }

  const isBullSurprise = (rg ?? 0) > 0.15 || (roe ?? 0) > 0.20 || (opm ?? 0) > 0.20;
  const surpC = isBullSurprise
    ? (beta > 1.4 ? 0.50 : 0.38)
    : (beta > 1.4 ? -0.28 : -0.20);

  const m: M = { sector, rg, eg, roe, opm, pe, beta, dte, fcf, tHigh, tMean, tLow, cur, isBullSurprise };

  const scenarios = [
    {
      id: "bull",
      label: "強気予想",
      icon: "🚀",
      color: "emerald",
      price5Y: price5Y(cur, bullC),
      cagr:    +(bullC * 100).toFixed(1),
      changePercent: changePct(cur, price5Y(cur, bullC)),
      headline: headline("bull", sector, rg, pe),
      trigger:  "新市場開拓・AI活用・業績超過が実現した場合",
      reasoning: reasons("bull", m),
    },
    {
      id: "base",
      label: "中立予想",
      icon: "📊",
      color: "blue",
      price5Y: price5Y(cur, baseC),
      cagr:    +(baseC * 100).toFixed(1),
      changePercent: changePct(cur, price5Y(cur, baseC)),
      headline: headline("base", sector, rg, pe),
      trigger:  "現状トレンドが継続し想定内の成長が続く場合",
      reasoning: reasons("base", m),
    },
    {
      id: "bear",
      label: "弱気予想",
      icon: "📉",
      color: "rose",
      price5Y: price5Y(cur, bearC),
      cagr:    +(bearC * 100).toFixed(1),
      changePercent: changePct(cur, price5Y(cur, bearC)),
      headline: headline("bear", sector, rg, pe),
      trigger:  "景気後退・競合激化・規制強化が同時発生した場合",
      reasoning: reasons("bear", m),
    },
    {
      id: "surprise",
      label: "サプライズ予想",
      icon: "⚡",
      color: "violet",
      price5Y: price5Y(cur, surpC),
      cagr:    +(surpC * 100).toFixed(1),
      changePercent: changePct(cur, price5Y(cur, surpC)),
      headline: isBullSurprise
        ? "テクノロジー革命・業界独占で10倍株化シナリオ"
        : "想定外の複合リスクによる急落・大幅毀損シナリオ",
      trigger: isBullSurprise
        ? "破壊的技術の独占・大型M&A・市場爆発的拡大の実現"
        : "経営危機・業界崩壊・複合ブラックスワンの発生",
      reasoning: reasons("surprise", m),
    },
  ];

  // Enhance the narrative with Claude (price math stays deterministic).
  const ai = await enhanceWithClaude(name, symbol, sector, currency, m, scenarios);
  if (ai) {
    for (const s of scenarios) {
      const t = ai[s.id as "bull" | "base" | "bear" | "surprise"];
      if (t) {
        if (t.headline) s.headline = t.headline;
        if (t.trigger)  s.trigger  = t.trigger;
        if (Array.isArray(t.reasoning) && t.reasoning.length > 0) s.reasoning = t.reasoning.slice(0, 5);
      }
    }
  }

  return NextResponse.json({
    symbol,
    name,
    currentPrice: cur,
    currency,
    scenarios,
    aiGenerated: !!ai,
    aiOverall: ai?.overall ?? null,
    updatedAt: new Date().toISOString(),
  });
}
