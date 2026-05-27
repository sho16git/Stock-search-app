const KEY = "stock-search:recent:v1";
const MAX = 12;

export type RecentItem = {
  symbol: string;
  visitedAt: number;
};

export function getRecent(): RecentItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function pushRecent(symbol: string) {
  if (typeof window === "undefined") return;
  const current = getRecent().filter((r) => r.symbol !== symbol);
  current.unshift({ symbol, visitedAt: Date.now() });
  const next = current.slice(0, MAX);
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("recent:change"));
}
