export function formatCurrency(n: number, opts: { compact?: boolean } = {}): string {
  if (!Number.isFinite(n)) return "$0";
  const abs = Math.abs(n);
  if (opts.compact || abs >= 1_000_000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: abs >= 1_000_000 ? 2 : 1,
    }).format(n);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatNumber(n: number, digits = 0): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(n);
}

export function formatPercent(n: number, digits = 0): string {
  return `${formatNumber(n, digits)}%`;
}
