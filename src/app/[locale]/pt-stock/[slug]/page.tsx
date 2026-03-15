// src/app/[locale]/pt-stock/[slug]/page.tsx
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { ProductChannel } from "@prisma/client";
import ProductConfigurator from "@/components/ProductConfigurator";

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

/* ====================== Types ====================== */

type PageProps = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
};

type ProductConfiguratorOptionValue = {
  id: string;
  value: string;
  label: string;
  priceDelta: number;
};

type ProductConfiguratorOptionGroup = {
  id: string;
  key: string;
  label: string;
  type: "SIZE" | "RADIO" | "ADDON";
  required: boolean;
  values: ProductConfiguratorOptionValue[];
};

type ProductConfiguratorSize = {
  id: string;
  size: string;
  stock?: number | null;
  available?: boolean | null;
};

type ProductConfiguratorProduct = {
  id: string;
  slug: string;
  name: string;
  team?: string | null;
  description?: string | null;
  basePrice: number;
  images: string[];
  optionGroups: ProductConfiguratorOptionGroup[];
  sizes?: ProductConfiguratorSize[];
  badges?: string[];
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
      badges: true,
      ptStockQty: true,
      sizes: {
        orderBy: { size: "asc" },
        select: {
          id: true,
          size: true,
          available: true,
        },
      },
      options: {
        orderBy: [{ key: "asc" }],
        select: {
          id: true,
          key: true,
          label: true,
          type: true,
          required: true,
          values: {
            orderBy: [{ label: "asc" }],
            select: {
              id: true,
              value: true,
              label: true,
              priceDelta: true,
            },
          },
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

  const stockQty = Number(product.ptStockQty ?? 0);
  const inStock = stockQty > 0;
  const stockMessage = getStockUrgencyMessage(stockQty);

  const productForConfigurator: ProductConfiguratorProduct = {
    id: product.id,
    slug: product.slug,
    name: product.name,
    team: product.team,
    description: product.description,
    basePrice: product.basePrice,
    images: getImages(product.imageUrls),
    badges: product.badges ?? [],
    sizes: product.sizes.map((s) => ({
      id: s.id,
      size: s.size,
      available: s.available,
      stock: s.available ? stockQty : 0,
    })),
    optionGroups: product.options.map((group) => ({
      id: group.id,
      key: group.key,
      label: group.label,
      type: group.type,
      required: group.required,
      values: group.values.map((value) => ({
        id: value.id,
        value: value.value,
        label: value.label,
        priceDelta: value.priceDelta,
      })),
    })),
  };

  return (
    <main className="min-h-screen bg-white">
      <div className="container-fw py-6 md:py-10">
        <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px] text-gray-500 sm:text-sm">
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

        <div className="mb-5 grid gap-3 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-2xl border bg-white/70 p-3 sm:p-4">
            <div className="flex flex-wrap items-center gap-2">
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

              {product.season ? (
                <div className="inline-flex items-center rounded-full border bg-white px-3 py-1 text-sm font-semibold text-gray-700">
                  {t("labels.season")}: {product.season}
                </div>
              ) : null}
            </div>

            <div
              className={cx(
                "mt-3 rounded-xl border px-3 py-2 text-[11px] font-semibold sm:text-xs",
                stockMessage.classes
              )}
            >
              {stockMessage.text}
            </div>
          </div>

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
        </div>

        <ProductConfigurator product={productForConfigurator} />

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-2xl border bg-white/70 p-3 sm:p-4">
            <div className="grid grid-cols-3 gap-2">
              <TrustPill icon={<ShieldIcon />} text={t("trustSecureCheckout")} />
              <TrustPill icon={<TruckIcon />} text={t("trustTrackedShipping")} />
              <TrustPill icon={<ChatIcon />} text={t("trustFastSupport")} />
            </div>
          </div>

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
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <InfoAccordions t={t} />

          <div className="space-y-4">
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