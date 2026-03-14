// src/app/(store)/cart/actions.ts
"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getShippingForCart } from "@/lib/shipping";

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
function normalizeOptions(obj?: Record<string, string | null>) {
  if (!obj) return {};
  const entries = Object.entries(obj).filter(([, v]) => v != null && v !== "");
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

async function getOrCreateCart() {
  const jar = await cookies();

  const existingSid = jar.get("sid")?.value ?? null;
  const userId: string | null = null;

  if (existingSid) {
    const found = await prisma.cart.findFirst({
      where: { sessionId: existingSid },
    });
    if (found) return found;
  }

  const newSid: string =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

  jar.set("sid", newSid, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires,
    secure: true,
  });

  return prisma.cart.create({
    data: { sessionId: newSid, userId: userId ?? null },
  });
}

async function getBaseUnitPrice(productId: string): Promise<number> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { basePrice: true },
  });

  if (!product) throw new Error("Product not found");
  return product.basePrice;
}

function emptySummary() {
  return {
    count: 0,
    subtotal: 0,
    discount: 0,
    shipping: 0,
    total: 0,
    promotion: {
      promoName: "NONE" as const,
      freeUnitsCount: 0,
      hasPromotion: false,
    },
  };
}

/* ========= actions ========= */
export async function addToCartAction(raw: AddToCartInput) {
  try {
    const input = AddToCartSchema.parse(raw);

    const cart = await getOrCreateCart();
    const unitPrice = await getBaseUnitPrice(input.productId);

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

    const optionsJsonWithPersonalization: Record<string, any> = {
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
      const newQty = Math.min(99, existing.qty + input.qty);

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

    revalidatePath("/cart");

    const count = await prisma.cartItem.count({ where: { cartId: cart.id } });

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

export async function getCartSummary() {
  const jar = await cookies();
  const sid = jar.get("sid")?.value ?? null;

  if (!sid) return emptySummary();

  const rawItems = await prisma.cartItem.findMany({
    where: { cart: { sessionId: sid } },
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

  if (!rawItems.length) return emptySummary();

  const subtotal = rawItems.reduce(
    (acc, it) => acc + Number(it.unitPrice) * Number(it.qty),
    0
  );

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

    const shipping =
      typeof (ship as any)?.shippingCents === "number"
        ? Number((ship as any).shippingCents)
        : 0;

    return {
      count: rawItems.length,
      subtotal,
      discount: 0,
      shipping,
      total: subtotal + shipping,
      promotion: {
        promoName: "NONE" as const,
        freeUnitsCount: 0,
        hasPromotion: false,
      },
    };
  }

  // GLOBAL e MIXED:
  // sem promoções de bundle / buy X get Y
  // envio grátis a partir de 70€, caso contrário 5€
  const shipping = subtotal >= 70 ? 0 : 5;
  const total = subtotal + shipping;

  return {
    count: rawItems.length,
    subtotal,
    discount: 0,
    shipping,
    total,
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
    await prisma.cartItem.delete({ where: { id } });
  } catch {}

  revalidatePath("/cart");
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
      select: { unitPrice: true },
    });

    if (!item) return;

    const q = Math.min(99, Math.floor(qty));

    await prisma.cartItem.update({
      where: { id },
      data: {
        qty: q,
        totalPrice: item.unitPrice * q,
      },
    });
  } catch {}

  revalidatePath("/cart");
}