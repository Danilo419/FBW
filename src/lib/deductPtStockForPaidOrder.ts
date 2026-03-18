import { prisma } from "@/lib/prisma";

type JsonRecord = Record<string, unknown>;

function extractSizeFromSnapshot(snapshot: unknown): string | null {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return null;
  }

  const snap = snapshot as JsonRecord;

  const directSize = snap.size;
  if (typeof directSize === "string" && directSize.trim()) {
    return directSize.trim();
  }

  const selectedSize = snap.selectedSize;
  if (typeof selectedSize === "string" && selectedSize.trim()) {
    return selectedSize.trim();
  }

  const options = snap.options;
  if (options && typeof options === "object" && !Array.isArray(options)) {
    const optionSize = (options as JsonRecord).size;
    if (typeof optionSize === "string" && optionSize.trim()) {
      return optionSize.trim();
    }
  }

  const selectedOptions = snap.selectedOptions;
  if (
    selectedOptions &&
    typeof selectedOptions === "object" &&
    !Array.isArray(selectedOptions)
  ) {
    const selectedOptionSize = (selectedOptions as JsonRecord).size;
    if (typeof selectedOptionSize === "string" && selectedOptionSize.trim()) {
      return selectedOptionSize.trim();
    }
  }

  return null;
}

/**
 * Deduz o stock PT por tamanho quando a encomenda fica paga.
 * - Evita descontar duas vezes usando order.stockDeductedAt
 * - Atualiza SizeStock.ptStockQty e SizeStock.available
 * - Recalcula Product.ptStockQty
 */
export async function deductPtStockForPaidOrder(orderId: string): Promise<void> {
  if (!orderId?.trim()) {
    throw new Error("Missing orderId");
  }

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        stockDeductedAt: true,
        items: {
          select: {
            id: true,
            productId: true,
            qty: true,
            snapshotJson: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    // Evita descontar duas vezes caso o webhook repita
    if (order.stockDeductedAt) {
      return;
    }

    const affectedProductIds = new Set<string>();

    for (const item of order.items) {
      const qty = Math.max(0, Number(item.qty ?? 0));
      if (qty <= 0) continue;

      const selectedSize = extractSizeFromSnapshot(item.snapshotJson);

      if (!selectedSize) {
        console.warn(
          `[deductPtStockForPaidOrder] Missing size for order item ${item.id} (product ${item.productId})`
        );
        continue;
      }

      const sizeStock = await tx.sizeStock.findFirst({
        where: {
          productId: item.productId,
          size: selectedSize,
        },
        select: {
          id: true,
          ptStockQty: true,
        },
      });

      if (!sizeStock) {
        throw new Error(
          `SizeStock not found for product ${item.productId} and size ${selectedSize}`
        );
      }

      const currentQty = Math.max(0, Number(sizeStock.ptStockQty ?? 0));
      const nextQty = Math.max(0, currentQty - qty);

      await tx.sizeStock.update({
        where: { id: sizeStock.id },
        data: {
          ptStockQty: nextQty,
          available: nextQty > 0,
        },
      });

      affectedProductIds.add(item.productId);
    }

    for (const productId of affectedProductIds) {
      const sizeRows = await tx.sizeStock.findMany({
        where: { productId },
        select: {
          ptStockQty: true,
        },
      });

      const totalQty = sizeRows.reduce((sum, row) => {
        return sum + Math.max(0, Number(row.ptStockQty ?? 0));
      }, 0);

      await tx.product.update({
        where: { id: productId },
        data: {
          ptStockQty: totalQty,
        },
      });
    }

    await tx.order.update({
      where: { id: orderId },
      data: {
        stockDeductedAt: new Date(),
      },
    });
  });
}