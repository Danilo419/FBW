// src/app/pt-stock/[slug]/page.tsx
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProductConfigurator from "@/components/ProductConfigurator";
import type { OptionType } from "@prisma/client";

export const dynamic = "force-dynamic";

function isExternalUrl(u: string) {
  return /^https?:\/\//i.test(u) || u.startsWith("//");
}
function normalizeUrl(u: string) {
  if (!u) return "";
  if (u.startsWith("//")) return `https:${u}`;
  return u;
}
function getCoverUrl(imageUrls: unknown) {
  try {
    if (!imageUrls) return "/placeholder.png";

    if (Array.isArray(imageUrls)) {
      const first = String(imageUrls[0] ?? "").trim();
      return normalizeUrl(first) || "/placeholder.png";
    }

    if (typeof imageUrls === "string") {
      const s = imageUrls.trim();
      if (!s) return "/placeholder.png";

      if (s.startsWith("[") && s.endsWith("]")) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const first = String(parsed[0] ?? "").trim();
          return normalizeUrl(first) || "/placeholder.png";
        }
      }

      return normalizeUrl(s) || "/placeholder.png";
    }

    return "/placeholder.png";
  } catch {
    return "/placeholder.png";
  }
}

function mapOptionType(t: OptionType): "SIZE" | "RADIO" | "ADDON" {
  if (t === "SIZE") return "SIZE";
  if (t === "RADIO") return "RADIO";
  return "ADDON";
}

type PageProps = {
  // ✅ Next 15 types in production expect params as Promise
  params: Promise<{ slug: string }>;
};

export default async function PtStockProductPage({ params }: PageProps) {
  const { slug } = await params;

  const product = await prisma.product.findFirst({
    where: {
      slug,
      isVisible: true,
      channel: "PT_STOCK_CTT",
    },
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
      sizes: {
        select: { id: true, size: true, available: true },
        orderBy: { size: "asc" },
      },
      options: {
        select: {
          id: true,
          key: true,
          label: true,
          type: true,
          required: true,
          values: {
            select: { id: true, value: true, label: true, priceDelta: true },
            orderBy: { label: "asc" },
          },
        },
        orderBy: { key: "asc" },
      },
    },
  });

  if (!product) return notFound();

  const images =
    product.imageUrls?.length && product.imageUrls.every((x) => String(x).trim())
      ? product.imageUrls.map((u) => normalizeUrl(String(u)))
      : [getCoverUrl(product.imageUrls)];

  const externalCover = isExternalUrl(images[0] ?? "");

  // Adaptar para o ProductConfigurator UI type
  const productUI = {
    id: product.id,
    slug: product.slug,
    name: product.name,
    team: product.team,
    description: product.description,
    basePrice: product.basePrice,
    images,
    badges: product.badges ?? [],
    optionGroups: (product.options ?? []).map((g) => ({
      id: g.id,
      key: g.key,
      label: g.label,
      type: mapOptionType(g.type),
      required: g.required,
      values: (g.values ?? []).map((v) => ({
        id: v.id,
        value: v.value,
        label: v.label,
        priceDelta: v.priceDelta ?? 0,
      })),
    })),
    sizes: (product.sizes ?? []).map((s) => ({
      id: s.id,
      size: String(s.size).toUpperCase(),
      available: s.available,
    })),
  };

  return (
    <div className="container-fw py-10">
      {/* Top bar */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link href="/pt-stock" className="text-sm text-blue-700 hover:underline">
          ← Voltar ao Portugal Delivery
        </Link>

        <div className="inline-flex items-center gap-2 rounded-full border bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          CTT • 2–3 dias úteis
        </div>
      </div>

      {/* Optional: small hero image preview (keeps same product page vibe) */}
      <div className="mb-6 rounded-2xl border bg-white p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight break-words">
              {product.name}
            </h1>
            <div className="mt-1 text-sm text-gray-600 break-words">{product.team}</div>
            <div className="mt-2 text-sm text-gray-700">
              Produto em stock em Portugal — envio CTT rápido.
            </div>
          </div>

          <div className="relative h-24 w-20 sm:h-28 sm:w-24 overflow-hidden rounded-xl border bg-white">
            <Image
              src={images[0] ?? "/placeholder.png"}
              alt={product.name}
              fill
              className="object-contain"
              sizes="96px"
              unoptimized={externalCover}
            />
          </div>
        </div>
      </div>

      {/* Main configurator */}
      <ProductConfigurator product={productUI as any} />
    </div>
  );
}