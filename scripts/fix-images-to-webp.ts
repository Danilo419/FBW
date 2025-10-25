// scripts/fix-images-to-webp.ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Converte a extensão para .webp mantendo o path
function toWebp(url: string) {
  return url.replace(/\.(png|jpg|jpeg)$/i, ".webp");
}

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, imageUrls: true },
  });

  let updated = 0;
  let missing = 0;

  for (const p of products) {
    const src = p.imageUrls ?? [];
    if (!src.length) {
      missing++;
      continue;
    }

    const converted = src.map(toWebp);

    // Se nada mudou, segue
    const isSame =
      converted.length === src.length &&
      converted.every((u, i) => u === src[i]);

    if (isSame) continue;

    await prisma.product.update({
      where: { id: p.id },
      data: { imageUrls: { set: converted } },
    });

    updated++;
    console.log(`✅ ${p.name}: ${src.length} → ${converted.length} imagens (extensão .webp aplicada)`);
  }

  console.log(`\nResumo: ${updated} produtos atualizados; ${missing} sem imagens.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
