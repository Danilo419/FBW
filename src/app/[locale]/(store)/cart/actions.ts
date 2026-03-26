// src/app/[locale]/(store)/cart/actions.ts
"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getShippingForCart } from "@/lib/shipping";
import {
  DISCOUNT_COOKIE,
  calculateDiscountSummary,
  getValidDiscountCode,
  normalizeDiscountCode,
} from "@/lib/discount-codes";

/* ========= validação ========= */
const AddToCartSchema = z.object({
  productId: z.string().min(1),
  qty: z.coerce.number().int().min(1).max(99),
  options: z.record(z.string(), z.string().nullable()).default({}),
  personalization: z
    .object({
      name: z.string().max(14).optional().nullable(),
      number: z
        .string()
        .trim()
        .regex(/^\d{1,3}$/, "Invalid number")
        .optional()
        .nullable(),
      playerId: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
});
type AddToCartInput = z.infer<typeof AddToCartSchema>;

/* ========= helpers ========= */
function normalizeOptions(
  obj?: Record<string, string | null>
): Record<string, string> {
  if (!obj) return {};

  const entries = Object.entries(obj).filter(
    (entry): entry is [string, string] => {
      const [, value] = entry;
      return value != null && value !== "";
    }
  );

  entries.sort(([a], [b]) => a.localeCompare(b));
  return Object.fromEntries(entries);
}

function sameJson(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function sanitizeName(v: unknown) {
  const s = v == null ? "" : String(v).trim();
  if (!s) return null;
  const up = s.toUpperCase().slice(0, 14);
  return up || null;
}

function sanitizeNumber(v: unknown) {
  const s = v == null ? "" : String(v).trim();
  if (!s) return null;
  const only = s.replace(/\D/g, "").slice(0, 3);
  return only || null;
}

function getCookieExpiryDate() {
  return new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
}

function shouldUseSecureCookies() {
  return process.env.NODE_ENV === "production";
}

async function setCartCookies(values: { sid?: string | null; cartId?: string | null }) {
  const jar = await cookies();
  const expires = getCookieExpiryDate();
  const secure = shouldUseSecureCookies();

  if (values.sid) {
    jar.set("sid", values.sid, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      expires,
      secure,
    });
  }

  if (values.cartId) {
    jar.set("cartId", values.cartId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      expires,
      secure,
    });
  }
}

async function getOrCreateCart() {
  const jar = await cookies();

  const existingSid = jar.get("sid")?.value ?? null;
  const existingCartId = jar.get("cartId")?.value ?? null;
  const userId: string | null = null;

  if (existingSid) {
    const foundBySid = await prisma.cart.findFirst({
      where: { sessionId: existingSid },
    });

    if (foundBySid) {
      await setCartCookies({
        sid: foundBySid.sessionId,
        cartId: foundBySid.id,
      });
      return foundBySid;
    }
  }

  if (existingCartId) {
    const foundByCartId = await prisma.cart.findUnique({
      where: { id: existingCartId },
    });

    if (foundByCartId) {
      const ensuredSid =
        foundByCartId.sessionId ||
        existingSid ||
        globalThis.crypto?.randomUUID?.() ||
        `${Date.now()}-${Math.random()}`;

      const cart =
        foundByCartId.sessionId === ensuredSid
          ? foundByCartId
          : await prisma.cart.update({
              where: { id: foundByCartId.id },
              data: { sessionId: ensuredSid },
            });

      await setCartCookies({
        sid: cart.sessionId,
        cartId: cart.id,
      });

      return cart;
    }
  }

  const newSid =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

  const cart = await prisma.cart.create({
    data: { sessionId: newSid, userId: userId ?? null },
  });

  await setCartCookies({
    sid: cart.sessionId,
    cartId: cart.id,
  });

  return cart;
}

async function getBaseUnitPrice(productId: string): Promise<number> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { basePrice: true },
  });

  if (!product) throw new Error("Product not found");
  return Number(product.basePrice);
}

function emptySummary() {
  return {
    count: 0,
    subtotal: 0,
    discount: 0,
    shipping: 0,
    total: 0,
    discountCode: null as null | {
      code: string;
      percentOff: number;
    },
    promotion: {
      promoName: "NONE" as const,
      freeUnitsCount: 0,
      hasPromotion: false,
    },
  };
}

async function revalidateCartUi() {
  revalidatePath("/cart");
  revalidatePath("/pt/cart");
  revalidatePath("/en/cart");
  revalidatePath("/", "layout");
  revalidatePath("/pt", "layout");
  revalidatePath("/en", "layout");
}

async function getAppliedDiscountCodeFromCookie() {
  const jar = await cookies();
  const rawCode = jar.get(DISCOUNT_COOKIE)?.value ?? "";
  return normalizeDiscountCode(rawCode);
}

async function setDiscountCookie(code: string) {
  const jar = await cookies();
  const secure = shouldUseSecureCookies();

  jar.set(DISCOUNT_COOKIE, normalizeDiscountCode(code), {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    expires: getCookieExpiryDate(),
  });
}

async function clearDiscountCookie() {
  const jar = await cookies();
  const secure = shouldUseSecureCookies();

  jar.set(DISCOUNT_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    expires: new Date(0),
    maxAge: 0,
  });
}

async function resolveShippingCents(
  rawItems: Array<{
    qty: number;
    product: {
      channel: string | null;
    } | null;
  }>,
  subtotal: number
) {
  const channels = new Set<string>();
  for (const it of rawItems) {
    channels.add(String(it.product?.channel ?? "GLOBAL"));
  }

  const cartChannel =
    channels.size > 1
      ? "MIXED"
      : ((Array.from(channels)[0] as "GLOBAL" | "PT_STOCK_CTT") ?? "GLOBAL");

  if (cartChannel === "PT_STOCK_CTT") {
    const ship = getShippingForCart(
      rawItems.map((it) => ({
        qty: Math.max(0, Number(it.qty ?? 0)),
        channel: "PT_STOCK_CTT" as const,
      }))
    );

    return typeof (ship as any)?.shippingCents === "number"
      ? Number((ship as any).shippingCents)
      : 0;
  }

  return subtotal >= 70 ? 0 : 5;
}

/* ========= actions ========= */
export async function addToCartAction(raw: AddToCartInput) {
  try {
    const input = AddToCartSchema.parse(raw);

    const cart = await getOrCreateCart();
    const unitPrice = await getBaseUnitPrice(input.productId);

    await setCartCookies({
      sid: cart.sessionId,
      cartId: cart.id,
    });

    const optionsJson = normalizeOptions(input.options ?? undefined);

    const inPers = input.personalization ?? null;
    const cleanName = sanitizeName(inPers?.name);
    const cleanNumber = sanitizeNumber(inPers?.number);

    const personalization =
      cleanName || cleanNumber || inPers?.playerId
        ? {
            name: cleanName,
            number: cleanNumber,
            playerId: inPers?.playerId ?? null,
          }
        : null;

    const optionsJsonWithPersonalization: Record<string, string> = {
      ...optionsJson,
    };

    if (cleanName) optionsJsonWithPersonalization.custName = cleanName;
    if (cleanNumber) optionsJsonWithPersonalization.custNumber = cleanNumber;

    const siblings = await prisma.cartItem.findMany({
      where: { cartId: cart.id, productId: input.productId },
      select: {
        id: true,
        qty: true,
        optionsJson: true,
        personalization: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const existing = siblings.find(
      (it) =>
        sameJson(it.optionsJson ?? {}, optionsJsonWithPersonalization) &&
        sameJson(it.personalization ?? null, personalization)
    );

    if (existing) {
      const newQty = Math.min(99, Number(existing.qty) + input.qty);

      await prisma.cartItem.update({
        where: { id: existing.id },
        data: {
          qty: newQty,
          unitPrice,
          totalPrice: unitPrice * newQty,
          optionsJson: optionsJsonWithPersonalization as any,
          personalization: personalization as any,
        },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: input.productId,
          qty: input.qty,
          unitPrice,
          totalPrice: unitPrice * input.qty,
          optionsJson: optionsJsonWithPersonalization as any,
          personalization: personalization as any,
        },
      });
    }

    await setCartCookies({
      sid: cart.sessionId,
      cartId: cart.id,
    });

    await revalidateCartUi();

    const allItems = await prisma.cartItem.findMany({
      where: { cartId: cart.id },
      select: { qty: true },
    });

    const count = allItems.reduce((acc, item) => acc + Number(item.qty), 0);

    return {
      ok: true as const,
      cartId: cart.id,
      count,
      lineTotal: unitPrice * input.qty,
    };
  } catch (err) {
    console.error("[addToCartAction] failed:", err);
    return { ok: false as const, error: "ADD_TO_CART_FAILED" };
  }
}

export async function applyDiscountCodeAction(formData: FormData) {
  try {
    const rawCode = String(formData.get("code") || "");
    const code = normalizeDiscountCode(rawCode);

    if (!code) {
      return {
        ok: false as const,
        error: "INVALID_DISCOUNT_CODE",
        message: "Enter a valid discount code.",
      };
    }

    const discount = await getValidDiscountCode(code);

    if (!discount) {
      await clearDiscountCookie();
      await revalidateCartUi();

      return {
        ok: false as const,
        error: "INVALID_DISCOUNT_CODE",
        message: "Invalid, expired, inactive, or already used discount code.",
      };
    }

    await setDiscountCookie(discount.code);
    await revalidateCartUi();

    return {
      ok: true as const,
      code: discount.code,
      percentOff: Number(discount.percentOff),
      message: `${discount.percentOff}% discount applied to products only.`,
    };
  } catch (err) {
    console.error("[applyDiscountCodeAction] failed:", err);
    return {
      ok: false as const,
      error: "APPLY_DISCOUNT_CODE_FAILED",
      message: "Could not apply discount code.",
    };
  }
}

export async function removeDiscountCodeAction() {
  try {
    await clearDiscountCookie();
    await revalidateCartUi();

    return { ok: true as const };
  } catch (err) {
    console.error("[removeDiscountCodeAction] failed:", err);
    return { ok: false as const, error: "REMOVE_DISCOUNT_CODE_FAILED" };
  }
}

export async function getCartSummary() {
  const jar = await cookies();
  const sid = jar.get("sid")?.value ?? null;
  const cartId = jar.get("cartId")?.value ?? null;

  let cartWhere:
    | { cart: { sessionId: string } }
    | { cartId: string }
    | null = null;

  if (sid) cartWhere = { cart: { sessionId: sid } };
  else if (cartId) cartWhere = { cartId };
  else {
    await clearDiscountCookie();
    return emptySummary();
  }

  const rawItems = await prisma.cartItem.findMany({
    where: cartWhere,
    select: {
      id: true,
      qty: true,
      unitPrice: true,
      product: {
        select: {
          name: true,
          imageUrls: true,
          channel: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (!rawItems.length) {
    await clearDiscountCookie();
    return emptySummary();
  }

  const subtotal = rawItems.reduce(
    (acc, it) => acc + Number(it.unitPrice) * Number(it.qty),
    0
  );

  const shipping = await resolveShippingCents(
    rawItems.map((it) => ({
      qty: Number(it.qty),
      product: {
        channel: it.product?.channel ?? "GLOBAL",
      },
    })),
    subtotal
  );

  const appliedCode = await getAppliedDiscountCodeFromCookie();
  const validDiscount = appliedCode
    ? await getValidDiscountCode(appliedCode)
    : null;

  if (appliedCode && !validDiscount) {
    await clearDiscountCookie();
  }

  const summary = calculateDiscountSummary({
    productSubtotalCents: subtotal,
    shippingCents: shipping,
    percentOff: validDiscount?.percentOff ?? 0,
  });

  return {
    count: rawItems.reduce((acc, it) => acc + Number(it.qty), 0),
    subtotal: summary.productSubtotalCents,
    discount: summary.discountAmountCents,
    shipping: summary.shippingCents,
    total: summary.totalCents,
    discountCode: validDiscount
      ? {
          code: validDiscount.code,
          percentOff: Number(validDiscount.percentOff),
        }
      : null,
    promotion: {
      promoName: "NONE" as const,
      freeUnitsCount: 0,
      hasPromotion: false,
    },
  };
}

export async function removeItem(formData: FormData) {
  const id = formData.get("itemId");
  if (!id || typeof id !== "string") return;

  try {
    const item = await prisma.cartItem.findUnique({
      where: { id },
      select: { cartId: true, cart: { select: { sessionId: true } } },
    });

    if (item) {
      await setCartCookies({
        sid: item.cart?.sessionId ?? null,
        cartId: item.cartId,
      });
    }

    await prisma.cartItem.delete({ where: { id } });
  } catch {}

  const summary = await getCartSummary();
  if (summary.count === 0) {
    await clearDiscountCookie();
  }

  await revalidateCartUi();
}

export async function updateQty(formData: FormData) {
  const id = formData.get("itemId");
  const qty = Number(formData.get("qty"));

  if (!id || typeof id !== "string" || !Number.isFinite(qty) || qty < 1) {
    return;
  }

  try {
    const item = await prisma.cartItem.findUnique({
      where: { id },
      select: {
        unitPrice: true,
        cartId: true,
        cart: { select: { sessionId: true } },
      },
    });

    if (!item) return;

    await setCartCookies({
      sid: item.cart?.sessionId ?? null,
      cartId: item.cartId,
    });

    const q = Math.min(99, Math.floor(qty));

    await prisma.cartItem.update({
      where: { id },
      data: {
        qty: q,
        totalPrice: Number(item.unitPrice) * q,
      },
    });
  } catch {}

  await revalidateCartUi();
}

export async function getAppliedDiscountCodeForCart() {
  const code = await getAppliedDiscountCodeFromCookie();
  if (!code) return null;

  const discount = await getValidDiscountCode(code);
  if (!discount) {
    await clearDiscountCookie();
    return null;
  }

  return {
    code: discount.code,
    percentOff: Number(discount.percentOff),
  };
}