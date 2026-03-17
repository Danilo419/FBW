import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { ProductChannel } from "@prisma/client";
import PtStockProductConfigurator from "@/components/PtStockProductConfigurator";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ====================== Helpers ====================== */

function normalizeUrl(u: string) {
  if (!u) return "";
  if (u.startsWith("//")) return `https:${u}`;
  return u;
}

function getImages(imageUrls: unknown): string[] {
  try {
    if (!imageUrls) return ["/placeholder.png"];

    if (Array.isArray(imageUrls)) {
      const arr = imageUrls
        .filter((x) => x != null)
        .map((x) => String(x).trim())
        .filter(Boolean)
        .map(normalizeUrl);

      return arr.length ? arr : ["/placeholder.png"];
    }

    if (typeof imageUrls === "string") {
      const s = imageUrls.trim();
      if (!s) return ["/placeholder.png"];

      if (s.startsWith("[") && s.endsWith("]")) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) {
          const arr = parsed
            .filter((x) => x != null)
            .map((x) => String(x).trim())
            .filter(Boolean)
            .map(normalizeUrl);

          return arr.length ? arr : ["/placeholder.png"];
        }
      }

      return [normalizeUrl(s)];
    }

    return ["/placeholder.png"];
  } catch {
    return ["/placeholder.png"];
  }
}

const SALE_MAP_EUR: Record<string, number> = {
  "29.99": 70,
  "34.99": 100,
  "39.99": 120,
  "44.99": 150,
  "49.99": 165,
  "59.99": 200,
  "69.99": 230,
};

function getPricePresentation(basePrice: number) {
  const rawUnitPrice = Number(basePrice || 0);
  const candidateEur1 = rawUnitPrice;
  const candidateEur2 = rawUnitPrice / 100;

  let salePriceEur: number;
  if (SALE_MAP_EUR[candidateEur1.toFixed(2)]) salePriceEur = candidateEur1;
  else if (SALE_MAP_EUR[candidateEur2.toFixed(2)]) salePriceEur = candidateEur2;
  else salePriceEur = rawUnitPrice > 100 ? candidateEur2 : candidateEur1;

  const saleKey = salePriceEur.toFixed(2);
  const originalPriceEur = SALE_MAP_EUR[saleKey];

  let originalUnitPriceForMoney: number | undefined;
  if (typeof originalPriceEur === "number" && salePriceEur > 0) {
    const factor = rawUnitPrice / salePriceEur;
    originalUnitPriceForMoney = originalPriceEur * factor;
  }

  const hasDiscount =
    typeof originalPriceEur === "number" && originalPriceEur > salePriceEur;

  const discountPercent = hasDiscount
    ? Math.round(((originalPriceEur - salePriceEur) / originalPriceEur) * 100)
    : 0;

  return {
    hasDiscount,
    discountPercent,
    originalUnitPriceForMoney,
  };
}

/* ====================== Types ====================== */

type PageProps = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
};

/* ====================== Page ====================== */

export default async function PtStockProductPage({ params }: PageProps) {
  const { locale, slug } = await params;
  const t = await getTranslations({
    locale,
    namespace: "ptStockProductPage",
  });

  const product = await prisma.product.findFirst({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      team: true,
      season: true,
      description: true,
      basePrice: true,
      imageUrls: true,
      ptStockQty: true,
      isVisible: true,
      channel: true,
      sizes: {
        orderBy: { size: "asc" },
        select: {
          id: true,
          size: true,
          available: true,
          ptStockQty: true,
        },
      },
    },
  });

  if (!product) {
    return (
      <main className="min-h-screen bg-white">
        <div className="container-fw py-10">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-extrabold text-gray-900">
              Product not found
            </h1>
            <p className="mt-3 text-sm text-gray-600">
              No product was found with this slug:
            </p>
            <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-900">
              {slug}
            </p>

            <div className="mt-6">
              <Link
                href={`/${locale}/pt-stock`}
                className="inline-flex items-center rounded-xl border px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50"
              >
                Back to PT Stock
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (product.channel !== ProductChannel.PT_STOCK_CTT || !product.isVisible) {
    return (
      <main className="min-h-screen bg-white">
        <div className="container-fw py-10">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-extrabold text-gray-900">
              Product unavailable
            </h1>

            <div className="mt-4 space-y-2 text-sm text-gray-700">
              <p>
                <span className="font-semibold">Slug:</span> {product.slug}
              </p>
              <p>
                <span className="font-semibold">Channel:</span> {product.channel}
              </p>
              <p>
                <span className="font-semibold">Visible:</span>{" "}
                {String(product.isVisible)}
              </p>
            </div>

            <div className="mt-6">
              <Link
                href={`/${locale}/pt-stock`}
                className="inline-flex items-center rounded-xl border px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50"
              >
                Back to PT Stock
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const safeImages = getImages(product.imageUrls);

  const safeSizes = Array.isArray(product.sizes)
    ? product.sizes
        .filter((s) => s && typeof s === "object")
        .map((s, index) => ({
          id: String(s.id ?? `size-${index}`),
          size: String(s.size ?? "").trim(),
          available: !!s.available,
          ptStockQty: Math.max(0, Number(s.ptStockQty ?? 0)),
        }))
        .filter((s) => s.size.length > 0)
    : [];

  const stockQty = Number(product.ptStockQty ?? 0);
  const inStock = stockQty > 0;
  const basePrice = Number(product.basePrice ?? 0);

  return (
    <main className="min-h-screen bg-white">
      <div className="container-fw py-6 md:py-10">
        <nav className="mb-6 text-sm text-gray-500">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/${locale}`} className="hover:text-gray-900">
              {t("breadcrumbs.home")}
            </Link>
            <span>/</span>
            <Link href={`/${locale}/pt-stock`} className="hover:text-gray-900">
              {t("breadcrumbs.ptStock")}
            </Link>
            <span>/</span>
            <span className="text-gray-900">{product.name}</span>
          </div>
        </nav>

        <PtStockProductConfigurator
          locale={locale}
          product={{
            id: product.id,
            slug: product.slug,
            name: product.name ?? "Product",
            team: product.team ?? null,
            season: product.season ?? null,
            description: product.description ?? null,
            basePrice,
            images: safeImages,
            ptStockQty: stockQty,
            inStock,
            sizes: safeSizes,
            pricePresentation: getPricePresentation(basePrice),
          }}
        />
      </div>
    </main>
  );
}