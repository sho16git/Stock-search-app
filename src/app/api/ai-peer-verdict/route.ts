/**
 * /api/ai-peer-verdict — 同業他社比較をClaudeが判定
 * 対象銘柄がピア比でバリュエーション・成長性・収益性的に
 * 割安/割高か、どの競合が魅力的かを日本語で判定する。
 */
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { recordUsage } from "@/lib/ai-usage";

export const runtime = "nodejs";

type PeerRow = {
  symbol: string;
  nameJa?: string | null;
  name?: string | null;
  trailingPE?: number | null;
  priceToBook?: number | null;
  returnOnEquity?: number | null;
  dividendYield?: number | null;
  marketCap?: number | null;
};

export async function POST(req: NextRequest) {
  const { symbol, peers } = (await req.json()) as { symbol: string; peers: PeerRow[] };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.includes("xxxx")) {
    return NextResponse.json({ error: "no_api_key" }, { status: 503 });
  }
  if (!Array.isArray(peers) || peers.length < 2) {
    return NextResponse.json({ error: "no_peers" }, { status: 400 });
  }

  const fmt = (v: number | null | undefined, pct = false) =>
    v == null ? "N/A" : pct ? `${(v * 100).toFixed(1)}%` : v.toFixed(1);

  const rows = peers.slice(0, 8).map((p, i) => {
    const tag = p.symbol === symbol ? "★対象" : `競合${i}`;
    return `${tag} ${p.nameJa ?? p.name ?? p.symbol} (${p.symbol}): PER${fmt(p.trailingPE)} / PBR${fmt(p.priceToBook)} / ROE${fmt(p.returnOnEquity, true)} / 配当${fmt(p.dividendYield, true)}`;
  }).join("\n");

  const context = `対象銘柄: ${symbol}\n\n■ 同業比較（★が対象銘柄）\n${rows}`;

  let raw = "";
  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 550,
      messages: [{
        role: "user",
        content: `個人投資家向けに、以下の同業他社比較データを分析してください。★の対象銘柄が競合と比べてどうかを、PER・PBR・ROE・配当利回りの数値を引用して日本語で判定してください。

${context}

JSONのみで回答:
{
  "headline": "対象銘柄の相対評価を20字以内（例: 競合比で割安・高ROE）",
  "comment": "対象銘柄のバリュエーション・収益性を競合と比較した解説を130字以内。具体的な数値を引用",
  "bullets": ["最も割安な銘柄とその理由(35字以内)", "最も収益性が高い銘柄(35字以内)"],
  "tag": "割安|妥当|割高"
}`,
      }],
    });
    raw = (msg.content[0] as { type: string; text?: string })?.text ?? "";
    recordUsage("ai-peer-verdict", "claude-haiku-4-5-20251001", msg.usage);
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
