// src/app/pt-stock/[slug]/page.tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProductConfigurator from "@/components/ProductConfigurator";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { slug: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function PtStockProductPage({ params }: PageProps) {
  const slug = params?.slug;

  if (!slug) return notFound();

  const product = await prisma.product.findFirst({
    where: {
      slug: String(slug),
      channel: "PT_STOCK_CTT",
      isVisible: true,
    },
    include: {
      options: {
        include: { values: true },
        orderBy: { key: "asc" },
      },
      sizes: {
        orderBy: { size: "asc" },
      },
    },
  });

  if (!product) return notFound();

  const mapped = {
    id: product.id,
    slug: product.slug,
    name: product.name,
    team: product.team,
    description: product.description ?? null,
    basePrice: product.basePrice,
    images: product.imageUrls ?? [],
    optionGroups: (product.options ?? []).map((g) => ({
      id: g.id,
      key: g.key,
      label: g.label,
      type: g.type as any,
      required: g.required,
      values: (g.values ?? []).map((v) => ({
        id: v.id,
        value: v.value,
        label: v.label,
        priceDelta: v.priceDelta,
      })),
    })),
    sizes: (product.sizes ?? []).map((s) => ({
      id: s.id,
      size: s.size,
      available: s.available,
      stock: product.ptStockQty ?? null, // opcional: mostra "stock" global PT se quiseres
    })),
    badges: product.badges ?? [],
  };

  return (
    <div className="container-fw py-10">
      {/* Texto específico PT stock (CTT) — podes trocar para o teu componente */}
      <div className="mb-4 rounded-2xl border bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        <b>Portugal Stock:</b> Sent via <b>CTT</b> in <b>2–3 business days</b>.
      </div>

      <ProductConfigurator product={mapped as any} />
    </div>
  );
}