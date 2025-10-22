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
  basePrice: number; // cents
  images: string[];
  sizes: SizeUI[];        // Adult
  kidsSizes?: SizeUI[];   // Kids (opcional)
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
/** Converte linhas do Prisma (available:boolean) para UI (stock:number) */
function toUISizes(rows: { id: string | number; size: string; available: boolean }[]): SizeUI[] {
  return rows.map((s) => ({
    id: String(s.id),
    size: s.size,
    stock: s.available ? 1 : 0,
  }));
}

/* ==================== ADULT SIZES: S → 4XL ==================== */
const ADULT_ALLOWED_ORDER = ["S", "M", "L", "XL", "2XL", "3XL", "4XL"] as const;
type AllowedAdult = (typeof ADULT_ALLOWED_ORDER)[number];
function normalizeAdultSizeLabel(raw: string): string {
  const t = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (t === "XXL") return "2XL";
  if (t === "XXXL") return "3XL";
  if (t === "XXXXL") return "4XL";
  return t;
}
function isAllowedAdultSize(label: string): label is AllowedAdult {
  return ADULT_ALLOWED_ORDER.includes(label as AllowedAdult);
}
function indexInOrder(value: string, order: readonly string[]) {
  const i = order.indexOf(value.toUpperCase());
  return i === -1 ? Number.POSITIVE_INFINITY : i;
}
function sortByOrder<T extends { size: string }>(list: T[], order: readonly string[]): T[] {
  return [...list].sort(
    (a, b) => indexInOrder(a.size.toUpperCase(), order) - indexInOrder(b.size.toUpperCase(), order)
  );
}
/** Se já existir pelo menos um tamanho adulto, garante todos S→4XL (fantasmas com stock=0 se faltar) */
function ensureUpTo4XLIfNeeded(adult: SizeUI[]): SizeUI[] {
  if (!adult.length) return adult;
  const by = new Map(adult.map((s) => [s.size.toUpperCase(), s]));
  const merged: SizeUI[] = [];
  for (const key of ADULT_ALLOWED_ORDER) {
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

/* ==================== KIDS ==================== */
const KIDS_ORDER = ["2-3Y", "3-4Y", "4-5Y", "6-7Y", "8-9Y", "10-11Y", "12-13Y"] as const;
function isKidsLabel(s: string) {
  const t = s.trim().toUpperCase();
  if (/^\d+\s*Y$/.test(t)) return true;
  if (/^\d+\s*-\s*\d+\s*Y$/.test(t)) return true;
  if (/^\d+\s*(YR|YRS|YEAR|YEARS)$/.test(t)) return true;
  if (/^\d+\s*(ANOS|AÑOS)$/.test(t)) return true;
  if (/^(KID|KIDS|CHILD|JUNIOR|JR)\b/.test(t)) return true;
  if (/\b(JR|JUNIOR|KID|KIDS)$/.test(t)) return true;
  return false;
}
/** Split DB sizes into Adult vs Kids, aplicando o filtro S→4XL nos adultos */
function splitAdultKids(all: SizeUI[]): { adult: SizeUI[]; kids: SizeUI[] } {
  const rawAdult = all.filter((s) => !isKidsLabel(s.size));
  const kids = all.filter((s) => isKidsLabel(s.size));

  const adultNormalized = rawAdult
    .map((s) => ({ ...s, size: normalizeAdultSizeLabel(s.size) }))
    .filter((s) => isAllowedAdultSize(s.size));

  const dedupMap = new Map<string, SizeUI>();
  for (const s of adultNormalized) {
    const key = s.size.toUpperCase();
    const existing = dedupMap.get(key);
    if (!existing) dedupMap.set(key, s);
    else if (existing.stock <= 0 && s.stock > 0) dedupMap.set(key, s);
  }
  const adultFiltered = Array.from(dedupMap.values());
  const adultSorted = sortByOrder(adultFiltered, ADULT_ALLOWED_ORDER);
  const adultCompleted = ensureUpTo4XLIfNeeded(adultSorted);

  return {
    adult: adultCompleted,
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
    basePrice: number; // cents
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
    sizes: adultSizes,
    optionGroups,
  };
  if (kidsSizes.length) ui.kidsSizes = kidsSizes;
  return ui;
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

/* ---------- Page ---------- */
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const core = await prisma.product.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      team: true,
      description: true,
      basePrice: true, // cents
      images: true, // string[]
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
      <ProductConfigurator product={uiProduct} />
      {/* ⬇️ Apenas productId, sem prop "product" */}
      <ProductReviews productId={uiProduct.id} />
    </div>
  );
}
