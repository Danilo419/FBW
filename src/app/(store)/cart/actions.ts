// src/app/(store)/cart/actions.ts
'use server';

import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { calculateCartTotals } from '@/lib/cart/pricing';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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
function errToMessage(err: unknown) {
  if (!err) return 'UNKNOWN_ERROR';
  if (err instanceof z.ZodError) return err.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(' | ');
  if (typeof err === 'object' && err && 'message' in err) return String((err as any).message);
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

async function getUserId(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions);
    return ((session?.user as any)?.id as string | undefined) ?? null;
  } catch {
    return null;
  }
}

async function ensureSid(jar: Awaited<ReturnType<typeof cookies>>) {
  const existingSid = jar.get('sid')?.value ?? null;
  if (existingSid) return existingSid;

  const newSid: string =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
  const isProd = process.env.NODE_ENV === 'production';

  jar.set('sid', newSid, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    expires,
    secure: isProd,
  });

  return newSid;
}

async function getOrCreateCart() {
  const jar = await cookies();
  const sid = await ensureSid(jar);
  const userId = await getUserId();

  // 1) se logado, procura por userId primeiro
  if (userId) {
    const byUser = await prisma.cart.findFirst({ where: { userId } });
    if (byUser) {
      // se o carrinho do user não tiver sessionId, mete
      if (!byUser.sessionId) {
        await prisma.cart.update({
          where: { id: byUser.id },
          data: { sessionId: sid },
        });
      }
      return { ...byUser, sessionId: sid };
    }
  }

  // 2) procura por sid
  const bySid = await prisma.cart.findFirst({ where: { sessionId: sid } });
  if (bySid) {
    // se agora estiver logado e o cart não tiver userId, liga
    if (userId && !bySid.userId) {
      await prisma.cart.update({ where: { id: bySid.id }, data: { userId } });
      return { ...bySid, userId };
    }
    return bySid;
  }

  // 3) cria novo
  return prisma.cart.create({
    data: { sessionId: sid, userId: userId ?? null },
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
  const jar = await cookies();
  const sid = jar.get('sid')?.value ?? null;
  const userId = await getUserId();

  try {
    const input = AddToCartSchema.parse(raw);
    const cart = await getOrCreateCart();

    const unitPrice = await getBaseUnitPrice(input.productId);
    const optionsJson = normalizeOptions(input.options ?? undefined);
    const personalization = input.personalization ?? null;

    // DEBUG útil
    console.log('[addToCartAction] sid=', sid, 'userId=', userId, 'cartId=', cart.id, 'productId=', input.productId);

    const siblings = await prisma.cartItem.findMany({
      where: { cartId: cart.id, productId: input.productId },
      select: {
        id: true,
        qty: true,
        optionsJson: true,
        personalization: true,
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

    revalidatePath('/cart');

    const count = await prisma.cartItem.count({ where: { cartId: cart.id } });

    return { ok: true as const, cartId: cart.id, count };
  } catch (err) {
    const msg = errToMessage(err);
    console.error('[addToCartAction] failed:', msg, err);
    return { ok: false as const, error: msg };
  }
}

export async function getCartSummary() {
  const jar = await cookies();
  const sid = jar.get('sid')?.value ?? null;
  const userId = await getUserId();

  const rawItems = await prisma.cartItem.findMany({
    where: {
      cart: {
        OR: [
          userId ? { userId } : undefined,
          sid ? { sessionId: sid } : undefined,
        ].filter(Boolean) as any,
      },
    },
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
      promotion: { discount: 0, freeUnitsCount: 0, hasPromotion: false },
    };
  }

  const cartItemsForPricing = rawItems.map((it) => ({
    id: it.id,
    name: it.product?.name ?? '',
    price: it.unitPrice,
    quantity: it.qty,
  }));

  const totals = calculateCartTotals(cartItemsForPricing);

  return { count: rawItems.length, ...totals };
}

export async function removeItem(formData: FormData) {
  const jar = await cookies();
  const sid = jar.get('sid')?.value ?? null;
  const userId = await getUserId();

  const id = formData.get('itemId');
  if (!id || typeof id !== 'string') return;

  try {
    // segurança: só apaga se o item pertencer ao teu carrinho
    await prisma.cartItem.deleteMany({
      where: {
        id,
        cart: {
          OR: [
            userId ? { userId } : undefined,
            sid ? { sessionId: sid } : undefined,
          ].filter(Boolean) as any,
        },
      },
    });
  } catch {}

  revalidatePath('/cart');
}

export async function updateQty(formData: FormData) {
  const jar = await cookies();
  const sid = jar.get('sid')?.value ?? null;
  const userId = await getUserId();

  const id = formData.get('itemId');
  const qty = Number(formData.get('qty'));
  if (!id || typeof id !== 'string' || !Number.isFinite(qty) || qty < 1) return;

  try {
    const item = await prisma.cartItem.findFirst({
      where: {
        id,
        cart: {
          OR: [
            userId ? { userId } : undefined,
            sid ? { sessionId: sid } : undefined,
          ].filter(Boolean) as any,
        },
      },
      select: { unitPrice: true },
    });
    if (!item) return;

    await prisma.cartItem.update({
      where: { id },
      data: { qty, totalPrice: item.unitPrice * qty },
    });
  } catch {}

  revalidatePath('/cart');
}
