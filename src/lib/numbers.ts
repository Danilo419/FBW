// src/lib/numbers.ts
/** Format an integer with locale thousand separators (defaults to pt-PT → 1.000, 10.000, …) */
export function formatInt(n: number, locale = "pt-PT") {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(n);
}
