// scripts/fix-images-to-webp.ts
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

function toWebp(p: string) {
  return p.replace(/\.(png|jpe?g)$/i, ".webp");
}

function fileExistsInPublic(p: string) {
  if (!p?.startsWith("/")) return false;
  return fs.existsSync(path.join(process.cwd(), "public", p));
}

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, images: true, name: true },
  });

  let updated = 0, missing = 0;

  for (const p of products) {
    const curr = p.images ?? [];
    const next = curr.map(toWebp);

    // se nada mudou, salta
    if (JSON.stringify(curr) === JSON.stringify(next)) continue;

    // validação básica: conta quantos webp existem mesmo no disco
    const nonExisting = next.filter((rel) => !fileExistsInPublic(rel));
    if (nonExisting.length) {
      console.warn(`[WARN] ${p.name} tem imagens .webp em falta:`, nonExisting);
      missing += nonExisting.length;
    }

    await prisma.product.update({
      where: { id: p.id },
      data: { images: next },
    });
    updated++;
    console.log(`OK: ${p.name}`);
  }

  console.log(`\nProdutos atualizados: ${updated}`);
  console.log(`.webp em falta (aviso): ${missing}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
