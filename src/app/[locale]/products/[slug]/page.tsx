// src/app/[locale]/products/[slug]/page.tsx
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import ProductConfigurator from "@/components/ProductConfigurator";
import ProductReviews from "@/components/ProductReviews";

/** Always render at runtime (disable SSG/ISR so builds never touch the DB) */
export const revalidate = 0;
export const dynamic = "force-dynamic";

/* ===================== UI types ===================== */

type OptionValueUI = {
  id: string;
  value: string;
  label: string;
  priceDelta: number;
};

type OptionGroupUI = {
  id: string;
  key: string;
  label: string;
  type: "SIZE" | "RADIO" | "ADDON";
  required: boolean;
  values: OptionValueUI[];
};

type SizeUI = {
  id: string;
  size: string;
  available: boolean;
  stock?: number | null;
};

type ProductUI = {
  id: string;
  slug: string;
  name: string;
  team?: string | null;
  description?: string | null;
  basePrice: number;
  images: string[];
  sizes: SizeUI[];
  optionGroups: OptionGroupUI[];
  badges?: string[];
  allowNameNumber?: boolean | null;
};

type PageProps = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
};

/* ===================== Helpers ===================== */

function toUIGroupType(t: string): "SIZE" | "RADIO" | "ADDON" {
  if (t === "SIZE" || t === "RADIO" || t === "ADDON") return t;
  return "RADIO";
}

function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function toUISizes(
  rows: { id: string | number; size: string; available: boolean }[]
): SizeUI[] {
  return rows.map((s) => ({
    id: String(s.id),
    size: String(s.size).toUpperCase(),
    available: Boolean(s.available),
    stock: null,
  }));
}

function mapValuesByGroup(
  values: {
    id: string | number;
    groupId: string | number;
    value: string;
    label: string | null;
    priceDelta: number | null;
  }[]
): Map<string, OptionValueUI[]> {
  const by = new Map<string, OptionValueUI[]>();

  for (const v of values) {
    const gid = String(v.groupId);
    const list = by.get(gid) ?? [];

    list.push({
      id: String(v.id),
      value: v.value,
      label: v.label ?? v.value,
      priceDelta: Number(v.priceDelta ?? 0),
    });

    by.set(gid, list);
  }

  return by;
}

function toUIGroups(
  groups: {
    id: string | number;
    key: string;
    label: string;
    type: string;
    required: boolean;
  }[],
  valuesByGroup: Map<string, OptionValueUI[]>
): OptionGroupUI[] {
  return groups.map((g) => ({
    id: String(g.id),
    key: g.key,
    label: g.label,
    type: toUIGroupType(g.type),
    required: Boolean(g.required),
    values: valuesByGroup.get(String(g.id)) ?? [],
  }));
}

/* ===================== Static params ===================== */

export async function generateStaticParams() {
  if (process.env.VERCEL) return [];

  try {
    const rows = await prisma.product.findMany({
      select: { slug: true },
      take: 500,
    });

    return rows.flatMap((r) => [
      { locale: "en", slug: r.slug },
      { locale: "pt", slug: r.slug },
    ]);
  } catch {
    return [];
  }
}

/* ===================== Page ===================== */

export default async function ProductPage({ params }: PageProps) {
  const { locale, slug } = await params;

  setRequestLocale(locale);

  const core = await prisma.product.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      team: true,
      description: true,
      basePrice: true,
      imageUrls: true,
      badges: true,
      allowNameNumber: true,
    },
  });

  if (!core) notFound();

  const [sizesDb, groupsDb, valuesDb] = await Promise.all([
    prisma.sizeStock.findMany({
      where: { productId: core.id },
      orderBy: { id: "asc" },
      select: { id: true, size: true, available: true },
    }),

    prisma.optionGroup.findMany({
      where: { productId: core.id },
      orderBy: { id: "asc" },
      select: { id: true, key: true, label: true, type: true, required: true },
    }),

    prisma.optionValue.findMany({
      where: { group: { productId: core.id } },
      orderBy: { id: "asc" },
      select: {
        id: true,
        groupId: true,
        value: true,
        label: true,
        priceDelta: true,
      },
    }),
  ]);

  const sizes = toUISizes(sizesDb);
  const valuesByGroup = mapValuesByGroup(valuesDb);
  let optionGroups = toUIGroups(groupsDb, valuesByGroup);

  const selectedBadges = ensureArray<string>(core.badges).map(String);

  optionGroups = optionGroups
    .map((g) => {
      if (g.key !== "badges") return g;

      if (selectedBadges.length === 0) {
        return { ...g, values: [] };
      }

      const filteredValues = (g.values ?? []).filter((v) =>
        selectedBadges.includes(v.value)
      );

      return { ...g, values: filteredValues };
    })
    .filter((g) => !(g.key === "badges" && (g.values?.length ?? 0) === 0));

  const badgesExist = selectedBadges.length > 0;

  if (!badgesExist) {
    optionGroups = optionGroups
      .map((g) => {
        if (g.key !== "customization") return g;

        const filtered = (g.values ?? []).filter(
          (v) => !/badge/i.test(v.value) && !/badge/i.test(v.label)
        );

        return { ...g, values: filtered };
      })
      .filter(
        (g) => !(g.key === "customization" && (g.values?.length ?? 0) === 0)
      );
  }

  const uiProduct: ProductUI = {
    id: String(core.id),
    slug: core.slug,
    name: core.name,
    team: core.team,
    description: core.description,
    basePrice: Number(core.basePrice ?? 0),
    images: ensureArray<unknown>(core.imageUrls).map(String),
    sizes,
    optionGroups,
    badges: selectedBadges,
    allowNameNumber: core.allowNameNumber,
  };

  return (
    <div className="container-fw py-8 sm:py-10">
      <div className="grid gap-10">
        <ProductConfigurator product={uiProduct} />
        <ProductReviews productId={uiProduct.id} />
      </div>
    </div>
  );
}