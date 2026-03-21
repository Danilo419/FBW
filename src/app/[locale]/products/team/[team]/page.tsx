// src/app/[locale]/products/team/[team]/page.tsx
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  slugFromTeamName,
  teamNamesForQuery,
  teamNameFromSlug,
} from "@/lib/shop-data";

/* ============================ Config ============================ */
export const revalidate = 60;

type PageProps = {
  params: Promise<{ locale: string; team: string }>;
  searchParams?: Promise<{ page?: string }>;
};

const PAGE_SIZE = 12;

/* ============================ Promo map ============================ */
const SALE_MAP: Record<number, number> = {
  2999: 7000,
  3499: 10000,
  3999: 12000,
  4499: 15000,
  4999: 16500,
  5999: 20000,
  6999: 23000,
};

function getCompareAt(basePriceCents: number) {
  const compareAt = SALE_MAP[basePriceCents];
  if (!compareAt) return null;
  const pct = Math.round((1 - basePriceCents / compareAt) * 100);
  return { compareAt, pct };
}

/* ============================ Utils ============================ */
function fallbackTitle(slug: string) {
  return slug
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function moneyAfterEUR(cents: number, locale: string) {
  const safeLocale = locale === "pt" ? "pt-PT" : "en-GB";

  return (cents / 100).toLocaleString(safeLocale, {
    style: "currency",
    currency: "EUR",
    currencyDisplay: "symbol",
  });
}

function firstImageFrom(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.trim() || null;

  if (Array.isArray(value)) {
    for (const v of value) {
      if (typeof v === "string" && v.trim()) return v.trim();
      if (v && typeof (v as any).url === "string" && (v as any).url.trim()) {
        return (v as any).url.trim();
      }
      if (v && typeof (v as any).src === "string" && (v as any).src.trim()) {
        return (v as any).src.trim();
      }
    }
  }

  const anyValue: any = value;
  if (typeof anyValue?.url === "string" && anyValue.url.trim()) {
    return anyValue.url.trim();
  }
  if (typeof anyValue?.src === "string" && anyValue.src.trim()) {
    return anyValue.src.trim();
  }

  return null;
}

function coverUrl(raw: string | null | undefined, noImageText: string): string {
  const fallback =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='500' height='666' viewBox='0 0 500 666'>
        <rect width='100%' height='100%' fill='#f3f4f6'/>
        <text x='50%' y='50%' text-anchor='middle' dominant-baseline='middle'
          font-family='system-ui,Segoe UI,Roboto,Ubuntu,Helvetica,Arial' font-size='22' fill='#9ca3af'>${noImageText}</text>
      </svg>`
    );

  if (!raw) return fallback;

  const p = raw.trim();
  if (p.startsWith("http")) return p;
  return p.startsWith("/") ? p : `/${p}`;
}

/* ========= Construção do "chip" azul a partir do nome ========= */
/** Remove a temporada (ex.: 06/07, 24/25, 2016/17, 2017) do fim */
const YEAR_TAIL_RE = /(?:\b(19|20)\d{2}(?:\/\d{2})?|\b\d{2}\/\d{2})\s*$/i;
/** Corta sufixos do tipo "Home|Away|Third|Fourth (Jersey|Shirt|Kit) ..." */
const VARIANT_KIT_TAIL_RE =
  /\b(?:home|away|third|fourth)\s+(?:jersey|shirt|kit)\b.*$/i;

/** Normaliza espaços e remove duplos */
function cleanSpaces(s: string) {
  return s.replace(/\s{2,}/g, " ").trim();
}

/**
 * Regras:
 * 1) tira temporada no fim;
 * 2) se houver "Home/Away/Third/Fourth Jersey|Shirt|Kit" no fim, corta a partir daí;
 * 3) mantém descrições como "Retro", "Black/White Training Polo Set", etc.
 */
function labelFromName(name?: string | null): string | null {
  if (!name) return null;
  let s = name.trim();

  s = s.replace(YEAR_TAIL_RE, "").trim();
  s = s.replace(VARIANT_KIT_TAIL_RE, "").trim();

  if (!s) s = name.replace(YEAR_TAIL_RE, "").trim();

  return cleanSpaces(s) || null;
}

/* ============================ Matching rules ============================ */
function normKey(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * ✅ OVERRIDES (match exato com o que está na BD)
 * Aqui definimos exatamente quais valores do campo `team`
 * são permitidos para um dado slug.
 */
const TEAM_QUERY_OVERRIDES: Record<string, string[]> = {
  "milan": ["Milan"],
  "ac-milan": ["Milan"],
  "inter-milan": ["Inter Milan"],

  "ajax": ["Ajax"],
  "braga": ["Braga"],
  "lyon": ["Lyon"],
  "porto": ["Porto"],
  "psg": ["PSG"],
  "psv": ["PSV"],
  "roma": ["Roma"],
  "sporting": ["Sporting"],

  "as-roma": ["Roma"],
  "psv-eindhoven": ["PSV"],
  "paris-saint-germain": ["PSG"],
  "olympique-lyonnais": ["Lyon"],
  "afc-ajax": ["Ajax"],
};

/**
 * contains só quando for "seguro" (não ambíguo).
 * Nota: para slugs com override, NUNCA usamos contains.
 */
const CONTAINS_BLOCKLIST = new Set(
  [
    "milan",
    "inter",
    "city",
    "united",
    "athletic",
    "sporting",
    "real",
    "fc",
    "sc",
    "ac",
    "cf",
    "cd",
    "bc",
    "sv",
    "st",
    "saint",
    "borussia",
    "dynamo",
    "dinamo",
    "lokomotiv",
    "loko",
    "racing",
    "atletico",
    "atlético",
  ].map((s) => s.toLowerCase())
);

function shouldUseContains(term: string) {
  const t = normKey(term);
  if (!t) return false;
  if (t.length < 6) return false;
  if (!t.includes(" ") && CONTAINS_BLOCKLIST.has(t)) return false;
  return true;
}

/* ============================ Page ============================ */
export default async function TeamProductsPage({
  params,
  searchParams,
}: PageProps) {
  const { locale, team } = await params;
  const t = await getTranslations({
    locale,
    namespace: "TeamProductsPage",
  });

  const rawParam = decodeURIComponent(team || "").trim();

  // normaliza para slug (se já for slug, fica igual)
  const slug = slugFromTeamName(rawParam);

  // resolve um nome canónico a partir do slug (para UI)
  const canonicalName =
    teamNameFromSlug(slug) || TEAM_MAP_FALLBACK[slug] || fallbackTitle(slug);

  const teamTitle = canonicalName;

  const sp = (await searchParams) ?? {};
  const requestedPage = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  /* ----------------------- WHERE seguro ----------------------- */
  const override = TEAM_QUERY_OVERRIDES[slug];

  let where: Prisma.ProductWhereInput;

  if (override && override.length) {
    where = { team: { in: override } };
  } else {
    const namesForQuery = Array.from(
      new Set(
        [
          canonicalName,
          rawParam,
          slug,
          ...teamNamesForQuery(canonicalName),
          ...teamNamesForQuery(rawParam),
        ]
          .map((s) => String(s || "").trim())
          .filter(Boolean)
      )
    );

    const exactNames = Array.from(
      new Set(
        namesForQuery
          .map((s) => s.trim())
          .filter(Boolean)
          .filter(
            (s) => normKey(s).length >= 3 && !CONTAINS_BLOCKLIST.has(normKey(s))
          )
      )
    );

    const or: Prisma.ProductWhereInput[] = [];

    if (exactNames.length) {
      or.push({ team: { in: exactNames } });
    } else {
      or.push({ team: { equals: canonicalName } });
    }

    for (const nm of namesForQuery) {
      const clean = (nm || "").trim();
      if (!clean) continue;
      if (!shouldUseContains(clean)) continue;
      or.push({ team: { contains: clean, mode: "insensitive" } });
    }

    where = { OR: or };
  }

  const totalCount = await prisma.product.count({ where });
  if (!totalCount) notFound();

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, requestedPage), totalPages);
  const skip = (currentPage - 1) * PAGE_SIZE;

  const products = await prisma.product.findMany({
    where,
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      imageUrls: true,
      basePrice: true,
      team: true,
    },
    take: PAGE_SIZE,
    skip,
  });

  return (
    <List
      locale={locale}
      team={teamTitle}
      items={products}
      totalPages={totalPages}
      currentPage={currentPage}
      teamSlug={slug}
      labels={{
        backToClubs: t("backToClubs"),
        viewProduct: t("viewProduct"),
        pagination: t("pagination"),
        firstPage: t("firstPage"),
        lastPage: t("lastPage"),
        page: t("page"),
        noImage: t("noImage"),
      }}
    />
  );
}

/**
 * Só para UI: caso teamNameFromSlug não tenha o slug ainda,
 * isto garante um fallback bonito.
 * (Não é usado na query.)
 */
const TEAM_MAP_FALLBACK: Record<string, string> = {
  "real-madrid": "Real Madrid",
  "barcelona": "FC Barcelona",
  "atletico-madrid": "Atlético de Madrid",
  "real-betis": "Real Betis",
  "sevilla": "Sevilla FC",
  "real-sociedad": "Real Sociedad",
  "villarreal": "Villarreal",

  "benfica": "SL Benfica",
  "porto": "FC Porto",
  "sporting": "Sporting CP",
  "braga": "SC Braga",

  "vitoria-sc": "Vitória de Guimarães",

  "inter-milan": "Inter Milan",
  "milan": "AC Milan",
  "ac-milan": "AC Milan",

  "ajax": "Ajax",
  "lyon": "Lyon",
  "psg": "PSG",
  "psv": "PSV",
  "roma": "Roma",
};

/* ============================ UI ============================ */
function List({
  locale,
  team,
  items,
  totalPages,
  currentPage,
  teamSlug,
  labels,
}: {
  locale: string;
  team: string;
  items: {
    slug: string;
    name: string;
    imageUrls?: unknown;
    basePrice: number;
    team?: string | null;
  }[];
  totalPages: number;
  currentPage: number;
  teamSlug: string;
  labels: {
    backToClubs: string;
    viewProduct: string;
    pagination: string;
    firstPage: string;
    lastPage: string;
    page: string;
    noImage: string;
  };
}) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Fundo */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-sky-200/30 blur-3xl" />
        <div className="absolute top-32 -right-20 h-64 w-64 rounded-full bg-indigo-200/30 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-white/60 to-sky-50" />
      </div>

      <div className="container-fw py-8 sm:py-10">
        {/* Back */}
        <div className="mb-6">
          <Link
            href={`/${locale}/clubs`}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700"
          >
            <span aria-hidden="true">←</span>
            {labels.backToClubs}
          </Link>
        </div>

        {/* Grid de produtos */}
        <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => {
            const src = coverUrl(firstImageFrom(p.imageUrls), labels.noImage);
            const euros = Math.floor(p.basePrice / 100).toString();
            const dec = (p.basePrice % 100).toString().padStart(2, "0");
            const compare = getCompareAt(p.basePrice);

            const preferredLabel =
              (typeof p.team === "string" && p.team.trim()) ||
              labelFromName(p.name) ||
              team;

            const chipText = preferredLabel.toUpperCase();

            return (
              <Link
                key={p.slug}
                href={`/${locale}/products/${p.slug}`}
                className="group relative block overflow-hidden rounded-3xl bg-white/90 backdrop-blur-sm ring-1 ring-slate-200 shadow-sm transition duration-300 hover:shadow-xl hover:ring-sky-200"
              >
                {compare && (
                  <div className="absolute left-3 top-3 z-10 rounded-full bg-red-600 px-2.5 py-1 text-xs font-extrabold text-white shadow-md ring-1 ring-red-700/40">
                    -{compare.pct}%
                  </div>
                )}

                <div className="flex h-full flex-col">
                  <div className="relative aspect-[4/5] bg-gradient-to-b from-slate-50 to-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={p.name}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-contain p-4 sm:p-6 transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>

                  <div className="flex grow flex-col p-4 sm:p-5">
                    <div className="text-[11px] font-semibold/relaxed uppercase tracking-wide text-sky-600">
                      {chipText}
                    </div>

                    <div className="mt-1 line-clamp-2 text-[13px] font-semibold leading-tight text-slate-900 sm:text-base">
                      {p.name}
                    </div>

                    {/* Preço */}
                    <div className="mt-3 flex items-baseline gap-2 sm:mt-4">
                      {compare && (
                        <div className="text-[12px] text-slate-500 line-through sm:text-[13px]">
                          {moneyAfterEUR(compare.compareAt, locale)}
                        </div>
                      )}

                      <div className="flex items-end text-[#1c40b7]">
                        <span className="text-[20px] font-semibold leading-none tracking-tight sm:text-2xl">
                          {euros}
                        </span>
                        <span className="translate-y-[1px] text-[12px] font-medium sm:text-[13px]">
                          ,{dec}
                        </span>
                        <span className="ml-1 translate-y-[1px] text-[13px] font-medium sm:text-[15px]">
                          €
                        </span>
                      </div>
                    </div>

                    <div className="mt-auto">
                      <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                      <div className="flex h-11 items-center gap-2 text-[13px] font-medium text-slate-700 sm:h-12 sm:text-sm">
                        <span className="transition group-hover:translate-x-0.5">
                          {labels.viewProduct}
                        </span>
                        <svg
                          className="h-4 w-4 opacity-70 transition group-hover:translate-x-0.5 group-hover:opacity-100"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <nav
            className="mt-14 flex justify-center"
            role="navigation"
            aria-label={labels.pagination}
          >
            <ul className="flex items-center gap-3">
              <li>
                <PaginationPill
                  href={
                    currentPage > 1
                      ? `/${locale}/products/team/${teamSlug}?page=1`
                      : undefined
                  }
                  label={labels.firstPage}
                >
                  &laquo;
                </PaginationPill>
              </li>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <li key={n}>
                  <PaginationPill
                    href={
                      n === currentPage
                        ? undefined
                        : `/${locale}/products/team/${teamSlug}?page=${n}`
                    }
                    active={n === currentPage}
                    label={`${labels.page} ${n}`}
                  >
                    {n}
                  </PaginationPill>
                </li>
              ))}

              <li>
                <PaginationPill
                  href={
                    currentPage < totalPages
                      ? `/${locale}/products/team/${teamSlug}?page=${totalPages}`
                      : undefined
                  }
                  label={labels.lastPage}
                >
                  &raquo;
                </PaginationPill>
              </li>
            </ul>
          </nav>
        )}
      </div>
    </div>
  );
}

/* ============================ Pagination Pill ============================ */
function PaginationPill({
  href,
  active = false,
  children,
  label,
}: {
  href?: string;
  active?: boolean;
  children: ReactNode;
  label: string;
}) {
  const base =
    "h-11 min-w-11 px-4 inline-flex items-center justify-center rounded-2xl border shadow-sm transition";
  const activeCls = "border-sky-600 bg-sky-600 text-white shadow-md";
  const idleCls =
    "border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:text-sky-700";
  const disabledCls =
    "border-slate-200 bg-white text-slate-300 pointer-events-none";

  if (!href) {
    return (
      <span
        aria-label={label}
        aria-disabled="true"
        className={`${base} ${active ? activeCls : disabledCls}`}
      >
        {children}
      </span>
    );
  }

  if (active) {
    return (
      <span
        aria-current="page"
        aria-label={label}
        className={`${base} ${activeCls}`}
      >
        {children}
      </span>
    );
  }

  return (
    <Link href={href} aria-label={label} className={`${base} ${idleCls}`}>
      {children}
    </Link>
  );
}