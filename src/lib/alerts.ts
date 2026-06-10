/**
 * Price Alert storage (localStorage)
 *
 * Each alert: symbol, name, targetPrice, direction ('above'|'below'), triggered, createdAt
 */

export type AlertDirection = "above" | "below";

export type PriceAlert = {
  id: string;           // uuid-like
  symbol: string;
  name: string | null;
  targetPrice: number;
  direction: AlertDirection;
  triggered: boolean;
  triggeredAt: string | null;
  createdAt: string;
};

const KEY = "stockapp_alerts_v1";

export function getAlerts(): PriceAlert[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as PriceAlert[];
  } catch {
    return [];
  }
}

function saveAlerts(alerts: PriceAlert[]) {
  localStorage.setItem(KEY, JSON.stringify(alerts));
}

export function addAlert(alert: Omit<PriceAlert, "id" | "triggered" | "triggeredAt" | "createdAt">): PriceAlert {
  const newAlert: PriceAlert = {
    ...alert,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    triggered: false,
    triggeredAt: null,
    createdAt: new Date().toISOString(),
  };
  const alerts = getAlerts();
  alerts.unshift(newAlert);
  saveAlerts(alerts);
  return newAlert;
}

export function removeAlert(id: string) {
  saveAlerts(getAlerts().filter(a => a.id !== id));
}

export function clearTriggeredAlerts() {
  saveAlerts(getAlerts().filter(a => !a.triggered));
}

/**
 * Check all pending alerts against a price map { [symbol]: currentPrice }
 * Returns the alerts that were triggered this call (so caller can notify user)
 */
export function checkAlerts(prices: Record<string, number>): PriceAlert[] {
  const alerts = getAlerts();
  const triggered: PriceAlert[] = [];
  let changed = false;

  for (const alert of alerts) {
    if (alert.triggered) continue;
    const price = prices[alert.symbol];
    if (price == null) continue;
    const hit =
      (alert.direction === "above" && price >= alert.targetPrice) ||
      (alert.direction === "below" && price <= alert.targetPrice);
    if (hit) {
      alert.triggered = true;
      alert.triggeredAt = new Date().toISOString();
      triggered.push(alert);
      changed = true;
    }
  }

  if (changed) saveAlerts(alerts);
  return triggered;
}

export function getAlertsForSymbol(symbol: string): PriceAlert[] {
  return getAlerts().filter(a => a.symbol === symbol);
}

/** Count of untriggered (active) alerts */
export function getActiveAlertCount(): number {
  return getAlerts().filter(a => !a.triggered).length;
}
