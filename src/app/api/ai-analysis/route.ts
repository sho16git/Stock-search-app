import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import yahooFinance from "@/lib/yfinance";
import { getJpName } from "@/lib/jp-stocks";

export const runtime  = "nodejs";
export const revalidate = 3600;

function pct(v: number | null | undefined) {
  if (v == null) return "N/A";
  return `${(v * 100).toFixed(1)}%`;
}
function num(v: number | null | undefined, digits = 2) {
  if (v == null) return "N/A";
  return v.toFixed(digits);
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim();
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  // ── データ収集 ──────────────────────────────────────────────────
  let quoteData:   Record<string, unknown> = {};
  let fundData:    Record<string, unknown> = {};
  let statData:    Record<string, unknown> = {};
  let analystData: Record<string, unknown> = {};

  try {
    const q = await yahooFinance.quote(symbol);
    quoteData = q as unknown as Record<string, unknown>;
  } catch { /* ignore */ }

  try {
    const s = await yahooFinance.quoteSummary(symbol, {
      modules: ["financialData", "defaultKeyStatistics", "recommendationTrend"],
    });
    fundData = (s.financialData        ?? {}) as Record<string, unknown>;
    statData = (s.defaultKeyStatistics ?? {}) as Record<string, unknown>;

    const trend = s.recommendationTrend as { trend?: unknown[] } | undefined;
    const t0    = trend?.trend?.[0] as Record<string, unknown> | undefined;
    const buy   = ((t0?.strongBuy as number) ?? 0) + ((t0?.buy as number) ?? 0);
    const hold  = (t0?.hold as number) ?? 0;
    const sell  = ((t0?.sell as number) ?? 0) + ((t0?.strongSell as number) ?? 0);
    const tot   = buy + hold + sell;

    analystData = {
      buyPct:  tot ? Math.round((buy  / tot) * 100) : null,
      holdPct: tot ? Math.round((hold / tot) * 100) : null,
      sellPct: tot ? Math.round((sell / tot) * 100) : null,
      total: tot,
      targetMean:   (fundData.targetMeanPrice  as { raw?: number } | undefined)?.raw  ?? null,
      targetHigh:   (fundData.targetHighPrice  as { raw?: number } | undefined)?.raw  ?? null,
      targetLow:    (fundData.targetLowPrice   as { raw?: number } | undefined)?.raw  ?? null,
      currentPrice: (fundData.currentPrice     as { raw?: number } | undefined)?.raw  ?? null,
      recKey:       fundData.recommendationKey ?? null,
    };
  } catch { /* ignore */ }

  // ── 財務指標 ──────────────────────────────────────────────────
  const raw = (o: unknown): number | null => {
    if (o == null) return null;
    if (typeof o === "number") return o;
    if (typeof o === "object" && "raw" in (o as object)) return (o as { raw?: number }).raw ?? null;
    return null;
  };

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

  const name      = getJpName(symbol) ?? (quoteData.longName as string) ?? symbol;
  const price     = quoteData.regularMarketPrice  as number | undefined;
  const changePct = quoteData.regularMarketChangePercent as number | undefined;
  const sector    = quoteData.sector as string | undefined;
  const industry  = quoteData.industry as string | undefined;
  const currency  = quoteData.currency as string | undefined;
  const week52Hi  = quoteData.fiftyTwoWeekHigh as number | undefined;
  const week52Lo  = quoteData.fiftyTwoWeekLow  as number | undefined;
  const mktCap    = quoteData.marketCap as number | undefined;

  const posFromHi = price && week52Hi ? ((price - week52Hi) / week52Hi) * 100 : null;
  const posFromLo = price && week52Lo ? ((price - week52Lo) / week52Lo) * 100 : null;
  const upside    = (analystData.targetMean as number | null) && (analystData.currentPrice as number | null)
    ? (((analystData.targetMean as number) - (analystData.currentPrice as number)) / (analystData.currentPrice as number)) * 100
    : null;

  const mktCapStr = mktCap
    ? mktCap >= 1e12 ? `${(mktCap / 1e12).toFixed(2)}T`
    : mktCap >= 1e9  ? `${(mktCap / 1e9).toFixed(1)}B`
    : mktCap >= 1e6  ? `${(mktCap / 1e6).toFixed(0)}M`
    : String(mktCap) : "N/A";

  const fcfStr = freeCashflow
    ? freeCashflow >= 1e9  ? `${(freeCashflow / 1e9).toFixed(1)}B`
    : freeCashflow >= 1e6  ? `${(freeCashflow / 1e6).toFixed(0)}M`
    : String(freeCashflow) : "N/A";

  const context = `
■ 銘柄基本情報
銘柄: ${symbol} (${name})
現在値: ${price ?? "N/A"} ${currency ?? ""}  時価総額: ${mktCapStr}
セクター: ${sector ?? "N/A"} / 業種: ${industry ?? "N/A"}
本日騰落率: ${changePct?.toFixed(2) ?? "N/A"}%
52週高値比: ${num(posFromHi)}%  52週安値比: +${num(posFromLo)}%

■ バリュエーション
PER(予想): ${num(forwardPE)}倍  PER(実績): ${num(trailingPE)}倍
PBR: ${num(pbRatio)}倍  EV/EBITDA: ${num(evToEbitda)}倍

■ 収益性・成長性
ROE: ${pct(roe)}  ROA: ${pct(roa)}
営業利益率: ${pct(opMargin)}  純利益率: ${pct(profitMargin)}
売上成長率(YoY): ${pct(revenueGrowth)}  利益成長率(YoY): ${pct(earningsGrowth)}
フリーキャッシュフロー: ${fcfStr}

■ 財務健全性
D/E比率: ${num(debtToEquity)}  流動比率: ${num(currentRatio)}
ベータ: ${num(beta)}  空売り比率: ${num(shortRatio)}

■ アナリスト評価
${analystData.total ?? 0}名: 買い${analystData.buyPct ?? "?"}% / 中立${analystData.holdPct ?? "?"}% / 売り${analystData.sellPct ?? "?"}%
推奨キー: ${analystData.recKey ?? "N/A"}
目標株価: 平均${analystData.targetMean ?? "N/A"} / 高値${analystData.targetHigh ?? "N/A"} / 安値${analystData.targetLow ?? "N/A"}
現在値比アップサイド: ${num(upside)}%
`.trim();

  // ── Claude API ────────────────────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (apiKey) {
    try {
      const client = new Anthropic({ apiKey });
      const msg = await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 1200,
        messages: [{
          role: "user",
          content: `あなたは証券アナリストです。以下の財務データを基に、日本語で詳細な投資分析レポートを作成してください。

${context}

以下のJSON形式のみで回答してください（マークダウン・説明文は不要、純粋なJSONのみ）:
{
  "summary": "3〜4文の総括。財務の強み・現在のバリュエーション・成長性を具体的な数字で説明",
  "bullPoints": ["ポジティブ要因を5つ。必ず具体的な数値(ROE/PER/成長率等)を含めること（各40字以内）"],
  "bearPoints": ["リスク要因を5つ。具体的な懸念点（各40字以内）"],
  "riskLevel": "low|medium|high",
  "recommendation": "強い買い|買い|中立|売り|強い売り",
  "oneliner": "投資判断を表す12字以内のキャッチフレーズ",
  "valuationComment": "バリュエーション(PER/PBR/EV/EBITDA)に関する1〜2文の評価",
  "technicalComment": "52週高安値位置・モメンタムに関する1文の評価"
}`,
        }],
      });

      const text = (msg.content[0] as { type: string; text?: string })?.text ?? "";
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return NextResponse.json({ ...parsed, source: "claude", symbol, name });
      }
    } catch (err) {
      console.error("Claude AI error:", err);
    }
  }

  // ── ルールベース フォールバック ─────────────────────────────────
  const buyPct   = (analystData.buyPct  as number) ?? 0;
  const sellPct  = (analystData.sellPct as number) ?? 0;
  const holdPct  = (analystData.holdPct as number) ?? 0;

  const bullPoints: string[] = [];
  const bearPoints: string[] = [];

  // ポジティブ
  if (buyPct >= 60)                          bullPoints.push(`アナリスト${buyPct}%が買い推奨（${analystData.total}名評価）`);
  if (upside && upside > 5)                  bullPoints.push(`目標株価まで+${upside.toFixed(1)}%の上昇余地あり`);
  if (roe != null && roe > 0.15)             bullPoints.push(`ROE ${pct(roe)} と高い資本効率`);
  if (opMargin != null && opMargin > 0.20)   bullPoints.push(`営業利益率 ${pct(opMargin)} の高収益体質`);
  if (revenueGrowth != null && revenueGrowth > 0.10) bullPoints.push(`売上高 前年比+${pct(revenueGrowth)} の成長株`);
  if (earningsGrowth != null && earningsGrowth > 0.15) bullPoints.push(`利益成長率 ${pct(earningsGrowth)} の高成長`);
  if (forwardPE != null && forwardPE < 15)   bullPoints.push(`PER ${num(forwardPE)}倍 と割安水準`);
  if (posFromLo != null && posFromLo < 20)   bullPoints.push("52週安値圏からの反発局面");
  if (currentRatio != null && currentRatio > 2) bullPoints.push(`流動比率 ${num(currentRatio)}倍 で財務健全`);
  if (debtToEquity != null && debtToEquity < 50) bullPoints.push("低負債で財務リスクが低い");
  if (freeCashflow != null && freeCashflow > 0)  bullPoints.push(`FCF ${fcfStr} の黒字キャッシュフロー`);
  if (changePct && changePct > 2)            bullPoints.push("本日 強い上昇モメンタム");

  // ネガティブ
  if (sellPct >= 25)                         bearPoints.push(`アナリスト${sellPct}%が売り推奨`);
  if (posFromHi != null && posFromHi < -20)  bearPoints.push(`52週高値から${Math.abs(posFromHi).toFixed(0)}%下落中`);
  if (forwardPE != null && forwardPE > 40)   bearPoints.push(`PER ${num(forwardPE)}倍 は割高の懸念`);
  if (upside != null && upside < 0)          bearPoints.push(`目標株価を${Math.abs(upside).toFixed(1)}%すでに上回る`);
  if (debtToEquity != null && debtToEquity > 200) bearPoints.push(`D/E比率 ${num(debtToEquity)} と高負債`);
  if (beta != null && beta > 1.5)            bearPoints.push(`ベータ ${num(beta)} と市場より変動大`);
  if (revenueGrowth != null && revenueGrowth < 0) bearPoints.push(`売上前年比 ${pct(revenueGrowth)} と減収`);
  if (opMargin != null && opMargin < 0.05)   bearPoints.push("営業利益率が低く収益性に懸念");
  if (changePct && changePct < -2)           bearPoints.push("本日 強い下落圧力");
  if (shortRatio != null && shortRatio > 5)  bearPoints.push(`空売り比率 ${num(shortRatio)} と弱気ポジション多い`);

  // 最低3つ保証
  const fallbackBull = ["グローバルブランドによる競争優位性", "安定したキャッシュフロー創出力", "配当再投資による長期リターン期待", "セクターリーダーとしての市場地位", "イノベーション投資による将来性"];
  const fallbackBear = ["マクロ経済・金利上昇リスク", "為替変動による業績影響", "競合他社との競争激化", "規制・地政学リスク", "消費者需要の減速懸念"];
  while (bullPoints.length < 5) bullPoints.push(fallbackBull[bullPoints.length] ?? "成長ポテンシャルあり");
  while (bearPoints.length < 5) bearPoints.push(fallbackBear[bearPoints.length] ?? "市場リスクに注意");

  // 推奨判定
  let recommendation = "中立";
  let riskLevel: "low" | "medium" | "high" = "medium";
  if (buyPct >= 65 && (upside ?? 0) > 5)   { recommendation = "買い";     riskLevel = "low";    }
  if (buyPct >= 75 && (upside ?? 0) > 10)  { recommendation = "強い買い"; riskLevel = "low";    }
  if (sellPct >= 35)                        { recommendation = "売り";     riskLevel = "high";   }
  if (sellPct >= 50)                        { recommendation = "強い売り"; riskLevel = "high";   }
  if (beta != null && beta > 1.5)           riskLevel = "high";
  if (beta != null && beta < 0.8 && riskLevel !== "high") riskLevel = "low";

  const onelinerMap: Record<string, string> = {
    "強い買い": "今すぐ注目の一手",
    "買い":     "上昇トレンドに期待",
    "中立":     "慎重に見極めを",
    "売り":     "リスク管理が重要",
    "強い売り": "売却を検討すべき",
  };

  const peComment = forwardPE
    ? forwardPE < 15 ? `PER ${num(forwardPE)}倍は同業と比べ割安。`
    : forwardPE > 35 ? `PER ${num(forwardPE)}倍は成長期待を織り込んだ水準。`
    : `PER ${num(forwardPE)}倍は適正水準。` : "";

  const techComment = posFromHi != null
    ? `52週高値から${Math.abs(posFromHi).toFixed(1)}%の位置で推移${posFromHi > -10 ? "（高値圏）" : posFromHi < -30 ? "（下落局面）" : "（中間圏）"}。`
    : "チャート位置情報なし。";

  return NextResponse.json({
    summary: `${name}（${sector ?? ""}）は、アナリスト${analystData.total ?? 0}名中${buyPct}%が買い推奨。${upside != null ? `目標株価まで${upside > 0 ? "+" : ""}${upside.toFixed(1)}%の余地${upside > 0 ? "あり" : "（上回り）"}。` : ""}${roe != null ? `ROE ${pct(roe)}` : ""}${opMargin != null ? `・営業利益率${pct(opMargin)}` : ""}${roe != null || opMargin != null ? "の収益構造。" : ""}${revenueGrowth != null ? `売上成長率${pct(revenueGrowth)}で推移。` : ""}`,
    bullPoints: bullPoints.slice(0, 5),
    bearPoints: bearPoints.slice(0, 5),
    riskLevel,
    recommendation,
    oneliner: onelinerMap[recommendation] ?? "様子見",
    valuationComment: `${peComment}${pbRatio ? `PBR ${num(pbRatio)}倍。` : ""}${evToEbitda ? `EV/EBITDA ${num(evToEbitda)}倍。` : ""}`.trim() || "バリュエーションデータなし。",
    technicalComment: techComment,
    source: "rule-based",
    symbol,
    name,
  });
}
