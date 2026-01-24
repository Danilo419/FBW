// src/app/(store)/cart/actions.ts
"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { applyPromotions, type CartLine } from "@/lib/cartPromotions";

/* ========= validação ========= */
const AddToCartSchema = z.object({
  productId: z.string().min(1),
  qty: z.coerce.number().int().min(1).max(99),
  options: z.record(z.string(), z.string().nullable()).default({}),
  personalization: z
    .object({
      // ✅ backend como fonte da verdade: 14 chars (igual ao que vai para a encomenda)
      name: z.string().max(14).optional().nullable(),

      // ✅ 0–999 (1 a 3 dígitos) — guardamos como string
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

/**
 * Nome:
 * - mantém o que o UI faz: trim + uppercase + max 14
 * (o UI também permite espaços; aqui não tiramos espaços)
 */
function sanitizeName(v: unknown) {
  const s = (v == null ? "" : String(v)).trim();
  if (!s) return null;
  const up = s.toUpperCase().slice(0, 14);
  return up || null;
}

/**
 * Número:
 * - mantém só dígitos
 * - limita a 3
 * - permite "0" e "000" etc (porque é string)
 */
function sanitizeNumber(v: unknown) {
  const s = (v == null ? "" : String(v)).trim();
  if (!s) return null;
  const only = s.replace(/\D/g, "").slice(0, 3);
  return only || null;
}

async function getOrCreateCart() {
  const jar = await cookies();

  const existingSid = jar.get("sid")?.value ?? null;
  const userId: string | null = null; // se tiveres auth, mete aqui

  if (existingSid) {
    const found = await prisma.cart.findFirst({ where: { sessionId: existingSid } });
    if (found) return found;
  }

  const newSid: string = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 dias
  jar.set("sid", newSid, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires,
    secure: true, // ✅ em prod
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

    // ✅ normalizar options
    const optionsJson = normalizeOptions(input.options ?? undefined);

    // ✅ normalizar personalization
    const inPers = input.personalization ?? null;

    // (mesmo que Zod valide, continuamos a limpar por segurança)
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

    /**
     * ✅ IMPORTANTÍSSIMO:
     * Guardar name/number também dentro de optionsJson
     * para garantir que o carrinho/admin mostrem sempre corretamente.
     */
    const optionsJsonWithPersonalization: Record<string, any> = { ...optionsJson };
    if (cleanName) optionsJsonWithPersonalization.custName = cleanName;
    if (cleanNumber) optionsJsonWithPersonalization.custNumber = cleanNumber;

    // procurar linhas iguais (mesmo produto + mesmas opções/personalização)
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
          unitPrice, // ✅ sempre preço real do produto
          totalPrice: unitPrice * newQty, // ✅ SEM promo aqui
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
          unitPrice, // ✅ sempre preço real do produto
          totalPrice: unitPrice * input.qty, // ✅ SEM promo aqui
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

/**
 * getCartSummary agora:
 * - lê as linhas do carrinho
 * - usa applyPromotions (mesma lógica do Stripe e do cart/page.tsx)
 * - devolve subtotal, discount, shipping, total, etc.
 */
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
        select: { name: true, imageUrls: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (!rawItems.length) return emptySummary();

  const subtotal = rawItems.reduce((acc, it) => acc + it.unitPrice * it.qty, 0);

  const lines: CartLine[] = rawItems.map((it) => ({
    id: String(it.id),
    name: it.product?.name ?? "",
    unitAmountCents: Math.max(0, Number(it.unitPrice ?? 0)),
    qty: Math.max(0, Number(it.qty ?? 0)),
    image: it.product?.imageUrls?.[0] ?? null,
  }));

  const promo = applyPromotions(lines);

  const payableSubtotal = promo.lines.reduce(
    (acc, l) => acc + l.payQty * l.unitAmountCents,
    0
  );

  const discount = Math.max(0, subtotal - payableSubtotal);
  const shipping = promo.shippingCents;
  const total = payableSubtotal + shipping;

  return {
    count: rawItems.length,
    subtotal,
    discount,
    shipping,
    total,
    promotion: {
      promoName: promo.promoName,
      freeUnitsCount: promo.freeItemsApplied,
      hasPromotion: promo.promoName !== "NONE" && promo.freeItemsApplied > 0,
    },
  };
}

/* ====== EXTRA: mover estas actions para fora do page.tsx ====== */

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
  if (!id || typeof id !== "string" || !Number.isFinite(qty) || qty < 1) return;

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
        totalPrice: item.unitPrice * q, // ✅ SEM promo aqui
      },
    });
  } catch {}

  revalidatePath("/cart");
}
