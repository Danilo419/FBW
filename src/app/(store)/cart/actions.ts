// src/app/(store)/cart/actions.ts
'use server';

import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { calculateCartTotals } from '@/lib/cart/pricing';

/* ========= validação ========= */
const AddToCartSchema = z.object({
  productId: z.string().min(1),
  qty: z.coerce.number().int().min(1).max(99),
  options: z.record(z.string(), z.string().nullable()).default({}),
  personalization: z
    .object({
      name: z.string().max(20).optional().nullable(),
      number: z.string().max(2).optional().nullable(),
      playerId: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
});
type AddToCartInput = z.infer<typeof AddToCartSchema>;

/* ========= helpers ========= */
function normalizeOptions(obj?: Record<string, string | null>) {
  if (!obj) return {};
  const entries = Object.entries(obj).filter(([, v]) => v != null && v !== '');
  entries.sort(([a], [b]) => a.localeCompare(b));
  return Object.fromEntries(entries);
}
function sameJson(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

async function getOrCreateCart() {
  const jar = await cookies(); // ✅ no teu setup é Promise<ReadonlyRequestCookies>

  const existingSid = jar.get('sid')?.value ?? null;
  const userId: string | null = null; // se tiveres auth, mete aqui

  if (existingSid) {
    const found = await prisma.cart.findFirst({ where: { sessionId: existingSid } });
    if (found) return found;
  }

  const newSid: string =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 dias

  // ✅ FIX: secure só em produção (HTTPS). Em localhost/http, secure=true impede o cookie de ser guardado.
  const isProd = process.env.NODE_ENV === 'production';

  jar.set('sid', newSid, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    expires,
    secure: isProd,
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
  if (!product) throw new Error('Product not found');
  return product.basePrice;
}

/* ========= actions ========= */
export async function addToCartAction(raw: AddToCartInput) {
  try {
    const input = AddToCartSchema.parse(raw);

    const cart = await getOrCreateCart();

    const unitPrice = await getBaseUnitPrice(input.productId);
    const optionsJson = normalizeOptions(input.options ?? undefined);
    const personalization = input.personalization ?? null;

    // procurar linhas iguais (mesmo produto + mesmas opções/personalização)
    const siblings = await prisma.cartItem.findMany({
      where: { cartId: cart.id, productId: input.productId },
      select: {
        id: true,
        qty: true,
        optionsJson: true,     // ajusta se no schema o nome for diferente
        personalization: true, // idem
      },
      orderBy: { createdAt: 'asc' },
    });

    const existing = siblings.find(
      (it) =>
        sameJson(it.optionsJson ?? {}, optionsJson) &&
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
          optionsJson: optionsJson as any,
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
          optionsJson: optionsJson as any,
          personalization: personalization as any,
        },
      });
    }

    // ✅ opcional mas útil para atualizar UI que dependa do /cart
    revalidatePath('/cart');

    const count = await prisma.cartItem.count({ where: { cartId: cart.id } });
    return {
      ok: true as const,
      cartId: cart.id,
      count,
      lineTotal: unitPrice * input.qty,
    };
  } catch (err) {
    console.error('[addToCartAction] failed:', err);
    return { ok: false as const, error: 'ADD_TO_CART_FAILED' };
  }
}

/**
 * getCartSummary agora:
 * - lê as linhas do carrinho
 * - monta array de itens com (id, name, price, quantity)
 * - usa calculateCartTotals (promoções + shipping)
 * - devolve subtotal, discount, shipping, total, etc.
 */
export async function getCartSummary() {
  const jar = await cookies();
  const sid = jar.get('sid')?.value ?? null;

  if (!sid) {
    return {
      count: 0,
      subtotal: 0,
      discount: 0,
      shipping: 0,
      total: 0,
      promotion: {
        discount: 0,
        freeUnitsCount: 0,
        hasPromotion: false,
      },
    };
  }

  const rawItems = await prisma.cartItem.findMany({
    where: { cart: { sessionId: sid } },
    select: {
      id: true,
      qty: true,
      unitPrice: true,
      product: { select: { name: true } },
    },
  });

  if (!rawItems.length) {
    return {
      count: 0,
      subtotal: 0,
      discount: 0,
      shipping: 0,
      total: 0,
      promotion: {
        discount: 0,
        freeUnitsCount: 0,
        hasPromotion: false,
      },
    };
  }

  const cartItemsForPricing = rawItems.map((it) => ({
    id: it.id,
    name: it.product?.name ?? '',
    price: it.unitPrice,
    quantity: it.qty,
  }));

  const totals = calculateCartTotals(cartItemsForPricing);

  return {
    count: rawItems.length, // nº de linhas
    ...totals,
  };
}

/* ====== EXTRA: mover estas actions para fora do page.tsx ====== */

export async function removeItem(formData: FormData) {
  const id = formData.get('itemId');
  if (!id || typeof id !== 'string') return;

  try {
    await prisma.cartItem.delete({ where: { id } });
  } catch {}

  revalidatePath('/cart');
}

export async function updateQty(formData: FormData) {
  const id = formData.get('itemId');
  const qty = Number(formData.get('qty'));
  if (!id || typeof id !== 'string' || !Number.isFinite(qty) || qty < 1) return;

  try {
    const item = await prisma.cartItem.findUnique({
      where: { id },
      select: { unitPrice: true },
    });
    if (!item) return;

    await prisma.cartItem.update({
      where: { id },
      data: {
        qty,
        totalPrice: item.unitPrice * qty,
      },
    });
  } catch {}

  revalidatePath('/cart');
}
