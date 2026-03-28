import { prisma } from "../src/lib/prisma";

function safeJson(v: any) {
  try {
    if (typeof v === "string") return JSON.parse(v);
    return v;
  } catch {
    return v;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function normalizeSize(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim().toUpperCase();
  return s || null;
}

function extractSizeFromSnapshot(snapshot: unknown): string | null {
  const snap = asRecord(safeJson(snapshot));
  if (!snap) return null;

  const directCandidates: unknown[] = [
    snap.size,
    snap.selectedSize,
    snap.variantSize,
    snap.chosenSize,
  ];

  for (const c of directCandidates) {
    const n = normalizeSize(c);
    if (n) return n;
  }

  const options = asRecord(snap.options);
  if (options) {
    for (const c of [
      options.size,
      options.selectedSize,
      options.variantSize,
      options.chosenSize,
      options.Size,
    ]) {
      const n = normalizeSize(c);
      if (n) return n;
    }
  }

  const selectedOptions = asRecord(snap.selectedOptions);
  if (selectedOptions) {
    for (const c of [
      selectedOptions.size,
      selectedOptions.selectedSize,
      selectedOptions.variantSize,
      selectedOptions.chosenSize,
      selectedOptions.Size,
    ]) {
      const n = normalizeSize(c);
      if (n) return n;
    }
  }

  const personalization = asRecord(snap.personalization);
  if (personalization) {
    for (const c of [personalization.size, personalization.selectedSize]) {
      const n = normalizeSize(c);
      if (n) return n;
    }
  }

  return null;
}

async function main() {
  console.log("PT STOCK ROOT CAUSE DEBUG");
  console.log("Quando:", new Date().toISOString());

  const order = await prisma.order.findFirst({
    where: {
      OR: [
        { status: "paid" },
        { paymentStatus: "paid" },
      ],
      items: {
        some: {
          product: {
            channel: "PT_STOCK_CTT",
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      paidAt: true,
      stockDeductedAt: true,
      channel: true,
      items: {
        select: {
          id: true,
          name: true,
          qty: true,
          productId: true,
          snapshotJson: true,
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              channel: true,
              ptStockQty: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    console.log("Nenhuma order paid PT_STOCK_CTT encontrada.");
    return;
  }

  console.log("\n==================================================");
  console.log("ORDER");
  console.log("==================================================");
  console.log(JSON.stringify({
    id: order.id,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paidAt: order.paidAt,
    stockDeductedAt: order.stockDeductedAt,
    channel: order.channel,
  }, null, 2));

  console.log("\n==================================================");
  console.log("ITENS E TAMANHOS");
  console.log("==================================================");

  const productIds = [...new Set(order.items.map(i => i.productId).filter(Boolean))];

  for (const item of order.items) {
    const detectedSize = extractSizeFromSnapshot(item.snapshotJson);

    console.log(JSON.stringify({
      itemId: item.id,
      name: item.name,
      qty: item.qty,
      productId: item.productId,
      detectedSize,
      snapshotJson: safeJson(item.snapshotJson),
      product: item.product,
    }, null, 2));
  }

  console.log("\n==================================================");
  console.log("SIZE STOCKS DOS PRODUTOS");
  console.log("==================================================");

  const sizeStocks = await prisma.sizeStock.findMany({
    where: {
      productId: { in: productIds },
    },
    orderBy: [
      { productId: "asc" },
      { size: "asc" },
    ],
    select: {
      id: true,
      productId: true,
      size: true,
      ptStockQty: true,
      available: true,
    },
  });

  console.log(JSON.stringify(sizeStocks, null, 2));

  console.log("\n==================================================");
  console.log("VALIDACAO ITEM A ITEM");
  console.log("==================================================");

  for (const item of order.items) {
    if (!item.product || item.product.channel !== "PT_STOCK_CTT") {
      console.log(JSON.stringify({
        itemId: item.id,
        ok: true,
        reason: "Ignorado porque nao e PT_STOCK_CTT",
      }, null, 2));
      continue;
    }

    const detectedSize = extractSizeFromSnapshot(item.snapshotJson);

    if (!detectedSize) {
      console.log(JSON.stringify({
        itemId: item.id,
        ok: false,
        reason: "Nao foi possivel detetar size no snapshotJson",
      }, null, 2));
      continue;
    }

    const row = sizeStocks.find(
      s => s.productId === item.productId && String(s.size).toUpperCase() === detectedSize
    );

    if (!row) {
      console.log(JSON.stringify({
        itemId: item.id,
        ok: false,
        reason: "FALTA LINHA SizeStock PARA ESTE TAMANHO",
        productId: item.productId,
        size: detectedSize,
      }, null, 2));
      continue;
    }

    console.log(JSON.stringify({
      itemId: item.id,
      ok: true,
      productId: item.productId,
      size: detectedSize,
      qtyOrdered: item.qty,
      sizeStockBefore: row.ptStockQty,
      expectedAfter: Math.max(0, Number(row.ptStockQty || 0) - Number(item.qty || 0)),
    }, null, 2));
  }

  console.log("\n==================================================");
  console.log("RESUMO");
  console.log("==================================================");

  console.log("- Se aparecer 'FALTA LINHA SizeStock PARA ESTE TAMANHO', esse e o motivo da falha.");
  console.log("- Se stockDeductedAt ja estiver preenchido, a funcao sai logo sem descontar.");
  console.log("- Se existir SizeStock para todos os tamanhos e stockDeductedAt estiver null, entao o problema e outro.");
}

main()
  .catch((err) => {
    console.error("ERRO FATAL:");
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
