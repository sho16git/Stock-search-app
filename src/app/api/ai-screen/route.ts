/**
 * /api/ai-screen — 自然言語クエリをスクリーナー条件に変換
 * 例「高配当で割安な日本株」→ { market:"JP", yieldMin:3.5, perMax:15 }
 * 変換のみ行い、実際の絞り込みは既存の /api/screener が担当する。
 */
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { recordUsage } from "@/lib/ai-usage";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { query } = (await req.json()) as { query: string };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.includes("xxxx")) {
    return NextResponse.json({ error: "no_api_key" }, { status: 503 });
  }
  if (!query || !query.trim()) {
    return NextResponse.json({ error: "empty_query" }, { status: 400 });
  }

  let raw = "";
  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      messages: [{
        role: "user",
        content: `あなたは株式スクリーナーの条件変換器です。日本語のクエリを以下のフィルター条件(JSON)に変換してください。

【利用可能なフィルター】
- market: "JP"(日本株) | "US"(米国株) | "" (指定なし)
- type: "stock"(個別株) | "etf"(ETF) | "all"
- sector: 次のいずれか1つ → energy(エネルギー) / materials(素材) / industrials(資本財) / consumer-discretionary(一般消費財) / consumer-staples(生活必需品) / health-care(ヘルスケア) / financials(金融) / information-technology(情報技術・半導体・ソフト) / communication-services(通信・メディア) / utilities(公益) / real-estate(不動産・REIT) / "" (指定なし)
- perMin, perMax: PER（倍）
- pbrMin, pbrMax: PBR（倍）
- yieldMin, yieldMax: 配当利回り（％、例: 3.5）
- epsMin: EPS（最低値）
- priceMin, priceMax: 株価
- mcapMin, mcapMax: 時価総額（億円/億ドル単位の数値）
- sortKey: "marketCap" | "per" | "pbr" | "dividendYield" | "price" | "changePercent"
- sortDir: "asc" | "desc"

【解釈ガイド】
- 「割安」→ perMax: 15, pbrMax: 1.5 など
- 「高配当」→ yieldMin: 3.5、sortKey:"dividendYield", sortDir:"desc"
- 「好財務/優良」→ epsMin を正の値、perMax 適度
- 「大型株」→ mcapMin を大きく、「小型株」→ mcapMax を小さく
- 「成長株」→ sortKey:"changePercent" など
- 該当しない条件は省略（nullや空文字を入れない）

クエリ: 「${query.trim()}」

以下のJSON形式のみで回答（マークダウン不要、該当する項目だけ含める）:
{
  "interpretation": "解釈した条件を日本語で1文（例: 日本株・配当利回り3.5%以上・PER15倍以下を利回り順に表示）",
  "filters": { "market": "JP", "yieldMin": 3.5, "perMax": 15 },
  "sortKey": "dividendYield",
  "sortDir": "desc"
}`,
      }],
    });
    raw = (msg.content[0] as { type: string; text?: string })?.text ?? "";
    recordUsage("ai-screen", "claude-haiku-4-5-20251001", msg.usage);
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
