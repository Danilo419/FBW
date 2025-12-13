// src/app/api/stripe/checkout/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// ✅ Remove apiVersion para não bater com o tipo literal do teu pacote Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

function absUrl(path: string) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";
  return `${base}${path}`;
}

function safeInt(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    const userEmail = (session?.user as any)?.email as string | undefined;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Espera receber { cartId }
    const body = await req.json().catch(() => ({}));
    const cartId = String(body?.cartId || "").trim();

    if (!cartId) {
      return NextResponse.json({ error: "Missing cartId" }, { status: 400 });
    }

    const cart = await prisma.cart.findFirst({
      where: { id: cartId, userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return NextResponse.json(
        { error: "Cart not found or empty" },
        { status: 404 }
      );
    }

    // Totais (cents)
    const subtotal = cart.items.reduce((acc, it) => {
      const line = safeInt((it as any).totalPrice, it.qty * it.unitPrice);
      return acc + line;
    }, 0);

    const shipping = 0; // cents (ajusta)
    const tax = 0; // cents (ajusta)
    const total = subtotal + shipping + tax;

    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] =
      cart.items.map((it) => {
        const img = (it.product as any)?.imageUrls?.[0] || undefined;

        return {
          quantity: it.qty,
          price_data: {
            currency: "eur",
            unit_amount: it.unitPrice,
            product_data: {
              name: it.product.name,
              images: img ? [img] : undefined,
              metadata: {
                productId: it.productId,
              },
            },
          },
        };
      });

    const stripeSession = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,

      success_url: absUrl(`/checkout/success?session_id={CHECKOUT_SESSION_ID}`),
      cancel_url: absUrl(`/cart`),

      // ✅ CRÍTICO para o webhook ligar a compra ao utilizador
      client_reference_id: userId,
      metadata: {
        userId,
        cartId,
        subtotal: String(subtotal),
        shipping: String(shipping),
        tax: String(tax),
        totalCents: String(total),
      },

      // Opcional: recolha de morada no Checkout
      shipping_address_collection: {
        allowed_countries: ["PT", "ES", "FR", "DE", "IT", "GB", "NL", "BE", "CH"],
      },

      // ✅ evita erro "session possibly null"
      customer_email: userEmail || undefined,
    });

    if (!stripeSession.url) {
      return NextResponse.json(
        {
          error: "Stripe did not return a hosted checkout URL.",
          sessionId: stripeSession.id,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: String(stripeSession.url),
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
