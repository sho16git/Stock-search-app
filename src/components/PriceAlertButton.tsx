"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing, Plus, Trash2, X } from "lucide-react";
import { addAlert, getAlertsForSymbol, removeAlert, isEventAlert, type PriceAlert } from "@/lib/alerts";
import { formatNumber } from "@/lib/format";

const eventLabel = (a: PriceAlert) =>
  a.kind === "earnings" ? "決算発表" : a.kind === "ex_dividend" ? "配当権利日" : "";
const fmtMd = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" }) : "";

function AlertRow({ a, onRemove, done }: { a: PriceAlert; onRemove: () => void; done?: boolean }) {
  return (
    <div className={`flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3.5 py-2.5 ${done ? "opacity-60" : ""}`}>
      <div className="flex items-center gap-2">
        {isEventAlert(a) ? (
          <>
            <span className="text-xs">{done ? "✅" : a.kind === "earnings" ? "📊" : "💰"}</span>
            <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">{eventLabel(a)}</span>
            <span className="text-xs text-zinc-500">{fmtMd(a.eventDate)}の{a.daysBefore ?? 3}日前に通知</span>
          </>
        ) : (
          <>
            <span className={`text-xs font-bold ${a.direction === "above" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
              {done ? "✅" : a.direction === "above" ? "▲" : "▼"}
            </span>
            <span className="font-mono text-sm font-bold text-zinc-700 dark:text-zinc-200">{formatNumber(a.targetPrice ?? 0)}</span>
            <span className="text-xs text-zinc-500">{a.direction === "above" ? "以上" : "以下"}</span>
          </>
        )}
      </div>
      <button onClick={onRemove} className="w-6 h-6 rounded-lg flex items-center justify-center text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Modal to set / view alerts ────────────────────────────────────────────────
function AlertModal({
  symbol,
  name,
  currentPrice,
  currency,
  onClose,
}: {
  symbol: string;
  name: string | null;
  currentPrice: number | null;
  currency: string;
  onClose: () => void;
}) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [input,  setInput]  = useState("");
  const [dir,    setDir]    = useState<"above" | "below">("above");
  const [error,  setError]  = useState("");

  const [events, setEvents] = useState<{ nextEarningsDate: string | null; exDividendDate: string | null } | null>(null);

  useEffect(() => {
    setAlerts(getAlertsForSymbol(symbol));
    fetch(`/api/events?symbol=${encodeURIComponent(symbol)}`)
      .then((r) => r.json())
      .then((j) => setEvents({ nextEarningsDate: j.nextEarningsDate ?? null, exDividendDate: j.exDividendDate ?? null }))
      .catch(() => setEvents({ nextEarningsDate: null, exDividendDate: null }));
  }, [symbol]);

  const addEventAlert = (kind: "earnings" | "ex_dividend", eventDate: string) => {
    const added = addAlert({ symbol, name, kind, eventDate, daysBefore: 3 });
    setAlerts((prev) => [added, ...prev]);
    if (typeof Notification !== "undefined" && Notification.permission === "default") Notification.requestPermission();
  };
  const hasEventAlert = (kind: "earnings" | "ex_dividend") =>
    alerts.some((a) => a.kind === kind && !a.triggered);

  // Keyboard close
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const handleAdd = () => {
    const val = parseFloat(input.replace(/,/g, ""));
    if (isNaN(val) || val <= 0) { setError("有効な価格を入力してください"); return; }
    setError("");
    const added = addAlert({ symbol, name, targetPrice: val, direction: dir });
    setAlerts(prev => [added, ...prev]);
    setInput("");

    // Request browser notification permission
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  };

  const handleRemove = (id: string) => {
    removeAlert(id);
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const activeAlerts   = alerts.filter(a => !a.triggered);
  const triggeredAlerts = alerts.filter(a => a.triggered);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full sm:max-w-md bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-700 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 items-center justify-center text-white shadow-md shadow-amber-500/25">
              <Bell className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">価格アラート</h3>
              <p className="text-[11px] text-zinc-400">{symbol}{name ? ` · ${name}` : ""}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Current price */}
          {currentPrice != null && (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span>現在価格:</span>
              <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                {formatNumber(currentPrice)} <span className="text-zinc-400">{currency}</span>
              </span>
            </div>
          )}

          {/* Add new alert */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">新しいアラートを追加</p>

            {/* Direction toggle */}
            <div className="flex p-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl gap-0.5">
              <button
                onClick={() => setDir("above")}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                  dir === "above"
                    ? "bg-white dark:bg-zinc-700 shadow-sm text-emerald-700 dark:text-emerald-300"
                    : "text-zinc-500 dark:text-zinc-400"
                }`}
              >
                ▲ 以上になったら
              </button>
              <button
                onClick={() => setDir("below")}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                  dir === "below"
                    ? "bg-white dark:bg-zinc-700 shadow-sm text-rose-700 dark:text-rose-300"
                    : "text-zinc-500 dark:text-zinc-400"
                }`}
              >
                ▼ 以下になったら
              </button>
            </div>

            {/* Price input */}
            <div className="flex gap-2">
              <input
                type="number"
                value={input}
                onChange={e => { setInput(e.target.value); setError(""); }}
                onKeyDown={e => { if (e.key === "Enter") handleAdd(); }}
                placeholder={currentPrice ? `例: ${Math.round(currentPrice * (dir === "above" ? 1.05 : 0.95))}` : "目標価格"}
                className="flex-1 px-3 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm font-mono text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
              />
              <button
                onClick={handleAdd}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white text-sm font-semibold shadow-sm hover:shadow-md hover:brightness-110 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                追加
              </button>
            </div>
            {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
          </div>

          {/* Event alerts (earnings / ex-dividend) */}
          {events && (events.nextEarningsDate || events.exDividendDate) && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">日付アラート（3日前に通知）</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => events.nextEarningsDate && addEventAlert("earnings", events.nextEarningsDate.slice(0, 10))}
                  disabled={!events.nextEarningsDate || hasEventAlert("earnings")}
                  className="flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-violet-400 disabled:opacity-50 disabled:hover:border-zinc-200 transition-colors text-left">
                  <span className="text-xs font-bold flex items-center gap-1">📊 決算発表</span>
                  <span className="text-[10px] text-zinc-400">{events.nextEarningsDate ? `${fmtMd(events.nextEarningsDate)}予定${hasEventAlert("earnings") ? "・設定済" : ""}` : "予定なし"}</span>
                </button>
                <button
                  onClick={() => events.exDividendDate && addEventAlert("ex_dividend", events.exDividendDate.slice(0, 10))}
                  disabled={!events.exDividendDate || hasEventAlert("ex_dividend")}
                  className="flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-violet-400 disabled:opacity-50 disabled:hover:border-zinc-200 transition-colors text-left">
                  <span className="text-xs font-bold flex items-center gap-1">💰 配当権利日</span>
                  <span className="text-[10px] text-zinc-400">{events.exDividendDate ? `${fmtMd(events.exDividendDate)}${hasEventAlert("ex_dividend") ? "・設定済" : ""}` : "予定なし"}</span>
                </button>
              </div>
            </div>
          )}

          {/* Active alerts */}
          {activeAlerts.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                有効なアラート ({activeAlerts.length})
              </p>
              {activeAlerts.map(alert => (
                <AlertRow key={alert.id} a={alert} onRemove={() => handleRemove(alert.id)} />
              ))}
            </div>
          )}

          {/* Triggered alerts */}
          {triggeredAlerts.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">発動済みアラート</p>
              {triggeredAlerts.map(alert => (
                <AlertRow key={alert.id} a={alert} onRemove={() => handleRemove(alert.id)} done />
              ))}
            </div>
          )}

          {/* Empty state */}
          {alerts.length === 0 && (
            <div className="text-center py-4 text-zinc-400">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">アラートはまだ設定されていません</p>
            </div>
          )}

          {/* Note */}
          <p className="text-[10px] text-zinc-400 text-center leading-relaxed border-t border-zinc-100 dark:border-zinc-800 pt-3">
            ※ アラートはこのアプリを開いている間のみチェックされます。<br />
            ブラウザ通知を許可すると音&プッシュ通知で受け取れます。
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main Button ───────────────────────────────────────────────────────────────
export default function PriceAlertButton({
  symbol,
  name,
  currentPrice,
  currency = "USD",
}: {
  symbol: string;
  name?: string | null;
  currentPrice?: number | null;
  currency?: string;
}) {
  const [open,       setOpen]       = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [mounted,    setMounted]    = useState(false);

  useEffect(() => {
    setMounted(true);
    setAlertCount(getAlertsForSymbol(symbol).filter(a => !a.triggered).length);
  }, [symbol]);

  if (!mounted) return null;

  const hasAlerts = alertCount > 0;

  return (
    <>
      {open && (
        <AlertModal
          symbol={symbol}
          name={name ?? null}
          currentPrice={currentPrice ?? null}
          currency={currency}
          onClose={() => {
            setOpen(false);
            setAlertCount(getAlertsForSymbol(symbol).filter(a => !a.triggered).length);
          }}
        />
      )}
      <button
        onClick={() => setOpen(true)}
        className={`relative inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-semibold transition-all hover:-translate-y-0.5 ${
          hasAlerts
            ? "bg-amber-50 dark:bg-amber-950/30 border-amber-400 text-amber-700 dark:text-amber-300"
            : "border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-amber-400 hover:text-amber-600"
        }`}
        title="価格アラートを設定"
      >
        {hasAlerts ? (
          <BellRing className="w-4 h-4" />
        ) : (
          <Bell className="w-4 h-4" />
        )}
        {hasAlerts ? `アラート(${alertCount})` : "アラート"}
        {hasAlerts && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center">
            {alertCount}
          </span>
        )}
      </button>
    </>
  );
}
