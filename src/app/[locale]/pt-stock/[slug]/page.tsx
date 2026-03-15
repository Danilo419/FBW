// src/app/[locale]/pt-stock/[slug]/page.tsx
import Image from "next/image";
import { Link } from "@/i18n/navigation";
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

function getStockUrgencyMessage(stockQty: number) {
  if (stockQty <= 0) {
    return {
      text: "Sold out right now.",
      classes: "border-red-200 bg-red-50 text-red-700",
    };
  }

  if (stockQty === 1) {
    return {
      text: "Hurry, only 1 unit left in stock.",
      classes: "border-red-200 bg-red-50 text-red-700",
    };
  }

  if (stockQty <= 3) {
    return {
      text: `Hurry, only ${stockQty} units left in stock.`,
      classes: "border-orange-200 bg-orange-50 text-orange-700",
    };
  }

  if (stockQty <= 6) {
    return {
      text: `Limited stock available — ${stockQty} units remaining.`,
      classes: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  return {
    text: `Ready to ship from Portugal — ${stockQty} units available.`,
    classes: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
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

/* ====================== Small UI ====================== */

function TrustPill({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-xl border bg-gray-50 px-2.5 py-2 text-[11px] font-semibold text-gray-700 sm:text-xs">
      <span className="text-gray-800">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-black/10" aria-hidden="true" />;
}

function AccordionRow({
  icon,
  title,
  children,
  defaultOpen,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="group" open={!!defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition hover:bg-white/60">
        <span className="text-gray-800">{icon}</span>
        <span className="text-sm font-semibold text-gray-900 sm:text-base">{title}</span>
        <span className="ml-auto text-gray-600">
          <ChevronDownIcon className="h-5 w-5 transition-transform duration-200 group-open:rotate-180" />
        </span>
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}

function InfoAccordions({
  t,
}: {
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-white/70">
      <AccordionRow icon={<TruckIcon className="h-4 w-4" />} title={t("shippingDelivery")} defaultOpen>
        <ul className="space-y-2 text-xs text-gray-700 sm:text-sm">
          <li className="flex gap-2">
            <span className="mt-1">•</span>
            <span>
              <b>{t("estimatedDeliveryBold")}</b> {t("estimatedDeliveryText")}
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1">•</span>
            <span>
              {t("trackingNumberText1")} <b>{t("trackingNumberBold")}</b> {t("trackingNumberText2")}
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1">•</span>
            <span>{t("supportRepliesFast")}</span>
          </li>
        </ul>
      </AccordionRow>

      <Divider />

      <AccordionRow icon={<RotateIcon className="h-4 w-4" />} title={t("returnsSupport")}>
        <ul className="space-y-2 text-xs text-gray-700 sm:text-sm">
          <li className="flex gap-2">
            <span className="mt-1">•</span>
            <span>{t("gotProblem")}</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1">•</span>
            <span>
              {t("keepProductText1")} <b>{t("unusedBold")}</b> {t("keepProductText2")}
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1">•</span>
            <span>{t("personalizedItemsRule")}</span>
          </li>
        </ul>
      </AccordionRow>

      <Divider />

      <AccordionRow icon={<StarBadgeIcon className="h-4 w-4" />} title={t("qualityDetails")}>
        <ul className="space-y-2 text-xs text-gray-700 sm:text-sm">
          <li className="flex gap-2">
            <span className="mt-1">•</span>
            <span>{t("qualityStitching")}</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1">•</span>
            <span>{t("qualityComfort")}</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1">•</span>
            <span>
              {t("bestFitText1")} <b>{t("sizeGuideBold")}</b> {t("bestFitText2")}
            </span>
          </li>
        </ul>
      </AccordionRow>
    </div>
  );
}

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

  if (!product) {
    return (
      <main className="min-h-screen bg-white">
        <div className="container-fw py-10">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-extrabold text-gray-900">Product not found</h1>
            <p className="mt-3 text-sm text-gray-600">No product was found with this slug:</p>
            <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-900">
              {slug}
            </p>

            <div className="mt-6">
              <Link
                href="/pt-stock"
                locale={locale}
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
  const stockMessage = getStockUrgencyMessage(stockQty);

  return (
    <main className="min-h-screen bg-white">
      <div className="w-full overflow-x-hidden px-2 py-4 sm:px-4 sm:py-6">
        <div className="mx-auto mb-4 flex w-full max-w-[260px] flex-wrap items-center gap-2 text-[11px] text-gray-500 sm:max-w-[520px] sm:text-sm lg:max-w-none">
          <Link href="/" locale={locale} className="hover:text-gray-900">
            {t("breadcrumbs.home")}
          </Link>
          <span>/</span>
          <Link href="/pt-stock" locale={locale} className="hover:text-gray-900">
            {t("breadcrumbs.ptStock")}
          </Link>
          <span>/</span>
          <span className="text-gray-900">{product.name}</span>
        </div>

        <div className="relative mx-auto flex w-full max-w-[260px] flex-col gap-6 sm:max-w-[520px] lg:max-w-none lg:flex-row lg:items-start lg:gap-8">
          {/* LEFT COLUMN */}
          <div className="w-full rounded-2xl border bg-white p-3 sm:p-4 lg:w-[560px] lg:flex-none lg:self-start lg:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden h-10 w-10 shrink-0 lg:block" />

              <div className="relative mx-auto aspect-[3/4] w-full max-w-[240px] overflow-hidden rounded-xl bg-white sm:max-w-[320px] lg:max-w-none">
                <Image
                  src={mainImage}
                  alt={product.name}
                  fill
                  className="object-contain"
                  priority
                  sizes="(min-width: 1024px) 540px, 100vw"
                  unoptimized={isExternalUrl(mainImage)}
                />

                {hasDiscount && (
                  <div className="absolute left-3 top-3 flex items-center justify-center rounded-full bg-red-500 px-3 py-1.5 text-xs font-bold text-white shadow-md sm:left-4 sm:top-4 sm:text-sm">
                    -{discountPercent}%
                  </div>
                )}

                <div className="absolute right-3 top-3 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-800">
                  PT Stock
                </div>
              </div>

              <div className="hidden h-10 w-10 shrink-0 lg:block" />
            </div>

            {images.length > 1 && (
              <div className="mt-3">
                <div className="no-scrollbar mx-auto overflow-x-auto overflow-y-hidden whitespace-nowrap py-2 [scrollbar-width:none] [-ms-overflow-style:none]">
                  <style>{`.no-scrollbar::-webkit-scrollbar{display:none;}`}</style>
                  <div className="inline-flex gap-2">
                    {images.map((src, i) => (
                      <div
                        key={src + i}
                        className={cx(
                          "relative h-[52px] w-[42px] flex-none rounded-xl border sm:h-[60px] sm:w-[50px] lg:h-[82px] lg:w-[68px]",
                          i === 0 ? "border-blue-600 ring-2 ring-blue-100" : "border-gray-200"
                        )}
                      >
                        <span className="absolute inset-[3px] overflow-hidden rounded-[10px]">
                          <Image
                            src={src}
                            alt={`${product.name} ${i + 1}`}
                            fill
                            className="object-contain"
                            sizes="68px"
                            unoptimized={isExternalUrl(src)}
                          />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 grid grid-cols-3 gap-2">
              <TrustPill icon={<ShieldIcon />} text={t("trustSecureCheckout")} />
              <TrustPill icon={<TruckIcon />} text={t("trustTrackedShipping")} />
              <TrustPill icon={<ChatIcon />} text={t("trustFastSupport")} />
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="min-w-0 w-full flex-1 space-y-4 rounded-2xl border bg-white p-3 sm:p-4 lg:space-y-6 lg:p-6">
            <header className="space-y-2">
              <div className="h-2 overflow-hidden rounded-full bg-gray-100" aria-hidden="true">
                <div className="h-2 bg-blue-600" style={{ width: inStock ? "100%" : "35%" }} />
              </div>

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {product.team && product.team !== product.name && (
                    <div className="mb-1 text-xs font-medium text-emerald-700 sm:text-sm">
                      {product.team}
                    </div>
                  )}

                  <h1 className="text-sm font-extrabold leading-snug tracking-tight sm:text-base lg:text-2xl">
                    {product.name}
                  </h1>

                  <div className="mt-1 flex flex-wrap items-baseline gap-2">
                    {hasDiscount && originalUnitPriceForMoney != null && (
                      <span className="text-[11px] text-gray-400 line-through sm:text-xs">
                        {formatMoneyRight(originalUnitPriceForMoney)}
                      </span>
                    )}

                    <span className="text-sm font-semibold text-gray-900 sm:text-lg lg:text-xl">
                      {formatMoneyRight(product.basePrice)}
                    </span>

                    {hasDiscount && (
                      <span className="ml-1 rounded-full border border-red-100 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600 sm:text-xs">
                        Save {discountPercent}%
                      </span>
                    )}
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-600 sm:text-xs">
                    <span className="inline-flex items-center gap-2">
                      <TruckIcon className="h-3.5 w-3.5" />
                      {t("ctt.delivery")}
                    </span>

                    {product.season && (
                      <span className="inline-flex items-center gap-2">
                        <StarBadgeIcon className="h-3.5 w-3.5" />
                        {t("labels.season")}: {product.season}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {product.description && (
                <p className="mt-1.5 whitespace-pre-line text-xs text-gray-700 sm:text-sm">
                  {product.description}
                </p>
              )}
            </header>

            {/* STOCK */}
            <div className="rounded-2xl border bg-white/70 p-3 sm:p-4">
              <div className="mb-2 text-[11px] text-gray-700 sm:text-sm">
                {t("stock.title")} <span className="text-red-500">*</span>
              </div>

              <div className="flex flex-wrap gap-2">
                <div
                  className={cx(
                    "inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold",
                    inStock ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"
                  )}
                >
                  {inStock ? t("stock.inStock") : t("stock.outOfStock")}
                </div>

                <div className="inline-flex items-center rounded-full border bg-gray-50 px-3 py-1 text-sm font-semibold text-gray-700">
                  {stockQty} unit{stockQty === 1 ? "" : "s"}
                </div>
              </div>

              <div
                className={cx(
                  "mt-3 rounded-xl border px-3 py-2 text-[11px] sm:text-xs",
                  stockMessage.classes
                )}
              >
                {stockMessage.text}
              </div>
            </div>

            {/* SIZES */}
            <div data-section="size" className="rounded-2xl border bg-white/70 p-3 sm:p-4">
              <div className="mb-2 text-[11px] text-gray-700 sm:text-sm">
                {t("sizes.title")}
              </div>

              {sizes.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {sizes.map((size) => (
                    <span
                      key={size.id}
                      className={cx(
                        "rounded-xl border px-2.5 py-1.5 text-[11px] sm:text-xs lg:text-sm",
                        size.available
                          ? "border-gray-300 bg-white text-gray-900"
                          : "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 line-through opacity-60"
                      )}
                    >
                      {size.size}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">{t("sizes.noSizes")}</div>
              )}

              {availableSizes.length > 0 && (
                <p className="mt-2 text-[11px] text-gray-500 sm:text-xs">
                  {t("sizes.availableOnly")}
                </p>
              )}
            </div>

            {/* SHIPPING PRICE BOX */}
            <div className="rounded-2xl border bg-white/70 p-3 sm:p-4">
              <div className="mb-2 text-[11px] font-semibold text-gray-700 sm:text-sm">
                {t("shippingInfo.title")}
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
                  <span>{t("shippingInfo.oneShirt")}</span>
                  <span className="font-semibold text-gray-900">{t("shippingInfo.onePrice")}</span>
                </div>

                <div className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
                  <span>{t("shippingInfo.twoShirts")}</span>
                  <span className="font-semibold text-gray-900">{t("shippingInfo.twoPrice")}</span>
                </div>

                <div className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
                  <span>{t("shippingInfo.threePlus")}</span>
                  <span className="font-semibold text-emerald-700">{t("shippingInfo.free")}</span>
                </div>
              </div>
            </div>

            {/* CTT CARD */}
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

            {/* DESCRIPTION */}
            <div className="rounded-2xl border bg-white/70 p-4">
              <div className="mb-2 text-sm font-semibold text-gray-900">
                {t("description.title")}
              </div>

              <p className="whitespace-pre-line text-sm leading-6 text-gray-700">
                {product.description?.trim() || t("description.fallback")}
              </p>
            </div>

            {/* ACCORDIONS */}
            <InfoAccordions t={t} />

            {/* TRUST INFO */}
            <div className="rounded-2xl border bg-white/70 p-3 sm:p-4">
              <div className="grid gap-2 text-[11px] text-gray-700 sm:grid-cols-3 sm:text-xs">
                <div className="flex items-start gap-2">
                  <ShieldIcon className="mt-0.5 h-4 w-4" />
                  <div>
                    <div className="font-semibold">{t("securePayment")}</div>
                    <div className="text-gray-500">{t("encryptedCheckout")}</div>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <TruckIcon className="mt-0.5 h-4 w-4" />
                  <div>
                    <div className="font-semibold">{t("trackedShipping")}</div>
                    <div className="text-gray-500">{t("ctt.delivery")}</div>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <ChatIcon className="mt-0.5 h-4 w-4" />
                  <div>
                    <div className="font-semibold">{t("fastSupport")}</div>
                    <div className="text-gray-500">{t("weReplyQuickly")}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="grid gap-2 sm:grid-cols-2">
              <Link
                href="/pt-stock"
                locale={locale}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold text-gray-900 transition hover:bg-gray-50 sm:text-base"
              >
                {t("actions.back")}
              </Link>

              <Link
                href="/clubs"
                locale={locale}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-900 bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black sm:text-base"
              >
                {t("actions.browseMore")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ====================== Icons ====================== */

function ChevronDownIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" className={cx("h-5 w-5", props.className)} fill="none" aria-hidden="true">
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TruckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" className={cx("text-gray-800", props.className)} fill="none" aria-hidden="true">
      <path
        d="M3 7h11v10H3V7zM14 10h4l3 3v4h-7v-7z"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <path
        d="M7 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM18 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"
        fill="currentColor"
      />
    </svg>
  );
}

function ShieldIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" className={cx("text-gray-800", props.className)} fill="none" aria-hidden="true">
      <path
        d="M12 3l8 4v6c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V7l8-4z"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <path
        d="M9 12l2 2 4-5"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChatIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" className={cx("text-gray-800", props.className)} fill="none" aria-hidden="true">
      <path
        d="M4 5h16v11H7l-3 3V5z"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <path
        d="M8 9h8M8 12h6"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </svg>
  );
}

function RotateIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" className={cx("text-gray-800", props.className)} fill="none" aria-hidden="true">
      <path
        d="M21 12a9 9 0 10-3 6.7"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <path
        d="M21 7v5h-5"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarBadgeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" className={cx("text-gray-800", props.className)} fill="none" aria-hidden="true">
      <path
        d="M12 2l2.3 4.7 5.2.8-3.8 3.7.9 5.2L12 14.9 7.4 16.4l.9-5.2-3.8-3.7 5.2-.8L12 2z"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <path
        d="M7 21l5-2 5 2"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </svg>
  );
}