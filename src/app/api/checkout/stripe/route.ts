// src/app/api/checkout/stripe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { applyPromotions } from "@/lib/cartPromotions";
import { getShippingForCart } from "@/lib/shipping";
import {
  DISCOUNT_COOKIE,
  calcDiscountOnProductsOnly,
  getValidDiscountCode,
  normalizeDiscountCode,
} from "@/lib/discount-codes";

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
  product: {
    id?: string;
    name: string;
    imageUrls: string[] | null;
    channel?: string | null;
  };
  optionsJson?: any;
  personalization?: any;
  totalPrice?: number | null;
};

type CartChannel = "GLOBAL" | "PT_STOCK_CTT" | "MIXED";

/* ============================== HELPERS ============================== */

function normalizeBaseUrl(url: string) {
  return url.trim().replace(/\/+$/, "");
}

/**
 * ✅ Usa SEMPRE o domínio público (env) quando definido
 * - NEXT_PUBLIC_SITE_URL (recomendado)
 * - SITE_URL (alternativa)
 * Fallback: host do request (dev/local)
 */
async function getCheckoutBaseUrl(): Promise<string> {
  const env =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    "";

  if (env) return normalizeBaseUrl(env);

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host =
    h.get("x-forwarded-host") ??
    h.get("host") ??
    process.env.VERCEL_URL ??
    "localhost:3000";

  return normalizeBaseUrl(`${proto}://${host}`);
}

function toAbsoluteImage(
  url: string | null | undefined,
  APP: string
): string | null {
  if (!url) return null;
  const t = String(url).trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith("//")) return `https:${t}`;
  if (t.startsWith("/")) return `${APP}${t}`;
  return null;
}

function safeStr(v: any): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function safeObj(v: any): Record<string, any> {
  if (!v) return {};
  if (typeof v === "object") return v as any;
  if (typeof v === "string") {
    try {
      const j = JSON.parse(v);
      return typeof j === "object" && j ? (j as any) : {};
    } catch {
      return {};
    }
  }
  return {};
}

/**
 * Cookie "ship" pode vir:
 * - base64(JSON)
 * - JSON direto (em alguns browsers/setups)
 */
function parseShipCookie(raw: string): Shipping | null {
  if (!raw) return null;

  try {
    const txt = Buffer.from(raw, "base64").toString("utf8");
    const j = JSON.parse(txt);
    if (j && typeof j === "object") return j as Shipping;
  } catch {}

  try {
    const j = JSON.parse(raw);
    if (j && typeof j === "object") return j as Shipping;
  } catch {}

  return null;
}

/**
 * ✅ Stripe metadata MUST be Record<string, string>
 * ❌ undefined values are NOT allowed
 */
function shippingToMetadata(s?: Shipping | null): Record<string, string> {
  const out: Record<string, string> = {};

  const put = (key: string, value?: string | null) => {
    const v = safeStr(value);
    if (v) out[key] = v.slice(0, 500);
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

/**
 * ✅ IMPORTANTE:
 * O admin extractor procura line1/city/postal_code no ROOT do JSON.
 * Então aqui nós "flatten" o shipping para evitar ficar tudo dentro de address:{...}
 */
function shippingToFlatJson(s?: Shipping | null): Record<string, any> | null {
  if (!s) return null;

  const addr = safeObj(s.address);
  return {
    name: safeStr(s.name),
    phone: safeStr(s.phone),
    email: safeStr(s.email),

    line1: safeStr(addr.line1),
    line2: safeStr(addr.line2),
    city: safeStr(addr.city),
    state: safeStr(addr.state),
    postal_code: safeStr(addr.postal_code),
    country: safeStr(addr.country),

    address: {
      line1: safeStr(addr.line1),
      line2: safeStr(addr.line2),
      city: safeStr(addr.city),
      state: safeStr(addr.state),
      postal_code: safeStr(addr.postal_code),
      country: safeStr(addr.country),
    },
  };
}

/**
 * ✅ Fallback: tenta ler shipping do BODY (caso passes do form no fetch)
 */
function parseShippingFromBody(body: any): Shipping | null {
  const b = body && typeof body === "object" ? body : {};
  const s = b.shipping ?? b.ship ?? b.shippingFromCookie ?? null;
  if (!s || typeof s !== "object") return null;

  const addr = safeObj((s as any).address);
  const out: Shipping = {
    name: safeStr((s as any).name) ?? undefined,
    phone: safeStr((s as any).phone) ?? undefined,
    email: safeStr((s as any).email) ?? undefined,
    address: {
      line1: safeStr(addr.line1) ?? undefined,
      line2: safeStr(addr.line2) ?? undefined,
      city: safeStr(addr.city) ?? undefined,
      state: safeStr(addr.state) ?? undefined,
      postal_code: safeStr(addr.postal_code) ?? undefined,
      country: safeStr(addr.country) ?? undefined,
    },
  };
  return out;
}

const MAX_FREE_ITEMS_PER_ORDER = 2;

function detectCartChannel(items: CartItemRow[]): CartChannel {
  const channels = new Set<string>();

  for (const it of items) {
    channels.add(String(it.product?.channel ?? "GLOBAL"));
  }

  if (channels.size > 1) return "MIXED";

  const only = Array.from(channels)[0];
  return only === "PT_STOCK_CTT" ? "PT_STOCK_CTT" : "GLOBAL";
}

function extractSelectedSize(optionsJson: any): string | null {
  const root = safeObj(optionsJson);

  const direct = safeStr(root.size);
  if (direct) return direct;

  const selectedSize = safeStr(root.selectedSize);
  if (selectedSize) return selectedSize;

  const options = safeObj(root.options);
  const optionsSize = safeStr(options.size);
  if (optionsSize) return optionsSize;

  const selectedOptions = safeObj(root.selectedOptions);
  const selectedOptionsSize = safeStr(selectedOptions.size);
  if (selectedOptionsSize) return selectedOptionsSize;

  return null;
}

function buildSnapshotJson(
  optionsJson: any,
  personalization: any,
  extras?: Record<string, any>
) {
  const baseSnapshot = safeObj(optionsJson);
  const selectedSize = extractSelectedSize(baseSnapshot);

  const snapshot: Record<string, any> = {
    ...baseSnapshot,
    personalization: personalization ?? null,
  };

  if (selectedSize) {
    snapshot.size = selectedSize;

    if (!safeStr(snapshot.selectedSize)) {
      snapshot.selectedSize = selectedSize;
    }

    const options = safeObj(snapshot.options);
    if (!safeStr(options.size)) {
      snapshot.options = {
        ...options,
        size: selectedSize,
      };
    }

    const selectedOptions = safeObj(snapshot.selectedOptions);
    if (!safeStr(selectedOptions.size)) {
      snapshot.selectedOptions = {
        ...selectedOptions,
        size: selectedSize,
      };
    }
  }

  if (extras && typeof extras === "object") {
    Object.assign(snapshot, extras);
  }

  return snapshot;
}

/* ============================== ROUTE ============================== */

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe();

    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;

    const body = await req.json().catch(() => ({}));
    const method = (body?.method ?? "automatic") as Method;
    void method;

    const APP = await getCheckoutBaseUrl();

    const jar = await cookies();
    const sid = jar.get("sid")?.value ?? null;

    if (!sid) {
      return NextResponse.json(
        { error: "Cart session not found" },
        { status: 400 }
      );
    }

    const rawDiscountCode = jar.get(DISCOUNT_COOKIE)?.value ?? "";
    const normalizedDiscountCode = normalizeDiscountCode(rawDiscountCode);
    const validDiscount = normalizedDiscountCode
      ? await getValidDiscountCode(normalizedDiscountCode)
      : null;

    const cart = await prisma.cart.findFirst({
      where: { sessionId: sid },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
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
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const currency = "eur";

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
      personalization: it.personalization ?? null,
      totalPrice: (it as any).totalPrice ?? null,
    }));

    const cartChannel = detectCartChannel(cartItems);
    const isPtStockCart = cartChannel === "PT_STOCK_CTT";

    const originalSubtotal = cartItems.reduce(
      (acc, it) => acc + it.qty * it.unitPrice,
      0
    );

    const promo =
      cartChannel === "GLOBAL"
        ? applyPromotions(
            cartItems.map((it, idx) => ({
              id: String(idx),
              name: String(it.product?.name ?? "Item"),
              unitAmountCents: it.unitPrice,
              qty: it.qty,
              image: it.product?.imageUrls?.[0] ?? null,
            }))
          )
        : {
            promoName: "NONE" as const,
            freeItemsApplied: 0,
            shippingCents: 0,
            lines: cartItems.map((it, idx) => ({
              id: String(idx),
              name: String(it.product?.name ?? "Item"),
              unitAmountCents: it.unitPrice,
              qty: it.qty,
              payQty: it.qty,
              freeQty: 0,
              image: it.product?.imageUrls?.[0] ?? null,
            })),
          };

    const payableProductsSubtotalCents = promo.lines.reduce((acc, line) => {
      const idx = Number(line.id);
      const it = cartItems[idx];
      if (!it) return acc;
      return acc + line.payQty * it.unitPrice;
    }, 0);

    const promoDiscountCents = Math.max(
      0,
      originalSubtotal - payableProductsSubtotalCents
    );

    const ptShipping = isPtStockCart
      ? getShippingForCart(
          cartItems.map((it) => ({
            qty: Math.max(0, Number(it.qty ?? 0)),
            channel: "PT_STOCK_CTT" as const,
          }))
        )
      : null;

    const shippingCents = isPtStockCart
      ? typeof (ptShipping as any)?.shippingCents === "number"
        ? Math.max(0, Number((ptShipping as any).shippingCents))
        : 0
      : Math.max(0, Number((promo as any).shippingCents ?? 0));

    const reviewDiscountCents = validDiscount
      ? calcDiscountOnProductsOnly(
          payableProductsSubtotalCents,
          Number(validDiscount.percentOff ?? 0)
        )
      : 0;

    const totalDiscountCents = promoDiscountCents + reviewDiscountCents;
    const finalProductsSubtotalCents = Math.max(
      0,
      payableProductsSubtotalCents - reviewDiscountCents
    );
    const totalCents = finalProductsSubtotalCents + shippingCents;

    /* -------- Shipping (cookie -> body fallback) -------- */
    const rawShip = jar.get("ship")?.value ?? "";
    let shippingFromCookie = rawShip ? parseShipCookie(rawShip) : null;

    if (!shippingFromCookie) {
      const fromBody = parseShippingFromBody(body);
      if (fromBody) shippingFromCookie = fromBody;
    }

    const shippingJsonFlat = shippingToFlatJson(shippingFromCookie);

    console.log(
      "[checkout/stripe] sid:",
      sid,
      "shipCookie:",
      Boolean(rawShip),
      "hasShipping:",
      Boolean(shippingFromCookie),
      "discountCode:",
      validDiscount?.code ?? null
    );

    /* -------- Create local order (PENDING) -------- */
    const orderItemsCreate = promo.lines.flatMap((line) => {
      const idx = Number(line.id);
      const it = cartItems[idx]!;
      const img = it.product.imageUrls?.[0] ?? null;

      const out: any[] = [];

      if (line.payQty > 0) {
        out.push({
          productId: it.productId,
          name: it.product.name,
          image: img,
          qty: line.payQty,
          unitPrice: it.unitPrice,
          totalPrice: line.payQty * it.unitPrice,
          snapshotJson: buildSnapshotJson(it.optionsJson, it.personalization),
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
          snapshotJson: buildSnapshotJson(it.optionsJson, it.personalization, {
            __isFree: true,
            __originalUnitPrice: it.unitPrice,
          }),
        });
      }

      return out;
    });

    const createdOrder = await prisma.order.create({
      data: {
        userId: userId ?? null,
        sessionId: cart.sessionId ?? sid,
        status: "pending",
        currency: currency.toUpperCase(),
        channel: cartChannel === "PT_STOCK_CTT" ? "PT_STOCK_CTT" : "GLOBAL",

        subtotal: payableProductsSubtotalCents,
        productSubtotalCents: payableProductsSubtotalCents,

        shipping: shippingCents,
        shippingCents,

        tax: 0,

        discountCodeId: validDiscount?.id ?? null,
        discountCodeText: validDiscount?.code ?? null,
        discountPercent: validDiscount?.percentOff ?? null,
        discountAmountCents: reviewDiscountCents,

        total: totalCents / 100,
        totalCents,

        shippingJson: shippingJsonFlat as any,

        items: { create: orderItemsCreate },
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

    const metadata: Record<string, string> = {
      orderId: createdOrder.id,
      promoName: String(promo.promoName ?? "NONE"),
      freeItemsApplied: String(promo.freeItemsApplied ?? 0),
      shippingCents: String(shippingCents),
      discountCents: String(totalDiscountCents),
      maxFreeItemsCap: String(MAX_FREE_ITEMS_PER_ORDER),
      ...(userId ? { userId } : {}),

      discountCode: String(validDiscount?.code ?? ""),
      discountPercent: String(validDiscount?.percentOff ?? 0),
      discountAmountCents: String(reviewDiscountCents),
      productSubtotalCents: String(payableProductsSubtotalCents),

      ...shippingToMetadata(shippingFromCookie),
    };

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
    return NextResponse.json(
      { error: err?.message ?? "Stripe error" },
      { status: 400 }
    );
  }
}