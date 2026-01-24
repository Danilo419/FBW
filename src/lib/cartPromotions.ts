// src/lib/cartPromotions.ts
export const MAX_FREE_ITEMS_PER_ORDER = 2;

export type CartLine = {
  id: string;
  name: string;
  unitAmountCents: number; // preço REAL do item (cents)
  qty: number;
  image?: string | null;
};

export type AppliedLine = CartLine & {
  payQty: number;
  freeQty: number;
};

export type PromoResult = {
  promoName: "NONE" | "BUY_2_GET_3" | "BUY_3_GET_5";
  freeItemsApplied: number;
  shippingCents: number;
  lines: AppliedLine[];
};

function getTier(totalQty: number): PromoResult["promoName"] {
  if (totalQty >= 5) return "BUY_3_GET_5"; // 5 items -> 2 free
  if (totalQty >= 3) return "BUY_2_GET_3"; // 3 items -> 1 free
  return "NONE"; // 0-2 items -> no promo
}

function freeCountForTier(tier: PromoResult["promoName"]): number {
  if (tier === "BUY_3_GET_5") return 2;
  if (tier === "BUY_2_GET_3") return 1;
  return 0;
}

export function applyPromotions(lines: CartLine[]): PromoResult {
  const safeLines = (lines ?? []).map((l) => ({
    ...l,
    id: String(l.id),
    name: String(l.name ?? "Item"),
    unitAmountCents: Math.max(0, Math.floor(Number(l.unitAmountCents) || 0)),
    qty: Math.max(0, Math.floor(Number(l.qty) || 0)),
  }));

  const totalQty = safeLines.reduce((a, l) => a + (l.qty ?? 0), 0);
  const tier = getTier(totalQty);

  // ✅ Shipping rule:
  // - 1–2 items: shipping 5€
  // - 3+ items (BUY_2_GET_3 / BUY_3_GET_5): shipping grátis
  const shippingCents = tier === "NONE" ? (totalQty > 0 ? 500 : 0) : 0;

  // Quantidade de grátis permitida + hard cap
  let freeToApply = Math.min(freeCountForTier(tier), MAX_FREE_ITEMS_PER_ORDER);

  if (freeToApply <= 0 || safeLines.length === 0) {
    return {
      promoName: tier,
      freeItemsApplied: 0,
      shippingCents,
      lines: safeLines.map((l) => ({ ...l, payQty: l.qty, freeQty: 0 })),
    };
  }

  // Expande para unidades para garantir "cheapest ones" 100% correto
  const units: { lineIndex: number; unitAmountCents: number }[] = [];
  safeLines.forEach((l, i) => {
    for (let k = 0; k < l.qty; k++) {
      units.push({ lineIndex: i, unitAmountCents: l.unitAmountCents });
    }
  });

  units.sort((a, b) => a.unitAmountCents - b.unitAmountCents);

  // Marca os N mais baratos como free
  const freeByLineIndex = new Map<number, number>();
  for (let i = 0; i < units.length && freeToApply > 0; i++) {
    const idx = units[i]!.lineIndex;
    freeByLineIndex.set(idx, (freeByLineIndex.get(idx) ?? 0) + 1);
    freeToApply--;
  }

  const applied: AppliedLine[] = safeLines.map((l, i) => {
    const freeQty = Math.min(freeByLineIndex.get(i) ?? 0, l.qty);
    const payQty = Math.max(0, l.qty - freeQty);
    return { ...l, payQty, freeQty };
  });

  const freeItemsApplied = applied.reduce((a, l) => a + l.freeQty, 0);

  return {
    promoName: tier,
    freeItemsApplied,
    shippingCents,
    lines: applied,
  };
}
