/**
 * /api/ai-chat — 会話型 株式AIアシスタント (Claude tool-use)
 * Claude がツール(銘柄検索・株価指標取得・ニュース取得)で実データを引き、
 * 数値根拠付きで日本語回答する。手動ツールループでサーバー側実行。
 */
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import yahooFinance from "@/lib/yfinance";
import { recordUsage } from "@/lib/ai-usage";
import {
  getJpName, searchJpStocks, searchUsStocks, searchTseNames, searchAllUsKatakana,
} from "@/lib/jp-stocks";
import { getUsKatakana } from "@/lib/us-katakana";

export const runtime = "nodejs";

const MODEL = "claude-sonnet-4-5";
const MAX_TURNS = 6;

type ChatMsg = { role: "user" | "assistant"; content: string };

const num = (v: unknown): number | null => {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "object" && "raw" in (v as object)) {
    const r = (v as { raw?: number }).raw;
    return typeof r === "number" && Number.isFinite(r) ? r : null;
  }
  return null;
};

function displayName(symbol: string, longName?: string | null): string {
  return getJpName(symbol) ?? getUsKatakana(symbol) ?? longName ?? symbol;
}

/* ── Tool implementations ────────────────────────────────────────── */
async function toolSearchTicker(query: string): Promise<string> {
  const out = new Map<string, string>();
  for (const s of searchJpStocks(query, 4)) out.set(s.symbol, s.name);
  for (const s of searchTseNames(query, 4)) out.set(s.symbol, s.name);
  for (const s of searchUsStocks(query, 4)) out.set(s.symbol, displayName(s.symbol, s.name));
  for (const k of searchAllUsKatakana(query, 4)) out.set(k.symbol, k.katakana);
  if (out.size < 3) {
    try {
      const y = await (yahooFinance.search as (q: string, o: object) => Promise<{ quotes?: unknown[] }>)(
        query, { quotesCount: 6, newsCount: 0 });
      for (const it of y.quotes ?? []) {
        const o = it as Record<string, unknown>;
        if (typeof o.symbol === "string") {
          out.set(o.symbol, displayName(o.symbol, (o.longname ?? o.shortname) as string | undefined));
        }
      }
    } catch { /* ignore */ }
  }
  const list = [...out.entries()].slice(0, 6).map(([symbol, name]) => ({ symbol, name }));
  return list.length ? JSON.stringify(list) : "該当する銘柄が見つかりませんでした。";
}

async function toolGetStock(symbol: string): Promise<string> {
  try {
    const q = (await (yahooFinance.quote as (s: string) => Promise<Record<string, unknown>>)(symbol)) ?? {};
    let fin: Record<string, unknown> = {}, stat: Record<string, unknown> = {}, det: Record<string, unknown> = {};
    try {
      const s = await (yahooFinance.quoteSummary as (s: string, o: object) => Promise<Record<string, unknown>>)(
        symbol, { modules: ["financialData", "defaultKeyStatistics", "summaryDetail"] });
      fin = (s.financialData ?? {}) as Record<string, unknown>;
      stat = (s.defaultKeyStatistics ?? {}) as Record<string, unknown>;
      det = (s.summaryDetail ?? {}) as Record<string, unknown>;
    } catch { /* ignore */ }
    const price = num(q.regularMarketPrice);
    const data = {
      symbol,
      name: displayName(symbol, (q.longName ?? q.shortName) as string | undefined),
      price,
      changePercent: num(q.regularMarketChangePercent),
      currency: q.currency ?? null,
      per: num(det.trailingPE) ?? num(stat.forwardPE),
      pbr: num(det.priceToBook) ?? num(stat.priceToBook),
      roe: num(fin.returnOnEquity),
      profitMargin: num(fin.profitMargins),
      revenueGrowth: num(fin.revenueGrowth),
      dividendYield: num(det.dividendYield) ?? num(det.trailingAnnualDividendYield),
      marketCap: num(q.marketCap),
      week52High: num(q.fiftyTwoWeekHigh),
      week52Low: num(q.fiftyTwoWeekLow),
      targetMeanPrice: num(fin.targetMeanPrice),
      recommendation: fin.recommendationKey ?? null,
      numAnalysts: num(fin.numberOfAnalystOpinions),
    };
    if (price == null) return `銘柄 ${symbol} の株価データを取得できませんでした。シンボルが正しいか確認してください。`;
    return JSON.stringify(data);
  } catch {
    return `銘柄 ${symbol} のデータ取得に失敗しました。`;
  }
}

async function toolGetNews(symbol: string): Promise<string> {
  try {
    const y = await (yahooFinance.search as (q: string, o: object) => Promise<{ news?: unknown[] }>)(
      symbol, { quotesCount: 0, newsCount: 6 });
    const news = (y.news ?? []).map((it) => {
      const o = it as Record<string, unknown>;
      const t = o.providerPublishTime;
      const date = t ? new Date(typeof t === "number" ? t * 1000 : String(t)).toISOString().slice(0, 10) : null;
      return { title: o.title ?? "", publisher: o.publisher ?? "", date };
    }).filter((n) => n.title);
    return news.length ? JSON.stringify(news) : "関連ニュースが見つかりませんでした。";
  } catch {
    return "ニュース取得に失敗しました。";
  }
}

const TOOLS: Anthropic.Tool[] = [
  {
    name: "search_ticker",
    description: "会社名・カタカナ・キーワードから銘柄のティッカーシンボルを検索する。ユーザーが社名で言及した場合に必ず使ってシンボルを特定する。",
    input_schema: {
      type: "object",
      properties: { query: { type: "string", description: "会社名やキーワード(例: トヨタ, アップル, 半導体)" } },
      required: ["query"],
    },
  },
  {
    name: "get_stock",
    description: "ティッカーシンボルの最新株価・PER・PBR・ROE・配当利回り・時価総額・52週レンジ・アナリスト目標株価などの実データを取得する。",
    input_schema: {
      type: "object",
      properties: { symbol: { type: "string", description: "ティッカー(例: 7203.T, AAPL)" } },
      required: ["symbol"],
    },
  },
  {
    name: "get_news",
    description: "ティッカーシンボルの最新ニュース見出しを取得する。材料や最近の動向を聞かれたときに使う。",
    input_schema: {
      type: "object",
      properties: { symbol: { type: "string", description: "ティッカー(例: 7203.T, AAPL)" } },
      required: ["symbol"],
    },
  },
];

async function runTool(name: string, input: Record<string, unknown>): Promise<string> {
  if (name === "search_ticker") return toolSearchTicker(String(input.query ?? ""));
  if (name === "get_stock") return toolGetStock(String(input.symbol ?? ""));
  if (name === "get_news") return toolGetNews(String(input.symbol ?? ""));
  return "不明なツールです。";
}

const SYSTEM = `あなたは日本語で答える株式投資アシスタントです。
- 銘柄について聞かれたら、必ずツールで最新の実データを取得し、株価・PER・ROE・配当利回りなど具体的な数値を引用して答える。社名で言及されたら search_ticker でシンボルを特定する。
- 2銘柄の比較を求められたら両方のデータを取得して数値で比較する。
- 回答は簡潔に、結論を先に。専門用語には軽い補足を付ける。
- これは情報提供であり投資助言ではない旨を、断定を避ける表現で自然に織り込む。最終的な投資判断は自己責任である点を踏まえる。
- データが取得できない場合は正直に伝える。`;

export async function POST(req: NextRequest) {
  const { messages } = (await req.json()) as { messages: ChatMsg[] };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.includes("xxxx")) {
    return NextResponse.json({ error: "no_api_key" }, { status: 503 });
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "no_messages" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });
  const convo: Anthropic.MessageParam[] = messages.slice(-12).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  try {
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const resp = await client.messages.create({
        model: MODEL,
        max_tokens: 1500,
        system: SYSTEM,
        tools: TOOLS,
        messages: convo,
      });
      recordUsage("ai-chat", MODEL, resp.usage);

      if (resp.stop_reason === "tool_use") {
        convo.push({ role: "assistant", content: resp.content });
        const results: Anthropic.ToolResultBlockParam[] = [];
        for (const block of resp.content) {
          if (block.type === "tool_use") {
            const output = await runTool(block.name, block.input as Record<string, unknown>);
            results.push({ type: "tool_result", tool_use_id: block.id, content: output });
          }
        }
        convo.push({ role: "user", content: results });
        continue;
      }

      const text = resp.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      return NextResponse.json({ reply: text || "うまく回答を生成できませんでした。もう一度お試しください。" });
    }
    return NextResponse.json({ reply: "情報の取得に時間がかかっています。質問を絞って再度お試しください。" });
  } catch (e) {
    const status = (e as { status?: number })?.status;
    if (status === 401 || status === 403) return NextResponse.json({ error: "no_api_key" }, { status: 503 });
    return NextResponse.json({ error: "ai_error" }, { status: 502 });
  }
}
