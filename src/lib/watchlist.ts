const KEY = "stock-search:watchlist:v1";

export type WatchItem = {
  symbol: string;
  name?: string;
  addedAt: number;
};

export function getWatchlist(): WatchItem[] {
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

function save(items: WatchItem[]) {
  window.localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("watchlist:change"));
}

export function isWatched(symbol: string): boolean {
  return getWatchlist().some((w) => w.symbol === symbol);
}

export function addWatch(item: Omit<WatchItem, "addedAt">) {
  const list = getWatchlist();
  if (list.some((w) => w.symbol === item.symbol)) return;
  list.unshift({ ...item, addedAt: Date.now() });
  save(list);
}

export function removeWatch(symbol: string) {
  const list = getWatchlist().filter((w) => w.symbol !== symbol);
  save(list);
}

export function toggleWatch(item: Omit<WatchItem, "addedAt">): boolean {
  if (isWatched(item.symbol)) {
    removeWatch(item.symbol);
    return false;
  }
  addWatch(item);
  return true;
}
