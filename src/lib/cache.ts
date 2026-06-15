/**
 * Tiny in-memory TTL cache shared across API route handlers.
 *
 * On a warm serverless instance this de-duplicates repeated/concurrent Yahoo
 * Finance calls (e.g. a sector page loading 50 quotes, pagination re-fetches,
 * or several users hitting the same popular symbol) — cutting latency and the
 * number of upstream requests. It is intentionally process-local: stale data
 * is bounded by the TTL, and a cold instance simply repopulates.
 */

type Entry = { value: unknown; expires: number };

const store = new Map<string, Entry>();

/** Return a cached value if fresh, else run `fn`, cache, and return it. */
export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expires > now) return hit.value as T;

  const value = await fn();
  store.set(key, { value, expires: now + ttlMs });

  // Opportunistic cleanup so the map can't grow without bound
  if (store.size > 5000) {
    for (const [k, e] of store) if (e.expires <= now) store.delete(k);
  }
  return value;
}

/** Synchronous cache read (fresh only). */
export function cacheGet<T>(key: string): T | undefined {
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  return undefined;
}

/** Synchronous cache write. */
export function cacheSet(key: string, value: unknown, ttlMs: number): void {
  store.set(key, { value, expires: Date.now() + ttlMs });
}
