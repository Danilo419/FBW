// src/app/api/checkout/stripe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { getServerBaseUrl } from "@/lib/origin";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

/* ============================== TYPES ============================== */

type Method =
  | "card"
  | "link"
  | "multibanco"
  | "klarna"
  | "revolut_pay"
  | "satispay"
  | "amazon_pay"
  | "automatic";

type Shipping = {
  name?: string;
  phone?: string;
  email?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
};

type CartItemRow = {
  productId: string;
  qty: number;
  unitPrice: number; // cents
  product: { name: string; imageUrls: string[] | null };
  optionsJson?: any;
  totalPrice?: number | null;
};

/* ============================== PROMOS ============================== */

const MAX_FREE_ITEMS_PER_ORDER = 2;

type PromoName = "NONE" | "BUY_1_GET_1" | "BUY_2_GET_3" | "BUY_3_GET_5";

function getTier(totalQty: number): PromoName {
  if (totalQty >= 5) return "BUY_3_GET_5"; // 5 -> 2 free
  if (totalQty >= 3) return "BUY_2_GET_3"; // 3 -> 1 free
  if (totalQty >= 2) return "BUY_1_GET_1"; // 2 -> 1 free
  return "NONE";
}

function freeCountForTier(tier: PromoName) {
  if (tier === "BUY_3_GET_5") return 2;
  if (tier === "BUY_2_GET_3") return 1;
  if (tier === "BUY_1_GET_1") return 1;
  return 0;
}

function shippingForTier(totalQty: number, tier: PromoName) {
  // Regras:
  // - 1 item -> 5€ shipping
  // - 2 items (Buy 1 Get 1) -> 5€ shipping
  // - 3+ items (Buy 2 Get 3 / Buy 3 Get 5) -> FREE shipping
  if (tier === "BUY_2_GET_3" || tier === "BUY_3_GET_5") return 0;
  return totalQty >= 3 ? 0 : 500;
}

type AppliedItem = {
  idx: number;
  payQty: number;
  freeQty: number;
};

function applyPromotionsCheapest(items: CartItemRow[]) {
  const totalQty = items.reduce((a, it) => a + (it.qty ?? 0), 0);
  const tier = getTier(totalQty);
  let freeToApply = Math.min(freeCountForTier(tier), MAX_FREE_ITEMS_PER_ORDER);

  const applied: AppliedItem[] = items.map((_, idx) => ({
    idx,
    payQty: items[idx]!.qty,
    freeQty: 0,
  }));

  if (freeToApply <= 0) {
    return {
      tier,
      totalQty,
      freeApplied: 0,
      applied,
    };
  }

  // expande para unidades e ordena por mais barato
  const units: { idx: number; unitPrice: number }[] = [];
  items.forEach((it, idx) => {
    const q = it.qty ?? 0;
    for (let k = 0; k < q; k++) units.push({ idx, unitPrice: it.unitPrice });
  });

  units.sort((a, b) => a.unitPrice - b.unitPrice);

  for (let i = 0; i < units.length && freeToApply > 0; i++) {
    const idx = units[i]!.idx;
    applied[idx]!.freeQty += 1;
    applied[idx]!.payQty -= 1;
    freeToApply--;
  }

  const freeApplied = applied.reduce((a, x) => a + x.freeQty, 0);

  return {
    tier,
    totalQty,
    freeApplied,
    applied,
  };
}

/* ============================== HELPERS ============================== */

function toAbsoluteImage(url: string | null | undefined, APP: string): string | null {
  if (!url) return null;
  const t = url.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith("/")) return `${APP}${t}`;
  return null;
}

/**
 * ✅ Stripe metadata MUST be Record<string, string>
 * ❌ undefined values are NOT allowed
 */
function shippingToMetadata(s?: Shipping | null): Record<string, string> {
  const out: Record<string, string> = {};

  const put = (key: string, value?: string) => {
    if (value && value.trim()) out[key] = value.slice(0, 500);
  };

  if (!s) return out;

  put("ship_name", s.name);
  put("ship_phone", s.phone);
  put("ship_email", s.email);

  put("ship_line1", s.address?.line1);
  put("ship_line2", s.address?.line2);
  put("ship_city", s.address?.city);
  put("ship_state", s.address?.state);
  put("ship_postal", s.address?.postal_code);
  put("ship_country", s.address?.country);

  return out;
}

/* ============================== ROUTE ============================== */

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe();

    // ✅ Guest checkout allowed:
    // If user is logged in, we associate the order/session to userId.
    // If not, we proceed using the cart sessionId (sid cookie).
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;

    const body = await req.json().catch(() => ({}));
    const method = (body?.method ?? "automatic") as Method; // (mantido caso uses depois)

    const APP = await getServerBaseUrl();

    const jar = await cookies();
    const sid = jar.get("sid")?.value ?? null;

    if (!sid) {
      return NextResponse.json({ error: "Cart session not found" }, { status: 400 });
    }

    const cart = await prisma.cart.findFirst({
      where: { sessionId: sid },
      include: {
        items: {
          include: {
            product: {
              select: { name: true, imageUrls: true },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const currency = "eur";

    // Normaliza items do cart (cents)
    const cartItems: CartItemRow[] = cart.items.map((it: any) => ({
      productId: it.productId,
      qty: it.qty,
      unitPrice: it.unitPrice,
      product: it.product,
      optionsJson: it.optionsJson ?? it.options ?? it.snapshotJson ?? it.optionsJSON ?? (it as any).optionsJson ?? {},
      totalPrice: (it as any).totalPrice ?? null,
    }));

    const originalSubtotal = cartItems.reduce((acc, it) => acc + it.qty * it.unitPrice, 0);

    // ✅ APLICA PROMOÇÕES (cheapest ones) + shipping
    const promo = applyPromotionsCheapest(cartItems);
    const shippingCents = shippingForTier(promo.totalQty, promo.tier);

    const paidSubtotal = promo.applied.reduce((acc, row) => {
      const it = cartItems[row.idx]!;
      return acc + row.payQty * it.unitPrice;
    }, 0);

    const discountCents = Math.max(0, originalSubtotal - paidSubtotal);
    const totalCents = paidSubtotal + shippingCents;

    /* -------- Shipping from cookie -------- */
    let shippingFromCookie: Shipping | null = null;
    const rawShip = jar.get("ship")?.value;
    if (rawShip) {
      try {
        shippingFromCookie = JSON.parse(Buffer.from(rawShip, "base64").toString("utf8"));
      } catch {}
    }

    /* -------- Create local order (PENDING) -------- */
    const orderItemsCreate = promo.applied.flatMap((row) => {
      const it = cartItems[row.idx]!;
      const img = it.product.imageUrls?.[0] ?? null;
      const baseSnapshot = (it as any).optionsJson ?? {};

      const out: any[] = [];

      if (row.payQty > 0) {
        out.push({
          productId: it.productId,
          name: it.product.name,
          image: img,
          qty: row.payQty,
          unitPrice: it.unitPrice,
          totalPrice: row.payQty * it.unitPrice,
          snapshotJson: baseSnapshot,
        });
      }

      if (row.freeQty > 0) {
        out.push({
          productId: it.productId,
          name: `${it.product.name} (FREE)`,
          image: img,
          qty: row.freeQty,
          unitPrice: 0,
          totalPrice: 0,
          snapshotJson: {
            ...baseSnapshot,
            __isFree: true,
            __originalUnitPrice: it.unitPrice,
          },
        });
      }

      return out;
    });

    const createdOrder = await prisma.order.create({
      data: {
        userId: userId ?? null, // ✅ allow guest
        sessionId: cart.sessionId ?? sid,
        status: "pending",
        currency,

        subtotal: originalSubtotal, // "antes"
        shipping: shippingCents,
        tax: 0,
        total: totalCents, // "a pagar"

        shippingJson: shippingFromCookie as any,
        items: { create: orderItemsCreate },
      },
      include: { items: true },
    });

    const success_url = `${APP}/checkout/success?order=${createdOrder.id}&provider=stripe&session_id={CHECKOUT_SESSION_ID}`;
    const cancel_url = `${APP}/cart`;

    // ✅ line_items pagos + grátis (0€)
    const line_items = createdOrder.items.map((it) => {
      const img = toAbsoluteImage(it.image, APP);
      return {
        quantity: it.qty,
        price_data: {
          currency,
          unit_amount: it.unitPrice, // 0 para FREE items
          product_data: {
            name: it.name,
            ...(img ? { images: [img] } : {}),
          },
        },
      };
    });

    /* -------- METADATA (100% SAFE) -------- */
    const metadata: Record<string, string> = {
      orderId: createdOrder.id,
      promoName: promo.tier,
      freeItemsApplied: String(promo.freeApplied),
      shippingCents: String(shippingCents),
      discountCents: String(discountCents),
      ...(userId ? { userId } : {}),
      ...shippingToMetadata(shippingFromCookie),
    };

    // ✅ Shipping no Stripe (5€ ou FREE)
    const shipping_options = [
      {
        shipping_rate_data: {
          type: "fixed_amount" as const,
          fixed_amount: { currency, amount: shippingCents },
          display_name: shippingCents === 0 ? "Free Shipping" : "Shipping",
        },
      },
    ];

    const stripeSession = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url,
      cancel_url,
      line_items,
      shipping_options,
      metadata,

      ...(userId ? { client_reference_id: userId } : {}),

      ...(shippingFromCookie?.email
        ? { customer_email: shippingFromCookie.email.slice(0, 200) }
        : {}),

      // NOTE: kept "method" variable to avoid breaking your flow,
      // you can wire it to payment_method_types / automatic payment methods if you want later.
    });

    await prisma.order.update({
      where: { id: createdOrder.id },
      data: { stripeSessionId: stripeSession.id },
    });

    return NextResponse.json({
      url: stripeSession.url,
      sessionId: stripeSession.id,
    });
  } catch (err: any) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Stripe error" },
      { status: 400 }
    );
  }
}
