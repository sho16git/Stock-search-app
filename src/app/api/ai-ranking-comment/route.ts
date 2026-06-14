/**
 * /api/ai-ranking-comment — AIランキングの順位をClaudeが解説
 * 上位銘柄の傾向・なぜ上位か・注目銘柄を日本語で解説する。
 */
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { recordUsage } from "@/lib/ai-usage";

export const runtime = "nodejs";

type Entry = {
  rank: number;
  name: string;
  symbol: string;
  market?: string;
  sector?: string;
  theme?: string;
  score?: number;
  expectedReturn?: string;
};

const PERIOD_JA: Record<string, string> = { "1y": "1年", "5y": "5年", "10y": "10年" };

export async function POST(req: NextRequest) {
  const { entries, period, market, marketNote } = (await req.json()) as {
    entries: Entry[];
    period?: string;
    market?: string;
    marketNote?: string;
  };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.includes("xxxx")) {
    return NextResponse.json({ error: "no_api_key" }, { status: 503 });
  }
  if (!Array.isArray(entries) || entries.length === 0) {
    return NextResponse.json({ error: "no_entries" }, { status: 400 });
  }

  const rows = entries.slice(0, 10).map((e) =>
    `${e.rank}位 ${e.name}(${e.symbol}) ${e.market ?? ""} スコア${e.score ?? "N/A"} / ${e.sector ?? ""} / ${e.theme ?? ""} / 想定${e.expectedReturn ?? "N/A"}`
  ).join("\n");

  const marketLabel = market === "JP" ? "日本株" : market === "US" ? "米国株" : "日米全体";
  const context = `
期間: ${PERIOD_JA[period ?? "1y"] ?? period ?? ""}の高騰予想ランキング  対象: ${marketLabel}
${marketNote ? `市況メモ: ${marketNote}` : ""}
■ 上位銘柄
${rows}`.trim();

  let raw = "";
  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      messages: [{
        role: "user",
        content: `個人投資家向けに、以下の定量スコアによる高騰予想ランキング上位銘柄を日本語で解説してください。具体的な銘柄名・セクターを引用してください。

${context}

JSONのみで回答:
{
  "headline": "ランキングの傾向を20字以内（例: 半導体・AI関連が上位独占）",
  "comment": "上位銘柄に共通するセクター・テーマ・特徴を踏まえた解説を140字以内",
  "bullets": ["特に注目の銘柄とその理由(40字以内)", "もう1銘柄の注目理由(40字以内)"],
  "tag": "強気相場|選別相場|慎重"
}`,
      }],
    });
    raw = (msg.content[0] as { type: string; text?: string })?.text ?? "";
    recordUsage("ai-ranking-comment", "claude-haiku-4-5-20251001", msg.usage);
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
