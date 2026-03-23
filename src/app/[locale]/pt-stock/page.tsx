// src/app/[locale]/pt-stock/page.tsx
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { ProductChannel } from "@prisma/client";

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

function formatMoneyRight(cents: number) {
  const s = formatMoney(cents);

  let m = s.match(/^-€\s*(.+)$/);
  if (m) return `-${m[1]}€`;

  m = s.match(/^€\s*(.+)$/);
  if (m) return `${m[1]}€`;

  return s;
}

export default async function PtStockPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  setRequestLocale(locale);

  const t = await getTranslations({
    locale,
    namespace: "ptStockPage",
  });

  const products = await prisma.product.findMany({
    where: {
      isVisible: true,
      channel: ProductChannel.PT_STOCK_CTT,
    },
    select: {
      id: true,
      slug: true,
      name: true,
      team: true,
      basePrice: true,
      imageUrls: true,
      season: true,
      createdAt: true,
      ptStockQty: true,
    },
    orderBy: [{ createdAt: "desc" }],
  });

  return (
    <div className="container-fw py-10">
      <div className="mb-6 rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              {t("title")}
            </h1>
          </div>

          <div className="rounded-2xl border bg-gray-50 px-4 py-3 sm:rounded-full sm:py-2">
            <div className="text-sm font-semibold text-gray-900">
              {t("shippingRules.title")}
            </div>
            <div className="mt-1 flex flex-col text-sm text-gray-700 sm:flex-row sm:items-center sm:gap-3">
              <span>{t("shippingRules.one")}</span>
              <span className="hidden text-gray-300 sm:block">•</span>
              <span>{t("shippingRules.two")}</span>
              <span className="hidden text-gray-300 sm:block">•</span>
              <span>{t("shippingRules.three")}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-5 text-sm text-gray-700">
          <div>
            <p>
              {t.rich("intro.line1", {
                brand: (chunks) => <b>{chunks}</b>,
                delivery: (chunks) => <b>{chunks}</b>,
              })}
            </p>

            <p className="mt-2">
              {t.rich("intro.line2", {
                noApply: (chunks) => <b>{chunks}</b>,
              })}
            </p>

            <p className="mt-2">
              {t.rich("intro.line3", {
                one: (chunks) => <b>{chunks}</b>,
                two: (chunks) => <b>{chunks}</b>,
                three: (chunks) => <b>{chunks}</b>,
              })}
            </p>
          </div>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="rounded-2xl border bg-white/70 p-10 text-gray-600">
          {t("empty")}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
          {products.map((p) => {
            const cover = getCoverUrl(p.imageUrls);
            const external = isExternalUrl(cover);
            const stockQty = p.ptStockQty ?? 0;

            return (
              <Link
                key={p.id}
                href={`/pt-stock/${p.slug}`}
                className="group rounded-2xl border bg-white p-3 shadow-sm transition hover:shadow-md sm:p-4"
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border bg-white">
                  <Image
                    src={cover}
                    alt={p.name}
                    fill
                    className="object-contain transition-transform group-hover:scale-[1.02]"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    unoptimized={external}
                  />
                  <div className="absolute left-3 top-3 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-800">
                    {t("badge")}
                  </div>
                </div>

                <div className="mt-3 min-w-0">
                  <div className="break-words text-sm font-semibold leading-snug text-gray-900">
                    {p.name}
                  </div>

                  {p.team ? (
                    <div className="mt-0.5 break-words text-xs text-gray-600">
                      {p.team}
                      {p.season ? (
                        <span className="text-gray-400"> • {p.season}</span>
                      ) : null}
                    </div>
                  ) : p.season ? (
                    <div className="mt-0.5 break-words text-xs text-gray-600">
                      {p.season}
                    </div>
                  ) : null}

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="tabular-nums text-sm font-extrabold text-gray-900">
                      {formatMoneyRight(p.basePrice)}
                    </div>
                    <span className="text-[11px] text-gray-500 transition group-hover:text-gray-700">
                      {t("viewProduct")}
                    </span>
                  </div>

                  {stockQty > 0 && (
                    <div className="mt-2 text-[11px] font-semibold text-emerald-700">
                      {stockQty === 1
                        ? t("stock.onlyOne")
                        : t("stock.unitsAvailable", { count: stockQty })}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}