import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { recordUsage } from "@/lib/ai-usage";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { title, body, symbol, companyName, context } = await req.json() as {
    title: string;
    body?: string;
    symbol?: string;
    companyName?: string;
    context?: string;
  };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  // Missing, blank, or the placeholder value from .env.local → treat as unset
  if (!apiKey || apiKey.includes("xxxx")) {
    return NextResponse.json({ error: "no_api_key" }, { status: 503 });
  }

  const subject = companyName ?? symbol ?? "市場全般";
  const text = [title, body].filter(Boolean).join("\n\n").slice(0, 1800);
  const hint = context ? `\nテーマ: ${context}` : "";

  let raw = "";
  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: `個人投資家向けに、以下のニュースを日本語で分析してください。対象: ${subject}${hint}

---
${text}
---

JSONのみで回答（コードブロック不要）:
{
  "summary": "120字以内で核心を要約（数値・固有名詞を使い具体的に）",
  "impact": "positive|negative|neutral",
  "impactReason": "株価・市場への具体的な影響を35字以内で（例: 売上10%増の好材料）",
  "timeHorizon": "short|medium|long",
  "confidence": 55〜95の整数
}`,
        },
      ],
    });
    raw = (msg.content[0] as { type: string; text?: string })?.text ?? "";
    recordUsage("ai-news-summary", "claude-haiku-4-5-20251001", msg.usage);
  } catch (e) {
    // Invalid/expired key → guide the user to set a valid one
    const status = (e as { status?: number })?.status;
    if (status === 401 || status === 403) {
      return NextResponse.json({ error: "no_api_key" }, { status: 503 });
    }
    return NextResponse.json({ error: "ai_error" }, { status: 502 });
  }

  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) {
    return NextResponse.json({ error: "parse_error" }, { status: 500 });
  }

  try {
    const parsed = JSON.parse(match[0]);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "json_error" }, { status: 500 });
  }
}
