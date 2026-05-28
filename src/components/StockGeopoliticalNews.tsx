"use client";

import { useEffect, useState } from "react";
import GeopoliticalNews from "./GeopoliticalNews";

/**
 * Fetches the GICS sector for `symbol` from /api/profile,
 * then renders <GeopoliticalNews sector={...} />.
 * Falls back to general macro news if profile fetch fails.
 */
export default function StockGeopoliticalNews({ symbol }: { symbol: string }) {
  const [sector, setSector] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    fetch(`/api/profile?symbol=${encodeURIComponent(symbol)}`)
      .then((r) => r.json())
      .then((j) => setSector((j.gicsId as string | null) ?? null))
      .catch(() => setSector(null));
  }, [symbol]);

  // Still loading sector
  if (sector === undefined) return null;

  return <GeopoliticalNews sector={sector} />;
}
