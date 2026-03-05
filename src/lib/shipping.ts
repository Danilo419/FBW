// src/lib/shipping.ts

export type CartChannel = "GLOBAL" | "PT_STOCK_CTT" | "MIXED";

export type ShippingResult = {
  /** total shipping em cêntimos */
  shippingCents: number;

  /** canal do carrinho (usado no UI) */
  cartChannel: CartChannel;

  /** se pode avançar para checkout (ex.: MIXED não deve) */
  canCheckout: boolean;

  /** mensagem opcional para UI */
  message?: string;

  /** breakdown opcional */
  breakdown?: {
    globalQty: number;
    ptQty: number;
    totalQty: number;
  };
};

/**
 * Item mínimo para calcular shipping sem depender do Prisma types.
 * (funciona com cartItem + include product.channel, ou com linhas "flat")
 */
export type ShippingItemLike = {
  qty: number;
  product?: { channel?: string | null } | null;
  channel?: string | null; // caso já venhas com channel no próprio item
};

/** 🔹 regras de shipping (ajusta se quiseres) */
const GLOBAL_SHIPPING_CENTS = 500; // 5€
const PT_1_SHIPPING_CENTS = 600; // 6€
const PT_2_SHIPPING_CENTS = 300; // 3€
const PT_3PLUS_SHIPPING_CENTS = 0; // grátis

function normChannel(v: unknown): "GLOBAL" | "PT_STOCK_CTT" {
  return String(v ?? "").toUpperCase() === "PT_STOCK_CTT" ? "PT_STOCK_CTT" : "GLOBAL";
}

export function getCartChannelFromItems(items: ShippingItemLike[]): CartChannel {
  let hasGlobal = false;
  let hasPt = false;

  for (const it of items) {
    const qty = Math.max(0, Number(it?.qty ?? 0));
    if (qty <= 0) continue;

    const ch = normChannel(it.channel ?? it.product?.channel);
    if (ch === "PT_STOCK_CTT") hasPt = true;
    else hasGlobal = true;
  }

  if (hasGlobal && hasPt) return "MIXED";
  if (hasPt) return "PT_STOCK_CTT";
  return "GLOBAL";
}

export function calcPtStockShippingCents(ptQty: number): number {
  const q = Math.max(0, Math.floor(ptQty || 0));
  if (q <= 0) return 0;
  if (q === 1) return PT_1_SHIPPING_CENTS;
  if (q === 2) return PT_2_SHIPPING_CENTS;
  return PT_3PLUS_SHIPPING_CENTS;
}

export function calcGlobalShippingCents(globalQty: number): number {
  const q = Math.max(0, Math.floor(globalQty || 0));
  if (q <= 0) return 0;
  return GLOBAL_SHIPPING_CENTS;
}

/**
 * ✅ FUNÇÃO PRINCIPAL (usa no cart/page.tsx)
 * Devolve cartChannel + shippingCents.
 */
export function getShippingForCart(items: ShippingItemLike[]): ShippingResult {
  const totalQty = items.reduce((a, it) => a + Math.max(0, Number(it?.qty ?? 0)), 0);

  let globalQty = 0;
  let ptQty = 0;

  for (const it of items) {
    const qty = Math.max(0, Math.floor(Number(it?.qty ?? 0)));
    if (qty <= 0) continue;

    const ch = normChannel(it.channel ?? it.product?.channel);
    if (ch === "PT_STOCK_CTT") ptQty += qty;
    else globalQty += qty;
  }

  const cartChannel = getCartChannelFromItems(items);

  // ✅ se misturar, podes bloquear (recomendado)
  if (cartChannel === "MIXED") {
    return {
      cartChannel,
      shippingCents: 0,
      canCheckout: false,
      message:
        "Your cart has mixed items (GLOBAL + Portugal Delivery). Please checkout separately.",
      breakdown: { globalQty, ptQty, totalQty },
    };
  }

  if (cartChannel === "PT_STOCK_CTT") {
    return {
      cartChannel,
      shippingCents: calcPtStockShippingCents(ptQty),
      canCheckout: true,
      message:
        ptQty >= 3
          ? "Portugal Delivery: free shipping (3+ items)."
          : ptQty === 2
          ? "Portugal Delivery: shipping 3€ (2 items)."
          : ptQty === 1
          ? "Portugal Delivery: shipping 6€ (1 item)."
          : undefined,
      breakdown: { globalQty, ptQty, totalQty },
    };
  }

  // GLOBAL
  return {
    cartChannel: "GLOBAL",
    shippingCents: calcGlobalShippingCents(globalQty),
    canCheckout: true,
    message: globalQty > 0 ? "Global shipping applies." : undefined,
    breakdown: { globalQty, ptQty, totalQty },
  };
}