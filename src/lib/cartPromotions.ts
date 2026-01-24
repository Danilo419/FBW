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
  promoName: "NONE" | "BUY_1_GET_1" | "BUY_2_GET_3" | "BUY_3_GET_5";
  freeItemsApplied: number;
  shippingCents: number;
  lines: AppliedLine[];
};

function getTier(totalQty: number): PromoResult["promoName"] {
  if (totalQty >= 5) return "BUY_3_GET_5"; // 5 items -> 2 free
  if (totalQty >= 3) return "BUY_2_GET_3"; // 3 items -> 1 free
  if (totalQty >= 2) return "BUY_1_GET_1"; // 2 items -> 1 free
  return "NONE";
}

function freeCountForTier(tier: PromoResult["promoName"]): number {
  if (tier === "BUY_3_GET_5") return 2;
  if (tier === "BUY_2_GET_3") return 1;
  if (tier === "BUY_1_GET_1") return 1;
  return 0;
}

export function applyPromotions(lines: CartLine[]): PromoResult {
  const totalQty = lines.reduce((a, l) => a + (l.qty ?? 0), 0);
  const tier = getTier(totalQty);

  // Shipping rule (pelo que descreveste):
  // - 1 item: shipping 5€
  // - BUY_1_GET_1: shipping 5€
  // - BUY_2_GET_3 e BUY_3_GET_5: shipping grátis
  const shippingCents =
    tier === "BUY_2_GET_3" || tier === "BUY_3_GET_5" ? 0 : 500;

  // Quantidade de grátis permitida + hard cap
  let freeToApply = Math.min(freeCountForTier(tier), MAX_FREE_ITEMS_PER_ORDER);
  if (freeToApply <= 0) {
    return {
      promoName: tier,
      freeItemsApplied: 0,
      shippingCents,
      lines: lines.map((l) => ({ ...l, payQty: l.qty, freeQty: 0 })),
    };
  }

  // Expande para unidades para garantir "cheapest ones" 100% correto
  const units: { lineIndex: number; unitAmountCents: number }[] = [];
  lines.forEach((l, i) => {
    for (let k = 0; k < l.qty; k++) units.push({ lineIndex: i, unitAmountCents: l.unitAmountCents });
  });

  units.sort((a, b) => a.unitAmountCents - b.unitAmountCents);

  // Marca os N mais baratos como free
  const freeByLineIndex = new Map<number, number>();
  for (let i = 0; i < units.length && freeToApply > 0; i++) {
    const idx = units[i]!.lineIndex;
    freeByLineIndex.set(idx, (freeByLineIndex.get(idx) ?? 0) + 1);
    freeToApply--;
  }

  const applied: AppliedLine[] = lines.map((l, i) => {
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
