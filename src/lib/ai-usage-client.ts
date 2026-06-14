/**
 * AI利用状況メーター(クライアント版) — localStorage に記録。
 * Vercel等のサーバーレスではサーバー側のファイル書き込みが使えないため、
 * AI機能を呼んだ各端末のブラウザに使用量を記録・集計する。
 * トークン数は取得しないため、エンドポイント別の代表値からコストを概算する。
 */

const KEY = "stock-search:ai-usage:v1";

/** エンドポイント別: 使用モデルと1回あたりの概算コスト(USD)。
 *  公開料金(Haiku $1/$5, Sonnet $3/$15 per 1M tokens)と典型的なトークン量からの概算。 */
export const AI_ENDPOINTS: Record<string, { label: string; model: "haiku" | "sonnet"; usd: number }> = {
  "ai-news-summary":    { label: "ニュース解説",     model: "haiku",  usd: 0.0010 },
  "ai-technical":       { label: "テクニカル分析",   model: "haiku",  usd: 0.0015 },
  "ai-earnings-summary":{ label: "決算サマリー",     model: "haiku",  usd: 0.0035 },
  "ai-screen":          { label: "自然言語検索",     model: "haiku",  usd: 0.0012 },
  "ai-analyst":         { label: "アナリスト解説",   model: "haiku",  usd: 0.0015 },
  "ai-peer-verdict":    { label: "銘柄比較判定",     model: "haiku",  usd: 0.0018 },
  "ai-ranking-comment": { label: "ランキング解説",   model: "haiku",  usd: 0.0020 },
  "ai-portfolio":       { label: "ポートフォリオ診断", model: "sonnet", usd: 0.0160 },
  "ai-predict":         { label: "AI 5年予想",       model: "sonnet", usd: 0.0250 },
  "ai-analysis":        { label: "AI総合分析",       model: "sonnet", usd: 0.0400 },
  "ai-chat":            { label: "AI投資相談",       model: "sonnet", usd: 0.0150 },
};

type Ev = { ts: number; endpoint: string; usd: number };

function load(): Ev[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const a = raw ? (JSON.parse(raw) as Ev[]) : [];
    return Array.isArray(a) ? a : [];
  } catch { return []; }
}

/** AI機能の成功レスポンス受信後に呼ぶ。endpoint は "ai-news-summary" 等。 */
export function recordAiCall(endpoint: string): void {
  try {
    if (typeof window === "undefined") return;
    const info = AI_ENDPOINTS[endpoint];
    if (!info) return;
    const list = load();
    list.push({ ts: Date.now(), endpoint, usd: info.usd });
    // 直近2000件に制限
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(-2000)));
    window.dispatchEvent(new CustomEvent("ai-usage:change"));
  } catch { /* ignore */ }
}

export function clearAiUsage(): void {
  try { window.localStorage.removeItem(KEY); window.dispatchEvent(new CustomEvent("ai-usage:change")); } catch { /* ignore */ }
}

export type AiUsageSummary = {
  totalCalls: number;
  totalCostUsd: number;
  todayCalls: number;
  todayCostUsd: number;
  byModel: { model: string; calls: number; costUsd: number }[];
  byEndpoint: { endpoint: string; label: string; calls: number; costUsd: number }[];
  firstTs: number | null;
  lastTs: number | null;
};

export function readAiUsage(): AiUsageSummary {
  const events = load();
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const todayMs = start.getTime();

  const modelMap = new Map<string, { calls: number; costUsd: number }>();
  const epMap = new Map<string, { calls: number; costUsd: number }>();
  let totalCalls = 0, totalCostUsd = 0, todayCalls = 0, todayCostUsd = 0;
  let firstTs: number | null = null, lastTs: number | null = null;

  for (const e of events) {
    const info = AI_ENDPOINTS[e.endpoint];
    const model = info?.model ?? "haiku";
    totalCalls++; totalCostUsd += e.usd;
    if (firstTs === null || e.ts < firstTs) firstTs = e.ts;
    if (lastTs === null || e.ts > lastTs) lastTs = e.ts;
    if (e.ts >= todayMs) { todayCalls++; todayCostUsd += e.usd; }
    const mm = modelMap.get(model) ?? { calls: 0, costUsd: 0 };
    mm.calls++; mm.costUsd += e.usd; modelMap.set(model, mm);
    const em = epMap.get(e.endpoint) ?? { calls: 0, costUsd: 0 };
    em.calls++; em.costUsd += e.usd; epMap.set(e.endpoint, em);
  }

  return {
    totalCalls, totalCostUsd, todayCalls, todayCostUsd,
    byModel: [...modelMap.entries()].map(([model, v]) => ({ model, ...v })).sort((a, b) => b.costUsd - a.costUsd),
    byEndpoint: [...epMap.entries()].map(([endpoint, v]) => ({ endpoint, label: AI_ENDPOINTS[endpoint]?.label ?? endpoint, ...v })).sort((a, b) => b.costUsd - a.costUsd),
    firstTs, lastTs,
  };
}
