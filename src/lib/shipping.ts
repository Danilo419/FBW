// src/lib/shipping.ts

export type CartChannel = "GLOBAL" | "PT_STOCK_CTT";

export type ShippingResult = {
  shippingCents: number;
  label: string;
  carrier?: "CTT" | "GLOBAL";
  eta?: string; // texto curto tipo "2–3 business days"
};

/**
 * ✅ Regras:
 * - GLOBAL: usa a lógica antiga (promoções) — aqui devolvemos "null" para o caller continuar a usar applyPromotions()
 * - PT_STOCK_CTT (Portugal stock):
 *    1 item  -> 6€
 *    2 items -> 3€
 *    3+      -> FREE
 *
 * NOTA: este ficheiro é deliberadamente "pequeno" e puro,
 * para poderes chamar tanto no Cart, Checkout, Stripe webhooks, etc.
 */

/** helper: clamp int >= 0 */
function toNonNegInt(n: unknown) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.floor(x));
}

/**
 * Calcula shipping apenas com base no total de unidades de um "channel".
 * Útil quando já sabes que o carrinho é todo PT_STOCK_CTT.
 */
export function getPtStockCttShippingByQty(totalQty: number): ShippingResult {
  const q = toNonNegInt(totalQty);

  if (q <= 0) {
    return {
      shippingCents: 0,
      label: "CTT Shipping (Portugal)",
      carrier: "CTT",
      eta: "2–3 business days",
    };
  }

  if (q === 1) {
    return {
      shippingCents: 600,
      label: "CTT Shipping (Portugal)",
      carrier: "CTT",
      eta: "2–3 business days",
    };
  }

  if (q === 2) {
    return {
      shippingCents: 300,
      label: "CTT Shipping (Portugal)",
      carrier: "CTT",
      eta: "2–3 business days",
    };
  }

  return {
    shippingCents: 0,
    label: "CTT Free Shipping (Portugal)",
    carrier: "CTT",
    eta: "2–3 business days",
  };
}

/**
 * Forma genérica para calcular shipping a partir de linhas do carrinho,
 * suportando canais diferentes.
 *
 * Se misturares canais, isto devolve "GLOBAL" (ou 0) — a regra do teu projeto
 * é NÃO permitir MIXED carts, então normalmente nunca vais cair aqui com MIXED.
 */
export function getShippingForCart(
  items: Array<{ quantity: number; channel: CartChannel }>
): ShippingResult {
  const totals = new Map<CartChannel, number>();
  for (const it of items) {
    const ch = it.channel ?? "GLOBAL";
    const q = toNonNegInt(it.quantity);
    totals.set(ch, (totals.get(ch) ?? 0) + q);
  }

  const hasGlobal = (totals.get("GLOBAL") ?? 0) > 0;
  const hasPt = (totals.get("PT_STOCK_CTT") ?? 0) > 0;

  // ✅ Se por algum motivo vier MIXED, devolvemos 0 e o caller deve bloquear checkout
  if (hasGlobal && hasPt) {
    return {
      shippingCents: 0,
      label: "Shipping",
      carrier: "GLOBAL",
    };
  }

  if (hasPt) {
    return getPtStockCttShippingByQty(totals.get("PT_STOCK_CTT") ?? 0);
  }

  // GLOBAL: aqui não calculamos (promoções fazem isso)
  return {
    shippingCents: 0,
    label: "Shipping",
    carrier: "GLOBAL",
  };
}

/** Pequeno helper para UI (ex.: ProductConfigurator PT Stock) */
export function getEtaTextForChannel(channel: CartChannel) {
  return channel === "PT_STOCK_CTT" ? "2–3 business days (CTT)" : "7–20 business days";
}