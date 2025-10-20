import { PrismaClient, OptionType } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // pega todos os produtos (ajusta se quiseres limitar por slug)
  const products = await prisma.product.findMany({ select: { id: true } });

  for (const p of products) {
    // garante um grupo SIZE
    let group = await prisma.optionGroup.findFirst({
      where: { productId: p.id, type: "SIZE" },
      select: { id: true },
    });
    if (!group) {
      group = await prisma.optionGroup.create({
        data: {
          productId: p.id,
          key: "size",
          label: "Size",
          type: "SIZE" as OptionType,
          required: true,
        },
        select: { id: true },
      });
    }

    // OptionValue 4XL
    const ov = await prisma.optionValue.findFirst({
      where: { groupId: group.id, OR: [{ value: "4XL" }, { label: "4XL" }] },
      select: { id: true },
    });
    if (!ov) {
      await prisma.optionValue.create({
        data: { groupId: group.id, label: "4XL", value: "4XL", priceDelta: 0 },
      });
    }

    // SizeStock 4XL
    const ss = await prisma.sizeStock.findFirst({
      where: { productId: p.id, size: "4XL" },
      select: { id: true },
    });
    if (!ss) {
      await prisma.sizeStock.create({
        data: { productId: p.id, size: "4XL", available: true },
      });
    }
  }

  console.log("Done: 4XL garantido para todos os produtos.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(() => prisma.$disconnect());
