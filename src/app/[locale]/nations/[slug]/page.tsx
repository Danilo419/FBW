// src/app/nations/[slug]/page.tsx
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

/* ============================ Config ============================ */
export const revalidate = 60;

type PageProps = {
  params: Promise<{ slug: string }>;
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
function slugify(s?: string | null) {
  const base = (s ?? "").trim();
  return base
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function fallbackTitle(slug: string) {
  return slug
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function moneyAfterEUR(cents: number) {
  return (cents / 100).toLocaleString("pt-PT", {
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
      if (v && typeof (v as any).url === "string" && (v as any).url.trim())
        return (v as any).url.trim();
      if (v && typeof (v as any).src === "string" && (v as any).src.trim())
        return (v as any).src.trim();
    }
  }

  const any: any = value;
  if (typeof any?.url === "string" && any.url.trim()) return any.url.trim();
  if (typeof any?.src === "string" && any.src.trim()) return any.src.trim();
  return null;
}

function coverUrl(raw?: string | null): string {
  const fallback =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='500' height='666' viewBox='0 0 500 666'>
        <rect width='100%' height='100%' fill='#f3f4f6'/>
        <text x='50%' y='50%' text-anchor='middle' dominant-baseline='middle'
          font-family='system-ui,Segoe UI,Roboto,Ubuntu,Helvetica,Arial' font-size='22' fill='#9ca3af'>No image</text>
      </svg>`
    );
  if (!raw) return fallback;
  const p = raw.trim();
  if (p.startsWith("http")) return p;
  return p.startsWith("/") ? p : `/${p}`;
}

/* ========= Construção do "chip" azul a partir do nome ========= */
const YEAR_TAIL_RE = /(?:\b(19|20)\d{2}(?:\/\d{2})?|\b\d{2}\/\d{2})\s*$/i;
const VARIANT_KIT_TAIL_RE =
  /\b(?:home|away|third|fourth)\s+(?:jersey|shirt|kit)\b.*$/i;

function cleanSpaces(s: string) {
  return s.replace(/\s{2,}/g, " ").trim();
}

function labelFromName(name?: string | null): string | null {
  if (!name) return null;
  let s = name.trim();
  s = s.replace(YEAR_TAIL_RE, "").trim();
  s = s.replace(VARIANT_KIT_TAIL_RE, "").trim();
  if (!s) s = name.replace(YEAR_TAIL_RE, "").trim();
  return cleanSpaces(s) || null;
}

/* ============================ Page ============================ */
export default async function NationProductsPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const sp = (await searchParams) ?? {};
  const requestedPage = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  // descobrir o nome real da seleção a partir da BD (teamType NATION)
  const teams = await prisma.product.findMany({
    where: { teamType: "NATION" },
    select: { team: true },
    distinct: ["team"],
  });

  const matchedTeam = teams.find((t) => slugify(t.team) === slug)?.team ?? null;
  const teamName = matchedTeam ?? fallbackTitle(slug);

  const where: Prisma.ProductWhereInput = {
    teamType: "NATION",
    OR: [
      { team: { equals: teamName } },
      { team: { contains: teamName, mode: "insensitive" } },
      { team: { contains: slug, mode: "insensitive" } },
    ],
  };

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
      team={teamName}
      items={products}
      totalPages={totalPages}
      currentPage={currentPage}
      nationSlug={slug.toLowerCase()}
    />
  );
}

/* ============================ UI ============================ */
function List({
  team,
  items,
  totalPages,
  currentPage,
  nationSlug,
}: {
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
  nationSlug: string;
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
        {/* Back (igual estilo “pill”) */}
        <div className="mb-6">
          <Link
            href="/nations"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700"
          >
            <span aria-hidden="true">←</span>
            Back to Nations
          </Link>
        </div>

        {/* Grid de produtos (2 por linha no mobile) */}
        <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => {
            const src = coverUrl(firstImageFrom(p.imageUrls));
            const euros = Math.floor(p.basePrice / 100).toString();
            const dec = (p.basePrice % 100).toString().padStart(2, "0");
            const compare = getCompareAt(p.basePrice);

            const preferredLabel =
              (typeof p.team === "string" && p.team.trim()) ||
              labelFromName(p.name) ||
              team;

            const chipText = preferredLabel.toUpperCase();

            return (
              <a
                key={p.slug}
                href={`/products/${p.slug}`}
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

                    <div className="mt-1 line-clamp-2 text-[13px] sm:text-base font-semibold leading-tight text-slate-900">
                      {p.name}
                    </div>

                    {/* Preço */}
                    <div className="mt-3 sm:mt-4 flex items-baseline gap-2">
                      {compare && (
                        <div className="text-[12px] sm:text-[13px] text-slate-500 line-through">
                          {moneyAfterEUR(compare.compareAt)}
                        </div>
                      )}

                      <div className="flex items-end text-[#1c40b7]">
                        <span className="text-[20px] sm:text-2xl font-semibold tracking-tight leading-none">
                          {euros}
                        </span>
                        <span className="text-[12px] sm:text-[13px] font-medium translate-y-[1px]">
                          ,{dec}
                        </span>
                        <span className="text-[13px] sm:text-[15px] font-medium translate-y-[1px] ml-1">
                          €
                        </span>
                      </div>
                    </div>

                    <div className="mt-auto">
                      <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                      <div className="h-11 sm:h-12 flex items-center gap-2 text-[13px] sm:text-sm font-medium text-slate-700">
                        <span className="transition group-hover:translate-x-0.5">
                          View product
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
              </a>
            );
          })}
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <nav
            className="mt-14 flex justify-center"
            role="navigation"
            aria-label="Paginação de produtos"
          >
            <ul className="flex flex-wrap items-center justify-center gap-3">
              <li>
                <PaginationPill
                  href={
                    currentPage > 1 ? `/nations/${nationSlug}?page=1` : undefined
                  }
                  label="Primeira página"
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
                        : `/nations/${nationSlug}?page=${n}`
                    }
                    active={n === currentPage}
                    label={`Página ${n}`}
                  >
                    {n}
                  </PaginationPill>
                </li>
              ))}

              <li>
                <PaginationPill
                  href={
                    currentPage < totalPages
                      ? `/nations/${nationSlug}?page=${totalPages}`
                      : undefined
                  }
                  label="Última página"
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
  const disabledCls = "border-slate-200 bg-white text-slate-300 pointer-events-none";

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
      <span aria-current="page" aria-label={label} className={`${base} ${activeCls}`}>
        {children}
      </span>
    );
  }

  return (
    <a href={href} aria-label={label} className={`${base} ${idleCls}`}>
      {children}
    </a>
  );
}
