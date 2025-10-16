// src/app/(store)/cart/actions.ts
'use server';

export const runtime = 'nodejs';

import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import crypto from 'node:crypto';

const AddToCartSchema = z.object({
  productId: z.string().min(1),
  qty: z.number().int().min(1).max(99),
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

async function getOrCreateCart() {
  const jar = await cookies();
  let sid = jar.get('sid')?.value ?? null;

  // (Se tiveres auth, carrega aqui o userId)
  const userId: string | null = null;

  // 1) tenta carrinho existente (usa findFirst; não assume UNIQUE)
  if (sid) {
    const found = await prisma.cart.findFirst({ where: { sessionId: sid } });
    if (found) return found;
  }

  // 2) cria novo carrinho + cookie
  sid = crypto.randomUUID();
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 dias
  jar.set('sid', sid, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    expires,
  });

  return prisma.cart.create({
    data: {
      sessionId: sid,
      userId: userId ?? null,
    },
  });
}

/** 🔒 PREÇO BASE APENAS: ignora quaisquer deltas/opções */
async function getBaseUnitPrice(productId: string): Promise<number> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { basePrice: true },
  });
  if (!product) throw new Error('Product not found');
  return product.basePrice;
}

/** Normaliza opções (só informativas) para JSON determinístico */
function normalizeOptions(obj?: Record<string, string | null>) {
  if (!obj) return {};
  const entries = Object.entries(obj).filter(([, v]) => v != null && v !== '');
  entries.sort(([a], [b]) => a.localeCompare(b));
  return Object.fromEntries(entries);
}

export async function addToCartAction(raw: AddToCartInput) {
  const input = AddToCartSchema.parse(raw);

  const cart = await getOrCreateCart();

  // ✅ sem custos de personalização/opções
  const unitPrice = await getBaseUnitPrice(input.productId);
  const totalPrice = unitPrice * input.qty;

  const optionsJson = normalizeOptions(input.options ?? undefined);
  const personalization = input.personalization ?? null;

  // Junta linhas iguais (mesmo produto + mesmas opções/personalização)
  const existing = await prisma.cartItem.findFirst({
    where: {
      cartId: cart.id,
      productId: input.productId,
      optionsJson: optionsJson as any,
      personalization: personalization as any,
    },
    select: { id: true, qty: true },
  });

  if (existing) {
    const newQty = Math.min(99, existing.qty + input.qty);
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: {
        qty: newQty,
        unitPrice,                         // fica sempre o base
        totalPrice: unitPrice * newQty,    // base * qty
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
        unitPrice,                         // ✅ base
        totalPrice,                        // ✅ base * qty
        optionsJson: optionsJson as any,   // informativo
        personalization: personalization as any, // informativo
      },
    });
  }

  const count = await prisma.cartItem.count({ where: { cartId: cart.id } });

  return {
    ok: true as const,
    cartId: cart.id,
    count,
    totalPrice, // total desta operação
  };
}

export async function getCartSummary() {
  const jar = await cookies();
  const sid = jar.get('sid')?.value ?? null;
  if (!sid) return { count: 0, total: 0 };

  const items = await prisma.cartItem.findMany({
    where: { cart: { sessionId: sid } },
    select: { totalPrice: true },
  });

  const total = items.reduce((acc, it) => acc + it.totalPrice, 0);
  return { count: items.length, total };
}
