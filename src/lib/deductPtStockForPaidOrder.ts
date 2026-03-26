import { prisma } from "@/lib/prisma";
import { ProductChannel } from "@prisma/client";

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as JsonRecord;
}

function normalizeSize(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim().toUpperCase();
  if (!normalized) return null;

  return normalized;
}

function extractSizeFromSnapshot(snapshot: unknown): string | null {
  const snap = asRecord(snapshot);
  if (!snap) return null;

  const directCandidates: unknown[] = [
    snap.size,
    snap.selectedSize,
    snap.variantSize,
    snap.chosenSize,
  ];

  for (const candidate of directCandidates) {
    const normalized = normalizeSize(candidate);
    if (normalized) return normalized;
  }

  const options = asRecord(snap.options);
  if (options) {
    const optionCandidates: unknown[] = [
      options.size,
      options.selectedSize,
      options.variantSize,
      options.chosenSize,
      options.Size,
    ];

    for (const candidate of optionCandidates) {
      const normalized = normalizeSize(candidate);
      if (normalized) return normalized;
    }
  }

  const selectedOptions = asRecord(snap.selectedOptions);
  if (selectedOptions) {
    const selectedOptionCandidates: unknown[] = [
      selectedOptions.size,
      selectedOptions.selectedSize,
      selectedOptions.variantSize,
      selectedOptions.chosenSize,
      selectedOptions.Size,
    ];

    for (const candidate of selectedOptionCandidates) {
      const normalized = normalizeSize(candidate);
      if (normalized) return normalized;
    }
  }

  const personalization = asRecord(snap.personalization);
  if (personalization) {
    const personalizationCandidates: unknown[] = [
      personalization.size,
      personalization.selectedSize,
    ];

    for (const candidate of personalizationCandidates) {
      const normalized = normalizeSize(candidate);
      if (normalized) return normalized;
    }
  }

  return null;
}

/**
 * Deduz o stock PT por tamanho quando a encomenda fica paga.
 *
 * Regras:
 * - Evita descontar duas vezes usando order.stockDeductedAt
 * - Só desconta itens de produtos com channel = PT_STOCK_CTT
 * - Atualiza SizeStock.ptStockQty e SizeStock.available
 * - Recalcula Product.ptStockQty como soma de todos os tamanhos
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
            name: true,
            snapshotJson: true,
            product: {
              select: {
                id: true,
                name: true,
                channel: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    // Evita descontar duas vezes caso o webhook repita
    if (order.stockDeductedAt) {
      return;
    }

    const affectedProductIds = new Set<string>();

    for (const item of order.items) {
      const qty = Math.max(0, Number(item.qty ?? 0));
      if (qty <= 0) continue;

      if (!item.product) {
        console.warn(
          `[deductPtStockForPaidOrder] Missing product relation for order item ${item.id}`
        );
        continue;
      }

      // Só desconta stock de produtos PT Stock
      if (item.product.channel !== ProductChannel.PT_STOCK_CTT) {
        continue;
      }

      const selectedSize = extractSizeFromSnapshot(item.snapshotJson);

      if (!selectedSize) {
        throw new Error(
          `Missing size for PT Stock order item ${item.id} (${item.name}) on product ${item.productId}`
        );
      }

      const sizeStock = await tx.sizeStock.findUnique({
        where: {
          productId_size: {
            productId: item.productId,
            size: selectedSize,
          },
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