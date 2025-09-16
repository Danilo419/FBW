// src/app/products/[slug]/page.tsx
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ProductConfigurator from "@/components/ProductConfigurator";
import ProductReviews from "@/components/ProductReviews";

export const revalidate = 60;

/* ---------- UI types ---------- */
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
  basePrice: number;
  images: string[];
  sizes: SizeUI[];
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
  id: string;
  groupId: string;
  value: string;
  label: string;
  priceDelta: number;
}[]): Map<string, OptionValueUI[]> {
  const by = new Map<string, OptionValueUI[]>();
  for (const v of values) {
    const list = by.get(v.groupId) ?? [];
    list.push({
      id: v.id,
      value: v.value,
      label: v.label,
      priceDelta: v.priceDelta,
    });
    by.set(v.groupId, list);
  }
  return by;
}
function toUISizes(rows: { id: string; size: string; stock: number }[]): SizeUI[] {
  return rows.map((s) => ({ id: s.id, size: s.size, stock: s.stock }));
}
function toUIGroups(
  groups: { id: string; key: string; label: string; type: string; required: boolean }[],
  valuesByGroup: Map<string, OptionValueUI[]>
): OptionGroupUI[] {
  return groups.map((g) => ({
    id: g.id,
    key: g.key,
    label: g.label,
    type: toUIGroupType(g.type),
    required: g.required,
    values: valuesByGroup.get(g.id) ?? [],
  }));
}
function buildUIProduct(args: {
  core: {
    id: string;
    slug: string;
    name: string;
    team: string | null;
    description: string | null;
    basePrice: number;
    images: string[] | null;
  };
  sizes: SizeUI[];
  optionGroups: OptionGroupUI[];
}): ProductUI {
  const { core, sizes, optionGroups } = args;
  return {
    id: core.id,
    slug: core.slug,
    name: core.name,
    team: core.team ?? null,
    description: core.description ?? null,
    basePrice: core.basePrice,
    images: ensureArray(core.images),
    sizes,
    optionGroups,
  };
}

/** Garante que a lista de tamanhos inclui até 3XL.
 *  Para tamanhos ausentes, cria com stock 0 (aparecem desativados).
 */
function ensureUpTo3XL(sizes: SizeUI[]): SizeUI[] {
  const order = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];
  const bySize = new Map<string, SizeUI>();
  sizes.forEach((s) => bySize.set(s.size.toUpperCase(), s));

  const merged: SizeUI[] = [];
  for (const key of order) {
    const found = bySize.get(key);
    if (found) merged.push(found);
    else {
      merged.push({
        id: `ghost-${key}`,
        size: key,
        stock: 0,
      });
    }
  }
  return merged;
}

/* ---------- SSG params ---------- */
export async function generateStaticParams() {
  const rows = await prisma.product.findMany({ select: { slug: true } });
  return rows.map((r) => ({ slug: r.slug }));
}

/* ---------- Page ---------- */
type PageProps = { params: Promise<{ slug: string }> };

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;

  const core = await prisma.product.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      team: true,
      description: true,
      basePrice: true,
      images: true,
    },
  });
  if (!core) notFound();

  const [sizesDb, groupsDb, valuesDb] = await Promise.all([
    prisma.sizeStock.findMany({
      where: { productId: core.id },
      orderBy: { id: "asc" },
      select: { id: true, size: true, stock: true },
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

  const sizes = ensureUpTo3XL(toUISizes(sizesDb));
  const valuesByGroup = mapValuesByGroup(valuesDb);
  const optionGroups = toUIGroups(groupsDb, valuesByGroup);

  const uiProduct = buildUIProduct({ core, sizes, optionGroups });

  return (
    <div className="container-fw py-10 grid gap-10">
      {/* Configurador / detalhe do produto */}
      <ProductConfigurator product={uiProduct} />

      {/* Reviews (rating 0–5 + comentário) */}
      <ProductReviews productId={uiProduct.id} />
    </div>
  );
}
