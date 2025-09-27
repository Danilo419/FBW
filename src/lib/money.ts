// src/lib/money.ts

/**
 * Format an integer amount expressed in **cents** into a readable currency.
 *
 * @param cents    Amount in cents
 * @param currency ISO-4217 currency code (default: EUR)
 * @param locale   Optional locale (e.g. "pt-PT" or "en-US")
 */
export function formatMoney(cents: number, currency = "EUR", locale?: string) {
  const v = typeof cents === "number" && Number.isFinite(cents) ? cents : 0;
  return new Intl.NumberFormat(locale ?? undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(v / 100);
}

/** Alias kept for backwards-compat imports (`money`). */
export const money = formatMoney;

/* ------------------------------------------------------------------ */
/* Order helpers                                                       */
/* ------------------------------------------------------------------ */

type OrderItemLike = { totalPrice?: number | null };
type OrderLike = {
  currency?: string | null;
  totalCents?: number | null;
  total?: number | null; // legacy float in currency units
  shipping?: number | null; // cents
  tax?: number | null; // cents
  items?: OrderItemLike[];
};

/**
 * Safely derive a display-ready money label from an order-like object.
 * Priority:
 *  1) order.totalCents
 *  2) sum(items.totalPrice) + shipping + tax   (all in cents)
 *  3) Math.round(order.total * 100)            (legacy float fallback)
 */
export function moneyFromOrder(
  order: OrderLike | any,
  fallbackCurrency = "EUR",
  locale?: string
) {
  const currency = String(order?.currency || fallbackCurrency).toUpperCase();

  let cents: number | null =
    typeof order?.totalCents === "number" ? order.totalCents : null;

  if (cents == null && Array.isArray(order?.items)) {
    const items = order.items.reduce(
      (acc: number, it: OrderItemLike) => acc + (Number(it?.totalPrice) || 0),
      0
    );
    const shipping = Number(order?.shipping) || 0;
    const tax = Number(order?.tax) || 0;
    cents = items + shipping + tax;
  }

  if (cents == null && typeof order?.total === "number") {
    cents = Math.round(order.total * 100);
  }

  const value = typeof cents === "number" ? cents : 0;

  return {
    cents: value,
    currency,
    label: formatMoney(value, currency, locale),
  };
}
