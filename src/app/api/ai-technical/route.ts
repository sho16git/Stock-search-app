import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { recordUsage } from "@/lib/ai-usage";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    symbol: string;
    name?: string;
    price: number;
    changePct: number;
    range: string;
    rsi?: number | null;
    macd?: number | null;
    macdSignal?: number | null;
    ma5?: number | null;
    ma25?: number | null;
    ma75?: number | null;
    ma200?: number | null;
    week52Hi?: number | null;
    week52Lo?: number | null;
    activeMA?: number[];
  };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.includes("xxxx")) {
    return NextResponse.json({ error: "no_api_key" }, { status: 503 });
  }

  const { symbol, name, price, changePct, range, rsi, macd, macdSignal,
          ma5, ma25, ma75, ma200, week52Hi, week52Lo } = body;

  // 52週位置
  const week52Pct = week52Hi && week52Lo && week52Hi !== week52Lo
    ? Math.round(((price - week52Lo) / (week52Hi - week52Lo)) * 100)
    : null;

  // MA判定テキスト生成
  const maLines: string[] = [];
  if (ma5   != null) maLines.push(`MA5=${ma5.toFixed(1)}（価格比${price>ma5?"上":"下"}）`);
  if (ma25  != null) maLines.push(`MA25=${ma25.toFixed(1)}（価格比${price>ma25?"上":"下"}）`);
  if (ma75  != null) maLines.push(`MA75=${ma75.toFixed(1)}（価格比${price>ma75?"上":"下"}）`);
  if (ma200 != null) maLines.push(`MA200=${ma200.toFixed(1)}（価格比${price>ma200?"上":"下"}）`);

  // ゴールデン/デスクロス検知
  let crossSignal = "";
  if (ma5 != null && ma25 != null) {
    crossSignal = ma5 > ma25 ? "MA5>MA25（短期ゴールデンクロス気味）" : "MA5<MA25（短期デスクロス気味）";
  }

  const context = `
銘柄: ${name ?? symbol} (${symbol})
現在値: ${price} (本日${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%)
表示期間: ${range}

■ テクニカル指標
RSI(14): ${rsi != null ? rsi.toFixed(1) : "N/A"}
MACD: ${macd != null ? macd.toFixed(3) : "N/A"} / シグナル: ${macdSignal != null ? macdSignal.toFixed(3) : "N/A"}
${maLines.length > 0 ? "移動平均: " + maLines.join("、") : "移動平均: N/A"}
${crossSignal ? "クロスシグナル: " + crossSignal : ""}
52週レンジ: 高値${week52Hi ?? "N/A"} 安値${week52Lo ?? "N/A"} 現在位置${week52Pct != null ? week52Pct + "%" : "N/A"}
`.trim();

  let raw = "";
  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 450,
      messages: [
        {
          role: "user",
          content: `個人投資家向けに、以下のテクニカル指標データを基に投資判断に役立つ解説を日本語で作成してください。

${context}

JSONのみで回答:
{
  "headline": "現在のチャート状況を15字以内で表現（例: RSI過熱・上値重い、ゴールデンクロス接近）",
  "trend": "上昇|下降|横ばい|転換点",
  "comment": "RSI・MACD・移動平均・52週位置を踏まえた具体的な解説（150字以内）",
  "signal": "強い買い|買い|中立|売り|強い売り",
  "watchPoint": "今後注目すべき価格水準やシグナルを30字以内で"
}`,
        },
      ],
    });
    raw = (msg.content[0] as { type: string; text?: string })?.text ?? "";
    recordUsage("ai-technical", "claude-haiku-4-5-20251001", msg.usage);
  } catch (e) {
    const status = (e as { status?: number })?.status;
    if (status === 401 || status === 403) {
      return NextResponse.json({ error: "no_api_key" }, { status: 503 });
    }
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
