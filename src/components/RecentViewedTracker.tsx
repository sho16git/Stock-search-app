"use client";

import { useEffect } from "react";
import { pushRecent } from "@/lib/recent";

/**
 * Invisible component that records that the user viewed `symbol`.
 * Mount it on each /stock/[symbol] page.
 */
export default function RecentViewedTracker({ symbol }: { symbol: string }) {
  useEffect(() => {
    pushRecent(symbol);
  }, [symbol]);
  return null;
}
