"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type CurrencyCtx = {
  /** true のとき円換算表示 */
  showJpy: boolean;
  setShowJpy: (v: boolean | ((prev: boolean) => boolean)) => void;
  /** USD→JPY レート (null = 未取得) */
  jpyRate: number | null;
  setJpyRate: (v: number | null) => void;
};

export const CurrencyContext = createContext<CurrencyCtx>({
  showJpy: false,
  setShowJpy: () => {},
  jpyRate: null,
  setJpyRate: () => {},
});

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [showJpy, setShowJpy] = useState(false);
  const [jpyRate, setJpyRate] = useState<number | null>(null);

  return (
    <CurrencyContext.Provider value={{ showJpy, setShowJpy, jpyRate, setJpyRate }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export const useCurrency = () => useContext(CurrencyContext);
