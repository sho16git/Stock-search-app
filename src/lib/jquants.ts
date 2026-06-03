/**
 * J-Quants API client
 *
 * Authentication flow:
 *   1. POST /token/auth_user  { mailaddress, password }  → refreshToken (valid 1 week)
 *   2. POST /token/auth_refresh?refreshtoken=<rt>        → idToken     (valid 24 h)
 *   3. GET  /...  Authorization: Bearer <idToken>
 *
 * Tokens are cached module-level (persists across Next.js requests in the same process).
 */

const BASE = "https://api.jquants.com/v1";

// ── Token cache ────────────────────────────────────────────────────
let _refreshToken: string | null = null;
let _refreshTokenExpiry = 0; // epoch ms

let _idToken: string | null = null;
let _idTokenExpiry = 0; // epoch ms

// ── Public helpers ─────────────────────────────────────────────────

export function isJQuantsConfigured(): boolean {
  return !!(process.env.JQUANTS_EMAIL && process.env.JQUANTS_PASSWORD);
}

/** Authenticated GET to J-Quants API, returns parsed JSON */
export async function jquantsGet<T = Record<string, unknown>>(
  path: string,
  params?: Record<string, string>,
): Promise<T> {
  const token = await getIdToken();
  const url = new URL(`${BASE}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    // Do not cache at the Next.js / CDN level; token-based auth handles freshness
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`J-Quants ${res.status} ${path}: ${body}`);
  }
  return res.json() as T;
}

// ── Internal auth helpers ──────────────────────────────────────────

async function getRefreshToken(): Promise<string> {
  // Return cached token while still valid
  if (_refreshToken && Date.now() < _refreshTokenExpiry) return _refreshToken;

  const email    = process.env.JQUANTS_EMAIL;
  const password = process.env.JQUANTS_PASSWORD;
  if (!email || !password) {
    throw new Error("JQUANTS_EMAIL / JQUANTS_PASSWORD not set in .env.local");
  }

  const res = await fetch(`${BASE}/token/auth_user`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ mailaddress: email, password }),
    cache:   "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`J-Quants auth_user failed (${res.status}): ${body}`);
  }
  const data = (await res.json()) as { refreshToken?: string };
  if (!data.refreshToken) throw new Error("J-Quants auth_user: no refreshToken in response");

  _refreshToken       = data.refreshToken;
  _refreshTokenExpiry = Date.now() + 6 * 24 * 60 * 60 * 1000; // 6 days (conservative)
  return _refreshToken;
}

async function getIdToken(): Promise<string> {
  if (_idToken && Date.now() < _idTokenExpiry) return _idToken;

  const refreshToken = await getRefreshToken();
  const res = await fetch(
    `${BASE}/token/auth_refresh?refreshtoken=${encodeURIComponent(refreshToken)}`,
    { method: "POST", cache: "no-store" },
  );
  if (!res.ok) {
    // Refresh token may have expired — clear cache and re-authenticate
    _refreshToken       = null;
    _refreshTokenExpiry = 0;
    throw new Error(`J-Quants auth_refresh failed (${res.status})`);
  }
  const data = (await res.json()) as { idToken?: string };
  if (!data.idToken) throw new Error("J-Quants auth_refresh: no idToken in response");

  _idToken       = data.idToken;
  _idTokenExpiry = Date.now() + 23 * 60 * 60 * 1000; // 23 hours
  return _idToken;
}
