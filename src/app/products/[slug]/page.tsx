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
  stock: number; // 👈 o Configurator ainda usa "stock"
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
    stock: s.available ? 1 : 0, // 👈 compatibilidade com UI antiga
  }));
}

// Ordenação
const ADULT_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL", "4XL"];
const KIDS_ORDER = ["2-3Y", "3-4Y", "4-5Y", "6-7Y", "8-9Y", "10-11Y", "12-13Y"];

function indexInOrder(value: string, order: string[]) {
  const i = order.indexOf(value.toUpperCase());
  return i === -1 ? Number.POSITIVE_INFINITY : i;
}
function sortByOrder<T extends { size: string }>(list: T[], order: string[]): T[] {
  return [...list].sort(
    (a, b) => indexInOrder(a.size.toUpperCase(), order) - indexInOrder(b.size.toUpperCase(), order)
  );
}

/** Se já existir pelo menos um tamanho adulto, mostra “fantasmas” até 3XL (stock=0). */
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

/** Kids detector: 6Y, 10-11Y, Junior, Kids, etc. */
function isKidsLabel(s: string) {
  const t = s.trim().toUpperCase();
  if (/^\d+\s*Y$/.test(t)) return true;             // 6Y
  if (/^\d+\s*-\s*\d+\s*Y$/.test(t)) return true;   // 10-11Y
  if (/^\d+\s*(YR|YRS|YEAR|YEARS)$/.test(t)) return true;
  if (/^\d+\s*(ANOS|AÑOS)$/.test(t)) return true;
  if (/^(KID|KIDS|CHILD|JUNIOR|JR)\b/.test(t)) return true;
  if (/\b(JR|JUNIOR|KID|KIDS)$/.test(t)) return true;
  return false;
}

/** Split DB sizes into Adult vs Kids. */
function splitAdultKids(all: SizeUI[]): { adult: SizeUI[]; kids: SizeUI[] } {
  const adult = all.filter((s) => !isKidsLabel(s.size));
  const kids = all.filter((s) => isKidsLabel(s.size));
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

  if (kidsSizes.length) {
    ui.kidsSizes = kidsSizes;
  }

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
      images: true, // string[]
    },
  });
  if (!core) notFound();

  const [sizesDb, groupsDb, valuesDb] = await Promise.all([
    prisma.sizeStock.findMany({
      where: { productId: core.id },
      orderBy: { id: "asc" },
      // 👇 buscar `available` no schema novo
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

  // Converter para a forma esperada pelo ProductConfigurator (stock:number)
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
      <ProductReviews productId={uiProduct.id} />
    </div>
  );
}
