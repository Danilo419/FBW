const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function safeJson(value) {
  if (value == null) return null;
  if (typeof value === "object") return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

function isObject(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function pick(obj, keys) {
  if (!isObject(obj)) return undefined;
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") {
      return obj[k];
    }
  }
  return undefined;
}

function deepFindSize(value, depth = 0) {
  if (depth > 6 || value == null) return undefined;

  const parsed = safeJson(value);

  if (typeof parsed === "string") {
    const direct = parsed.match(/(?:^|[\s,;|])(?:size|tamanho)\s*[:=]\s*([A-Za-z0-9.+-]+)/i);
    if (direct) return direct[1].toUpperCase();

    if (/^(XXS|XS|S|M|L|XL|XXL|XXXL)$/i.test(parsed.trim())) {
      return parsed.trim().toUpperCase();
    }
    return undefined;
  }

  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      const found = deepFindSize(item, depth + 1);
      if (found) return found;
    }
    return undefined;
  }

  if (isObject(parsed)) {
    const direct =
      pick(parsed, ["size", "Size", "tamanho", "variantSize", "selectedSize", "shirtSize"]) ||
      pick(parsed, ["value"]) ||
      undefined;

    if (typeof direct === "string") {
      if (/^(XXS|XS|S|M|L|XL|XXL|XXXL)$/i.test(direct.trim())) {
        return direct.trim().toUpperCase();
      }
    }

    for (const [k, v] of Object.entries(parsed)) {
      if (/size|tamanho/i.test(k)) {
        if (typeof v === "string" && v.trim()) return v.trim().toUpperCase();
      }
      const found = deepFindSize(v, depth + 1);
      if (found) return found;
    }
  }

  return undefined;
}

function summarizePossibleStockFields(product) {
  if (!product || typeof product !== "object") return {};
  const result = {};

  for (const key of Object.keys(product)) {
    const val = product[key];

    if (
      /stock|qty|quant|size|variant|inventory/i.test(key) &&
      val !== undefined &&
      val !== null
    ) {
      result[key] = safeJson(val);
    }
  }

  return result;
}

function lines(title = "") {
  console.log("\n" + "=".repeat(100));
  if (title) console.log(title);
  console.log("=".repeat(100));
}

(async () => {
  console.log("PT STOCK DEBUG");
  console.log("Quando:", new Date().toISOString());
  console.log("Pasta:", process.cwd());

  lines("1) ÚLTIMAS ENCOMENDAS PAID / RECENTES");
  const orders = await prisma.order.findMany({
    take: 20,
    orderBy: { updatedAt: "desc" },
    include: {
      items: {
        include: {
          product: true
        }
      }
    }
  });

  if (!orders.length) {
    console.log("Nenhuma order encontrada.");
    return;
  }

  let foundRelevant = 0;

  for (const order of orders) {
    const orderLooksRelevant =
      String(order.status || "").toLowerCase() === "paid" ||
      String(order.paymentStatus || "").toLowerCase() === "paid" ||
      String(order.channel || "").toUpperCase() === "PT_STOCK_CTT" ||
      (order.items || []).some((it) => String(it?.product?.channel || "").toUpperCase() === "PT_STOCK_CTT");

    if (!orderLooksRelevant) continue;
    foundRelevant++;

    lines(`ORDER ${order.id}`);

    console.log("status:", order.status);
    console.log("paymentStatus:", order.paymentStatus);
    console.log("channel:", order.channel);
    console.log("createdAt:", order.createdAt);
    console.log("updatedAt:", order.updatedAt);
    console.log("paidAt:", order.paidAt);
    console.log("total:", order.total);
    console.log("totalCents:", order.totalCents);
    console.log("subtotal:", order.subtotal);
    console.log("shipping:", order.shipping);
    console.log("tax:", order.tax);

    if (!order.items?.length) {
      console.log("⚠️ Esta order não tem items.");
      continue;
    }

    for (const item of order.items) {
      console.log("\n--- ITEM ------------------------------------------------------------");
      console.log("itemId:", item.id);
      console.log("name:", item.name);
      console.log("qty:", item.qty);
      console.log("unitPrice:", item.unitPrice);
      console.log("productId:", item.productId);

      const size =
        deepFindSize(item.snapshotJson) ||
        deepFindSize(item.optionsJson) ||
        deepFindSize(item.variantJson) ||
        deepFindSize(item.metaJson) ||
        deepFindSize(item);

      console.log("sizeDetectado:", size || "(não encontrado)");

      const snapshot = safeJson(item.snapshotJson);
      const options = safeJson(item.optionsJson);
      const variant = safeJson(item.variantJson);
      const meta = safeJson(item.metaJson);

      console.log("snapshotJson:", snapshot);
      console.log("optionsJson:", options);
      console.log("variantJson:", variant);
      console.log("metaJson:", meta);

      if (!item.product) {
        console.log("❌ PROBLEMA: o item não tem product associado.");
        continue;
      }

      console.log("product.name:", item.product.name);
      console.log("product.slug:", item.product.slug);
      console.log("product.channel:", item.product.channel);
      console.log("product.ptStockQty:", item.product.ptStockQty);

      const possibleStockFields = summarizePossibleStockFields(item.product);
      console.log("possibleStockFields:", possibleStockFields);

      const problems = [];

      if (String(item.product.channel || "").toUpperCase() !== "PT_STOCK_CTT") {
        problems.push("O product.channel não é PT_STOCK_CTT.");
      }

      if (!size) {
        problems.push("Não consegui detetar o tamanho comprado no item.");
      }

      const stockFieldKeys = Object.keys(possibleStockFields);
      if (!stockFieldKeys.length) {
        problems.push("Não encontrei campos óbvios de stock por tamanho no produto.");
      }

      if (
        (String(order.status || "").toLowerCase() !== "paid") &&
        (String(order.paymentStatus || "").toLowerCase() !== "paid")
      ) {
        problems.push("A order não parece efetivamente marcada como paid nos campos esperados.");
      }

      if (!problems.length) {
        console.log("✅ Estrutura parece minimamente compatível para descontar stock.");
      } else {
        for (const p of problems) {
          console.log("⚠️", p);
        }
      }
    }
  }

  if (!foundRelevant) {
    console.log("⚠️ Não encontrei nenhuma order recente que pareça relevante para PT stock / paid.");
  }

  lines("2) RESUMO RÁPIDO");
  console.log("Se aparecer um destes problemas, normalmente a falha está aqui:");
  console.log("- sizeDetectado = (não encontrado)  -> o webhook/função não sabe que tamanho descontar");
  console.log("- product.channel != PT_STOCK_CTT   -> o item não está a cair na lógica PT stock");
  console.log("- sem stockFields                   -> o produto não tem onde descontar por tamanho");
  console.log("- status/paymentStatus não paid     -> a função nunca é disparada na condição certa");

  lines("3) FIM");
})()
  .catch((err) => {
    console.error("ERRO FATAL NO DEBUG:");
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
