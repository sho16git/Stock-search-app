/**
 * Japanese translation utility with two backends:
 *   1. Google Translate (unofficial gtx endpoint) — fast, high throughput, no key
 *   2. MyMemory (fallback) — free public API but rate-limited (~1k words/day anonymous)
 *
 * - In-memory LRU-ish cache (max 500 entries)
 * - Chunks input into ≤4000-char pieces (Google supports up to ~5k per call)
 * - Returns null on total failure so callers can fall back to the English source
 */

const CACHE = new Map<string, string>();
const MAX_CACHE = 500;

function setCache(key: string, value: string) {
  if (CACHE.size >= MAX_CACHE) {
    const first = CACHE.keys().next().value;
    if (first !== undefined) CACHE.delete(first);
  }
  CACHE.set(key, value);
}

/** Google Translate (gtx endpoint). Returns translated string. */
async function translateChunkGoogle(
  text: string,
  signal: AbortSignal,
): Promise<string> {
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ja&dt=t&q=" +
    encodeURIComponent(text);
  const res = await fetch(url, {
    signal,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
  });
  if (!res.ok) throw new Error(`google HTTP ${res.status}`);
  const json = (await res.json()) as unknown;
  // Response shape: [[ [translated, original, ...], ... ], ...]
  if (!Array.isArray(json) || !Array.isArray(json[0])) {
    throw new Error("google unexpected shape");
  }
  let out = "";
  for (const seg of json[0] as unknown[]) {
    if (Array.isArray(seg) && typeof seg[0] === "string") {
      out += seg[0];
    }
  }
  out = out.trim();
  if (!out) throw new Error("google empty response");
  return out;
}

/** MyMemory fallback. */
async function translateChunkMyMemory(
  text: string,
  signal: AbortSignal,
): Promise<string> {
  const url =
    "https://api.mymemory.translated.net/get?langpair=en|ja&de=app@stock-search.local&q=" +
    encodeURIComponent(text);
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`mymemory HTTP ${res.status}`);
  const json = (await res.json()) as {
    responseData?: { translatedText?: string };
  };
  const out = json?.responseData?.translatedText;
  if (typeof out !== "string" || !out.trim()) {
    throw new Error("mymemory empty");
  }
  return out;
}

async function translateChunk(text: string, signal: AbortSignal): Promise<string> {
  if (CACHE.has(text)) return CACHE.get(text)!;
  try {
    const out = await translateChunkGoogle(text, signal);
    setCache(text, out);
    return out;
  } catch (errGoogle) {
    // Fall back to MyMemory if Google fails (network etc.)
    try {
      const out = await translateChunkMyMemory(text, signal);
      setCache(text, out);
      return out;
    } catch (errMyMemory) {
      console.warn(
        "translateChunk both backends failed",
        String(errGoogle),
        "/",
        String(errMyMemory),
      );
      throw errGoogle;
    }
  }
}

function splitIntoChunks(text: string, limit = 4000): string[] {
  if (text.length <= limit) return [text];
  const sentences = text
    .split(/(?<=[.!?。!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const s of sentences) {
    if (s.length > limit) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      for (let i = 0; i < s.length; i += limit) {
        chunks.push(s.slice(i, i + limit));
      }
      continue;
    }
    if ((current + " " + s).trim().length > limit) {
      chunks.push(current.trim());
      current = s;
    } else {
      current = current ? `${current} ${s}` : s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

/**
 * Translate English text to Japanese. Returns null on failure.
 */
export async function translateToJa(
  text: string | null | undefined,
  opts: { timeoutMs?: number } = {},
): Promise<string | null> {
  if (!text || !text.trim()) return null;
  if (!/[A-Za-z]/.test(text)) return text; // already non-English

  if (CACHE.has(text)) return CACHE.get(text)!;

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    opts.timeoutMs ?? 20_000,
  );
  try {
    const chunks = splitIntoChunks(text);
    const parts = await Promise.all(
      chunks.map((c) => translateChunk(c, controller.signal)),
    );
    const merged = parts.join(" ");
    setCache(text, merged);
    return merged;
  } catch (err) {
    console.warn("translateToJa failed", err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
