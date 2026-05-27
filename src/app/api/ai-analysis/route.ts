import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import yahooFinance from "@/lib/yfinance";
import { getJpName } from "@/lib/jp-stocks";

export const runtime = "nodejs";
export const revalidate = 3600;

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim();
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  // ── Gather data ──────────────────────────────────────────────
  let quoteData: Record<string, unknown> = {};
  let fundData:  Record<string, unknown> = {};
  let analystData: Record<string, unknown> = {};

  try {
    const q = await yahooFinance.quote(symbol);
    quoteData = q as unknown as Record<string, unknown>;
  } catch { /* ignore */ }

  try {
    const s = await yahooFinance.quoteSummary(symbol, {
      modules: ["financialData", "defaultKeyStatistics", "recommendationTrend"],
    });
    fundData   = (s.financialData         ?? {}) as Record<string, unknown>;
    const stat = (s.defaultKeyStatistics  ?? {}) as Record<string, unknown>;
    const trend = s.recommendationTrend as { trend?: unknown[] } | undefined;
    const t0   = trend?.trend?.[0] as Record<string, unknown> | undefined;

    const buy  = ((t0?.strongBuy as number) ?? 0) + ((t0?.buy as number) ?? 0);
    const hold = (t0?.hold as number) ?? 0;
    const sell = ((t0?.sell as number) ?? 0) + ((t0?.strongSell as number) ?? 0);
    const tot  = buy + hold + sell;

    analystData = {
      buyPct:  tot ? Math.round((buy  / tot) * 100) : null,
      holdPct: tot ? Math.round((hold / tot) * 100) : null,
      sellPct: tot ? Math.round((sell / tot) * 100) : null,
      total: tot,
      targetMean: (fundData.targetMeanPrice as { raw?: number } | undefined)?.raw ?? null,
      currentPrice: (fundData.currentPrice  as { raw?: number } | undefined)?.raw ?? null,
      recKey: fundData.recommendationKey ?? null,
      peRatio:  (stat.forwardPE  as { raw?: number } | undefined)?.raw ?? null,
      pbRatio:  (stat.priceToBook as { raw?: number } | undefined)?.raw ?? null,
    };
  } catch { /* ignore */ }

  const name      = getJpName(symbol) ?? (quoteData.longName as string) ?? symbol;
  const price     = quoteData.regularMarketPrice as number | undefined;
  const changePct = quoteData.regularMarketChangePercent as number | undefined;
  const sector    = quoteData.sector as string | undefined;
  const week52Hi  = quoteData.fiftyTwoWeekHigh  as number | undefined;
  const week52Lo  = quoteData.fiftyTwoWeekLow   as number | undefined;

  const posFromHi = price && week52Hi ? ((price - week52Hi) / week52Hi) * 100 : null;
  const posFromLo = price && week52Lo ? ((price - week52Lo) / week52Lo) * 100 : null;

  const context = `
銘柄: ${symbol} (${name})
現在値: ${price ?? "N/A"} ${quoteData.currency ?? ""}
本日騰落率: ${changePct?.toFixed(2) ?? "N/A"}%
セクター: ${sector ?? "N/A"}
52週高値比: ${posFromHi?.toFixed(1) ?? "N/A"}%
52週安値比: +${posFromLo?.toFixed(1) ?? "N/A"}%
アナリスト: 買い${analystData.buyPct ?? "?"}% / 中立${analystData.holdPct ?? "?"}% / 売り${analystData.sellPct ?? "?"}%
目標株価: ${analystData.targetMean ?? "N/A"} (現在値比 ${
    analystData.targetMean && analystData.currentPrice
      ? (((analystData.targetMean as number) - (analystData.currentPrice as number)) / (analystData.currentPrice as number) * 100).toFixed(1)
      : "N/A"}%)
PER(予想): ${analystData.peRatio ?? "N/A"}倍
PBR: ${analystData.pbRatio ?? "N/A"}倍
アナリスト推奨: ${analystData.recKey ?? "N/A"}
`.trim();

  // ── Try Claude API ────────────────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (apiKey) {
    try {
      const client = new Anthropic({ apiKey });
      const msg = await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 800,
        messages: [
          {
            role: "user",
            content: `以下の株式データを分析し、日本語で投資家向けの簡潔な分析レポートを作成してください。

${context}

以下のJSON形式で回答してください（マークダウン不要、純粋なJSONのみ）:
{
  "summary": "2〜3文の総括（現状・特徴を端的に）",
  "bullPoints": ["強み・ポジティブ要因を3つ（各30字以内）"],
  "bearPoints": ["リスク・ネガティブ要因を3つ（各30字以内）"],
  "riskLevel": "low|medium|high",
  "recommendation": "強い買い|買い|中立|売り|強い売り",
  "oneliner": "10字以内のキャッチフレーズ"
}`,
          },
        ],
      });

      const raw = (msg.content[0] as { type: string; text?: string })?.text ?? "";
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return NextResponse.json({ ...parsed, source: "claude", symbol, name });
      }
    } catch (err) {
      console.error("Claude AI error:", err);
    }
  }

  // ── Fallback: rule-based analysis ────────────────────────────
  const buyPct  = (analystData.buyPct  as number) ?? 0;
  const sellPct = (analystData.sellPct as number) ?? 0;
  const peRatio = analystData.peRatio as number | null;
  const pbRatio = analystData.pbRatio as number | null;
  const upside  =
    analystData.targetMean && analystData.currentPrice
      ? (((analystData.targetMean as number) - (analystData.currentPrice as number)) /
          (analystData.currentPrice as number)) * 100
      : null;

  const bullPoints: string[] = [];
  const bearPoints: string[] = [];

  if (buyPct >= 60) bullPoints.push(`アナリストの${buyPct}%が買い推奨`);
  if (upside && upside > 5)  bullPoints.push(`目標株価まで+${upside.toFixed(1)}%の上昇余地`);
  if (posFromLo && posFromLo < 20) bullPoints.push("52週安値圏からの反発期待");
  if (peRatio && peRatio < 15)     bullPoints.push(`PER ${peRatio.toFixed(1)}倍は割安水準`);
  if (changePct && changePct > 2)  bullPoints.push("本日強い上昇モメンタム");

  if (sellPct >= 30)               bearPoints.push(`アナリストの${sellPct}%が売り推奨`);
  if (posFromHi && posFromHi < -20) bearPoints.push(`52週高値から${Math.abs(posFromHi).toFixed(0)}%下落中`);
  if (peRatio && peRatio > 40)      bearPoints.push(`PER ${peRatio.toFixed(1)}倍は割高の可能性`);
  if (upside && upside < 0)         bearPoints.push(`目標株価を${Math.abs(upside).toFixed(1)}%上回っている`);
  if (changePct && changePct < -2)  bearPoints.push("本日強い下落圧力");

  while (bullPoints.length < 3) bullPoints.push(["成長セクターに属する", "安定したキャッシュフロー", "グローバルなブランド力"][bullPoints.length]);
  while (bearPoints.length < 3) bearPoints.push(["マクロ経済の不確実性", "為替リスク", "競争激化の懸念"][bearPoints.length]);

  let recommendation = "中立";
  let riskLevel = "medium";
  if (buyPct >= 65 && (upside ?? 0) > 5) { recommendation = "買い"; riskLevel = "low"; }
  if (buyPct >= 75) { recommendation = "強い買い"; riskLevel = "low"; }
  if (sellPct >= 40) { recommendation = "売り"; riskLevel = "high"; }

  return NextResponse.json({
    summary: `${name}は${sector ?? ""}セクターの銘柄です。アナリスト${analystData.total ?? 0}名の予想では買い${buyPct}%・中立${analystData.holdPct ?? 0}%・売り${sellPct}%となっています。`,
    bullPoints: bullPoints.slice(0, 3),
    bearPoints: bearPoints.slice(0, 3),
    riskLevel,
    recommendation,
    oneliner: recommendation === "強い買い" ? "今が買い時！" : recommendation === "買い" ? "上昇に期待" : recommendation === "売り" ? "要注意" : "様子見",
    source: "rule-based",
    symbol,
    name,
  });
}
