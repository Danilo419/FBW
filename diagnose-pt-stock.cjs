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

  const direct = [
    snap.size,
    snap.selectedSize,
    snap.variantSize,
    snap.chosenSize,
  ];

  for (const c of direct) {
    const n = normSize(c);
    if (n) return n;
  }

  const options = asObj(snap.options);
  if (options) {
    for (const c of [
      options.size,
      options.selectedSize,
      options.variantSize,
      options.chosenSize,
      options.Size,
    ]) {
      const n = normSize(c);
      if (n) return n;
    }
  }

  const selectedOptions = asObj(snap.selectedOptions);
  if (selectedOptions) {
    for (const c of [
      selectedOptions.size,
      selectedOptions.selectedSize,
      selectedOptions.variantSize,
      selectedOptions.chosenSize,
      selectedOptions.Size,
    ]) {
      const n = normSize(c);
      if (n) return n;
    }
  }

  const personalization = asObj(snap.personalization);
  if (personalization) {
    for (const c of [personalization.size, personalization.selectedSize]) {
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
            select: {
              id: true,
              name: true,
              channel: true,
              ptStockQty: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    console.log("NO_PAID_ORDER_FOUND");
    return;
  }

  console.log("==================================================");
  console.log("LATEST PAID ORDER");
  console.log("==================================================");
  console.log(JSON.stringify({
    id: order.id,
    status: order.status,
    paymentStatus: order.paymentStatus,
    channel: order.channel,
    stockDeductedAt: order.stockDeductedAt,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    totalCents: order.totalCents,
  }, null, 2));

  const ptItems = (order.items || []).filter(
    (it) => it.product && it.product.channel === "PT_STOCK_CTT"
  );

  console.log("==================================================");
  console.log("PT STOCK ITEMS IN ORDER");
  console.log("==================================================");

  if (ptItems.length === 0) {
    console.log("NO_PT_STOCK_ITEMS_IN_THIS_ORDER");
  }

  for (const item of ptItems) {
    const size = extractSize(item.snapshotJson);
    console.log(JSON.stringify({
      itemId: item.id,
      productId: item.productId,
      productName: item.product?.name,
      productChannel: item.product?.channel,
      qty: item.qty,
      detectedSize: size,
      snapshotJson: item.snapshotJson,
    }, null, 2));
  }

  const grouped = new Map();

  for (const item of ptItems) {
    const size = extractSize(item.snapshotJson);
    const key = `${item.productId}__${size || "NO_SIZE"}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        productId: item.productId,
        productName: item.product?.name || "Unknown",
        size,
        orderedQty: 0,
      });
    }
    grouped.get(key).orderedQty += Number(item.qty || 0);
  }

  const productIds = [...new Set(ptItems.map((i) => i.productId))];
  const sizeStocks = await prisma.sizeStock.findMany({
    where: { productId: { in: productIds } },
    orderBy: [{ productId: "asc" }, { size: "asc" }],
  });

  console.log("==================================================");
  console.log("CURRENT SIZE STOCK ROWS");
  console.log("==================================================");
  console.log(JSON.stringify(sizeStocks, null, 2));

  console.log("==================================================");
  console.log("EXPECTED MATCH / PROBLEM CHECK");
  console.log("==================================================");

  for (const entry of grouped.values()) {
    if (!entry.size) {
      console.log(JSON.stringify({
        productId: entry.productId,
        productName: entry.productName,
        problem: "SIZE_NOT_FOUND_IN_SNAPSHOT",
        orderedQty: entry.orderedQty,
      }, null, 2));
      continue;
    }

    const row = sizeStocks.find(
      (r) => r.productId === entry.productId && String(r.size).toUpperCase() === String(entry.size).toUpperCase()
    );

    if (!row) {
      console.log(JSON.stringify({
        productId: entry.productId,
        productName: entry.productName,
        size: entry.size,
        orderedQty: entry.orderedQty,
        problem: "SIZE_STOCK_ROW_NOT_FOUND",
      }, null, 2));
      continue;
    }

    console.log(JSON.stringify({
      productId: entry.productId,
      productName: entry.productName,
      size: entry.size,
      orderedQty: entry.orderedQty,
      currentPtStockQty: row.ptStockQty,
      expectedPtStockQtyAfterDeduction: Math.max(0, Number(row.ptStockQty || 0) - Number(entry.orderedQty || 0)),
      available: row.available,
    }, null, 2));
  }

  console.log("==================================================");
  console.log("FINAL DIAGNOSIS");
  console.log("==================================================");

  if (order.stockDeductedAt == null) {
    console.log("DIAGNOSIS: ORDER_IS_PAID_BUT_STOCK_DEDUCTION_DID_NOT_FINISH_OR_DID_NOT_RUN");
  } else {
    console.log("DIAGNOSIS: stockDeductedAt IS FILLED, so deduction should already have run");
  }
})()
  .catch((err) => {
    console.error("SCRIPT_ERROR");
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
