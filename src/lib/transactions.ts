/**
 * 取引記録 (売買履歴) — localStorage に保存。
 * FIFO で実現損益を算出、新NISA枠(2024〜)の使用状況を集計する。
 */

const KEY = "stock-search:transactions:v1";

export type TxAccount = "growth" | "tsumitate" | "taxable"; // NISA成長枠 / つみたて枠 / 特定口座
export type TxSide = "buy" | "sell";

export type Transaction = {
  id: string;
  symbol: string;
  name?: string;
  side: TxSide;
  quantity: number;
  price: number;        // 1株あたり (銘柄の通貨)
  currency: string;     // "JPY" | "USD" ...
  date: string;         // YYYY-MM-DD
  account: TxAccount;
  fee?: number;         // 手数料 (通貨建て)
};

export const ACCOUNT_LABEL: Record<TxAccount, string> = {
  growth: "NISA成長投資枠",
  tsumitate: "NISAつみたて枠",
  taxable: "特定/一般口座",
};

// 新NISA (2024〜) の枠 (円)
export const NISA = {
  growthAnnual: 2_400_000,
  tsumitateAnnual: 1_200_000,
  lifetimeTotal: 18_000_000,
  growthLifetime: 12_000_000,
};

export function getTransactions(): Transaction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as Transaction[]) : [];
    return Array.isArray(list) ? list : [];
  } catch { return []; }
}

function save(list: Transaction[]) {
  window.localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("transactions:change"));
}

export function addTransaction(tx: Omit<Transaction, "id">): Transaction {
  const full: Transaction = { ...tx, id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` };
  save([...getTransactions(), full]);
  return full;
}

export function removeTransaction(id: string) {
  save(getTransactions().filter((t) => t.id !== id));
}

/* ── 実現損益 (FIFO) ──────────────────────────────────────────────── */
type Lot = { qty: number; price: number };

export type RealizedRow = { symbol: string; currency: string; realized: number; proceeds: number };
export type RealizedResult = {
  rows: RealizedRow[];
  totalByCurrency: Record<string, number>;
};

export function computeRealized(txns: Transaction[]): RealizedResult {
  // group by symbol (FIFO per symbol, currency follows the symbol)
  const bySymbol = new Map<string, Transaction[]>();
  for (const t of txns) {
    if (!bySymbol.has(t.symbol)) bySymbol.set(t.symbol, []);
    bySymbol.get(t.symbol)!.push(t);
  }
  const rows: RealizedRow[] = [];
  const totalByCurrency: Record<string, number> = {};

  for (const [symbol, list] of bySymbol) {
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
    const lots: Lot[] = [];
    let realized = 0, proceeds = 0;
    const currency = sorted[0]?.currency ?? "JPY";
    for (const t of sorted) {
      if (t.side === "buy") {
        lots.push({ qty: t.quantity, price: t.price });
      } else {
        let remaining = t.quantity;
        proceeds += t.price * t.quantity - (t.fee ?? 0);
        while (remaining > 0 && lots.length > 0) {
          const lot = lots[0];
          const used = Math.min(remaining, lot.qty);
          realized += (t.price - lot.price) * used;
          lot.qty -= used;
          remaining -= used;
          if (lot.qty <= 1e-9) lots.shift();
        }
        realized -= t.fee ?? 0;
      }
    }
    if (realized !== 0 || proceeds !== 0) {
      rows.push({ symbol, currency, realized, proceeds });
      totalByCurrency[currency] = (totalByCurrency[currency] ?? 0) + realized;
    }
  }
  rows.sort((a, b) => b.realized - a.realized);
  return { rows, totalByCurrency };
}

/* ── NISA枠の使用状況 ─────────────────────────────────────────────── */
export type NisaUsage = {
  growthAnnualUsed: number;
  tsumitateAnnualUsed: number;
  lifetimeUsed: number;
  growthLifetimeUsed: number;
  year: number;
};

/**
 * @param fxToJpy 通貨→円レート関数 (JPYは1)。USD建て買付を円換算して枠消費に反映。
 */
export function computeNisaUsage(txns: Transaction[], fxToJpy: (currency: string) => number): NisaUsage {
  const year = new Date().getFullYear();
  let growthAnnualUsed = 0, tsumitateAnnualUsed = 0;

  // 年間枠: 当年の買付額(円)
  for (const t of txns) {
    if (t.side !== "buy") continue;
    if (Number(t.date.slice(0, 4)) !== year) continue;
    const amt = (t.price * t.quantity + (t.fee ?? 0)) * fxToJpy(t.currency);
    if (t.account === "growth") growthAnnualUsed += amt;
    else if (t.account === "tsumitate") tsumitateAnnualUsed += amt;
  }

  // 生涯枠: NISA口座の残存取得簿価(FIFOで売却分を控除)
  const remainingCost = (account: TxAccount[]) => {
    const bySymbol = new Map<string, Transaction[]>();
    for (const t of txns) {
      if (!account.includes(t.account)) continue;
      if (!bySymbol.has(t.symbol)) bySymbol.set(t.symbol, []);
      bySymbol.get(t.symbol)!.push(t);
    }
    let cost = 0;
    for (const [, list] of bySymbol) {
      const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
      const lots: Lot[] = [];
      for (const t of sorted) {
        if (t.side === "buy") lots.push({ qty: t.quantity, price: t.price });
        else {
          let rem = t.quantity;
          while (rem > 0 && lots.length > 0) {
            const lot = lots[0];
            const used = Math.min(rem, lot.qty);
            lot.qty -= used; rem -= used;
            if (lot.qty <= 1e-9) lots.shift();
          }
        }
      }
      const fx = fxToJpy(sorted[0]?.currency ?? "JPY");
      cost += lots.reduce((a, l) => a + l.qty * l.price * fx, 0);
    }
    return cost;
  };

  return {
    growthAnnualUsed,
    tsumitateAnnualUsed,
    lifetimeUsed: remainingCost(["growth", "tsumitate"]),
    growthLifetimeUsed: remainingCost(["growth"]),
    year,
  };
}
