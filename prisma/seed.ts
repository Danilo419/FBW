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
    // 0) dependências diretas (para não violar FKs)
    await tx.cartItem.deleteMany({ where: { productId: existing.id } });
    await tx.orderItem.deleteMany({ where: { productId: existing.id } });
    await tx.review.deleteMany({ where: { productId: existing.id } });

    // 1) apagar OptionValues/Groups
    const groups = await tx.optionGroup.findMany({
      where: { productId: existing.id },
      select: { id: true },
    });
    const groupIds = groups.map((g) => g.id);
    if (groupIds.length) {
      await tx.optionValue.deleteMany({ where: { groupId: { in: groupIds } } });
      await tx.optionGroup.deleteMany({ where: { id: { in: groupIds } } });
    }

    // 2) apagar SizeStock
    await tx.sizeStock.deleteMany({ where: { productId: existing.id } });

    // 3) apagar Product
    await tx.product.delete({ where: { id: existing.id } });
  });
}

/* ------------------------------------------------------------------ */
/*                          Seed helpers                              */
/* ------------------------------------------------------------------ */

type BadgeSeed = { value: string; label: string; priceDelta: number };

/** Cria um produto com tamanhos adulto+criança e grupos de opções. */
async function createProduct(
  slug: string,
  name: string,
  team: string,
  season: string,      // e.g., "25/26"
  images: string[],
  priceCents: number,
  badges: BadgeSeed[] = [] // competition badges (multi add-on)
) {
  // limpar qualquer produto com o mesmo slug
  await removeProductBySlug(slug);

  const product = await prisma.product.create({
    data: {
      slug,
      name,
      team,
      season,
      basePrice: priceCents, // cêntimos
      images,
      description: `Official ${team} jersey ${season}. Breathable and comfortable fabric for fans and athletes.`,
    },
  });

  // Tamanhos (Adult + Kids). Seed-only; no live o admin gere os stocks.
  await prisma.sizeStock.createMany({
    data: [
      // Adult
      { productId: product.id, size: "XS", stock: 8 },
      { productId: product.id, size: "S",  stock: 12 },
      { productId: product.id, size: "M",  stock: 15 },
      { productId: product.id, size: "L",  stock: 12 },
      { productId: product.id, size: "XL", stock: 10 },
      { productId: product.id, size: "2XL", stock: 6 },
      { productId: product.id, size: "3XL", stock: 4 },

      // Kids
      { productId: product.id, size: "6Y",  stock: 10 },
      { productId: product.id, size: "8Y",  stock: 10 },
      { productId: product.id, size: "10Y", stock: 10 },
      { productId: product.id, size: "12Y", stock: 10 },
      { productId: product.id, size: "14Y", stock: 10 },
    ],
    skipDuplicates: true,
  });

  // Grupo SIZE (baseline adulto; o UI já troca para Kids)
  await prisma.optionGroup.create({
    data: {
      productId: product.id,
      key: "size",
      label: "Size",
      type: "SIZE",
      required: true,
      values: {
        create: [
          { value: "XS",  label: "XS",  priceDelta: 0 },
          { value: "S",   label: "S",   priceDelta: 0 },
          { value: "M",   label: "M",   priceDelta: 0 },
          { value: "L",   label: "L",   priceDelta: 0 },
          { value: "XL",  label: "XL",  priceDelta: 0 },
          { value: "2XL", label: "2XL", priceDelta: 0 },
          { value: "3XL", label: "3XL", priceDelta: 0 },
        ],
      },
    },
  });

  // Customization (RADIO)
  await prisma.optionGroup.create({
    data: {
      productId: product.id,
      key: "customization",
      label: "Customization",
      type: "RADIO",
      required: true,
      values: {
        create: [
          { value: "none",              label: "No customization",                         priceDelta: 0 },
          { value: "name-number",       label: "Name & Number",                             priceDelta: 1500 },
          { value: "badge",             label: "Competition Badge",                         priceDelta: 800 },
          { value: "name-number-badge", label: "Name & Number + Competition Badge",         priceDelta: 2100 },
        ],
      },
    },
  });

  // Shorts (ADDON)
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

  // Socks (ADDON)
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

  // Competition Badges (ADDON, multi-select)
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
            value: b.value,   // ex.: "laliga", "ucl", "ucl-winners"
            label: b.label,   // ex.: "La Liga Patch"
            priceDelta: b.priceDelta, // cêntimos
          })),
        },
      },
    });
  }

  console.log("Seed OK:", product.slug);
}

/* ------------------------------------------------------------------ */
/*                               main                                  */
/* ------------------------------------------------------------------ */

async function main() {
  // ------------------------------- LA LIGA -------------------------------
  await createProduct(
    "jersey-real-madrid-25-26",
    "Real Madrid Jersey 25/26",
    "Real Madrid",
    "25/26",
    ["/img/rm-front-25-26.png", "/img/rm-back-25-26.png"],
    10000,
    [
      { value: "laliga",      label: "La Liga Patch",                    priceDelta: 500 },
      { value: "ucl",         label: "UEFA Champions League Patch",      priceDelta: 700 },
      { value: "ucl-winners", label: "UCL Winners Patch",                priceDelta: 900 },
    ]
  );

  await createProduct(
    "jersey-barcelona-25-26",
    "FC Barcelona Jersey 25/26",
    "FC Barcelona",
    "25/26",
    ["/img/fcb-front-25-26.png", "/img/fcb-back-25-26.png"],
    8999,
    [
      { value: "laliga", label: "La Liga Patch",               priceDelta: 500 },
      { value: "ucl",    label: "UEFA Champions League Patch", priceDelta: 700 },
    ]
  );

  await createProduct(
    "jersey-atm-25-26",
    "Atlético de Madrid Jersey 25/26",
    "Atlético de Madrid",
    "25/26",
    ["/img/atm-front-25-26.png", "/img/atm-back-25-26.png"],
    8999,
    [{ value: "laliga", label: "La Liga Patch", priceDelta: 500 }]
  );

  await createProduct(
    "jersey-betis-25-26",
    "Real Betis Jersey 25/26",
    "Real Betis",
    "25/26",
    ["/img/betis-front-25-26.png", "/img/betis-back-25-26.png"],
    8499,
    [{ value: "laliga", label: "La Liga Patch", priceDelta: 500 }]
  );

  await createProduct(
    "jersey-sevilla-25-26",
    "Sevilla FC Jersey 25/26",
    "Sevilla FC",
    "25/26",
    ["/img/sevilla-front-25-26.png", "/img/sevilla-back-25-26.png"],
    8499,
    [
      { value: "laliga", label: "La Liga Patch",               priceDelta: 500 },
      { value: "ucl",    label: "UEFA Champions League Patch", priceDelta: 700 },
    ]
  );

  await createProduct(
    "jersey-realsociedad-25-26",
    "Real Sociedad Jersey 25/26",
    "Real Sociedad",
    "25/26",
    ["/img/realsociedad-front-25-26.png", "/img/realsociedad-back-25-26.png"],
    8499,
    [{ value: "laliga", label: "La Liga Patch", priceDelta: 500 }]
  );

  await createProduct(
    "jersey-villarreal-25-26",
    "Villarreal Jersey 25/26",
    "Villarreal",
    "25/26",
    ["/img/villarreal-front-25-26.png", "/img/villarreal-back-25-26.png"],
    8499,
    [
      { value: "laliga", label: "La Liga Patch",               priceDelta: 500 },
      { value: "ucl",    label: "UEFA Champions League Patch", priceDelta: 700 },
    ]
  );

  await createProduct(
    "jersey-athletic-25-26",
    "Athletic Club Jersey 25/26",
    "Athletic Club",
    "25/26",
    ["/img/athletic-front-25-26.png", "/img/athletic-back-25-26.png"],
    8299,
    [{ value: "laliga", label: "La Liga Patch", priceDelta: 500 }]
  );

  await createProduct(
    "jersey-getafe-25-26",
    "Getafe CF Jersey 25/26",
    "Getafe CF",
    "25/26",
    ["/img/getafe-front-25-26.png", "/img/getafe-back-25-26.png"],
    8999,
    [{ value: "laliga", label: "La Liga Patch", priceDelta: 500 }]
  );

  await createProduct(
    "jersey-elche-25-26",
    "Elche CF Jersey 25/26",
    "Elche CF",
    "25/26",
    ["/img/elche-front-25-26.png", "/img/elche-back-25-26.png"],
    8999,
    [{ value: "laliga", label: "La Liga Patch", priceDelta: 500 }]
  );

  await createProduct(
    "jersey-valencia-25-26",
    "Valencia CF Jersey 25/26",
    "Valencia CF",
    "25/26",
    ["/img/valencia-front-25-26.png", "/img/valencia-back-25-26.png"],
    8999,
    [{ value: "laliga", label: "La Liga Patch", priceDelta: 500 }]
  );

  await createProduct(
    "jersey-espanyol-25-26",
    "RCD Espanyol Jersey 25/26",
    "RCD Espanyol",
    "25/26",
    ["/img/espanyol-front-25-26.png", "/img/espanyol-back-25-26.png"],
    8999,
    [{ value: "laliga", label: "La Liga Patch", priceDelta: 500 }]
  );

  await createProduct(
    "jersey-alaves-25-26",
    "Alavés Jersey 25/26",
    "Alavés",
    "25/26",
    ["/img/alaves-front-25-26.png", "/img/alaves-back-25-26.png"],
    8999,
    [{ value: "laliga", label: "La Liga Patch", priceDelta: 500 }]
  );

  // ----------------------- PRIMEIRA LIGA PORTUGAL -----------------------
  await createProduct(
    "jersey-benfica-25-26",
    "SL Benfica Jersey 25/26",
    "SL Benfica",
    "25/26",
    ["/img/slb-front-25-26.png", "/img/slb-back-25-26.png"],
    8499,
    [
      { value: "ligaportugal", label: "Liga Portugal Patch",         priceDelta: 500 },
      { value: "ucl",          label: "UEFA Champions League Patch", priceDelta: 700 },
    ]
  );

  await createProduct(
    "jersey-sporting-25-26",
    "Sporting CP Jersey 25/26",
    "Sporting CP",
    "25/26",
    ["/img/scp-front-25-26.png", "/img/scp-back-25-26.png"],
    8499,
    [
      { value: "ligaportugal", label: "Liga Portugal Patch",         priceDelta: 500 },
      { value: "ucl",          label: "UEFA Champions League Patch", priceDelta: 700 },
    ]
  );

  await createProduct(
    "jersey-porto-25-26",
    "FC Porto Jersey 25/26",
    "FC Porto",
    "25/26",
    ["/img/fcp-front-25-26.png", "/img/fcp-back-25-26.png"],
    8499,
    [
      { value: "ligaportugal", label: "Liga Portugal Patch",         priceDelta: 500 },
      { value: "ucl",          label: "UEFA Champions League Patch", priceDelta: 700 },
    ]
  );

  await createProduct(
    "jersey-braga-25-26",
    "SC Braga Jersey 25/26",
    "SC Braga",
    "25/26",
    ["/img/braga-front-25-26.png", "/img/braga-back-25-26.png"],
    7999,
    [{ value: "ligaportugal", label: "Liga Portugal Patch", priceDelta: 500 }]
  );

  await createProduct(
    "jersey-vitoria-25-26",
    "Vitória SC Jersey 25/26",
    "Vitória SC",
    "25/26",
    ["/img/vsc-front-25-26.png", "/img/vsc-back-25-26.png"],
    7999,
    [{ value: "ligaportugal", label: "Liga Portugal Patch", priceDelta: 500 }]
  );
}

main()
  .then(() => console.log("Seed finished"))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
