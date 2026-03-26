// src/lib/redeem-discount-code.ts
import type { Prisma } from "@prisma/client";
import { normalizeDiscountCode } from "@/lib/discount-codes";

type DiscountTx = Prisma.TransactionClient;

export async function redeemDiscountCodeTx(
  tx: DiscountTx,
  rawCode: string | null | undefined,
  orderId: string
) {
  const code = normalizeDiscountCode(rawCode || "");
  if (!code) return null;

  const discount = await tx.discountCode.findUnique({
    where: { code },
  });

  if (!discount) return null;

  const safeDiscount = discount as typeof discount & {
    usedByOrderId?: string | null;
  };

  const now = new Date();

  if (!discount.active) return null;
  if (discount.expiresAt && discount.expiresAt < now) return null;

  // uso único real
  if (discount.usedAt) {
    throw new Error("Discount code already used.");
  }

  if (safeDiscount.usedByOrderId) {
    throw new Error("Discount code already linked to an order.");
  }

  // compatibilidade com o modelo atual/anterior
  if (discount.maxUses <= 0) return null;
  if (discount.usesCount >= 1) {
    throw new Error("Discount code already used.");
  }
  if (discount.usesCount >= discount.maxUses) {
    throw new Error("Discount code usage limit reached.");
  }

  // updateMany protege contra corrida:
  // só atualiza se o código continuar livre no exato momento do update
  const updated = await tx.discountCode.updateMany({
    where: {
      id: discount.id,
      active: true,
      usedAt: null,
      usesCount: 0,
      ...(safeDiscount.usedByOrderId === undefined
        ? {}
        : { usedByOrderId: null }),
    } as any,
    data: {
      active: false,
      usedAt: now,
      usesCount: 1,
      usedByOrderId: orderId,
    } as any,
  });

  if (updated.count !== 1) {
    throw new Error("Failed to redeem discount code.");
  }

  return {
    ...discount,
    active: false,
    usedAt: now,
    usesCount: 1,
    usedByOrderId: orderId,
  };
}