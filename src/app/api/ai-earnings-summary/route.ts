/**
 * /api/ai-earnings-summary — 決算をClaudeが要約
 * 直近の売上・純利益・EPS実績/予想・利益率をサーバー側で集計し、
 * Claude が増収増益か・サプライズ・注目点を数値付きで日本語解説する。
 */
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { recordUsage } from "@/lib/ai-usage";
import yahooFinance from "@/lib/yfinance";
import { getJpName } from "@/lib/jp-stocks";

export const runtime = "nodejs";

const num = (v: unknown): number | null => {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "object" && "raw" in (v as object)) {
    const r = (v as { raw?: number }).raw;
    return typeof r === "number" && Number.isFinite(r) ? r : null;
  }
  return null;
};

function fmtPeriod(date: unknown, quarterly: boolean): string {
  if (!date) return "—";
  const d = date instanceof Date ? date : new Date(String(date));
  if (Number.isNaN(d.getTime())) return "—";
  if (quarterly) return `${d.getFullYear()}Q${Math.ceil((d.getMonth() + 1) / 3)}`;
  return String(d.getFullYear());
}

/** 円/ドルを兆・億・百万単位の読みやすい文字列に */
function compact(v: number | null, currency: string): string {
  if (v == null) return "N/A";
  const abs = Math.abs(v);
  if (currency === "JPY") {
    if (abs >= 1e12) return `${(v / 1e12).toFixed(2)}兆円`;
    if (abs >= 1e8)  return `${(v / 1e8).toFixed(0)}億円`;
    return `${Math.round(v / 1e6)}百万円`;
  }
  if (abs >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v}`;
}

function yoy(cur: number | null, prev: number | null): string {
  if (cur == null || prev == null || prev === 0) return "";
  const p = ((cur - prev) / Math.abs(prev)) * 100;
  return ` (前年比${p >= 0 ? "+" : ""}${p.toFixed(1)}%)`;
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim();
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.includes("xxxx")) {
    return NextResponse.json({ error: "no_api_key" }, { status: 503 });
  }

  // ── データ取得 ──
  let summary: Record<string, unknown> = {};
  let quote: Record<string, unknown> = {};
  try {
    const s = await yahooFinance.quoteSummary(symbol, {
      modules: [
        "incomeStatementHistory",
        "incomeStatementHistoryQuarterly",
        "earningsHistory",
        "financialData",
        "defaultKeyStatistics",
      ],
    });
    summary = s as unknown as Record<string, unknown>;
  } catch { /* ignore */ }
  try {
    quote = (await yahooFinance.quote(symbol)) as unknown as Record<string, unknown>;
  } catch { /* ignore */ }

  const name = getJpName(symbol) ?? (quote.longName as string) ?? symbol;
  const currency = (quote.currency as string) ?? "USD";

  const annualRaw =
    (summary.incomeStatementHistory as { incomeStatementHistory?: Record<string, unknown>[] } | null)
      ?.incomeStatementHistory ?? [];
  const qRaw =
    (summary.incomeStatementHistoryQuarterly as { incomeStatementHistory?: Record<string, unknown>[] } | null)
      ?.incomeStatementHistory ?? [];
  const earnHistRaw =
    (summary.earningsHistory as { history?: Record<string, unknown>[] } | null)?.history ?? [];
  const fin = (summary.financialData ?? {}) as Record<string, unknown>;
  const stat = (summary.defaultKeyStatistics ?? {}) as Record<string, unknown>;

  const annual = annualRaw.slice(0, 3).map((s) => ({
    period: fmtPeriod(s.endDate, false),
    revenue: num(s.totalRevenue),
    netIncome: num(s.netIncome),
  }));
  const quarterly = qRaw.slice(0, 4).map((s) => ({
    period: fmtPeriod(s.endDate, true),
    revenue: num(s.totalRevenue),
    netIncome: num(s.netIncome),
  }));
  const epsHist = earnHistRaw.slice(0, 4).map((s) => ({
    period: fmtPeriod(s.quarter, true),
    actual: num(s.epsActual),
    estimate: num(s.epsEstimate),
    surprisePct: num(s.surprisePercent),
  }));

  const hasData =
    annual.some((a) => a.revenue != null) ||
    quarterly.some((q) => q.revenue != null) ||
    epsHist.some((e) => e.actual != null);
  if (!hasData) {
    return NextResponse.json({ error: "no_data" }, { status: 404 });
  }

  // ── コンテキスト構築 ──
  const annualLines = annual.map((a, i) => {
    const prev = annual[i + 1];
    return `${a.period}: 売上${compact(a.revenue, currency)}${yoy(a.revenue, prev?.revenue)} / 純利益${compact(a.netIncome, currency)}${yoy(a.netIncome, prev?.netIncome)}`;
  });
  const qLines = quarterly.map((q) => `${q.period}: 売上${compact(q.revenue, currency)} / 純利益${compact(q.netIncome, currency)}`);
  const epsLines = epsHist
    .filter((e) => e.actual != null)
    .map((e) => `${e.period}: EPS実績${e.actual}${e.estimate != null ? ` / 予想${e.estimate}` : ""}${e.surprisePct != null ? ` (サプライズ${(e.surprisePct * 100).toFixed(1)}%)` : ""}`);

  const rg = num(fin.revenueGrowth);
  const eg = num(fin.earningsGrowth);
  const pm = num(fin.profitMargins);
  const opm = num(fin.operatingMargins);
  const pctOrNa = (v: number | null) => (v == null ? "N/A" : `${(v * 100).toFixed(1)}%`);

  const context = `
銘柄: ${name} (${symbol})  通貨: ${currency}
■ 年次業績(新しい順)
${annualLines.join("\n") || "N/A"}
■ 四半期売上/純利益(新しい順)
${qLines.join("\n") || "N/A"}
■ EPS実績 vs 予想
${epsLines.join("\n") || "N/A"}
■ 指標
売上成長率(前年比): ${pctOrNa(rg)}  利益成長率: ${pctOrNa(eg)}  純利益率: ${pctOrNa(pm)}  営業利益率: ${pctOrNa(opm)}
予想PER: ${num(stat.forwardPE) ?? "N/A"}`.trim();

  // ── Claude ──
  let raw = "";
  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 700,
      messages: [{
        role: "user",
        content: `個人投資家向けに、以下の決算データを日本語で要約してください。実データの数値を必ず引用し、汎用的な表現は避けてください。

${context}

JSONのみで回答（コードブロック不要）:
{
  "headline": "決算の総括を20字以内で（例: 増収増益・サービス好調）",
  "revenueTrend": "増収|減収|横ばい",
  "profitTrend": "増益|減益|横ばい|赤字",
  "surprise": "アナリスト予想に対する着地を25字以内で（データが無ければ「予想データなし」）",
  "comment": "売上・利益・利益率・EPSサプライズを踏まえた具体的な解説を150字以内で",
  "watchPoints": ["次の決算で注目すべき点1(30字以内)", "注目点2(30字以内)"],
  "verdict": "好決算|無難|やや弱い|弱い"
}`,
      }],
    });
    raw = (msg.content[0] as { type: string; text?: string })?.text ?? "";
    recordUsage("ai-earnings-summary", "claude-haiku-4-5-20251001", msg.usage);
  } catch (e) {
    const status = (e as { status?: number })?.status;
    if (status === 401 || status === 403) return NextResponse.json({ error: "no_api_key" }, { status: 503 });
    return NextResponse.json({ error: "ai_error" }, { status: 502 });
  }

  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return NextResponse.json({ error: "parse_error" }, { status: 500 });
  try {
    const parsed = JSON.parse(match[0]);
    return NextResponse.json({ ...parsed, name, currency });
  } catch {
    return NextResponse.json({ error: "json_error" }, { status: 500 });
  }
}
