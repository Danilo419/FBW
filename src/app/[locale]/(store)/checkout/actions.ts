"use server";

import Stripe from "stripe";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applyPromotions, type CartLine } from "@/lib/cartPromotions";
import { getShippingForCart } from "@/lib/shipping";
import {
  DISCOUNT_COOKIE,
  calcDiscountOnProductsOnly,
  getValidDiscountCode,
  normalizeDiscountCode,
} from "@/lib/discount-codes";

/**
 * ✅ Fix TS error:
 * - Do NOT pin apiVersion here (your installed stripe typings expect a different literal)
 */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {});

type CartChannel = "GLOBAL" | "PT_STOCK_CTT" | "MIXED";

type PromoLineLike = {
  id: string;
  name: string;
  unitAmountCents: number;
  qty: number;
  payQty: number;
  freeQty: number;
  image?: string | null;
};

function originFromHeaders() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

function normalizeImageUrl(url: string | null | undefined) {
  const value = String(url ?? "").trim();
  if (!value) return null;
  if (value.startsWith("//")) return `https:${value}`;
  return value;
}

function detectCartChannel(
  items: Array<{
    product?: { channel?: string | null } | null;
  }>
): CartChannel {
  const channels = new Set<string>();

  for (const it of items) {
    channels.add(String(it.product?.channel ?? "GLOBAL"));
  }

  return channels.size > 1
    ? "MIXED"
    : ((Array.from(channels)[0] as CartChannel | undefined) ?? "GLOBAL");
}

function buildPromoLines(
  cartItems: Array<{
    id: string;
    qty: number;
    unitPrice: number;
    product?: {
      name?: string | null;
      imageUrls?: string[] | null;
    } | null;
  }>,
  cartChannel: CartChannel
): {
  promoName: string;
  freeItemsApplied: number;
  shippingCents: number;
  lines: PromoLineLike[];
} {
  const lines: CartLine[] = cartItems.map((it) => ({
    id: String(it.id),
    name: String(it.product?.name ?? ""),
    unitAmountCents: Math.max(0, Number(it.unitPrice ?? 0)),
    qty: Math.max(0, Number(it.qty ?? 0)),
    image: normalizeImageUrl(it.product?.imageUrls?.[0] ?? null),
  }));

  if (cartChannel === "GLOBAL") {
    const promo = applyPromotions(lines);

    return {
      promoName: String((promo as any).promoName ?? "NONE"),
      freeItemsApplied: Math.max(0, Number((promo as any).freeItemsApplied ?? 0)),
      shippingCents: Math.max(0, Number((promo as any).shippingCents ?? 0)),
      lines: ((promo as any).lines ?? []).map((l: any) => ({
        id: String(l.id),
        name: String(l.name ?? ""),
        unitAmountCents: Math.max(0, Number(l.unitAmountCents ?? 0)),
        qty: Math.max(0, Number(l.qty ?? 0)),
        payQty: Math.max(0, Number(l.payQty ?? 0)),
        freeQty: Math.max(0, Number(l.freeQty ?? 0)),
        image: normalizeImageUrl(l.image ?? null),
      })),
    };
  }

  return {
    promoName: "NONE",
    freeItemsApplied: 0,
    shippingCents: 0,
    lines: lines.map((l) => ({
      id: String(l.id),
      name: String(l.name),
      unitAmountCents: Math.max(0, Number(l.unitAmountCents)),
      qty: Math.max(0, Number(l.qty)),
      payQty: Math.max(0, Number(l.qty)),
      freeQty: 0,
      image: normalizeImageUrl((l as any).image ?? null),
    })),
  };
}

function buildDiscountedStripePaidItems(params: {
  lines: PromoLineLike[];
  percentOff: number;
}): {
  stripeLineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
  payableSubtotalCents: number;
  discountAmountCents: number;
} {
  const payableLines = params.lines.filter(
    (l) => l.payQty > 0 && l.unitAmountCents > 0
  );

  const payableSubtotalCents = payableLines.reduce(
    (sum, l) => sum + l.unitAmountCents * l.payQty,
    0
  );

  const discountAmountCents = calcDiscountOnProductsOnly(
    payableSubtotalCents,
    params.percentOff
  );

  if (payableSubtotalCents <= 0 || discountAmountCents <= 0) {
    return {
      payableSubtotalCents,
      discountAmountCents: 0,
      stripeLineItems: payableLines.map((l) => ({
        quantity: l.payQty,
        price_data: {
          currency: "eur",
          unit_amount: l.unitAmountCents,
          product_data: {
            name: l.name,
            images: l.image ? [l.image] : undefined,
          },
        },
      })),
    };
  }

  const provisional = payableLines.map((l, index) => {
    const lineSubtotal = l.unitAmountCents * l.payQty;
    const rawShare = (discountAmountCents * lineSubtotal) / payableSubtotalCents;
    const floorShare = Math.floor(rawShare);
    const remainder = rawShare - floorShare;

    return {
      index,
      line: l,
      lineSubtotal,
      floorShare,
      remainder,
    };
  });

  let assigned = provisional.reduce((sum, x) => sum + x.floorShare, 0);
  let leftover = discountAmountCents - assigned;

  provisional.sort((a, b) => {
    if (b.remainder !== a.remainder) return b.remainder - a.remainder;
    return b.lineSubtotal - a.lineSubtotal;
  });

  for (const item of provisional) {
    if (leftover <= 0) break;
    item.floorShare += 1;
    leftover -= 1;
  }

  provisional.sort((a, b) => a.index - b.index);

  const stripeLineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

  for (const item of provisional) {
    const { line } = item;
    const lineDiscount = Math.min(item.floorShare, item.lineSubtotal);
    const discountedLineTotal = Math.max(0, item.lineSubtotal - lineDiscount);

    if (discountedLineTotal <= 0) {
      stripeLineItems.push({
        quantity: line.payQty,
        price_data: {
          currency: "eur",
          unit_amount: 0,
          product_data: {
            name: `${line.name} (DISCOUNTED)`,
            images: line.image ? [line.image] : undefined,
          },
        },
      });
      continue;
    }

    const baseUnit = Math.floor(discountedLineTotal / line.payQty);
    const remainderUnits = discountedLineTotal % line.payQty;
    const lowerQty = line.payQty - remainderUnits;

    if (lowerQty > 0) {
      stripeLineItems.push({
        quantity: lowerQty,
        price_data: {
          currency: "eur",
          unit_amount: baseUnit,
          product_data: {
            name: line.name,
            images: line.image ? [line.image] : undefined,
          },
        },
      });
    }

    if (remainderUnits > 0) {
      stripeLineItems.push({
        quantity: remainderUnits,
        price_data: {
          currency: "eur",
          unit_amount: baseUnit + 1,
          product_data: {
            name: line.name,
            images: line.image ? [line.image] : undefined,
          },
        },
      });
    }
  }

  return {
    stripeLineItems,
    payableSubtotalCents,
    discountAmountCents,
  };
}

export async function createCheckoutSession() {
  const session = await getServerSession(authOptions);
  const jar = await cookies();

  const cartId = jar.get("cartId")?.value ?? null;
  if (!cartId) throw new Error("Cart not found.");

  const rawDiscountCode = jar.get(DISCOUNT_COOKIE)?.value ?? "";
  const normalizedDiscountCode = normalizeDiscountCode(rawDiscountCode);

  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      items: {
        include: {
          product: {
            select: {
              name: true,
              imageUrls: true,
              channel: true,
            },
          },
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    throw new Error("Cart is empty.");
  }

  const cartChannel = detectCartChannel(cart.items);

  const promo = buildPromoLines(
    cart.items.map((it) => ({
      id: String(it.id),
      qty: Number(it.qty ?? 0),
      unitPrice: Number(it.unitPrice ?? 0),
      product: {
        name: it.product?.name ?? "",
        imageUrls: it.product?.imageUrls ?? [],
      },
    })),
    cartChannel
  );

  const ptShipping =
    cartChannel === "PT_STOCK_CTT"
      ? getShippingForCart(
          cart.items.map((it) => ({
            qty: Math.max(0, Number(it.qty ?? 0)),
            channel: "PT_STOCK_CTT" as const,
          }))
        )
      : null;

  const shippingCents =
    cartChannel === "PT_STOCK_CTT"
      ? typeof (ptShipping as any)?.shippingCents === "number"
        ? Math.max(0, Number((ptShipping as any).shippingCents))
        : 0
      : Math.max(0, Number(promo.shippingCents ?? 0));

  const validDiscount = normalizedDiscountCode
    ? await getValidDiscountCode(normalizedDiscountCode)
    : null;

  const paidItemsBuild = buildDiscountedStripePaidItems({
    lines: promo.lines,
    percentOff: Number(validDiscount?.percentOff ?? 0),
  });

  const stripeLineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    ...paidItemsBuild.stripeLineItems,
  ];

  for (const l of promo.lines) {
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

  const shippingOption: Stripe.Checkout.SessionCreateParams.ShippingOption = {
    shipping_rate_data: {
      type: "fixed_amount",
      fixed_amount: { currency: "eur", amount: shippingCents },
      display_name: shippingCents === 0 ? "Free Shipping" : "Shipping",
    },
  };

  const origin = originFromHeaders();

  const productSubtotalBeforeDiscountCents = paidItemsBuild.payableSubtotalCents;
  const discountAmountCents = paidItemsBuild.discountAmountCents;
  const totalCents = Math.max(
    0,
    productSubtotalBeforeDiscountCents - discountAmountCents + shippingCents
  );

  const stripeSession = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: stripeLineItems,
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
      cartChannel: String(cartChannel),
      promoName: String(promo.promoName ?? "NONE"),
      freeItemsApplied: String(promo.freeItemsApplied ?? 0),
      shippingCents: String(shippingCents),
      discountCode: String(validDiscount?.code ?? ""),
      discountPercent: String(validDiscount?.percentOff ?? 0),
      discountAmountCents: String(discountAmountCents),
      productSubtotalCents: String(productSubtotalBeforeDiscountCents),
      totalCents: String(totalCents),
    },
  });

  return { url: stripeSession.url };
}