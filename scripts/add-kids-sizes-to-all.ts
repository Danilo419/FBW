import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const KIDS = ["6Y", "8Y", "10Y", "12Y", "14Y"];

async function run() {
  const products = await prisma.product.findMany({ select: { id: true, slug: true } });

  for (const p of products) {
    const existing = await prisma.sizeStock.findMany({
      where: { productId: p.id },
      select: { size: true },
    });

    // se já tiver algum tamanho Y, salta
    if (existing.some((s) => /y$/i.test(s.size.trim()))) {
      console.log(`(skip) kids já existem em ${p.slug}`);
      continue;
    }

    await prisma.sizeStock.createMany({
      data: KIDS.map((size) => ({ productId: p.id, size, stock: 10 })),
      skipDuplicates: true,
    });
    console.log(`OK: kids adicionados a ${p.slug}`);
  }
}

run()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
