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

// Adulto S–4XL, Criança com “Y”
const ADULT_SIZES = ["S", "M", "L", "XL", "2XL", "3XL", "4XL"] as const;
const KIDS_SIZES  = ["2-3Y", "3-4Y", "4-5Y", "6-7Y", "8-9Y", "10-11Y", "12-13Y"] as const;

/** Cria um produto com tamanhos (sem números de stock) e grupos de opções. */
async function createProduct(
  slug: string,
  name: string,
  team: string,
  season: string,      // e.g., "25/26"
  images: string[],
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
      images,
      description: `Official ${team} jersey ${season}. Breathable and comfortable fabric for fans and athletes.`,
    },
  });

  // ✅ SizeStock agora só indica se existe/está disponível (boolean), sem número
  await prisma.sizeStock.createMany({
    data: [
      ...ADULT_SIZES.map((sz) => ({ productId: product.id, size: sz, available: true })),
      ...KIDS_SIZES.map((sz)  => ({ productId: product.id, size: sz, available: true })),
    ],
    skipDuplicates: true,
  });

  // Grupo SIZE com exatamente estes tamanhos (adulto + criança)
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
          { value: "none",              label: "No customization",                  priceDelta: 0 },
          { value: "name-number",       label: "Name & Number",                     priceDelta: 1500 },
          { value: "badge",             label: "Competition Badge",                 priceDelta: 800 },
          { value: "name-number-badge", label: "Name & Number + Competition Badge", priceDelta: 2100 },
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
  // ------------------------------- LA LIGA -------------------------------
  await createProduct(
    "home-jersey-real-madrid-25-26",
    "Real Madrid Home Jersey 25/26",
    "Real Madrid",
    "25/26",
    ["/img/RealMadrid/25-26/home/rm-1-25-26-home.png", "/img/RealMadrid/25-26/home/rm-2-25-26-home.png", "/img/RealMadrid/25-26/home/rm-3-25-26-home.png", "/img/RealMadrid/25-26/home/rm-4-25-26-home.png", "/img/RealMadrid/25-26/home/rm-5-25-26-home.png", "/img/RealMadrid/25-26/home/rm-6-25-26-home.png", "/img/RealMadrid/25-26/home/rm-7-25-26-home.png", "/img/RealMadrid/25-26/home/rm-8-25-26-home.png"],
    3499,
    [
      { value: "laliga",      label: "La Liga Patch",               priceDelta: 500 },
      { value: "ucl",         label: "UEFA Champions League Patch", priceDelta: 700 },
    ]
  );

  await createProduct(
    "away-jersey-real-madrid-25-26",
    "Real Madrid Away Jersey 25/26",
    "Real Madrid",
    "25/26",
    ["/img/RealMadrid/25-26/away/rm-1-25-26-away.png", "/img/RealMadrid/25-26/away/rm-2-25-26-away.png", "/img/RealMadrid/25-26/away/rm-3-25-26-away.png", "/img/RealMadrid/25-26/away/rm-4-25-26-away.png", "/img/RealMadrid/25-26/away/rm-5-25-26-away.png", "/img/RealMadrid/25-26/away/rm-6-25-26-away.png"],
    3499,
    [
      { value: "laliga",      label: "La Liga Patch",               priceDelta: 500 },
      { value: "ucl",         label: "UEFA Champions League Patch", priceDelta: 700 },
    ]
  );

  await createProduct(
    "third-jersey-real-madrid-25-26",
    "Real Madrid Third Jersey 25/26",
    "Real Madrid",
    "25/26",
    ["/img/RealMadrid/25-26/third/rm-1-25-26-third.png", "/img/RealMadrid/25-26/third/rm-2-25-26-third.png", "/img/RealMadrid/25-26/third/rm-3-25-26-third.png", "/img/RealMadrid/25-26/third/rm-4-25-26-third.png", "/img/RealMadrid/25-26/third/rm-5-25-26-third.png", "/img/RealMadrid/25-26/third/rm-6-25-26-third.png", "/img/RealMadrid/25-26/third/rm-7-25-26-third.png"],
    3499,
    [
      { value: "laliga",      label: "La Liga Patch",               priceDelta: 500 },
      { value: "ucl",         label: "UEFA Champions League Patch", priceDelta: 700 },
    ]
  );

  await createProduct(
    "home-jersey-barcelona-25-26",
    "FC Barcelona Home Jersey 25/26",
    "FC Barcelona",
    "25/26",
    ["/img/Barcelona/25-26/home/fcb-1-25-26-home.png", "/img/Barcelona/25-26/home/fcb-2-25-26-home.png", "/img/Barcelona/25-26/home/fcb-3-25-26-home.png", "/img/Barcelona/25-26/home/fcb-4-25-26-home.png", "/img/Barcelona/25-26/home/fcb-5-25-26-home.png", "/img/Barcelona/25-26/home/fcb-6-25-26-home.png", "/img/Barcelona/25-26/home/fcb-7-25-26-home.png"],
    3499,
    [
      { value: "laliga", label: "La Liga Patch",               priceDelta: 500 },
      { value: "laligawinner", label: "La Liga Winner Patch",  priceDelta: 500 },
      { value: "ucl",    label: "UEFA Champions League Patch", priceDelta: 700 },
    ]
  );

  await createProduct(
    "away-jersey-barcelona-25-26",
    "FC Barcelona Away Jersey 25/26",
    "FC Barcelona",
    "25/26",
    ["/img/Barcelona/25-26/away/fcb-1-25-26-away.png", "/img/Barcelona/25-26/away/fcb-2-25-26-away.png", "/img/Barcelona/25-26/away/fcb-3-25-26-away.png", "/img/Barcelona/25-26/away/fcb-4-25-26-away.png", "/img/Barcelona/25-26/away/fcb-5-25-26-away.png", "/img/Barcelona/25-26/away/fcb-6-25-26-away.png", "/img/Barcelona/25-26/away/fcb-7-25-26-away.png"],
    3499,
    [
      { value: "laliga", label: "La Liga Patch",               priceDelta: 500 },
      { value: "laligawinner", label: "La Liga Winner Patch",  priceDelta: 500 },
      { value: "ucl",    label: "UEFA Champions League Patch", priceDelta: 700 },
    ]
  );

  await createProduct(
    "jersey-atm-25-26",
    "Atlético de Madrid Jersey 25/26",
    "Atlético de Madrid",
    "25/26",
    ["/img/atm-front-25-26.png", "/img/atm-back-25-26.png"],
    3499,
    [{ value: "laliga", label: "La Liga Patch", priceDelta: 500 }]
  );

  await createProduct(
    "jersey-betis-25-26",
    "Real Betis Jersey 25/26",
    "Real Betis",
    "25/26",
    ["/img/betis-front-25-26.png", "/img/betis-back-25-26.png"],
    3499,
    [{ value: "laliga", label: "La Liga Patch", priceDelta: 500 }]
  );

  await createProduct(
    "jersey-sevilla-25-26",
    "Sevilla FC Jersey 25/26",
    "Sevilla FC",
    "25/26",
    ["/img/sevilla-front-25-26.png", "/img/sevilla-back-25-26.png"],
    3499,
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
    3499,
    [{ value: "laliga", label: "La Liga Patch", priceDelta: 500 }]
  );

  await createProduct(
    "jersey-villarreal-25-26",
    "Villarreal Jersey 25/26",
    "Villarreal",
    "25/26",
    ["/img/villarreal-front-25-26.png", "/img/villarreal-back-25-26.png"],
    3499,
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
    3499,
    [{ value: "laliga", label: "La Liga Patch", priceDelta: 500 }]
  );

  await createProduct(
    "jersey-getafe-25-26",
    "Getafe CF Jersey 25/26",
    "Getafe CF",
    "25/26",
    ["/img/getafe-front-25-26.png", "/img/getafe-back-25-26.png"],
    3499,
    [{ value: "laliga", label: "La Liga Patch", priceDelta: 500 }]
  );

  await createProduct(
    "jersey-elche-25-26",
    "Elche CF Jersey 25/26",
    "Elche CF",
    "25/26",
    ["/img/elche-front-25-26.png", "/img/elche-back-25-26.png"],
    3499,
    [{ value: "laliga", label: "La Liga Patch", priceDelta: 500 }]
  );

  await createProduct(
    "jersey-valencia-25-26",
    "Valencia CF Jersey 25/26",
    "Valencia CF",
    "25/26",
    ["/img/valencia-front-25-26.png", "/img/valencia-back-25-26.png"],
    3499,
    [{ value: "laliga", label: "La Liga Patch", priceDelta: 500 }]
  );

  await createProduct(
    "jersey-espanyol-25-26",
    "RCD Espanyol Jersey 25/26",
    "RCD Espanyol",
    "25/26",
    ["/img/espanyol-front-25-26.png", "/img/espanyol-back-25-26.png"],
    3499,
    [{ value: "laliga", label: "La Liga Patch", priceDelta: 500 }]
  );

  await createProduct(
    "jersey-alaves-25-26",
    "Alavés Jersey 25/26",
    "Alavés",
    "25/26",
    ["/img/alaves-front-25-26.png", "/img/alaves-back-25-26.png"],
    3499,
    [{ value: "laliga", label: "La Liga Patch", priceDelta: 500 }]
  );

  // ----------------------- PRIMEIRA LIGA PORTUGAL -----------------------
  await createProduct(
    "jersey-benfica-25-26",
    "SL Benfica Jersey 25/26",
    "SL Benfica",
    "25/26",
    ["/img/Benfica/25-26/slb-front-25-26.png", "/img/Benfica/25-26/slb-back-25-26.png"],
    3499,
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
    ["/img/Porto/25-26/fcp-front-25-26.png", "/img/Porto/25-26/fcp-back-25-26.png"],
    3499,
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
    ["/img/Sporting/25-26/scp-front-25-26.png", "/img/Sporting/25-26/scp-back-25-26.png"],
    3499,
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
    3499,
    [{ value: "ligaportugal", label: "Liga Portugal Patch", priceDelta: 500 }]
  );

  await createProduct(
    "jersey-vitoria-25-26",
    "Vitória SC Jersey 25/26",
    "Vitória SC",
    "25/26",
    ["/img/vsc-front-25-26.png", "/img/vsc-back-25-26.png"],
    3499,
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
