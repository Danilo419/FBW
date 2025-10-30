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
  stock?: number | null; // opcional para futura compat
};

type ProductUI = {
  id: string;
  slug: string;
  name: string;
  team?: string | null;
  description?: string | null;
  basePrice: number; // cents
  images: string[];  // mapeado de imageUrls
  sizes: SizeUI[];   // apenas os que existem na BD
  optionGroups: OptionGroupUI[];
};

/* ===================== Helpers ===================== */
function toUIGroupType(t: string): "SIZE" | "RADIO" | "ADDON" {
  return t === "SIZE" || t === "RADIO" || t === "ADDON" ? t : "RADIO";
}

function ensureArray<T>(arr: T[] | null | undefined): T[] {
  return Array.isArray(arr) ? arr : [];
}

/** Converte SizeStock -> UI Size */
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

/** Agrupa OptionValue por groupId */
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
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // 1) Core do produto
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
    },
  });
  if (!core) notFound();

  // 2) Relations em queries separadas (alinha 100% com o teu schema)
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

  // 3) Converter para UI
  const sizes = toUISizes(sizesDb);
  const valuesByGroup = mapValuesByGroup(valuesDb);
  const optionGroups = toUIGroups(groupsDb, valuesByGroup);

  const uiProduct: ProductUI = {
    id: String(core.id),
    slug: core.slug,
    name: core.name,
    team: core.team,
    description: core.description,
    basePrice: Number(core.basePrice ?? 0),
    images: ensureArray(core.imageUrls),
    sizes,           // ✅ só os existentes; indisponíveis serão riscados no UI
    optionGroups,
  };

  return (
    <div className="container-fw py-10 grid gap-10">
      <ProductConfigurator product={uiProduct} />
      <ProductReviews productId={uiProduct.id} />
    </div>
  );
}
