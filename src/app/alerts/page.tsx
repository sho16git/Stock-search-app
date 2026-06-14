"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bell, BellRing, Trash2, BellOff } from "lucide-react";
import { getAlerts, removeAlert, clearTriggeredAlerts, isEventAlert, type PriceAlert } from "@/lib/alerts";
import { formatNumber } from "@/lib/format";

const evLabel = (a: PriceAlert) => a.kind === "earnings" ? "決算発表" : a.kind === "ex_dividend" ? "配当権利日" : "";
const evMd = (iso?: string | null) => iso ? new Date(iso).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" }) : "";
const evIcon = (a: PriceAlert) => a.kind === "earnings" ? "📊" : "💰";

function fmtDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("ja-JP", {
    month: "numeric", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AlertsPage() {
  const [alerts,  setAlerts]  = useState<PriceAlert[]>([]);
  const [mounted, setMounted] = useState(false);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | "unsupported">("unsupported");

  useEffect(() => {
    setMounted(true);
    setAlerts(getAlerts());
    if (typeof Notification !== "undefined") {
      setNotifPerm(Notification.permission);
    }
  }, []);

  const handleRemove = (id: string) => {
    removeAlert(id);
    setAlerts(getAlerts());
  };

  const handleClearTriggered = () => {
    clearTriggeredAlerts();
    setAlerts(getAlerts());
  };

  const requestNotifPermission = async () => {
    if (typeof Notification === "undefined") return;
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
  };

  const activeAlerts    = alerts.filter(a => !a.triggered);
  const triggeredAlerts = alerts.filter(a => a.triggered);

  if (!mounted) return null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <header>
        <div className="flex items-center gap-3 mb-4">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            トップ
          </Link>
        </div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
          <span className="inline-flex w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 items-center justify-center text-white shadow-lg shadow-amber-500/25">
            <Bell className="w-5 h-5" />
          </span>
          価格アラート
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          設定した目標価格に達すると通知が届きます。銘柄詳細ページでアラートを追加できます。
        </p>
      </header>

      {/* Notification permission banner */}
      {notifPerm !== "unsupported" && notifPerm !== "granted" && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-4 flex items-start gap-3">
          <BellRing className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              ブラウザ通知を有効にする
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              通知を許可すると、アプリを閉じていてもアラートをプッシュ通知で受け取れます。
            </p>
          </div>
          {notifPerm === "default" && (
            <button
              onClick={requestNotifPermission}
              className="shrink-0 px-3.5 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition-colors"
            >
              許可する
            </button>
          )}
          {notifPerm === "denied" && (
            <span className="shrink-0 text-xs text-amber-600 dark:text-amber-400">ブラウザ設定から許可してください</span>
          )}
        </div>
      )}

      {/* Empty state */}
      {alerts.length === 0 && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-10 text-center">
          <BellOff className="w-12 h-12 text-zinc-200 dark:text-zinc-700 mx-auto mb-3" />
          <p className="text-sm font-semibold text-zinc-500 mb-2">アラートがありません</p>
          <p className="text-xs text-zinc-400">
            銘柄詳細ページの「アラート」ボタンから価格アラートを設定できます。
          </p>
          <Link
            href="/"
            className="inline-block mt-4 px-4 py-2 rounded-xl bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 transition-colors"
          >
            銘柄を探す
          </Link>
        </div>
      )}

      {/* Active alerts */}
      {activeAlerts.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-500" />
              有効なアラート
              <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[10px] font-black">
                {activeAlerts.length}
              </span>
            </h2>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {activeAlerts.map(alert => (
              <div key={alert.id} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                {/* Icon */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 ${
                  isEventAlert(alert)
                    ? "bg-violet-100 dark:bg-violet-900/30 text-violet-600"
                    : alert.direction === "above"
                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600"
                    : "bg-rose-100 dark:bg-rose-900/30 text-rose-600"
                }`}>
                  {isEventAlert(alert) ? evIcon(alert) : alert.direction === "above" ? "▲" : "▼"}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/stock/${encodeURIComponent(alert.symbol)}`}
                      className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {alert.symbol}
                    </Link>
                    {alert.name && (
                      <span className="text-xs text-zinc-400 truncate">{alert.name}</span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {isEventAlert(alert) ? (
                      <span><span className="font-semibold text-violet-600 dark:text-violet-400">{evLabel(alert)} {evMd(alert.eventDate)}</span>{" "}の{alert.daysBefore ?? 3}日前に通知</span>
                    ) : (
                      <>
                        <span className={`font-semibold ${alert.direction === "above" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                          {formatNumber(alert.targetPrice ?? 0)}
                        </span>
                        {" "}{alert.direction === "above" ? "以上" : "以下"}になったら通知
                      </>
                    )}
                  </div>
                </div>

                {/* Date */}
                <div className="text-[10px] text-zinc-400 text-right shrink-0">
                  {fmtDate(alert.createdAt)}
                </div>

                {/* Delete */}
                <button
                  onClick={() => handleRemove(alert.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Triggered alerts */}
      {triggeredAlerts.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
              <span>✅</span>
              発動済みアラート
              <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-[10px] font-black">
                {triggeredAlerts.length}
              </span>
            </h2>
            <button
              onClick={handleClearTriggered}
              className="text-xs text-zinc-400 hover:text-rose-500 transition-colors"
            >
              すべて削除
            </button>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {triggeredAlerts.map(alert => (
              <div key={alert.id} className="flex items-center gap-3 px-4 py-3 opacity-60">
                <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-base shrink-0">
                  ✅
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/stock/${encodeURIComponent(alert.symbol)}`}
                      className="font-mono font-bold text-sm text-zinc-600 dark:text-zinc-400 hover:underline"
                    >
                      {alert.symbol}
                    </Link>
                    {alert.name && (
                      <span className="text-xs text-zinc-400 truncate">{alert.name}</span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    {isEventAlert(alert) ? (
                      <span className="font-semibold">{evLabel(alert)} {evMd(alert.eventDate)}</span>
                    ) : (
                      <><span className="font-semibold">{formatNumber(alert.targetPrice ?? 0)}</span>{" "}{alert.direction === "above" ? "以上" : "以下"}</>
                    )}
                    {" "}· 発動: {fmtDate(alert.triggeredAt)}
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(alert.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-rose-500 transition-colors shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Note */}
      <p className="text-[10px] text-zinc-400 text-center leading-relaxed pb-4">
        ※ アラートはアプリを開いている間、60秒ごとに価格をチェックします。<br />
        ブラウザ通知を許可すると、タブがバックグラウンドでもプッシュ通知が届きます。
      </p>
    </div>
  );
}
