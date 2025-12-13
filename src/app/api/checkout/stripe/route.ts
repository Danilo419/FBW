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

/* ============================== HELPERS ============================== */

function toAbsoluteImage(
  url: string | null | undefined,
  APP: string
): string | null {
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

    // Auth
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const method = (body?.method ?? "automatic") as Method;

    const APP = await getServerBaseUrl();

    const jar = await cookies();
    const sid = jar.get("sid")?.value ?? null;

    const cart = await prisma.cart.findFirst({
      where: { sessionId: sid ?? undefined },
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
    const subtotal = cart.items.reduce(
      (acc, it) => acc + ((it as any).totalPrice ?? it.qty * it.unitPrice),
      0
    );

    /* -------- Shipping from cookie -------- */
    let shippingFromCookie: Shipping | null = null;
    const rawShip = jar.get("ship")?.value;
    if (rawShip) {
      try {
        shippingFromCookie = JSON.parse(
          Buffer.from(rawShip, "base64").toString("utf8")
        );
      } catch {}
    }

    /* -------- Create local order (PENDING) -------- */
    const createdOrder = await prisma.order.create({
      data: {
        userId,
        sessionId: cart.sessionId ?? null,
        status: "pending",
        currency,
        subtotal,
        shipping: 0,
        tax: 0,
        total: subtotal,
        shippingJson: shippingFromCookie as any,
        items: {
          create: cart.items.map((it) => ({
            productId: it.productId,
            name: it.product.name,
            image: it.product.imageUrls?.[0] ?? null,
            qty: it.qty,
            unitPrice: it.unitPrice,
            totalPrice:
              (it as any).totalPrice ?? it.qty * it.unitPrice,
            snapshotJson: (it as any).optionsJson ?? {},
          })),
        },
      },
      include: { items: true },
    });

    const success_url = `${APP}/checkout/success?order=${createdOrder.id}&provider=stripe&session_id={CHECKOUT_SESSION_ID}`;
    const cancel_url = `${APP}/cart`;

    const line_items = createdOrder.items.map((it) => {
      const img = toAbsoluteImage(it.image, APP);
      return {
        quantity: it.qty,
        price_data: {
          currency,
          unit_amount: it.unitPrice,
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
      userId,
      ...shippingToMetadata(shippingFromCookie),
    };

    const stripeSession = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url,
      cancel_url,
      line_items,
      metadata,
      client_reference_id: userId,
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
    return NextResponse.json(
      { error: err?.message ?? "Stripe error" },
      { status: 400 }
    );
  }
}
