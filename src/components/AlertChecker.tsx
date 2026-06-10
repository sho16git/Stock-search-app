"use client";

/**
 * AlertChecker - mounted globally in layout.
 * Polls active alerts every 60s and fires browser/in-app notifications.
 */

import { useEffect, useRef, useState } from "react";
import { BellRing, X } from "lucide-react";
import { getAlerts, checkAlerts, type PriceAlert } from "@/lib/alerts";
import { formatNumber } from "@/lib/format";

// ── Toast ──────────────────────────────────────────────────────────────────────
function AlertToast({
  alerts,
  onDismiss,
}: {
  alerts: PriceAlert[];
  onDismiss: () => void;
}) {
  // Auto-dismiss after 8s
  useEffect(() => {
    const t = setTimeout(onDismiss, 8000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  if (alerts.length === 0) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[90vw] max-w-sm animate-slide-up">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-amber-300 dark:border-amber-700 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-100 dark:border-amber-900/40">
          <BellRing className="w-4 h-4 text-amber-500 animate-bounce" />
          <span className="text-sm font-bold text-amber-700 dark:text-amber-300 flex-1">
            価格アラート発動！
          </span>
          <button onClick={onDismiss} className="text-zinc-400 hover:text-zinc-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-4 py-3 space-y-2">
          {alerts.map(a => (
            <div key={a.id} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{a.symbol}</span>
                <span className="text-zinc-500">{a.name}</span>
              </div>
              <div className={`font-mono font-bold ${a.direction === "above" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                {a.direction === "above" ? "▲" : "▼"} {formatNumber(a.targetPrice)} 達成
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AlertChecker() {
  const [toastAlerts, setToastAlerts] = useState<PriceAlert[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const runCheck = async () => {
    const pending = getAlerts().filter(a => !a.triggered);
    if (pending.length === 0) return;

    // Fetch prices for all pending alert symbols
    const symbols = [...new Set(pending.map(a => a.symbol))];
    try {
      const res = await fetch(`/api/quotes?symbols=${encodeURIComponent(symbols.join(","))}`);
      if (!res.ok) return;
      const data: { quotes: { symbol: string; regularMarketPrice?: number }[] } = await res.json();
      const priceMap: Record<string, number> = {};
      for (const q of data.quotes ?? []) {
        if (q.regularMarketPrice != null) priceMap[q.symbol] = q.regularMarketPrice;
      }

      const triggered = checkAlerts(priceMap);
      if (triggered.length === 0) return;

      // Browser push notification
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        for (const a of triggered) {
          new Notification(`🔔 アラート: ${a.symbol}`, {
            body: `${formatNumber(a.targetPrice)} ${a.direction === "above" ? "以上" : "以下"} になりました`,
            icon: "/icon.png",
          });
        }
      } else {
        // In-app toast
        setToastAlerts(triggered);
      }
    } catch {
      // silently fail
    }
  };

  useEffect(() => {
    // Initial check after 5s (page load)
    const init = setTimeout(() => {
      runCheck();
    }, 5000);

    // Then every 60s
    timerRef.current = setInterval(runCheck, 60_000);

    return () => {
      clearTimeout(init);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (toastAlerts.length === 0) return null;

  return (
    <AlertToast
      alerts={toastAlerts}
      onDismiss={() => setToastAlerts([])}
    />
  );
}
