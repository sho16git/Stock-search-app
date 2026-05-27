"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { isWatched, toggleWatch } from "@/lib/watchlist";

export default function WatchlistButton({
  symbol,
  name,
}: {
  symbol: string;
  name?: string;
}) {
  const [watched, setWatched] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setWatched(isWatched(symbol));
  }, [symbol]);

  if (!mounted) {
    return (
      <button
        disabled
        className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm opacity-50"
      >
        <Star className="inline w-4 h-4 mr-1" />
        ウォッチ
      </button>
    );
  }

  return (
    <button
      onClick={() => {
        const now = toggleWatch({ symbol, name });
        setWatched(now);
      }}
      className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
        watched
          ? "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-400 text-yellow-800 dark:text-yellow-200"
          : "border-slate-300 dark:border-slate-700 hover:border-yellow-400"
      }`}
    >
      <Star
        className={`inline w-4 h-4 mr-1 ${watched ? "fill-yellow-500" : ""}`}
      />
      {watched ? "ウォッチ中" : "ウォッチに追加"}
    </button>
  );
}
