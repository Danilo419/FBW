import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prismaSource = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL_OLD! },  // BD antiga (onde estão os 180 produtos)
  },
});

const prismaTarget = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL_NEON! }, // Neon
  },
});

async function main() {
  console.log('A ler produtos da BD antiga...');
  const products = await prismaSource.product.findMany();
  console.log(`Encontrei ${products.length} produtos.`);

  console.log('A copiar para o Neon...');
  // upsert para não rebentar se já existir algum id
  for (const p of products) {
    await prismaTarget.product.upsert({
      where: { id: p.id },
      update: {
        ...p,
      },
      create: {
        ...p,
      },
    });
  }

  console.log('Concluído ✅');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prismaSource.$disconnect();
    await prismaTarget.$disconnect();
  });
