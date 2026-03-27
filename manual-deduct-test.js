const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function asObj(v) {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v;
}

function normSize(v) {
  if (typeof v !== "string") return null;
  const s = v.trim().toUpperCase();
  return s || null;
}

function extractSize(snapshot) {
  const snap = asObj(snapshot);
  if (!snap) return null;

  for (const c of [snap.size, snap.selectedSize, snap.variantSize, snap.chosenSize]) {
    const n = normSize(c);
    if (n) return n;
  }

  const options = asObj(snap.options);
  if (options) {
    for (const c of [options.size, options.selectedSize, options.variantSize, options.chosenSize, options.Size]) {
      const n = normSize(c);
      if (n) return n;
    }
  }

  const selectedOptions = asObj(snap.selectedOptions);
  if (selectedOptions) {
    for (const c of [selectedOptions.size, selectedOptions.selectedSize, selectedOptions.variantSize, selectedOptions.chosenSize, selectedOptions.Size]) {
      const n = normSize(c);
      if (n) return n;
    }
  }

  return null;
}

(async () => {
  const order = await prisma.order.findFirst({
    where: { status: "paid" },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: {
          product: {
            select: { id: true, name: true, channel: true }
          }
        }
      }
    }
  });

  if (!order) {
    console.log("NO_PAID_ORDER_FOUND");
    return;
  }

  console.log("TRYING_ORDER", order.id);

  if (order.stockDeductedAt) {
    console.log("ORDER_ALREADY_HAS_stockDeductedAt", order.stockDeductedAt);
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      if (!item.product || item.product.channel !== "PT_STOCK_CTT") continue;

      const size = extractSize(item.snapshotJson);
      console.log("ITEM_CHECK", {
        itemId: item.id,
        productId: item.productId,
        qty: item.qty,
        size,
      });

      if (!size) {
        throw new Error(`SIZE_NOT_FOUND_FOR_ITEM_${item.id}`);
      }

      const row = await tx.sizeStock.findUnique({
        where: {
          productId_size: {
            productId: item.productId,
            size,
          },
        },
      });

      console.log("SIZE_STOCK_ROW", row);

      if (!row) {
        throw new Error(`SIZE_STOCK_NOT_FOUND_${item.productId}_${size}`);
      }

      const nextQty = Math.max(0, Number(row.ptStockQty || 0) - Number(item.qty || 0));

      await tx.sizeStock.update({
        where: { id: row.id },
        data: {
          ptStockQty: nextQty,
          available: nextQty > 0,
        },
      });
    }

    const productIds = [...new Set(order.items.map(i => i.productId))];

    for (const productId of productIds) {
      const rows = await tx.sizeStock.findMany({
        where: { productId },
        select: { ptStockQty: true },
      });

      const totalQty = rows.reduce((sum, r) => sum + Math.max(0, Number(r.ptStockQty || 0)), 0);

      await tx.product.update({
        where: { id: productId },
        data: { ptStockQty: totalQty },
      });
    }

    await tx.order.update({
      where: { id: order.id },
      data: { stockDeductedAt: new Date() },
    });
  });

  console.log("MANUAL_DEDUCTION_OK", order.id);
})()
  .catch((err) => {
    console.error("MANUAL_DEDUCTION_FAILED");
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
