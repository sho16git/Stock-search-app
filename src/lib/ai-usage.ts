/**
 * AI APIコスト・メーター — 各AI routeのトークン使用量を記録・集計する。
 * ローカル(単一ユーザー)前提で JSONL ファイルに追記する。
 */
import fs from "fs";
import path from "path";

const FILE = path.join(process.cwd(), ".ai-usage.jsonl");

/** Anthropic Usage の必要フィールド (SDKの Usage 型は null を含むため許容) */
export type RawUsage = {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
};

type UsageEvent = {
  ts: number;
  endpoint: string;
  model: string;
  in: number;
  out: number;
  cr: number; // cache read
  cw: number; // cache creation (write)
};

/** モデル別 100万トークンあたり単価 (USD) */
const PRICING: Record<string, { in: number; out: number; cacheRead: number; cacheWrite: number }> = {
  haiku:  { in: 1.0, out: 5.0,  cacheRead: 0.1, cacheWrite: 1.25 },
  sonnet: { in: 3.0, out: 15.0, cacheRead: 0.3, cacheWrite: 3.75 },
  opus:   { in: 5.0, out: 25.0, cacheRead: 0.5, cacheWrite: 6.25 },
};

function priceFor(model: string) {
  const m = model.toLowerCase();
  if (m.includes("haiku")) return PRICING.haiku;
  if (m.includes("opus")) return PRICING.opus;
  return PRICING.sonnet;
}

export function costUsd(model: string, ev: { in: number; out: number; cr: number; cw: number }): number {
  const p = priceFor(model);
  return (
    (ev.in / 1e6) * p.in +
    (ev.out / 1e6) * p.out +
    (ev.cr / 1e6) * p.cacheRead +
    (ev.cw / 1e6) * p.cacheWrite
  );
}

/** AI route から呼ぶ。失敗してもAI応答を壊さないよう常に握りつぶす。 */
export function recordUsage(endpoint: string, model: string, usage: RawUsage | undefined | null): void {
  try {
    if (!usage) return;
    const ev: UsageEvent = {
      ts: Date.now(),
      endpoint,
      model,
      in: usage.input_tokens ?? 0,
      out: usage.output_tokens ?? 0,
      cr: usage.cache_read_input_tokens ?? 0,
      cw: usage.cache_creation_input_tokens ?? 0,
    };
    fs.appendFileSync(FILE, JSON.stringify(ev) + "\n");
  } catch {
    /* ignore — メーター記録の失敗はAI機能に影響させない */
  }
}

export type UsageSummary = {
  totalCalls: number;
  totalIn: number;
  totalOut: number;
  totalCostUsd: number;
  todayCalls: number;
  todayCostUsd: number;
  byModel: { model: string; calls: number; in: number; out: number; costUsd: number }[];
  byEndpoint: { endpoint: string; calls: number; costUsd: number }[];
  firstTs: number | null;
  lastTs: number | null;
};

export function readUsage(): UsageSummary {
  let events: UsageEvent[] = [];
  try {
    const raw = fs.readFileSync(FILE, "utf8");
    events = raw
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l) as UsageEvent)
      .filter((e) => e && typeof e.in === "number");
  } catch {
    /* ファイルが無い = 使用量ゼロ */
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayMs = startOfToday.getTime();

  const modelMap = new Map<string, { calls: number; in: number; out: number; costUsd: number }>();
  const epMap = new Map<string, { calls: number; costUsd: number }>();

  let totalIn = 0, totalOut = 0, totalCostUsd = 0;
  let todayCalls = 0, todayCostUsd = 0;
  let firstTs: number | null = null, lastTs: number | null = null;

  for (const e of events) {
    const c = costUsd(e.model, e);
    totalIn += e.in;
    totalOut += e.out;
    totalCostUsd += c;
    if (firstTs === null || e.ts < firstTs) firstTs = e.ts;
    if (lastTs === null || e.ts > lastTs) lastTs = e.ts;
    if (e.ts >= todayMs) { todayCalls++; todayCostUsd += c; }

    const mm = modelMap.get(e.model) ?? { calls: 0, in: 0, out: 0, costUsd: 0 };
    mm.calls++; mm.in += e.in; mm.out += e.out; mm.costUsd += c;
    modelMap.set(e.model, mm);

    const em = epMap.get(e.endpoint) ?? { calls: 0, costUsd: 0 };
    em.calls++; em.costUsd += c;
    epMap.set(e.endpoint, em);
  }

  return {
    totalCalls: events.length,
    totalIn,
    totalOut,
    totalCostUsd,
    todayCalls,
    todayCostUsd,
    byModel: [...modelMap.entries()]
      .map(([model, v]) => ({ model, ...v }))
      .sort((a, b) => b.costUsd - a.costUsd),
    byEndpoint: [...epMap.entries()]
      .map(([endpoint, v]) => ({ endpoint, ...v }))
      .sort((a, b) => b.costUsd - a.costUsd),
    firstTs,
    lastTs,
  };
}

export function resetUsage(): void {
  try {
    fs.rmSync(FILE, { force: true });
  } catch {
    /* ignore */
  }
}
