import { prisma } from "@/lib/prisma";
import { deductPtStockForPaidOrder } from "@/lib/deductPtStockForPaidOrder";
import { redeemDiscountCodeTx } from "@/lib/redeem-discount-code";
import { normalizeDiscountCode } from "@/lib/discount-codes";

export async function handlePaidOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      stockDeductedAt: true,
      discountCodeText: true,
    },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  // ✅ garantir que está paid
  if (order.status !== "paid") return;

  // ==============================
  // 🔥 STOCK (IDEMPOTENTE)
  // ==============================
  if (!order.stockDeductedAt) {
    try {
      await deductPtStockForPaidOrder(orderId);
    } catch (err) {
      console.error("[handlePaidOrder] stock error:", err);
    }
  }

  // ==============================
  // 🎟️ DISCOUNT (IDEMPOTENTE)
  // ==============================
  const code = normalizeDiscountCode(order.discountCodeText ?? "");

  if (code) {
    try {
      await prisma.$transaction(async (tx) => {
        await redeemDiscountCodeTx(tx, code, orderId);
      });
    } catch (err) {
      // ignora se já foi usado
      console.error("[handlePaidOrder] discount error:", err);
    }
  }
}