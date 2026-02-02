// src/app/products/[slug]/page.tsx
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ProductConfigurator from "@/components/ProductConfigurator";
import ProductReviews from "@/components/ProductReviews";

/** Always render at runtime (disable SSG/ISR so builds never touch the DB) */
export const revalidate = 0;
export const dynamic = "force-dynamic";

/* ===================== UI types (match ProductConfigurator props) ===================== */
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
  stock?: number | null; // optional for future compat
};

type ProductUI = {
  id: string;
  slug: string;
  name: string;
  team?: string | null;
  description?: string | null;
  basePrice: number; // cents
  images: string[]; // mapped from imageUrls
  sizes: SizeUI[]; // only those that exist in DB
  optionGroups: OptionGroupUI[];

  /** Saved directly on Product */
  badges?: string[];

  /**
   * ✅ IMPORTANT:
   * Comes from Prisma (Product.allowNameNumber).
   * If missing (old products), ProductConfigurator defaults to true.
   */
  allowNameNumber?: boolean | null;
};

/* ===================== Helpers ===================== */
function toUIGroupType(t: string): "SIZE" | "RADIO" | "ADDON" {
  return t === "SIZE" || t === "RADIO" || t === "ADDON" ? (t as any) : "RADIO";
}

function ensureArray<T>(arr: T[] | null | undefined): T[] {
  return Array.isArray(arr) ? arr : [];
}

/** Converts SizeStock -> UI Size */
function toUISizes(rows: { id: string | number; size: string; available: boolean }[]): SizeUI[] {
  return rows.map((s) => ({
    id: String(s.id),
    size: String(s.size).toUpperCase(),
    available: Boolean(s.available),
    stock: null,
  }));
}

/** Groups OptionValue by groupId */
function mapValuesByGroup(values: {
  id: string | number;
  groupId: string | number;
  value: string;
  label: string | null;
  priceDelta: number | null;
}[]): Map<string, OptionValueUI[]> {
  const by = new Map<string, OptionValueUI[]>();
  for (const v of values) {
    const gid = String(v.groupId);
    const list = by.get(gid) ?? [];
    list.push({
      id: String(v.id),
      value: v.value,
      label: v.label ?? v.value,
      priceDelta: v.priceDelta ?? 0,
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

/* ---------- Static params (guarded on Vercel) ---------- */
export async function generateStaticParams() {
  if (process.env.VERCEL) return [];
  try {
    const rows = await prisma.product.findMany({ select: { slug: true }, take: 500 });
    return rows.map((r) => ({ slug: r.slug }));
  } catch {
    return [];
  }
}

/* ===================== Page ===================== */
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // 1) Core product fields (✅ includes allowNameNumber)
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

      // ✅ Selected badges saved on Product (SOURCE OF TRUTH for product page)
      badges: true,

      // ✅ Pass DB flag to ProductConfigurator
      allowNameNumber: true,
    },
  });

  if (!core) notFound();

  // 2) Relations in separate queries
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
      select: { id: true, groupId: true, value: true, label: true, priceDelta: true },
    }),
  ]);

  // 3) Convert to UI
  const sizes = toUISizes(sizesDb);
  const valuesByGroup = mapValuesByGroup(valuesDb);
  let optionGroups = toUIGroups(groupsDb, valuesByGroup);

  /**
   * ✅ FIX REAL:
   * On the product page, "badges available" must be ONLY the badges selected on Product.badges.
   * The OptionGroup "badges" in the DB is just a catalog (can exist forever).
   */
  const selectedBadges = ensureArray(core.badges);

  // 1) Filter badges group to selected badges only (or remove it)
  optionGroups = optionGroups
    .map((g) => {
      if (g.key !== "badges") return g;

      // no selected badges -> hide the entire badges group
      if (selectedBadges.length === 0) return { ...g, values: [] };

      // keep only selected badge values
      const filteredValues = (g.values ?? []).filter((v) => selectedBadges.includes(v.value));
      return { ...g, values: filteredValues };
    })
    // remove empty badges group
    .filter((g) => !(g.key === "badges" && (g.values?.length ?? 0) === 0));

  // 2) Now decide if badges are available based on the filtered result
  const hasBadgesGroup = optionGroups.some((g) => g.key === "badges" && (g.values?.length ?? 0) > 0);

  /**
   * If there is NO badges group with values (after filtering),
   * remove "badge" entries from customization, and remove customization entirely if it becomes empty.
   */
  if (!hasBadgesGroup) {
    optionGroups = optionGroups
      .map((g) => {
        if (g.key !== "customization") return g;

        const filtered = (g.values ?? []).filter(
          (v) => !/badge/i.test(v.value) && !/badge/i.test(v.label)
        );

        return { ...g, values: filtered };
      })
      .filter((g) => !(g.key === "customization" && (g.values?.length ?? 0) === 0));
  }

  const uiProduct: ProductUI = {
    id: String(core.id),
    slug: core.slug,
    name: core.name,
    team: core.team,
    description: core.description,
    basePrice: Number(core.basePrice ?? 0),
    images: ensureArray(core.imageUrls),
    sizes,
    optionGroups,

    // ✅ pass selected badges to ProductConfigurator too
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
