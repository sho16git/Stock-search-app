"use client";

import { useState } from "react";
import { Save, Trash2, X } from "lucide-react";
import {
  getHolding,
  removeHolding,
  upsertHolding,
  type Holding,
} from "@/lib/portfolio";

export default function HoldingForm({
  symbol,
  name,
  currency,
  initial,
  onClose,
}: {
  symbol: string;
  name?: string;
  currency?: string;
  initial?: Holding | null;
  onClose: () => void;
}) {
  const existing = initial ?? getHolding(symbol);
  const [quantity, setQuantity] = useState(
    existing?.quantity ? String(existing.quantity) : "",
  );
  const [avgCost, setAvgCost] = useState(
    existing?.avgCost ? String(existing.avgCost) : "",
  );
  const [purchaseDate, setPurchaseDate] = useState(
    existing?.purchaseDate ?? "",
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = parseFloat(quantity);
    const c = parseFloat(avgCost);
    if (!Number.isFinite(q) || q <= 0) return;
    if (!Number.isFinite(c) || c < 0) return;
    upsertHolding({
      symbol,
      name,
      quantity: q,
      avgCost: c,
      currency,
      purchaseDate: purchaseDate || undefined,
    });
    onClose();
  };

  const remove = () => {
    if (!existing) return;
    if (window.confirm(`${symbol} をポートフォリオから削除しますか？`)) {
      removeHolding(symbol);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">
            {existing ? "保有を編集" : "保有株を追加"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
            aria-label="閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-sm">
          <div className="text-xs text-slate-500 uppercase tracking-wider">銘柄</div>
          <div className="font-mono font-semibold text-blue-600 dark:text-blue-400 text-base">
            {symbol}
            {name && (
              <span className="ml-2 text-slate-700 dark:text-slate-300 font-sans font-normal">
                {name}
              </span>
            )}
          </div>
        </div>

        <label className="block">
          <span className="block text-[11px] uppercase tracking-wider text-slate-500 mb-1">
            保有数量 (株)
          </span>
          <input
            type="number"
            step="any"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="例: 100"
            required
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </label>

        <label className="block">
          <span className="block text-[11px] uppercase tracking-wider text-slate-500 mb-1">
            平均取得単価{currency && ` (${currency})`}
          </span>
          <input
            type="number"
            step="any"
            min="0"
            value={avgCost}
            onChange={(e) => setAvgCost(e.target.value)}
            placeholder="例: 2800"
            required
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </label>

        <label className="block">
          <span className="block text-[11px] uppercase tracking-wider text-slate-500 mb-1">
            取得日 (任意)
          </span>
          <input
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </label>

        <div className="flex items-center justify-between gap-2 pt-2">
          {existing ? (
            <button
              type="button"
              onClick={remove}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-sm font-medium transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              削除
            </button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
            >
              <Save className="w-4 h-4" />
              保存
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
