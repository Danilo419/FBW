// src/lib/checkout.ts
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

/** Recalcula o preço de 1 unidade com base em basePrice + deltas das opções */
async function computeUnitPrice(productId: string, optionsJson: Record<string, string | null> | null) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { options: { include: { values: true } } },
  });
  if (!product) throw new Error('Product not found');

  let price = product.basePrice;
  if (optionsJson) {
    for (const group of product.options) {
      const chosen = optionsJson[group.key];
      if (!chosen) continue;
      const val = group.values.find(v => v.value === chosen);
      if (val) price += val.priceDelta;
    }
  }
  return price;
}

/** Cria uma Order 'pending' a partir do carrinho atual e devolve a Order completa */
export async function createOrderFromCart() {
  const jar = await cookies();
  const sid = jar.get('sid')?.value ?? null;

  // NOTA: se usares auth, carrega userId aqui
  const userId: string | null = null;

  const cart = await prisma.cart.findFirst({
    where: {
      OR: [
        userId ? { userId } : undefined,
        sid ? { sessionId: sid } : undefined,
      ].filter(Boolean) as any,
    },
    include: {
      items: {
        include: {
          product: { select: { id: true, name: true, images: true, basePrice: true, slug: true, team: true } },
        },
      },
    },
  });
  if (!cart || cart.items.length === 0) {
    throw new Error('Cart empty');
  }

  // Recalcular preços com base nos produtos e opções atuais
  let subtotal = 0;
  const orderItemsData = [];
  for (const it of cart.items) {
    const optionsJson = (it as any).optionsJson as Record<string, string | null> | null;
    const unitPrice = await computeUnitPrice(it.productId, optionsJson);
    const totalPrice = unitPrice * it.qty;
    subtotal += totalPrice;

    orderItemsData.push({
      productId: it.productId,
      name: it.product.name,
      image: it.product.images?.[0] ?? null,
      qty: it.qty,
      unitPrice,
      totalPrice,
      snapshotJson: {
        team: it.product.team,
        productSlug: it.product.slug,
        optionsJson,
      } as any,
    });
  }

  const shipping = 0; // ajusta se tiveres portes
  const tax = 0;      // ajusta se tiveres IVA manual (ou usa Stripe Tax)
  const total = subtotal + shipping + tax;

  const order = await prisma.order.create({
    data: {
      userId: userId ?? null,
      sessionId: sid,
      status: 'pending',
      currency: 'EUR',
      subtotal,
      shipping,
      tax,
      total,
      items: { create: orderItemsData },
    },
    include: { items: true },
  });

  return order;
}

/** Após pagamento bem-sucedido: baixa stock e limpa carrinho */
export async function finalizePaidOrder(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;

  // TODO (opcional): baixar stock em SizeStock com base nas opções
  // Exemplo (simplificado): sem gestão de stock por tamanho.

  // Limpar carrinho deste user/session
  if (order.sessionId) {
    const cart = await prisma.cart.findFirst({ where: { sessionId: order.sessionId } });
    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
  }
}
