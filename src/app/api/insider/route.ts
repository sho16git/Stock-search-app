/**
 * /api/insider?symbol=AAPL
 * SEC EDGAR Form 4 (insider transactions) — US stocks only
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SEC_UA = "StockSearchApp contact@stocksearch.app";

// In-memory cache: ticker → CIK (padded 10-digit string)
const cikMap = new Map<string, string>();
let cikMapLoaded = false;

async function loadCIKMap() {
  if (cikMapLoaded) return;
  try {
    const res = await fetch("https://www.sec.gov/files/company_tickers.json", {
      headers: { "User-Agent": SEC_UA },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return;
    const data = await res.json() as Record<string, { cik_str: number; ticker: string }>;
    for (const item of Object.values(data)) {
      cikMap.set(item.ticker.toUpperCase(), String(item.cik_str).padStart(10, "0"));
    }
    cikMapLoaded = true;
  } catch { /* silently fail */ }
}

function extractTag(xml: string, tag: string): string | null {
  return xml.match(new RegExp(`<${tag}>([^<]*)<\/${tag}>`, "i"))?.[1]?.trim() ?? null;
}

function extractValTag(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}>[\\s\\S]*?<value>([^<]*)<\\/value>`, "i");
  return xml.match(re)?.[1]?.trim() ?? null;
}

export type InsiderTx = {
  name: string;
  title: string;
  date: string;
  shares: number;
  price: number | null;
  value: number | null;
  isBuy: boolean;
  filingDate: string;
};

function parseForm4(xml: string, filingDate: string): InsiderTx[] {
  const name  = extractTag(xml, "rptOwnerName") ?? "Unknown";
  const title = extractTag(xml, "officerTitle")
    ?? (/<isDirector>1/.test(xml) ? "Director" : "Insider");

  const txs: InsiderTx[] = [];
  const blocks = xml.match(/<nonDerivativeTransaction>[\s\S]*?<\/nonDerivativeTransaction>/g) ?? [];

  for (const b of blocks) {
    const date   = extractValTag(b, "transactionDate");
    const sharesStr = extractValTag(b, "transactionShares");
    const priceStr  = extractValTag(b, "transactionPricePerShare");
    const code   = extractValTag(b, "transactionAcquiredDisposedCode");

    if (!date || !sharesStr) continue;
    const shares = parseFloat(sharesStr);
    const price  = priceStr && priceStr !== "0" ? parseFloat(priceStr) : null;
    if (!isFinite(shares) || shares <= 0) continue;

    txs.push({
      name,
      title,
      date,
      shares,
      price,
      value: price ? Math.round(shares * price) : null,
      isBuy: code === "A",
      filingDate,
    });
  }
  return txs;
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim().toUpperCase();
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  // JP stocks are not on SEC EDGAR
  if (symbol.endsWith(".T") || symbol.endsWith(".JP")) {
    return NextResponse.json({ symbol, transactions: [], supported: false });
  }

  await loadCIKMap();
  const cik = cikMap.get(symbol);
  if (!cik) {
    return NextResponse.json({ symbol, transactions: [], supported: false, reason: "CIK not found" });
  }

  try {
    // Get recent filings
    const subUrl = `https://data.sec.gov/submissions/CIK${cik}.json`;
    const subRes = await fetch(subUrl, {
      headers: { "User-Agent": SEC_UA },
      signal: AbortSignal.timeout(8000),
    });
    if (!subRes.ok) throw new Error("submissions fetch failed");

    const sub = await subRes.json() as {
      filings: {
        recent: {
          form: string[];
          filingDate: string[];
          accessionNumber: string[];
          primaryDocument: string[];
        };
      };
    };

    const { form, filingDate, accessionNumber, primaryDocument } = sub.filings.recent;

    // Filter Form 4s in last 90 days
    const cutoff = new Date(Date.now() - 90 * 86400_000).toISOString().slice(0, 10);
    const form4Indices: number[] = [];
    for (let i = 0; i < form.length; i++) {
      if (form[i] === "4" && filingDate[i] >= cutoff) {
        form4Indices.push(i);
        if (form4Indices.length >= 10) break;
      }
    }

    if (form4Indices.length === 0) {
      return NextResponse.json({ symbol, transactions: [], supported: true });
    }

    // Fetch and parse Form 4 XMLs in parallel (max 8)
    const cikDecimal = parseInt(cik, 10).toString();
    const allTxs: InsiderTx[] = [];

    await Promise.all(
      form4Indices.slice(0, 8).map(async (idx) => {
        const acc  = accessionNumber[idx].replace(/-/g, "");
        const file = primaryDocument[idx];
        const url  = `https://www.sec.gov/Archives/edgar/data/${cikDecimal}/${acc}/${file}`;
        try {
          const res = await fetch(url, {
            headers: { "User-Agent": SEC_UA },
            signal: AbortSignal.timeout(5000),
          });
          if (!res.ok) return;
          const xml = await res.text();
          const txs = parseForm4(xml, filingDate[idx]);
          allTxs.push(...txs);
        } catch { /* skip failed fetches */ }
      })
    );

    // Sort by date desc, deduplicate
    allTxs.sort((a, b) => b.date.localeCompare(a.date));

    return NextResponse.json({ symbol, transactions: allTxs.slice(0, 20), supported: true }, {
      headers: { "Cache-Control": "public, max-age=1800, stale-while-revalidate=3600" },
    });
  } catch (err) {
    console.error("insider error", err);
    return NextResponse.json({ symbol, transactions: [], supported: true, error: true });
  }
}
