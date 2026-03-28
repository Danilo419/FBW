const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const OUT = path.join(ROOT, "debug", "pt-stock-code-inspection.txt");

const TARGET_FILES = [
  "src/app/api/paypal/webhook/route.ts",
  "src/app/api/stripe/webhook/route.ts",
  "src/lib/deductPtStockForPaidOrder.ts",
  "src/lib/redeemDiscountCode.ts",
  "src/lib/redeem-discount-code.ts",
  "prisma/schema.prisma",
];

const SEARCH_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".prisma"]);

function exists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function readText(p) {
  try {
    return fs.readFileSync(p, "utf8");
  } catch (e) {
    return `[ERRO AO LER ${p}] ${String(e)}`;
  }
}

function walk(dir, results = []) {
  let items = [];
  try {
    items = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const item of items) {
    if (
      item.name === "node_modules" ||
      item.name === ".next" ||
      item.name === ".git" ||
      item.name === "dist" ||
      item.name === "build"
    ) {
      continue;
    }

    const full = path.join(dir, item.name);

    if (item.isDirectory()) {
      walk(full, results);
    } else {
      const ext = path.extname(item.name).toLowerCase();
      if (SEARCH_EXTS.has(ext)) results.push(full);
    }
  }

  return results;
}

function grepInFiles(files, patterns) {
  const hits = [];

  for (const file of files) {
    const text = readText(file);
    const lines = text.split(/\r?\n/);

    lines.forEach((line, i) => {
      for (const p of patterns) {
        if (line.toLowerCase().includes(p.toLowerCase())) {
          hits.push({
            file: path.relative(ROOT, file),
            line: i + 1,
            text: line,
            pattern: p,
          });
        }
      }
    });
  }

  return hits;
}

function section(title) {
  return "\n" + "=".repeat(120) + "\n" + title + "\n" + "=".repeat(120) + "\n";
}

function clip(text, max = 35000) {
  if (text.length <= max) return text;
  return text.slice(0, max) + "\n\n[TRUNCADO]";
}

let out = "";
out += "PT STOCK CODE INSPECTION\n";
out += "Quando: " + new Date().toISOString() + "\n";
out += "Pasta: " + ROOT + "\n";

out += section("1) FICHEIROS-ALVO");
for (const rel of TARGET_FILES) {
  const full = path.join(ROOT, rel);
  out += `${rel} -> ${exists(full) ? "EXISTE" : "NAO EXISTE"}\n`;
}

out += section("2) CONTEUDO DOS FICHEIROS-ALVO");
for (const rel of TARGET_FILES) {
  const full = path.join(ROOT, rel);
  if (!exists(full)) continue;

  out += `\n--- ${rel} ---\n`;
  out += clip(readText(full), 40000);
  out += "\n";
}

const allCodeFiles = walk(ROOT);

out += section("3) PESQUISA GLOBAL POR TERMOS IMPORTANTES");
const patterns = [
  "deductPtStockForPaidOrder",
  "ptStockQty",
  "paymentStatus",
  "status: \"paid\"",
  "status = \"paid\"",
  "status === \"paid\"",
  "paymentStatus: \"paid\"",
  "paymentStatus = \"paid\"",
  "paymentStatus === \"paid\"",
  "order.update",
  "order.updateMany",
  "product.update",
  "product.updateMany",
  "decrement:",
  "selectedSize",
  "snapshotJson",
  "PT_STOCK_CTT",
  "paidAt",
];

const hits = grepInFiles(allCodeFiles, patterns);

if (!hits.length) {
  out += "Nenhum resultado encontrado.\n";
} else {
  for (const hit of hits) {
    out += `[${hit.file}:${hit.line}] (${hit.pattern}) ${hit.text}\n`;
  }
}

out += section("4) FOCADO NA FUNCAO deductPtStockForPaidOrder");
const deductHits = grepInFiles(allCodeFiles, ["deductPtStockForPaidOrder"]);
for (const hit of deductHits) {
  out += `[${hit.file}:${hit.line}] ${hit.text}\n`;
}

out += section("5) FOCADO EM ATUALIZACOES DE STOCK");
const stockHits = grepInFiles(allCodeFiles, [
  "ptStockQty",
  "decrement:",
  "product.update",
  "product.updateMany",
]);
for (const hit of stockHits) {
  out += `[${hit.file}:${hit.line}] ${hit.text}\n`;
}

out += section("6) FOCADO NA MARCACAO DE ORDER COMO PAID");
const paidHits = grepInFiles(allCodeFiles, [
  "paymentStatus",
  "paidAt",
  "status: \"paid\"",
  "paymentStatus: \"paid\"",
  "status = \"paid\"",
  "paymentStatus = \"paid\"",
]);
for (const hit of paidHits) {
  out += `[${hit.file}:${hit.line}] ${hit.text}\n`;
}

out += section("7) RESUMO AUTOMATICO");
const hasDeductFile = exists(path.join(ROOT, "src/lib/deductPtStockForPaidOrder.ts"));
const hasPaypalWebhook = exists(path.join(ROOT, "src/app/api/paypal/webhook/route.ts"));
const hasStripeWebhook = exists(path.join(ROOT, "src/app/api/stripe/webhook/route.ts"));

out += `deductPtStockForPaidOrder.ts existe: ${hasDeductFile}\n`;
out += `paypal webhook existe: ${hasPaypalWebhook}\n`;
out += `stripe webhook existe: ${hasStripeWebhook}\n`;

const deductReferenced = hits.some(h => h.pattern.toLowerCase() === "deductptstockforpaidorder");
out += `A funcao parece ser referenciada no codigo: ${deductReferenced ? "SIM" : "NAO"}\n`;

const ptStockQtyReferenced = hits.some(h => h.pattern.toLowerCase() === "ptstockqty");
out += `ptStockQty aparece no codigo: ${ptStockQtyReferenced ? "SIM" : "NAO"}\n`;

fs.writeFileSync(OUT, out, "utf8");
console.log("Ficheiro criado com sucesso:");
console.log(OUT);
