// src/lib/cartPromotions.ts

export const FREE_SHIPPING_THRESHOLD = 70;
export const DEFAULT_SHIPPING_COST = 5;

export type CartLine = {
  id: string;
  name: string;
  unitAmountCents: number; // preço real do item
  qty: number;
  image?: string | null;
};

export type AppliedLine = CartLine & {
  payQty: number;
  freeQty: number;
};

export type PromoResult = {
  promoName: "NONE";
  freeItemsApplied: number;
  shippingCents: number;
  lines: AppliedLine[];
};

export function applyPromotions(lines: CartLine[]): PromoResult {
  const safeLines = (lines ?? []).map((l) => ({
    ...l,
    id: String(l.id),
    name: String(l.name ?? "Item"),
    unitAmountCents: Math.max(0, Math.floor(Number(l.unitAmountCents) || 0)),
    qty: Math.max(0, Math.floor(Number(l.qty) || 0)),
  }));

  const subtotalCents = safeLines.reduce(
    (acc, line) => acc + line.unitAmountCents * line.qty,
    0
  );

  const shippingCents =
    subtotalCents === 0
      ? 0
      : subtotalCents >= FREE_SHIPPING_THRESHOLD * 100
      ? 0
      : DEFAULT_SHIPPING_COST * 100;

  const applied: AppliedLine[] = safeLines.map((line) => ({
    ...line,
    payQty: line.qty,
    freeQty: 0,
  }));

  return {
    promoName: "NONE",
    freeItemsApplied: 0,
    shippingCents,
    lines: applied,
  };
}