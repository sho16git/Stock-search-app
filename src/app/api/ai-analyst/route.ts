/**
 * /api/ai-analyst — アナリスト評価をClaudeが解説
 * 目標株価・レーティング分布・現在値の乖離を日本語で解説する。
 */
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { recordUsage } from "@/lib/ai-usage";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const b = (await req.json()) as {
    symbol?: string;
    name?: string;
    currency?: string;
    currentPrice?: number | null;
    targetHigh?: number | null;
    targetLow?: number | null;
    targetMean?: number | null;
    recommendationKey?: string | null;
    recommendationMean?: number | null;
    numberOfAnalystOpinions?: number | null;
    trend?: { strongBuy: number; buy: number; hold: number; sell: number; strongSell: number } | null;
  };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.includes("xxxx")) {
    return NextResponse.json({ error: "no_api_key" }, { status: 503 });
  }

  const cur = b.currentPrice ?? null;
  const gap = cur && b.targetMean ? (((b.targetMean - cur) / cur) * 100).toFixed(1) : null;
  const t = b.trend;
  const ratingLine = t
    ? `強い買い${t.strongBuy} / 買い${t.buy} / 中立${t.hold} / 売り${t.sell} / 強い売り${t.strongSell}`
    : "N/A";

  const context = `
銘柄: ${b.name ?? b.symbol ?? ""} (${b.symbol ?? ""})  通貨: ${b.currency ?? ""}
現在値: ${cur ?? "N/A"}
目標株価: 高値${b.targetHigh ?? "N/A"} / 平均${b.targetMean ?? "N/A"} / 安値${b.targetLow ?? "N/A"}
平均目標までの乖離: ${gap != null ? gap + "%" : "N/A"}
コンセンサス: ${b.recommendationKey ?? "N/A"} (平均レーティング${b.recommendationMean ?? "N/A"}、5に近いほど売り)
アナリスト数: ${b.numberOfAnalystOpinions ?? "N/A"}
レーティング分布: ${ratingLine}`.trim();

  let raw = "";
  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      messages: [{
        role: "user",
        content: `個人投資家向けに、以下のアナリスト評価データを日本語で解説してください。数値を引用し、汎用論は避けてください。

${context}

JSONのみで回答:
{
  "headline": "コンセンサスの要約を20字以内（例: 強気優勢・上値余地15%）",
  "comment": "目標株価の乖離・レーティング分布・コンセンサスの傾向を踏まえた解説を130字以内",
  "bullets": ["注目点1(35字以内)", "注目点2(35字以内)"],
  "tag": "強気|やや強気|中立|やや弱気|弱気"
}`,
      }],
    });
    raw = (msg.content[0] as { type: string; text?: string })?.text ?? "";
    recordUsage("ai-analyst", "claude-haiku-4-5-20251001", msg.usage);
  } catch (e) {
    const s = (e as { status?: number })?.status;
    if (s === 401 || s === 403) return NextResponse.json({ error: "no_api_key" }, { status: 503 });
    return NextResponse.json({ error: "ai_error" }, { status: 502 });
  }

  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return NextResponse.json({ error: "parse_error" }, { status: 500 });
  try {
    return NextResponse.json(JSON.parse(match[0]));
  } catch {
    return NextResponse.json({ error: "json_error" }, { status: 500 });
  }
}
