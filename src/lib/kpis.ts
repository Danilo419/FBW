// src/lib/kpis.ts
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";

/**
 * Orders shipped = count of paid/fulfilled orders.
 * We treat an order as “shipped” KPI-wise if it's paid or beyond.
 */
export async function getOrdersShippedCount(): Promise<number> {
  return prisma.order.count({
    where: {
      OR: [
        { paidAt: { not: null } },
        { status: { in: ["paid", "shipped", "delivered"] } },
      ],
    },
  });
}

/**
 * Countries served = distinct shippingCountry among paid/fulfilled orders.
 */
export async function getCountriesServedCount(): Promise<number> {
  const rows = await prisma.order.findMany({
    where: {
      OR: [
        { paidAt: { not: null } },
        { status: { in: ["paid", "shipped", "delivered"] } },
      ],
      shippingCountry: { not: null },
    },
    select: { shippingCountry: true },
  });

  const uniq = new Set(
    rows
      .map((r) => (r.shippingCountry ?? "").trim().toLowerCase())
      .filter(Boolean)
  );

  return uniq.size;
}

/* ------------------------------------------------------------------ */
/* Total Revenue (paid) — always sum in cents                          */
/* ------------------------------------------------------------------ */

type PaidOrderRow = {
  totalCents: number | null;
  total: number | null; // legacy float in currency units
  shipping: number | null; // cents
  tax: number | null; // cents
  items: { totalPrice: number }[];
};

function orderToCents(o: PaidOrderRow): number {
  // 1) Preferred: totalCents persisted by Stripe/PayPal flows
  if (typeof o.totalCents === "number") return o.totalCents;

  // 2) Fallback: sum items + shipping + tax (all cents)
  const items = o.items.reduce((s, it) => s + (it.totalPrice || 0), 0);
  if (items || o.shipping || o.tax) {
    return items + (o.shipping || 0) + (o.tax || 0);
  }

  // 3) Legacy: total in currency units → convert to cents
  if (typeof o.total === "number") return Math.round(o.total * 100);

  return 0;
}

/**
 * Sum of paid/fulfilled orders in cents.
 */
export async function getTotalRevenuePaidCents(): Promise<number> {
  const paidOrders = await prisma.order.findMany({
    where: {
      OR: [
        { paidAt: { not: null } },
        { status: { in: ["paid", "shipped", "delivered"] } },
      ],
    },
    select: {
      totalCents: true,
      total: true,
      shipping: true,
      tax: true,
      items: { select: { totalPrice: true } },
    },
  });

  return paidOrders.reduce((sum, o) => sum + orderToCents(o as PaidOrderRow), 0);
}

/**
 * Convenience helper to format the total revenue KPI as a label.
 */
export async function getTotalRevenuePaidLabel(
  currency = "EUR",
  locale?: string
): Promise<string> {
  const cents = await getTotalRevenuePaidCents();
  return formatMoney(cents, currency, locale);
}
