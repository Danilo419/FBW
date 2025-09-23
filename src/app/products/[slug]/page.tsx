// src/app/products/[slug]/page.tsx
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ProductConfigurator from "@/components/ProductConfigurator";
import ProductReviews from "@/components/ProductReviews";

/** Always render at runtime (disable SSG/ISR so builds never touch the DB) */
export const revalidate = 0;
export const dynamic = "force-dynamic";

/* ---------- UI types (match ProductConfigurator props) ---------- */
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
  stock: number;
};

type ProductUI = {
  id: string;
  slug: string;
  name: string;
  team?: string | null;
  description?: string | null;
  basePrice: number;           // cents
  images: string[];
  // Adult sizes go here (kept for backwards compatibility)
  sizes: SizeUI[];
  // ✅ Option 1 (single page): Kids sizes are provided separately
  kidsSizes?: SizeUI[];
  // Optional delta for kids price (in cents). If omitted, same as basePrice.
  kidsPriceDelta?: number;
  optionGroups: OptionGroupUI[];
};

/* ---------- helpers ---------- */
function toUIGroupType(t: string): "SIZE" | "RADIO" | "ADDON" {
  return t === "SIZE" || t === "RADIO" || t === "ADDON" ? t : "RADIO";
}

function ensureArray<T>(arr: T[] | null | undefined): T[] {
  return Array.isArray(arr) ? arr : [];
}

function mapValuesByGroup(values: {
  id: string | number;
  groupId: string | number;
  value: string;
  label: string;
  priceDelta: number;
}[]): Map<string, OptionValueUI[]> {
  const by = new Map<string, OptionValueUI[]>();
  for (const v of values) {
    const gid = String(v.groupId);
    const list = by.get(gid) ?? [];
    list.push({
      id: String(v.id),
      value: v.value,
      label: v.label,
      priceDelta: v.priceDelta ?? 0,
    });
    by.set(gid, list);
  }
  return by;
}

function toUISizes(rows: { id: string | number; size: string; stock: number }[]): SizeUI[] {
  return rows.map((s) => ({ id: String(s.id), size: s.size, stock: s.stock ?? 0 }));
}

// Sorting helpers (robust to different naming like 2XL vs XXL)
const ADULT_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL", "4XL"];
const KIDS_ORDER = ["4Y", "6Y", "8Y", "10Y", "12Y", "14Y"];

function indexInOrder(value: string, order: string[]) {
  const i = order.indexOf(value.toUpperCase());
  return i === -1 ? Number.POSITIVE_INFINITY : i;
}

function sortByOrder<T extends { size: string }>(list: T[], order: string[]): T[] {
  return [...list].sort(
    (a, b) => indexInOrder(a.size.toUpperCase(), order) - indexInOrder(b.size.toUpperCase(), order)
  );
}

/** Add disabled adult sizes up to 3XL only if you already have at least one adult size.
 *  (Prevents showing a full ghost adult grid when a product is kids-only.)
 */
function ensureUpTo3XLIfNeeded(adult: SizeUI[]): SizeUI[] {
  if (!adult.length) return adult;
  const by = new Map(adult.map((s) => [s.size.toUpperCase(), s]));
  const wanted = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];
  const merged: SizeUI[] = [];
  for (const key of wanted) {
    merged.push(
      by.get(key) ?? {
        id: `ghost-${key}`,
        size: key,
        stock: 0,
      }
    );
  }
  return merged;
}

/** Split DB sizes into Adult vs Kids.
 *  If your schema does not store a group, we detect Kids by the pattern like "6Y", "8Y", "10Y", etc.
 */
function splitAdultKids(all: SizeUI[]): { adult: SizeUI[]; kids: SizeUI[] } {
  const isKids = (s: string) => /\d+\s*Y$/i.test(s.trim()) || s.toUpperCase().endsWith("Y");
  const adult = all.filter((s) => !isKids(s.size));
  const kids = all.filter((s) => isKids(s.size));
  return {
    adult: sortByOrder(ensureUpTo3XLIfNeeded(adult), ADULT_ORDER),
    kids: sortByOrder(kids, KIDS_ORDER),
  };
}

function toUIGroups(
  groups: { id: string | number; key: string; label: string; type: string; required: boolean }[],
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

function buildUIProduct(args: {
  core: {
    id: string;
    slug: string;
    name: string;
    team: string | null;
    description: string | null;
    basePrice: number;   // cents
    images: string[] | null;
  };
  adultSizes: SizeUI[];
  kidsSizes: SizeUI[];
  optionGroups: OptionGroupUI[];
}): ProductUI {
  const { core, adultSizes, kidsSizes, optionGroups } = args;

  const ui: ProductUI = {
    id: core.id,
    slug: core.slug,
    name: core.name,
    team: core.team ?? null,
    description: core.description ?? null,
    basePrice: core.basePrice,
    images: ensureArray(core.images),
    sizes: adultSizes,             // Adult sizes
    optionGroups,
  };

  if (kidsSizes.length) {
    ui.kidsSizes = kidsSizes;
    // If you later store a kids base price, compute a delta and set ui.kidsPriceDelta.
    // For now we omit it; ProductConfigurator will treat kids as same price if undefined.
  }

  return ui;
}

/* ---------- Static params (guarded on Vercel) ---------- */
export async function generateStaticParams() {
  // On Vercel builds, do not pre-generate anything to avoid DB access
  if (process.env.VERCEL) return [];
  try {
    const rows = await prisma.product.findMany({ select: { slug: true }, take: 500 });
    return rows.map((r) => ({ slug: r.slug }));
  } catch {
    return [];
  }
}

/* ---------- Page ---------- */
type PageProps = { params: { slug: string } };

export default async function ProductPage({ params }: PageProps) {
  const { slug } = params;

  const core = await prisma.product.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      team: true,
      description: true,
      basePrice: true, // cents
      images: true,    // string[]
    },
  });
  if (!core) notFound();

  const [sizesDb, groupsDb, valuesDb] = await Promise.all([
    prisma.sizeStock.findMany({
      where: { productId: core.id },
      orderBy: { id: "asc" },
      select: { id: true, size: true, stock: true }, // keep schema-agnostic; no group field assumed
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

  const sizesAll = toUISizes(sizesDb);
  const { adult, kids } = splitAdultKids(sizesAll);
  const valuesByGroup = mapValuesByGroup(valuesDb as any);
  const optionGroups = toUIGroups(groupsDb as any, valuesByGroup);

  const uiProduct = buildUIProduct({
    core: {
      id: String(core.id),
      slug: core.slug,
      name: core.name,
      team: core.team,
      description: core.description,
      basePrice: Number(core.basePrice ?? 0),
      images: core.images,
    },
    adultSizes: adult,
    kidsSizes: kids,
    optionGroups,
  });

  return (
    <div className="container-fw py-10 grid gap-10">
      {/* Product configurator / details (Adult & Kids in the same page) */}
      <ProductConfigurator product={uiProduct} />
      {/* Reviews (rating 0–5 + comment) */}
      <ProductReviews productId={uiProduct.id} />
    </div>
  );
}
