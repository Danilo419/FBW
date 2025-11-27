// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/** Remove tudo de um produto pelo slug (em ordem segura, evitando FKs) */
async function removeProductBySlug(slug: string) {
  const existing = await prisma.product.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!existing) return;

  await prisma.$transaction(async (tx) => {
    await tx.cartItem.deleteMany({ where: { productId: existing.id } });
    await tx.orderItem.deleteMany({ where: { productId: existing.id } });
    await tx.review.deleteMany({ where: { productId: existing.id } });

    const groups = await tx.optionGroup.findMany({
      where: { productId: existing.id },
      select: { id: true },
    });
    const groupIds = groups.map((g) => g.id);
    if (groupIds.length) {
      await tx.optionValue.deleteMany({ where: { groupId: { in: groupIds } } });
      await tx.optionGroup.deleteMany({ where: { id: { in: groupIds } } });
    }

    await tx.sizeStock.deleteMany({ where: { productId: existing.id } });
    await tx.product.delete({ where: { id: existing.id } });
  });
}

/* ------------------------------------------------------------------ */
/*                          Seed helpers                              */
/* ------------------------------------------------------------------ */

type BadgeSeed = { value: string; label: string; priceDelta: number };

const ADULT_SIZES = ["S", "M", "L", "XL", "2XL"] as const;
const KIDS_SIZES  = ["2-3Y", "3-4Y", "4-5Y", "6-7Y", "8-9Y", "10-11Y", "12-13Y"] as const;

/** Cria um produto com tamanhos (sem números de stock) e grupos de opções. */
async function createProduct(
  slug: string,
  name: string,
  team: string,
  season: string,      // e.g., "25/26"
  imageUrls: string[], // 👈 agora bate com o schema
  priceCents: number,
  badges: BadgeSeed[] = []
) {
  await removeProductBySlug(slug);

  const product = await prisma.product.create({
    data: {
      slug,
      name,
      team,
      season,
      basePrice: priceCents,
      imageUrls,
      description: `Official ${team} jersey ${season}. Breathable and comfortable fabric for fans and athletes.`,
    },
  });

  await prisma.sizeStock.createMany({
    data: [
      ...ADULT_SIZES.map((sz) => ({ productId: product.id, size: sz, available: true })),
      ...KIDS_SIZES.map((sz)  => ({ productId: product.id, size: sz, available: true })),
    ],
    skipDuplicates: true,
  });

  await prisma.optionGroup.create({
    data: {
      productId: product.id,
      key: "size",
      label: "Size",
      type: "SIZE",
      required: true,
      values: {
        create: [
          ...ADULT_SIZES.map((s) => ({ value: s, label: s, priceDelta: 0 })),
          ...KIDS_SIZES.map((s)  => ({ value: s, label: s, priceDelta: 0 })),
        ],
      },
    },
  });

  await prisma.optionGroup.create({
    data: {
      productId: product.id,
      key: "customization",
      label: "Customization",
      type: "RADIO",
      required: true,
      values: {
        create: [
          { value: "none",              label: "No customization",                  priceDelta: 0 },
          { value: "name-number",       label: "Name & Number",                     priceDelta: 1500 },
          { value: "badge",             label: "Competition Badge",                 priceDelta: 800 },
          { value: "name-number-badge", label: "Name & Number + Competition Badge", priceDelta: 2100 },
        ],
      },
    },
  });

  await prisma.optionGroup.create({
    data: {
      productId: product.id,
      key: "shorts",
      label: "Shorts",
      type: "ADDON",
      required: false,
      values: { create: [{ value: "yes", label: "Add shorts", priceDelta: 2500 }] },
    },
  });

  await prisma.optionGroup.create({
    data: {
      productId: product.id,
      key: "socks",
      label: "Socks",
      type: "ADDON",
      required: false,
      values: { create: [{ value: "yes", label: "Add socks", priceDelta: 1200 }] },
    },
  });

  if (badges.length) {
    await prisma.optionGroup.create({
      data: {
        productId: product.id,
        key: "badges",
        label: "Competition Badges",
        type: "ADDON",
        required: false,
        values: {
          create: badges.map((b) => ({
            value: b.value,
            label: b.label,
            priceDelta: b.priceDelta,
          })),
        },
      },
    });
  }

  console.log("Seed OK:", product.slug);
}

/* ------------------------------------------------------------------- */
/*                               main                                  */
/* ------------------------------------------------------------------- */

async function main() {
  // Agora não criamos nenhum produto por seed.
  // Todos os produtos são criados através do painel admin.
  console.log("Seed: no default products. All products are managed via admin panel.");
}

main()
  .then(() => console.log("Seed finished"))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
