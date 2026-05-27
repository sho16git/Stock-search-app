export function formatNumber(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString("ja-JP", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatPercent(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatCurrency(
  value: number | null | undefined,
  currency: string | null | undefined,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const code = (currency ?? "USD").toUpperCase();
  try {
    return value.toLocaleString("ja-JP", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    });
  } catch {
    return `${value.toLocaleString("ja-JP")} ${code}`;
  }
}

export function formatLargeNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1e12) return `${(value / 1e12).toFixed(2)}兆`;
  if (abs >= 1e8) return `${(value / 1e8).toFixed(2)}億`;
  if (abs >= 1e4) return `${(value / 1e4).toFixed(2)}万`;
  return value.toLocaleString("ja-JP");
}
