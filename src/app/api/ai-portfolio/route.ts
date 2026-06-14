/**
 * /api/ai-portfolio — 保有ポートフォリオをClaudeが診断
 * クライアントから保有銘柄(比率・損益・利回り)を受け取り、
 * 集中リスク・セクター偏り・リバランス提案を日本語で返す。
 */
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { recordUsage } from "@/lib/ai-usage";

export const runtime = "nodejs";

type HoldingIn = {
  symbol: string;
  name?: string;
  weightPct?: number | null;
  gainPercent?: number | null;
  dividendYieldPct?: number | null;
};

export async function POST(req: NextRequest) {
  const { holdings, totalValueJpy, totalGainPercent } = (await req.json()) as {
    holdings: HoldingIn[];
    totalValueJpy?: number | null;
    totalGainPercent?: number | null;
  };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.includes("xxxx")) {
    return NextResponse.json({ error: "no_api_key" }, { status: 503 });
  }
  if (!Array.isArray(holdings) || holdings.length === 0) {
    return NextResponse.json({ error: "no_holdings" }, { status: 400 });
  }

  const fmtPct = (v: number | null | undefined) =>
    v == null ? "N/A" : `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

  const lines = holdings
    .slice(0, 40)
    .map((h) => {
      const w = h.weightPct != null ? `${h.weightPct.toFixed(1)}%` : "N/A";
      return `${h.name ?? h.symbol} (${h.symbol}): 比率${w} / 損益${fmtPct(h.gainPercent)}${h.dividendYieldPct != null ? ` / 配当利回り${h.dividendYieldPct.toFixed(2)}%` : ""}`;
    })
    .join("\n");

  const context = `
保有銘柄数: ${holdings.length}
評価額合計: ${totalValueJpy != null ? Math.round(totalValueJpy).toLocaleString() + "円" : "N/A"}
全体損益率: ${fmtPct(totalGainPercent)}
■ 保有銘柄(比率順)
${lines}`.trim();

  let raw = "";
  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1200,
      messages: [{
        role: "user",
        content: `あなたは個人投資家向けのポートフォリオアドバイザーです。以下の保有内容を分析し、日本語で診断してください。各ティッカーのセクター・地域はあなたの知識で補完してください（例: AAPL=米テック、7203.T=日本自動車）。

【ルール】
・保有比率の数値を引用し、集中リスクを具体的に指摘
・セクター/地域の偏りを評価
・汎用論ではなく、この保有構成に固有の指摘をする
・提案は実行可能で具体的に

${context}

以下のJSON形式のみで回答（マークダウン・説明文不要）:
{
  "riskLevel": "低|中|高",
  "headline": "ポートフォリオの特徴を25字以内で",
  "diagnosis": "全体評価を150字以内で。集中度・セクター偏り・損益状況を踏まえる",
  "concentration": "集中リスクの評価を40字以内で（最大保有比率に言及）",
  "sectorBalance": "セクター/地域の分散状況を40字以内で",
  "diversityScore": 0から100の整数（分散の良さ。高いほど分散されている）,
  "strengths": ["強み1(30字以内)", "強み2(30字以内)"],
  "warnings": ["注意点1(30字以内)", "注意点2(30字以内)"],
  "suggestions": ["リバランス提案1(40字以内)", "提案2(40字以内)", "提案3(40字以内)"]
}`,
      }],
    });
    raw = (msg.content[0] as { type: string; text?: string })?.text ?? "";
    recordUsage("ai-portfolio", "claude-sonnet-4-5", msg.usage);
  } catch (e) {
    const status = (e as { status?: number })?.status;
    if (status === 401 || status === 403) return NextResponse.json({ error: "no_api_key" }, { status: 503 });
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
