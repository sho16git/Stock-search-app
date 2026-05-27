"use client";

import { useEffect, useState } from "react";
import { Briefcase } from "lucide-react";
import { getHolding, type Holding } from "@/lib/portfolio";
import HoldingForm from "./HoldingForm";

export default function HoldingButton({
  symbol,
  name,
  currency,
}: {
  symbol: string;
  name?: string;
  currency?: string;
}) {
  const [held, setHeld] = useState<Holding | null>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const reload = () => setHeld(getHolding(symbol));
    reload();
    window.addEventListener("portfolio:change", reload);
    return () => window.removeEventListener("portfolio:change", reload);
  }, [symbol]);

  if (!mounted) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
          held
            ? "bg-indigo-100 dark:bg-indigo-900/30 border-indigo-400 text-indigo-800 dark:text-indigo-200"
            : "border-slate-300 dark:border-slate-700 hover:border-indigo-400"
        }`}
      >
        <Briefcase className="inline w-4 h-4 mr-1" />
        {held
          ? `保有中 (${held.quantity.toLocaleString("ja-JP")}株)`
          : "保有を追加"}
      </button>
      {open && (
        <HoldingForm
          symbol={symbol}
          name={name}
          currency={currency}
          initial={held}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
