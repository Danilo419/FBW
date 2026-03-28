import { prisma } from "../src/lib/prisma";
import { deductPtStockForPaidOrder } from "../src/lib/deductPtStockForPaidOrder";

const ORDER_ID = "cmn95xmmi0008ky04gtc8bu4z";

async function snapshot(label: string) {
  const order = await prisma.order.findUnique({
    where: { id: ORDER_ID },
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      paidAt: true,
      stockDeductedAt: true,
      items: {
        select: {
          id: true,
          name: true,
          qty: true,
          productId: true,
          snapshotJson: true,
        },
      },
    },
  });

  if (!order) {
    console.log(`[${label}] ORDER NAO ENCONTRADA`);
    return;
  }

  const productIds = [...new Set(order.items.map(i => i.productId).filter(Boolean))];

  const sizeStocks = await prisma.sizeStock.findMany({
    where: {
      productId: { in: productIds },
    },
    orderBy: [{ productId: "asc" }, { size: "asc" }],
    select: {
      id: true,
      productId: true,
      size: true,
      ptStockQty: true,
      available: true,
    },
  });

  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
    },
    orderBy: { id: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      channel: true,
      ptStockQty: true,
    },
  });

  console.log("\n==================================================");
  console.log(label);
  console.log("==================================================");
  console.log("ORDER:");
  console.log(JSON.stringify(order, null, 2));
  console.log("SIZE STOCKS:");
  console.log(JSON.stringify(sizeStocks, null, 2));
  console.log("PRODUCTS:");
  console.log(JSON.stringify(products, null, 2));
}

async function main() {
  console.log("MANUAL EXECUTION OF deductPtStockForPaidOrder");
  console.log("Quando:", new Date().toISOString());
  console.log("ORDER_ID:", ORDER_ID);

  await snapshot("ANTES");

  console.log("\n==================================================");
  console.log("A EXECUTAR deductPtStockForPaidOrder");
  console.log("==================================================");

  try {
    await deductPtStockForPaidOrder(ORDER_ID);
    console.log("OK: deductPtStockForPaidOrder terminou sem erro.");
  } catch (err) {
    console.log("ERRO AO EXECUTAR deductPtStockForPaidOrder:");
    console.error(err);
  }

  await snapshot("DEPOIS");
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
