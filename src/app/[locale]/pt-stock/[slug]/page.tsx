import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { ProductChannel } from "@prisma/client";
import { formatMoney } from "@/lib/money";

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
        .map((x) => String(x || "").trim())
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
            .map((x) => String(x || "").trim())
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

function formatMoneyRight(cents: number) {
  const s = formatMoney(cents);

  let m = s.match(/^-€\s*(.+)$/);
  if (m) return `-${m[1]}€`;

  m = s.match(/^€\s*(.+)$/);
  if (m) return `${m[1]}€`;

  return s;
}

function isExternalUrl(u: string) {
  return /^https?:\/\//i.test(u) || u.startsWith("//");
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/* ====================== Discount map ====================== */

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
  const rawUnitPrice = basePrice;
  const candidateEur1 = rawUnitPrice;
  const candidateEur2 = rawUnitPrice / 100;

  let salePriceEur: number;
  if (SALE_MAP_EUR[candidateEur1.toFixed(2)]) salePriceEur = candidateEur1;
  else if (SALE_MAP_EUR[candidateEur2.toFixed(2)]) salePriceEur = candidateEur2;
  else salePriceEur = rawUnitPrice > 100 ? candidateEur2 : candidateEur1;

  const saleKey = salePriceEur.toFixed(2);
  const originalPriceEur = SALE_MAP_EUR[saleKey];

  let originalUnitPriceForMoney: number | undefined;
  if (typeof originalPriceEur === "number") {
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

type ProductSizeUI = {
  id: string;
  size: string;
  available: boolean;
};

/* ====================== Page ====================== */

export default async function PtStockProductPage({ params }: PageProps) {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "ptStockProductPage" });

  const product = await prisma.product.findFirst({
    where: {
      slug,
      isVisible: true,
      channel: ProductChannel.PT_STOCK_CTT,
    },
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
      sizes: {
        orderBy: { size: "asc" },
        select: {
          id: true,
          size: true,
          available: true,
        },
      },
    },
  });

  if (!product) notFound();

  const images = getImages(product.imageUrls);
  const mainImage = images[0];

  const sizes: ProductSizeUI[] = product.sizes.map((s) => ({
    id: s.id,
    size: s.size,
    available: s.available,
  }));

  const availableSizes = sizes.filter((s) => s.available);

  const { hasDiscount, discountPercent, originalUnitPriceForMoney } =
    getPricePresentation(product.basePrice);

  const stockQty = Number(product.ptStockQty ?? 0);
  const inStock = stockQty > 0;

  return (
    <main className="min-h-screen bg-white">
      <div className="container-fw py-6 md:py-10">
        {/* Breadcrumbs */}
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

        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          {/* LEFT: Gallery */}
          <section>
            <div className="overflow-hidden rounded-3xl border bg-white shadow-sm">
              <div className="relative aspect-square w-full">
                <Image
                  src={mainImage}
                  alt={product.name}
                  fill
                  className="object-contain"
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  unoptimized={isExternalUrl(mainImage)}
                />
              </div>
            </div>

            {images.length > 1 && (
              <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5">
                {images.map((img, index) => (
                  <div
                    key={`${img}-${index}`}
                    className="relative aspect-square overflow-hidden rounded-2xl border bg-white"
                  >
                    <Image
                      src={img}
                      alt={`${product.name} ${index + 1}`}
                      fill
                      className="object-contain"
                      sizes="120px"
                      unoptimized={isExternalUrl(img)}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* RIGHT: Product info */}
          <section className="space-y-5">
            <div>
              {product.team && product.team !== product.name && (
                <div className="mb-2 text-sm font-medium text-emerald-700">
                  {product.team}
                </div>
              )}

              <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">
                {product.name}
              </h1>

              {product.season && (
                <div className="mt-2 text-sm text-gray-600">
                  {t("labels.season")}:{" "}
                  <span className="font-medium text-gray-900">
                    {product.season}
                  </span>
                </div>
              )}
            </div>

            {/* Price */}
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-end gap-3">
                <div className="text-3xl font-extrabold text-gray-900">
                  {formatMoneyRight(product.basePrice)}
                </div>

                {hasDiscount && originalUnitPriceForMoney != null && (
                  <>
                    <div className="text-lg text-gray-400 line-through">
                      {formatMoneyRight(originalUnitPriceForMoney)}
                    </div>

                    <div className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-sm font-semibold text-red-700">
                      -{discountPercent}%
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Stock */}
            <div className="rounded-2xl border bg-white/70 p-4">
              <div className="mb-2 text-sm font-semibold text-gray-900">
                {t("stock.title")}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cx(
                    "inline-flex rounded-full px-3 py-1 text-sm font-semibold",
                    inStock
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-red-100 text-red-700"
                  )}
                >
                  {inStock ? t("stock.inStock") : t("stock.outOfStock")}
                </span>

                {inStock && (
                  <span className="text-sm text-gray-600">
                    {t("stock.units", { count: stockQty })}
                  </span>
                )}
              </div>
            </div>

            {/* Sizes */}
            <div className="rounded-2xl border bg-white/70 p-4">
              <div className="mb-3 text-sm font-semibold text-gray-900">
                {t("sizes.title")}
              </div>

              {sizes.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {sizes.map((size) => (
                    <span
                      key={size.id}
                      className={cx(
                        "inline-flex min-w-[48px] items-center justify-center rounded-xl border px-3 py-2 text-sm font-medium",
                        size.available
                          ? "border-gray-300 bg-white text-gray-900"
                          : "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 line-through"
                      )}
                    >
                      {size.size}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">{t("sizes.noSizes")}</p>
              )}

              {availableSizes.length > 0 && (
                <p className="mt-3 text-xs text-gray-500">
                  {t("sizes.availableOnly")}
                </p>
              )}
            </div>

            {/* Shipping prices */}
            <div className="rounded-2xl border bg-white/70 p-3 sm:p-4">
              <div className="mb-2 text-[11px] font-semibold text-gray-700 sm:text-sm">
                {t("shippingInfo.title")}
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
                  <span>{t("shippingInfo.oneShirt")}</span>
                  <span className="font-semibold text-gray-900">
                    {t("shippingInfo.onePrice")}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
                  <span>{t("shippingInfo.twoShirts")}</span>
                  <span className="font-semibold text-gray-900">
                    {t("shippingInfo.twoPrice")}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
                  <span>{t("shippingInfo.threePlus")}</span>
                  <span className="font-semibold text-emerald-700">
                    {t("shippingInfo.free")}
                  </span>
                </div>
              </div>
            </div>

            {/* CTT Highlight */}
            <div className="rounded-2xl border bg-white/70 p-3 sm:p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-yellow-300 bg-white shadow-sm">
                  <span className="text-sm font-black text-yellow-500">CTT</span>
                </div>

                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900 sm:text-base">
                    {t("ctt.title")}
                  </div>

                  <p className="mt-1 text-[11px] text-gray-700 sm:text-sm">
                    {t.rich("ctt.description", {
                      ctt: (chunks) => <strong>{chunks}</strong>,
                    })}
                  </p>

                  <div className="mt-3 inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-800 sm:text-xs">
                    {t("ctt.delivery")}
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="rounded-2xl border bg-white/70 p-4">
              <div className="mb-2 text-sm font-semibold text-gray-900">
                {t("description.title")}
              </div>

              <p className="whitespace-pre-line text-sm leading-6 text-gray-700">
                {product.description?.trim() || t("description.fallback")}
              </p>
            </div>

            {/* CTA / Links */}
            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                href={`/${locale}/pt-stock`}
                className="inline-flex items-center rounded-xl border px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50"
              >
                {t("actions.back")}
              </Link>

              <Link
                href={`/${locale}/clubs`}
                className="inline-flex items-center rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white hover:bg-gray-900"
              >
                {t("actions.browseMore")}
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}