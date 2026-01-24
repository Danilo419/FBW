"use server";

import Stripe from "stripe";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applyPromotions, type CartLine } from "@/lib/cartPromotions";

/**
 * ✅ Fix TS error:
 * - Do NOT pin apiVersion here (your installed stripe typings expect a different literal)
 */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {});

function originFromHeaders() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

export async function createCheckoutSession() {
  const session = await getServerSession(authOptions);

  // ✅ Fix TS error: cookies() returns Promise<ReadonlyRequestCookies> in your setup
  const jar = await cookies();

  // identifica carrinho (ajusta ao teu projeto; pelo teu repo usas mais "sid")
  const cartId = jar.get("cartId")?.value ?? null;

  if (!cartId) throw new Error("Cart not found.");

  // ✅ include product to access name/image properly (your cart items don't have name/image fields)
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
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

  if (!cart || cart.items.length === 0) throw new Error("Cart is empty.");

  // ✅ Build lines using YOUR actual fields:
  // - name: it.product.name
  // - unitAmountCents: it.unitPrice
  // - image: first product imageUrl if exists
  const lines: CartLine[] = cart.items.map((it: any) => ({
    id: String(it.id),
    name: String(it.product?.name ?? ""),
    unitAmountCents: Math.max(0, Number(it.unitPrice ?? 0)),
    qty: Math.max(0, Number(it.qty ?? 0)),
    image: (it.product?.imageUrls?.[0] ?? null) as any,
  }));

  // ✅ Apply promotions on server (same logic as cart UI + checkout route)
  const promo = applyPromotions(lines);

  // ✅ Build Stripe line items (paid + free items at 0€)
  const stripeLineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

  for (const l of promo.lines) {
    if (l.payQty > 0) {
      stripeLineItems.push({
        quantity: l.payQty,
        price_data: {
          currency: "eur",
          unit_amount: l.unitAmountCents,
          product_data: {
            name: l.name,
            images: l.image ? [l.image] : undefined,
          },
        },
      });
    }

    if (l.freeQty > 0) {
      stripeLineItems.push({
        quantity: l.freeQty,
        price_data: {
          currency: "eur",
          unit_amount: 0,
          product_data: {
            name: `${l.name} (FREE)`,
            images: l.image ? [l.image] : undefined,
          },
        },
      });
    }
  }

  // ✅ Shipping in Stripe (5€ or FREE)
  const shippingOption: Stripe.Checkout.SessionCreateParams.ShippingOption = {
    shipping_rate_data: {
      type: "fixed_amount",
      fixed_amount: { currency: "eur", amount: promo.shippingCents },
      display_name: promo.shippingCents === 0 ? "Free Shipping" : "Shipping",
    },
  };

  const origin = originFromHeaders();

  const stripeSession = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: stripeLineItems,

    // You can remove this if you want Stripe to auto-select methods
    payment_method_types: ["card"],

    shipping_address_collection: {
      allowed_countries: ["PT", "ES", "FR", "DE", "IT", "NL", "BE", "GB", "US", "CA"],
    },
    shipping_options: [shippingOption],

    customer_email: session?.user?.email ?? undefined,

    success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/cart`,

    metadata: {
      cartId: String(cartId),
      promoName: promo.promoName,
      freeItemsApplied: String(promo.freeItemsApplied),
      shippingCents: String(promo.shippingCents),
    },
  });

  return { url: stripeSession.url };
}
