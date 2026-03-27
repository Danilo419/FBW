// src/app/[locale]/products/fifa-world-cup-2026-jerseys/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/* ============================================================
   Tipos (iguais ao ResultsClient / outras páginas)
============================================================ */
type UIProduct = {
  id: string | number;
  name: string;
  slug?: string;
  img?: string;
  price?: number; // EUR (ex.: 34.99)
  team?: string | null;
};

const FALLBACK_IMG = "/images/players/RealMadrid/RealMadrid12.png";

/* ============================================================
   Preços / Promo (copiado do search)
============================================================ */

const SALE_MAP_EUR: Record<number, number> = {
  24.99: 100,
  29.99: 120,
  34.99: 140,
  39.99: 160,
  49.99: 200,
  59.99: 240,
};

function toCents(eur?: number | null) {
  if (typeof eur !== "number" || Number.isNaN(eur)) return null;
  return Math.round(eur * 100);
}

function getSale(priceEur?: number | null) {
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
  const n = (cents / 100).toLocaleString(locale === "pt" ? "pt-PT" : "en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${n} €`;
}

function pricePartsFromCents(cents: number, locale: string) {
  const value = cents / 100;
  const formatted = value.toLocaleString(locale === "pt" ? "pt-PT" : "en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const [int, dec = "00"] = formatted.split(/[.,]/);
  return { int, dec, sym: "€" };
}

/* ============================================================
   CLUB LABEL (FIX: nunca "Team", nunca "Chelsea Shadow", etc.)
============================================================ */

const CLUB_PATTERNS: Array<[RegExp, string]> = [
  [/\breal\s*madrid\b/i, "Real Madrid"],
  [/\b(fc\s*)?barcelona|barça\b/i, "FC Barcelona"],
  [/\batl[eé]tico\s*(de\s*)?madrid\b/i, "Atlético de Madrid"],
  [/\b(real\s*)?betis\b/i, "Real Betis"],
  [/\bsevilla\b/i, "Sevilla FC"],
  [/\breal\s*sociedad\b/i, "Real Sociedad"],
  [/\bvillarreal\b/i, "Villarreal"],

  [/\bsl?\s*benfica|benfica\b/i, "SL Benfica"],
  [/\bfc\s*porto|porto\b/i, "FC Porto"],
  [/\bsporting(?!.*gij[oó]n)\b|\bsporting\s*cp\b/i, "Sporting CP"],
  [/\bsc\s*braga|braga\b/i, "SC Braga"],
  [/\bv[itó|ito]ria\s*(sc)?\b/i, "Vitória SC"],
];

function normalizeStr(s?: string | null) {
  return (s ?? "").replace(/\s{2,}/g, " ").trim();
}

const COLOR_WORDS = new Set(
  [
    "RED",
    "BLACK",
    "WHITE",
    "BLUE",
    "NAVY",
    "SKY",
    "SKYBLUE",
    "SKY-BLUE",
    "LIGHT",
    "DARK",
    "GREEN",
    "YELLOW",
    "PINK",
    "PURPLE",
    "ORANGE",
    "GREY",
    "GRAY",
    "GOLD",
    "SILVER",
    "BEIGE",
    "BROWN",
    "MAROON",
    "BURGUNDY",
    "CREAM",
    "TEAL",
    "LIME",
    "AQUA",
    "CYAN",
  ].map((x) => x.toUpperCase())
);

const VARIANT_WORDS = new Set(
  [
    "PRIMARY",
    "HOME",
    "AWAY",
    "THIRD",
    "FOURTH",
    "1ST",
    "2ND",
    "3RD",
    "4TH",
    "FIRST",
    "SECOND",

    "CLUB",
    "TEAM",
    "MEN",
    "WOMEN",
    "KID",
    "KIDS",
    "YOUTH",

    "GOALKEEPER",
    "GK",
    "JERSEY",
    "KIT",
    "TRAINING",
    "TRACKSUIT",
    "SET",
    "SUIT",
    "PRE-MATCH",
    "PREMATCH",
    "WARM-UP",
    "WARMUP",
    "CUP",
    "EDITION",
    "SPECIAL",
    "LIMITED",
    "CONCEPT",
  ].map((x) => x.toUpperCase())
);

const DESCRIPTOR_WORDS = new Set(
  [
    "TRICOLOR",
    "TRI-COLOR",
    "TRICOLOUR",
    "TRI-COLOUR",
    "BICOLOR",
    "BI-COLOR",
    "BICOLOUR",
    "BI-COLOUR",
    "MULTICOLOR",
    "MULTI-COLOR",
    "MULTICOLOUR",
    "MULTI-COLOUR",
    "COLORWAY",
    "COLOURWAY",

    "SHADOW",
    "SAMURAI",
    "DRAGON",
    "LION",
    "PHANTOM",
    "STEALTH",
    "NINJA",
    "WARRIOR",
    "LEGEND",
    "ELITE",
    "PREMIUM",
  ].map((x) => x.toUpperCase())
);

const MULTIWORD_STARTERS = new Set(
  [
    "REAL",
    "ATLÉTICO",
    "ATLETICO",
    "MANCHESTER",
    "PARIS",
    "BORUSSIA",
    "BAYER",
    "BAYERN",
    "INTER",
    "AC",
    "AS",
    "SL",
    "FC",
    "SC",
    "CD",
    "UD",
    "RB",
    "SPORTING",
    "NEW",
    "SOUTH",
    "NORTH",
    "COSTA",
    "SAUDI",
    "LOS",
    "LAS",
    "LA",
    "DE",
    "DEL",
    "AL",
  ].map((x) => x.toUpperCase())
);

function clubFromString(input?: string | null): string | null {
  const s = normalizeStr(input);
  if (!s) return null;

  for (const [re, club] of CLUB_PATTERNS) {
    if (re.test(s)) return club;
  }
  return null;
}

function cleanTeamValue(v?: string | null): string {
  let s = normalizeStr(v);
  if (!s) return "";

  s = s.replace(/[|]+/g, " ").replace(/\s{2,}/g, " ").trim();
  if (!s) return "";

  const up = s.toUpperCase();
  if (up === "CLUB" || up === "TEAM") return "";

  const amp = s.split(/\s*&\s*/);
  if (amp.length > 1) s = normalizeStr(amp[0]);

  const tokens = s.split(/\s+/);
  let out = tokens.slice();

  while (out.length > 1) {
    const lastRaw = out[out.length - 1];
    const last = lastRaw.toUpperCase().replace(/[^A-Z-À-ÖØ-Ý]/g, "");
    const last2 = last.replace(/-/g, "");

    if (VARIANT_WORDS.has(last) || VARIANT_WORDS.has(last2)) {
      out.pop();
      continue;
    }
    if (COLOR_WORDS.has(last) || COLOR_WORDS.has(last2)) {
      out.pop();
      continue;
    }
    if (DESCRIPTOR_WORDS.has(last) || DESCRIPTOR_WORDS.has(last2)) {
      out.pop();
      continue;
    }
    break;
  }

  let joined = normalizeStr(out.join(" "));
  joined = joined.replace(
    /\s+(TRI-?COL(OU)?R|BI-?COL(OU)?R|MULTI-?COL(OU)?R)\b/gi,
    ""
  );
  return normalizeStr(joined);
}

function hardClampClubName(label: string): string {
  const s = normalizeStr(label);
  if (!s) return "";

  const byPattern = clubFromString(s);
  if (byPattern) return byPattern;

  const parts = s.split(/\s+/);
  if (parts.length <= 1) return s;

  const firstUp = parts[0].toUpperCase().replace(/[^A-ZÀ-ÖØ-Ý]/g, "");
  if (MULTIWORD_STARTERS.has(firstUp)) return s;

  const secondUp = (parts[1] ?? "")
    .toUpperCase()
    .replace(/[^A-ZÀ-ÖØ-Ý-]/g, "");
  const secondUp2 = secondUp.replace(/-/g, "");
  if (DESCRIPTOR_WORDS.has(secondUp) || DESCRIPTOR_WORDS.has(secondUp2)) {
    return parts[0];
  }

  return parts[0];
}

function inferClubFromName(name?: string | null): string {
  const s = normalizeStr(name);
  if (!s) return "";

  const cut = s.split(
    /\s+(Home|Away|Third|Fourth|Primary|Goalkeeper|GK|Kids|Kid|Women|Woman|Jersey|Kit|Tracksuit|Training|Pre-Match|Prematch|Warm-Up|Warmup|Retro|Concept|World\s*Cup)\b/i
  )[0];

  const cleaned = normalizeStr(
    cut.replace(
      /\b(20\d{2}\/\d{2}|25\/26|24\/25|23\/24|22\/23|2026|2025|2024|2023)\b/gi,
      ""
    )
  );

  return hardClampClubName(cleanTeamValue(cleaned));
}

function getClubLabel(p: UIProduct): string {
  const teamClean = cleanTeamValue(p.team);
  if (teamClean) return hardClampClubName(teamClean);

  const byNamePattern = clubFromString(p.name);
  if (byNamePattern) return byNamePattern;

  const inferred = inferClubFromName(p.name);
  if (inferred) return inferred;

  return "";
}

/* ============================================================
   Filtro: FIFA World Cup 2026 Jerseys
============================================================ */

function normName(p: UIProduct) {
  return (p.name ?? "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function hasAllTerms(p: UIProduct, terms: string[]): boolean {
  const n = normName(p);
  if (!n) return false;
  return terms.every((t) => n.includes(t.toUpperCase()));
}

function isWorldCup2026(p: UIProduct): boolean {
  if (!p?.name) return false;

  if (!hasAllTerms(p, ["WORLD CUP", "2026"])) return false;

  const n = normName(p);

  if (n.includes("SCARF")) return false;
  if (n.includes("BALL")) return false;
  if (n.includes("POSTER")) return false;
  if (n.includes("BABY")) return false;
  if (n.includes("INFANT")) return false;

  return true;
}

/* ============================================================
   Card de produto
============================================================ */

function ProductCard({
  p,
  locale,
  t,
}: {
  p: UIProduct;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const cents = typeof p.price === "number" ? toCents(p.price)! : null;
  const sale = cents != null ? getSale(p.price!) : null;
  const parts = cents != null ? pricePartsFromCents(cents, locale) : null;
  const teamLabel = getClubLabel(p);

  const cardInner = (
    <>
      {sale && (
        <div className="absolute left-3 top-3 z-10 rounded-full bg-red-600 px-2.5 py-1 text-xs font-extrabold text-white shadow-md ring-1 ring-red-700/40">
          -{sale.pct}%
        </div>
      )}

      <div className="flex h-full flex-col">
        <div className="relative aspect-[4/5] bg-gradient-to-b from-slate-50 to-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={p.name}
            src={p.img || FALLBACK_IMG}
            loading="lazy"
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement & {
                _fallbackApplied?: boolean;
              };
              if (img._fallbackApplied) return;
              img._fallbackApplied = true;
              img.src = FALLBACK_IMG;
            }}
            className="absolute inset-0 h-full w-full object-contain p-3 transition-transform duration-300 group-hover:scale-105 sm:p-6"
          />
        </div>

        <div className="flex grow flex-col p-4 sm:p-5">
          {teamLabel && (
            <div className="text-[10px] font-semibold/relaxed uppercase tracking-wide text-sky-600 sm:text-[11px]">
              {teamLabel}
            </div>
          )}

          <div className="mt-1 line-clamp-2 text-xs font-semibold leading-tight text-slate-900 sm:text-sm">
            {p.name}
          </div>

          <div className="mt-3 sm:mt-4">
            <div className="flex items-end gap-2">
              {sale && (
                <div className="text-[11px] text-slate-500 line-through sm:text-[13px]">
                  {moneyAfter(sale.compareAtCents, locale)}
                </div>
              )}

              {parts && (
                <div className="flex items-end" style={{ color: "#1c40b7" }}>
                  <span className="text-xl font-semibold leading-none tracking-tight sm:text-2xl">
                    {parts.int}
                  </span>
                  <span className="translate-y-[1px] text-[11px] font-medium sm:text-[13px]">
                    ,{parts.dec}
                  </span>
                  <span className="ml-1 translate-y-[1px] text-[13px] font-medium sm:text-[15px]">
                    {parts.sym}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-auto">
            <div className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent sm:mt-4" />
            <div className="flex h-10 items-center gap-2 text-[11px] font-medium text-slate-700 sm:h-12 sm:text-sm">
              <span className="transition group-hover:translate-x-0.5">
                {t("viewProduct")}
              </span>
              <svg
                className="h-3.5 w-3.5 opacity-70 transition group-hover:translate-x-0.5 group-hover:opacity-100 sm:h-4 sm:w-4"
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
    </>
  );

  const baseClass =
    "group relative block overflow-hidden rounded-3xl bg-white/90 backdrop-blur-sm ring-1 ring-slate-200 shadow-sm transition duration-300 hover:shadow-xl hover:ring-sky-200";

  if (!p.slug) {
    return <div className={baseClass}>{cardInner}</div>;
  }

  return (
    <Link href={`/products/${p.slug}`} className={baseClass}>
      {cardInner}
    </Link>
  );
}

/* ============================================================
   Helper de paginação com "..."
============================================================ */

function buildPaginationRange(
  current: number,
  total: number
): (number | "dots")[] {
  const pages: (number | "dots")[] = [];

  if (total <= 5) {
    for (let i = 1; i <= total; i++) pages.push(i);
    return pages;
  }

  const first = 1;
  const last = total;
  const left = Math.max(current - 1, 2);
  const right = Math.min(current + 1, total - 1);

  pages.push(first);
  if (left > 2) pages.push("dots");
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < total - 1) pages.push("dots");
  pages.push(last);

  return pages;
}

/* ============================================================
   Página FIFA World Cup 2026 Jerseys
============================================================ */

export default function FifaWorldCup2026JerseysPage() {
  const locale = useLocale();
  const t = useTranslations("fifaWorldCup2026Page");

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<UIProduct[]>([]);
  const [error, setError] = useState<string | null>(null);

  const PAGE_SIZE = 12;
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [sort, setSort] = useState<
    "team" | "price-asc" | "price-desc" | "random"
  >("team");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/search?q=world%20cup%202026`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(t("searchFailedWithStatus", { status: r.status }));
        const json = await r.json();
        const arr: UIProduct[] = Array.isArray(json?.products)
          ? json.products
          : [];
        if (!cancelled) {
          setResults(arr);
          setPage(1);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setResults([]);
          setError(e?.message || t("searchError"));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [t]);

  const wc2026Filtered = useMemo(() => {
    let base = results.filter(isWorldCup2026);

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toUpperCase();
      base = base.filter((p) => {
        const name = (p.name ?? "").toUpperCase();
        const team = (p.team ?? "").toUpperCase();
        return name.includes(q) || team.includes(q);
      });
    }

    if (sort === "random") {
      const copy = base.slice();
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    }

    if (sort === "price-asc" || sort === "price-desc") {
      const copy = base.slice();
      copy.sort((a, b) => {
        const pa =
          typeof a.price === "number" ? a.price : Number.POSITIVE_INFINITY;
        const pb =
          typeof b.price === "number" ? b.price : Number.POSITIVE_INFINITY;
        return sort === "price-asc" ? pa - pb : pb - pa;
      });
      return copy;
    }

    const copy = base.slice();
    copy.sort((a, b) => {
      const ta = getClubLabel(a).toUpperCase();
      const tb = getClubLabel(b).toUpperCase();
      if (ta === tb) return (a.name ?? "").localeCompare(b.name ?? "");
      return ta.localeCompare(tb);
    });
    return copy;
  }, [results, searchTerm, sort]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(wc2026Filtered.length / PAGE_SIZE)),
    [wc2026Filtered.length]
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return wc2026Filtered.slice(start, end);
  }, [wc2026Filtered, page]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [page]);

  return (
    <div className="min-h-screen bg-white">
      <section className="border-b bg-gradient-to-b from-slate-50 via-white to-slate-50">
        <div className="container-fw py-8 sm:py-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-700 sm:text-[11px]">
                {t("eyebrow")}
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
                {t("title")}
              </h1>
              <p className="mt-2 max-w-xl text-xs text-gray-600 sm:text-sm md:text-base">
                {t("subtitle")}
              </p>
            </div>

            <div className="mt-2 flex flex-wrap justify-start gap-2 sm:mt-0 sm:justify-end sm:gap-3">
              <Link href="/" className="btn-outline text-xs sm:text-sm">
                ← {t("backToHome")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container-fw section-gap">
        <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-[11px] text-gray-500 sm:text-sm">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            {loading ? (
              <span>{t("loading")}</span>
            ) : (
              <span>{t("foundCount", { count: wc2026Filtered.length })}</span>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                placeholder={t("searchPlaceholder")}
                className="w-full rounded-2xl border px-9 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div className="flex items-center gap-2 text-[11px] sm:text-sm">
              <span className="text-gray-500">{t("sortBy")}</span>
              <select
                value={sort}
                onChange={(e) => {
                  setSort(
                    e.target.value as
                      | "team"
                      | "price-asc"
                      | "price-desc"
                      | "random"
                  );
                  setPage(1);
                }}
                className="rounded-2xl border bg-white px-3 py-2 text-[11px] outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
              >
                <option value="team">{t("sortOptions.team")}</option>
                <option value="price-asc">{t("sortOptions.priceAsc")}</option>
                <option value="price-desc">{t("sortOptions.priceDesc")}</option>
                <option value="random">{t("sortOptions.random")}</option>
              </select>
            </div>
          </div>
        </div>

        {loading && (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 lg:gap-8">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse overflow-hidden rounded-3xl bg-white/90 shadow-sm ring-1 ring-slate-200 backdrop-blur-sm"
              >
                <div className="aspect-[4/5] bg-slate-100" />
                <div className="p-4 sm:p-5">
                  <div className="mb-2 h-3 w-24 rounded bg-slate-200" />
                  <div className="mb-4 h-4 w-3/4 rounded bg-slate-200" />
                  <div className="h-3 w-20 rounded bg-slate-200" />
                  <div className="mt-4 h-px bg-slate-200/70 sm:mt-6" />
                  <div className="h-10 sm:h-12" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && <p className="text-red-600">{error}</p>}

        {!loading && !error && (
          <>
            <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 lg:gap-8">
              {pageItems.length === 0 && (
                <p className="col-span-full text-sm text-gray-500">
                  {t("empty")}
                </p>
              )}

              {pageItems.map((p) => (
                <ProductCard key={String(p.id)} p={p} locale={locale} t={t} />
              ))}
            </div>

            {pageItems.length > 0 && totalPages > 1 && (
              <nav className="mt-8 flex select-none items-center justify-center gap-1.5 sm:mt-10 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="rounded-xl bg-white/80 px-2.5 py-1.5 text-xs ring-1 ring-slate-200 transition hover:shadow-sm hover:ring-sky-200 disabled:opacity-40 sm:px-3 sm:py-2 sm:text-sm"
                  aria-label={t("previousPage")}
                >
                  «
                </button>

                {buildPaginationRange(page, totalPages).map((item, idx) => {
                  if (item === "dots") {
                    return (
                      <span
                        key={`dots-${idx}`}
                        className="px-2.5 py-1.5 text-xs text-slate-500 sm:px-3 sm:py-2 sm:text-sm"
                      >
                        ...
                      </span>
                    );
                  }

                  const n = item;
                  const active = n === page;

                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPage(n)}
                      className={[
                        "min-w-[32px] rounded-xl px-2.5 py-1.5 text-xs ring-1 transition sm:min-w-[40px] sm:px-3 sm:py-2 sm:text-sm",
                        active
                          ? "bg-sky-600 text-white shadow-sm ring-sky-600"
                          : "bg-white/80 text-slate-800 ring-slate-200 hover:shadow-sm hover:ring-sky-200",
                      ].join(" ")}
                      aria-current={active ? "page" : undefined}
                    >
                      {n}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page === totalPages}
                  className="rounded-xl bg-white/80 px-2.5 py-1.5 text-xs ring-1 ring-slate-200 transition hover:shadow-sm hover:ring-sky-200 disabled:opacity-40 sm:px-3 sm:py-2 sm:text-sm"
                  aria-label={t("nextPage")}
                >
                  »
                </button>
              </nav>
            )}
          </>
        )}
      </section>
    </div>
  );
}