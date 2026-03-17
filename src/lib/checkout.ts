// src/lib/checkout.ts
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  DISCOUNT_COOKIE,
  calcDiscountOnProductsOnly,
  getValidDiscountCode,
  normalizeDiscountCode,
} from "@/lib/discount-codes";

/** Recalcula o preço de 1 unidade com base em basePrice + deltas das opções */
async function computeUnitPrice(
  productId: string,
  optionsJson: Record<string, string | null> | null
) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { options: { include: { values: true } } },
  });

  if (!product) throw new Error("Product not found");

  let price = product.basePrice;

  if (optionsJson) {
    for (const group of product.options) {
      const chosen = optionsJson[group.key];
      if (!chosen) continue;

      const val = group.values.find((v) => v.value === chosen);
      if (val) price += val.priceDelta;
    }
  }

  return price;
}

function detectCartChannel(
  items: Array<{
    product: {
      channel?: string | null;
    };
  }>
): "GLOBAL" | "PT_STOCK_CTT" | "MIXED" {
  const channels = new Set<string>();

  for (const it of items) {
    channels.add(String(it.product?.channel ?? "GLOBAL"));
  }

  if (channels.size > 1) return "MIXED";

  const only = Array.from(channels)[0];
  return only === "PT_STOCK_CTT" ? "PT_STOCK_CTT" : "GLOBAL";
}

/** Cria uma Order 'pending' a partir do carrinho atual e devolve a Order completa */
export async function createOrderFromCart() {
  const jar = await cookies();
  const sid = jar.get("sid")?.value ?? null;
  const rawDiscountCode = jar.get(DISCOUNT_COOKIE)?.value ?? "";
  const normalizedDiscountCode = normalizeDiscountCode(rawDiscountCode);

  // NOTA: se usares auth, carrega userId aqui
  const userId: string | null = null;

  const orWhere = [
    userId ? { userId } : null,
    sid ? { sessionId: sid } : null,
  ].filter(Boolean) as Array<{ userId?: string | null; sessionId?: string | null }>;

  const cart = await prisma.cart.findFirst({
    where: orWhere.length ? { OR: orWhere } : undefined,
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              imageUrls: true,
              basePrice: true,
              slug: true,
              team: true,
              channel: true,
            },
          },
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    throw new Error("Cart empty");
  }

  const cartChannel = detectCartChannel(cart.items);

  // Recalcular preços com base nos produtos e opções atuais
  let productSubtotalCents = 0;

  const orderItemsData: Array<{
    productId: string;
    name: string;
    image: string | null;
    qty: number;
    unitPrice: number;
    totalPrice: number;
    snapshotJson: any;
  }> = [];

  for (const it of cart.items) {
    const optionsJson = (it as any).optionsJson as Record<string, string | null> | null;
    const personalization = (it as any).personalization ?? null;

    const unitPrice = await computeUnitPrice(it.productId, optionsJson);
    const totalPrice = unitPrice * it.qty;

    productSubtotalCents += totalPrice;

    orderItemsData.push({
      productId: it.productId,
      name: it.product.name,
      image: it.product.imageUrls?.[0] ?? null,
      qty: it.qty,
      unitPrice,
      totalPrice,
      snapshotJson: {
        team: it.product.team,
        productSlug: it.product.slug,
        productChannel: it.product.channel ?? "GLOBAL",
        optionsJson,
        personalization,
      } as any,
    });
  }

  const validDiscount = normalizedDiscountCode
    ? await getValidDiscountCode(normalizedDiscountCode)
    : null;

  const discountAmountCents = validDiscount
    ? calcDiscountOnProductsOnly(
        productSubtotalCents,
        Number(validDiscount.percentOff ?? 0)
      )
    : 0;

  const shippingCents = 0; // ajusta se tiveres portes calculados aqui
  const tax = 0;
  const totalCents = Math.max(
    0,
    productSubtotalCents - discountAmountCents + shippingCents + tax
  );

  const order = await prisma.order.create({
    data: {
      userId: userId ?? null,
      sessionId: sid,
      status: "pending",
      currency: "EUR",
      channel: cartChannel === "PT_STOCK_CTT" ? "PT_STOCK_CTT" : "GLOBAL",

      subtotal: productSubtotalCents,
      productSubtotalCents,

      shipping: shippingCents,
      shippingCents,

      tax,

      discountCodeId: validDiscount?.id ?? null,
      discountCodeText: validDiscount?.code ?? null,
      discountPercent: validDiscount?.percentOff ?? null,
      discountAmountCents,

      total: totalCents / 100,
      totalCents,

      items: { create: orderItemsData },
    },
    include: { items: true },
  });

  return order;
}

/** Após pagamento bem-sucedido: baixa stock e limpa carrinho */
export async function finalizePaidOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) return;

  // TODO (opcional): baixar stock em SizeStock com base nas opções
  // Exemplo (simplificado): sem gestão de stock por tamanho.

  // Limpar carrinho desta session
  if (order.sessionId) {
    const cart = await prisma.cart.findFirst({
      where: { sessionId: order.sessionId },
    });

    if (cart) {
      await prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      });
    }
  }
}