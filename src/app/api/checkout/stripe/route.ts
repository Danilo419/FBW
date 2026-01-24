// src/app/api/checkout/stripe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { getServerBaseUrl } from "@/lib/origin";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { applyPromotions, MAX_FREE_ITEMS_PER_ORDER } from "@/lib/cartPromotions";

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

    // ✅ Guest checkout allowed
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;

    const body = await req.json().catch(() => ({}));
    const method = (body?.method ?? "automatic") as Method; // (mantido caso uses depois)
    void method; // silence unused warning if not used yet

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
      qty: Math.max(0, Number(it.qty ?? 0)),
      unitPrice: Math.max(0, Number(it.unitPrice ?? 0)),
      product: it.product,
      optionsJson:
        it.optionsJson ??
        it.options ??
        it.snapshotJson ??
        it.optionsJSON ??
        (it as any).optionsJson ??
        {},
      totalPrice: (it as any).totalPrice ?? null,
    }));

    const originalSubtotal = cartItems.reduce((acc, it) => acc + it.qty * it.unitPrice, 0);

    // ✅ SINGLE SOURCE OF TRUTH: same as cart page
    const promo = applyPromotions(
      cartItems.map((it, idx) => ({
        id: String(idx), // id local (index) para mapear de volta
        name: String(it.product?.name ?? "Item"),
        unitAmountCents: it.unitPrice,
        qty: it.qty,
        image: it.product?.imageUrls?.[0] ?? null,
      }))
    );

    // Map promo result back to cartItems by index
    const paidSubtotal = promo.lines.reduce((acc, line) => {
      const idx = Number(line.id);
      const it = cartItems[idx];
      if (!it) return acc;
      return acc + line.payQty * it.unitPrice;
    }, 0);

    const discountCents = Math.max(0, originalSubtotal - paidSubtotal);
    const shippingCents = promo.shippingCents; // ✅ 500 when 1–2 items, 0 when 3+
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
    const orderItemsCreate = promo.lines.flatMap((line) => {
      const idx = Number(line.id);
      const it = cartItems[idx]!;
      const img = it.product.imageUrls?.[0] ?? null;
      const baseSnapshot = it.optionsJson ?? {};

      const out: any[] = [];

      if (line.payQty > 0) {
        out.push({
          productId: it.productId,
          name: it.product.name,
          image: img,
          qty: line.payQty,
          unitPrice: it.unitPrice,
          totalPrice: line.payQty * it.unitPrice,
          snapshotJson: baseSnapshot,
        });
      }

      if (line.freeQty > 0) {
        out.push({
          productId: it.productId,
          name: `${it.product.name} (FREE)`,
          image: img,
          qty: line.freeQty,
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
        userId: userId ?? null,
        sessionId: cart.sessionId ?? sid,
        status: "pending",
        currency,

        subtotal: originalSubtotal, // antes
        shipping: shippingCents,
        tax: 0,
        total: totalCents, // a pagar

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
      promoName: String(promo.promoName ?? "NONE"),
      freeItemsApplied: String(promo.freeItemsApplied ?? 0),
      shippingCents: String(shippingCents),
      discountCents: String(discountCents),
      maxFreeItemsCap: String(MAX_FREE_ITEMS_PER_ORDER),
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
    return NextResponse.json({ error: err?.message ?? "Stripe error" }, { status: 400 });
  }
}
