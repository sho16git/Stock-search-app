/**
 * /api/earnings — 決算カレンダー
 * Query: market = "JP" | "US", weeks = number (default 4)
 */
import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "@/lib/yfinance";
import { getJpName } from "@/lib/jp-stocks";
import { getUsKatakana } from "@/lib/us-katakana";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── スキャン対象 ────────────────────────────────────────────────────
const US_SYMBOLS = [
  // テック大手
  "AAPL","MSFT","GOOGL","AMZN","META","NVDA","TSLA","AMD","AVGO","ORCL",
  "CRM","ADBE","NOW","INTU","INTC","QCOM","MU","TXN","AMAT","LRCX","KLAC",
  // グロース
  "NFLX","PLTR","CRWD","SNOW","DDOG","NET","ZS","OKTA","MDB","SHOP",
  "MELI","COIN","RKLB","IONQ","ARM","SMCI","PYPL","SQ","UBER","ABNB",
  // バリュー・金融
  "JPM","BAC","GS","MS","WFC","C","V","MA","AXP","BLK","BRK-B",
  // ヘルスケア
  "JNJ","PFE","ABBV","MRK","LLY","TMO","UNH","AMGN","GILD","MRNA",
  // エネルギー・素材
  "CVX","XOM","COP","BP","SHEL",
  // 生活必需品・コンシューマー
  "KO","PEP","MCD","SBUX","NKE","COST","WMT","TGT","HD","PG","PM",
  // 工業・防衛
  "BA","CAT","GE","MMM","HON","RTX","LMT","NOC","DE",
  // 通信
  "VZ","T","TMUS",
  // 不動産・その他
  "AMT","PLD","CCI",
];

const JP_SYMBOLS = [
  // 半導体・テック
  "6920.T","8035.T","6857.T","6758.T","9984.T","6861.T","4063.T","6098.T",
  "6501.T","6702.T","6976.T","3659.T",
  // 自動車・輸送機
  "7203.T","7267.T","7269.T","7261.T","7270.T","7201.T","7011.T",
  // 金融
  "8306.T","8316.T","8411.T","8308.T","8601.T","8766.T","8725.T",
  // 通信・インフラ
  "9432.T","9433.T","9434.T","9020.T","9022.T","9021.T",
  // 生活・小売・食品
  "7974.T","3382.T","2502.T","2503.T","4452.T","2801.T","2802.T",
  // 製薬・医療
  "4519.T","4578.T","4523.T","4568.T","2413.T","4543.T",
  // 不動産・建設
  "8802.T","8801.T","8830.T","1925.T","1928.T",
  // 重工業・素材
  "6301.T","6302.T","4901.T","4911.T","5401.T",
  // エンタメ・コンシューマー
  "4661.T","9602.T","9613.T","6902.T","6594.T","7751.T",
];

const raw = (o: unknown): number | null => {
  if (o == null) return null;
  if (typeof o === "number") return isFinite(o) ? o : null;
  // Yahoo Finance v2 returns Date objects for timestamp fields
  if (o instanceof Date) return isFinite(o.getTime()) ? Math.floor(o.getTime() / 1000) : null;
  return null;
};

export async function GET(req: NextRequest) {
  const market  = req.nextUrl.searchParams.get("market") ?? "JP";
  const weeks   = Math.min(8, parseInt(req.nextUrl.searchParams.get("weeks") ?? "4", 10));
  const symbols = market === "US" ? US_SYMBOLS : JP_SYMBOLS;

  const nowTs   = Date.now() / 1000;
  const limitTs = nowTs + weeks * 7 * 24 * 3600;

  type EarningsEntry = {
    symbol:        string;
    name:          string;
    earningsDate:  number;
    currentPrice:  number | null;
    changePercent: number | null;
    currency:      string;
    epsEstimate:   number | null;
    epsPrev:       number | null;
    revenueEstimate: number | null;
    sector:        string | null;
  };

  const entries: EarningsEntry[] = [];

  // バッチで quote 取得（Yahoo Finance は一括対応）
  try {
    const quotes = await yahooFinance.quote(symbols).catch(() => []);
    const list   = Array.isArray(quotes) ? quotes : [quotes];

    for (const q of list) {
      const o   = q as Record<string, unknown>;
      const sym = String(o.symbol ?? "");
      if (!sym) continue;

      // 決算日候補: earningsTimestamp → earningsTimestampStart → earningsTimestampEnd の順
      const tsCandidates = [
        raw(o.earningsTimestamp),
        raw(o.earningsTimestampStart),
        raw((o as { earningsTimestampEnd?: unknown }).earningsTimestampEnd),
      ].filter((v): v is number => v !== null);

      // 未来のもの（または最大3日前まで）を優先
      const ts =
        tsCandidates.find(v => v >= nowTs - 3 * 86400 && v <= limitTs) ??
        null;

      // 範囲外はスキップ
      if (ts == null) continue;

      const jpName   = market === "JP" ? getJpName(sym) : null;
      const enName   = (o.longName ?? o.shortName) as string | undefined;
      const kataName = market === "US" ? getUsKatakana(sym) : null;
      const name     = jpName ?? kataName ?? enName ?? sym;

      // EPS / Revenue 予想（あれば）
      const epsEst = raw((o as { epsForward?: unknown }).epsForward);
      const epsPrev = raw((o as { epsTrailingTwelveMonths?: unknown }).epsTrailingTwelveMonths);

      entries.push({
        symbol:          sym,
        name,
        earningsDate:    ts,
        currentPrice:    raw(o.regularMarketPrice),
        changePercent:   raw(o.regularMarketChangePercent),
        currency:        (o.currency as string) ?? (market === "JP" ? "JPY" : "USD"),
        epsEstimate:     epsEst,
        epsPrev,
        revenueEstimate: null,
        sector:          (o.sector as string) ?? null,
      });
    }
  } catch { /* ignore */ }

  // 日付でソート
  entries.sort((a, b) => a.earningsDate - b.earningsDate);

  // 日ごとにグループ化 (YYYY-MM-DD)
  const grouped = new Map<string, EarningsEntry[]>();
  for (const e of entries) {
    const d = new Date(e.earningsDate * 1000);
    // ローカル日付文字列（サーバーはUTCだが、概算で十分）
    const key = d.toISOString().slice(0, 10);
    const arr = grouped.get(key) ?? [];
    arr.push(e);
    grouped.set(key, arr);
  }

  const calendar = Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, stocks]) => ({ date, stocks }));

  return NextResponse.json({
    market,
    weeks,
    updatedAt: new Date().toISOString(),
    total:    entries.length,
    calendar,
  });
}
