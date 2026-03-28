// src/app/[locale]/pt-stock/page.tsx
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { ProductChannel } from "@prisma/client";

export const dynamic = "force-dynamic";

/* ============================================================
   Helpers de imagem
============================================================ */

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

/* ============================================================
   Promo / preços (mesmo estilo visual da outra página)
============================================================ */

const SALE_MAP_EUR: Record<number, number> = {
  24.99: 100,
  29.99: 120,
  34.99: 140,
  39.99: 160,
  44.99: 180,
  49.99: 200,
  59.99: 240,
};

function centsToEur(cents?: number | null) {
  if (typeof cents !== "number" || Number.isNaN(cents)) return null;
  return Number((cents / 100).toFixed(2));
}

function toCents(eur?: number | null) {
  if (typeof eur !== "number" || Number.isNaN(eur)) return null;
  return Math.round(eur * 100);
}

function getSale(priceCents?: number | null) {
  const priceEur = centsToEur(priceCents);
  if (typeof priceEur !== "number") return null;

  const key = Number(priceEur.toFixed(2));
  const oldEur = SALE_MAP_EUR[key as keyof typeof SALE_MAP_EUR];
  if (!oldEur) return null;

  const now = toCents(priceEur)!;
  const old = toCents(oldEur)!;
  const pct = Math.round((1 - now / old) * 100);

  return { compareAtCents: old, pct };
}

function moneyAfter(cents: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function pricePartsFromCents(cents: number, locale: string) {
  const parts = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).formatToParts(cents / 100);

  const integer =
    parts
      .filter((p) => p.type === "integer" || p.type === "group")
      .map((p) => p.value)
      .join("") || "0";

  const decimal =
    parts.find((p) => p.type === "fraction")?.value?.padStart(2, "0") || "00";

  const decimalSeparator = parts.find((p) => p.type === "decimal")?.value || ",";
  const currency = parts.find((p) => p.type === "currency")?.value || "€";

  return { int: integer, dec: decimal, sep: decimalSeparator, sym: currency };
}

/* ============================================================
   Team label / limpeza
============================================================ */

function normalizeStr(s?: string | null) {
  return (s ?? "").replace(/\s{2,}/g, " ").trim();
}

function cleanTeamValue(v?: string | null): string {
  let s = normalizeStr(v);
  if (!s) return "";

  s = s.replace(/[|]+/g, " ").replace(/\s{2,}/g, " ").trim();
  if (!s) return "";

  const up = s.toUpperCase();
  if (up === "CLUB" || up === "TEAM") return "";

  return s;
}

/* ============================================================
   Tipos
============================================================ */

type ProductRow = {
  id: string;
  slug: string | null;
  name: string;
  team: string | null;
  basePrice: number;
  imageUrls: unknown;
  season: string | null;
  createdAt: Date;
  ptStockQty: number | null;
};

/* ============================================================
   Card com o mesmo design da outra página
============================================================ */

function ProductCard({
  p,
  locale,
  viewProductLabel,
}: {
  p: ProductRow;
  locale: string;
  viewProductLabel: string;
}) {
  const cover = getCoverUrl(p.imageUrls);
  const external = isExternalUrl(cover);
  const stockQty = p.ptStockQty ?? 0;
  const sale = getSale(p.basePrice);
  const parts = pricePartsFromCents(p.basePrice, locale);
  const teamLabel = cleanTeamValue(p.team);

  return (
    <Link
      href={`/pt-stock/${p.slug}`}
      className="group block rounded-3xl bg-white/90 backdrop-blur-sm ring-1 ring-slate-200 shadow-sm hover:shadow-xl hover:ring-sky-200 transition duration-300 overflow-hidden relative"
    >
      {sale && (
        <div className="absolute left-3 top-3 z-10 rounded-full bg-red-600 text-white px-2.5 py-1 text-xs font-extrabold shadow-md ring-1 ring-red-700/40">
          -{sale.pct}%
        </div>
      )}

      <div className="flex flex-col h-full">
        <div className="relative aspect-[4/5] bg-gradient-to-b from-slate-50 to-slate-100">
          <Image
            src={cover}
            alt={p.name}
            fill
            className="object-contain p-3 sm:p-6 transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            unoptimized={external}
          />
        </div>

        <div className="p-4 sm:p-5 flex flex-col grow">
          {teamLabel && (
            <div className="text-[10px] sm:text-[11px] uppercase tracking-wide text-sky-600 font-semibold leading-relaxed">
              {teamLabel}
            </div>
          )}

          <div className="mt-1 text-xs sm:text-sm font-semibold text-slate-900 leading-tight line-clamp-2">
            {p.name}
          </div>

          {p.season ? (
            <div className="mt-1 text-[11px] sm:text-xs text-slate-500">
              {p.season}
            </div>
          ) : null}

          {stockQty > 0 && (
            <div className="mt-2 text-[11px] font-semibold text-emerald-700">
              {stockQty === 1
                ? viewProductLabel === "" // só para nunca quebrar lint por branch vazia
                  ? null
                  : null
                : null}
              {stockQty === 1
                ? "1"
                : String(stockQty)}{" "}
              {stockQty === 1 ? "unidade" : "unidades"}
            </div>
          )}

          <div className="mt-3 sm:mt-4">
            <div className="flex items-end gap-2">
              {sale && (
                <div className="text-[11px] sm:text-[13px] text-slate-500 line-through">
                  {moneyAfter(sale.compareAtCents, locale)}
                </div>
              )}

              <div className="flex items-end" style={{ color: "#1c40b7" }}>
                <span className="text-xl sm:text-2xl font-semibold tracking-tight leading-none">
                  {parts.int}
                </span>
                <span className="text-[11px] sm:text-[13px] font-medium translate-y-[1px]">
                  {parts.sep}
                  {parts.dec}
                </span>
                <span className="text-[13px] sm:text-[15px] font-medium translate-y-[1px] ml-1">
                  {parts.sym}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-auto">
            <div className="mt-3 sm:mt-4 h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
            <div className="h-10 sm:h-12 flex items-center gap-2 text-[11px] sm:text-sm font-medium text-slate-700">
              <span className="transition group-hover:translate-x-0.5">
                {viewProductLabel}
              </span>
              <svg
                className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-70 group-hover:opacity-100 transition group-hover:translate-x-0.5"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 01-1.414 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ============================================================
   Página
============================================================ */

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
    <div className="min-h-screen bg-white">
      {/* HEADER */}
      <section className="border-b bg-gradient-to-b from-slate-50 via-white to-slate-50">
        <div className="container-fw py-8 sm:py-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">
                {t("badge")}
              </p>
              <h1 className="mt-1 text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                {t("title")}
              </h1>
              <div className="mt-3 max-w-3xl space-y-2 text-xs sm:text-sm md:text-base text-gray-600">
                <p>
                  {t.rich("intro.line1", {
                    brand: (chunks) => <b>{chunks}</b>,
                    delivery: (chunks) => <b>{chunks}</b>,
                  })}
                </p>

                <p>
                  {t.rich("intro.line2", {
                    noApply: (chunks) => <b>{chunks}</b>,
                  })}
                </p>

                <p>
                  {t.rich("intro.line3", {
                    one: (chunks) => <b>{chunks}</b>,
                    two: (chunks) => <b>{chunks}</b>,
                    three: (chunks) => <b>{chunks}</b>,
                  })}
                </p>
              </div>
            </div>

            <div className="rounded-3xl border bg-white/90 px-4 py-4 shadow-sm sm:max-w-md">
              <div className="text-sm font-semibold text-slate-900">
                {t("shippingRules.title")}
              </div>
              <div className="mt-2 flex flex-col gap-1 text-xs sm:text-sm text-slate-600">
                <span>{t("shippingRules.one")}</span>
                <span>{t("shippingRules.two")}</span>
                <span>{t("shippingRules.three")}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CONTEÚDO */}
      <section className="container-fw section-gap">
        <div className="mb-4 sm:mb-6 flex items-center gap-2 text-[11px] sm:text-sm text-gray-500">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          <span>{t("count", { count: products.length })}</span>
        </div>

        {products.length === 0 ? (
          <div className="rounded-3xl bg-white/90 backdrop-blur-sm ring-1 ring-slate-200 shadow-sm p-10 text-sm text-gray-600">
            {t("empty")}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                p={p}
                locale={locale}
                viewProductLabel={t("viewProduct")}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}