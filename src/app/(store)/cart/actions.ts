// src/app/(store)/cart/actions.ts
'use server';

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
  const jar = await cookies(); // na tua versão é Promise
  let sid = jar.get('sid')?.value ?? null;

  // Se tiveres auth, podes carregar userId aqui (ex.: via getServerSession)
  const userId: string | null = null;

  // 1) tenta por sessionId existente
  if (sid) {
    const found = await prisma.cart.findUnique({ where: { sessionId: sid } });
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

/** Calcula o preço final de 1 unidade com base nas opções escolhidas */
async function computeUnitPrice(
  productId: string,
  options: Record<string, string | null>
): Promise<number> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { options: { include: { values: true } } },
  });
  if (!product) throw new Error('Product not found');

  let price = product.basePrice;
  for (const group of product.options) {
    const chosen = options[group.key];
    if (!chosen) continue;
    const val = group.values.find((v) => v.value === chosen);
    if (val) price += val.priceDelta;
  }
  return price;
}

export async function addToCartAction(raw: AddToCartInput) {
  const input = AddToCartSchema.parse(raw);

  const cart = await getOrCreateCart();

  const unitPrice = await computeUnitPrice(input.productId, input.options);
  const totalPrice = unitPrice * input.qty;

  const item = await prisma.cartItem.create({
    data: {
      cartId: cart.id,
      productId: input.productId,
      qty: input.qty,
      unitPrice,                     // Int obrigatório no schema
      totalPrice,                    // Int obrigatório no schema
      optionsJson: (input.options ?? {}) as any, // Json? no schema
      personalization: (input.personalization ?? null) as any,
    },
    include: { product: true },
  });

  const count = await prisma.cartItem.count({ where: { cartId: cart.id } });

  return {
    ok: true as const,
    cartId: cart.id,
    itemId: item.id,
    count,
    totalPrice,
  };
}

export async function getCartSummary() {
  const jar = await cookies(); // na tua versão é Promise
  const sid = jar.get('sid')?.value ?? null;
  if (!sid) return { count: 0, total: 0 };

  const items = await prisma.cartItem.findMany({
    where: { cart: { sessionId: sid } },
    select: { totalPrice: true },
  });

  const total = items.reduce((acc, it) => acc + it.totalPrice, 0);
  return { count: items.length, total };
}
