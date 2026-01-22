"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";

/* ============================================================
   Tipos (iguais ao ResultsClient / outras páginas)
============================================================ */
type UIProduct = {
  id: string | number;
  name: string;
  slug?: string;
  img?: string | null;
  price?: number; // EUR (ex.: 34.99)
  team?: string | null;
};

const FALLBACK_IMG = "/images/players/RealMadrid/RealMadrid12.png";

/* ============================================================
   Preços / Promo (copiado do search)
============================================================ */

const SALE_MAP_EUR: Record<number, number> = {
  29.99: 70,
  34.99: 100,
  39.99: 120,
  44.99: 150,
  49.99: 165,
  59.99: 200,
  69.99: 230,
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

function moneyAfter(cents: number) {
  const n = (cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${n} €`;
}

function pricePartsFromCents(cents: number) {
  const euros = Math.floor(cents / 100).toString();
  const dec = (cents % 100).toString().padStart(2, "0");
  return { int: euros, dec, sym: "€" };
}

/* ============================================================
   CLUB LABEL (igual ao search)
============================================================ */

const CLUB_PATTERNS: Array<[RegExp, string]> = [
  [/\b(real\s*madrid|madrid)\b/i, "Real Madrid"],
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

function clubFromString(input?: string | null): string | null {
  const s = normalizeStr(input);
  if (!s) return null;

  for (const [re, club] of CLUB_PATTERNS) {
    if (re.test(s)) return club;
  }
  return null;
}

function getClubLabel(p: UIProduct): string {
  const byTeam = clubFromString(p.team);
  if (byTeam) return byTeam;

  const byName = clubFromString(p.name);
  if (byName) return byName;

  return "Club";
}

/* ============================================================
   Filtro: Pre-match jerseys / warm-up tops
============================================================ */

function normName(p: UIProduct) {
  return (p.name ?? "").toUpperCase();
}

function isPreMatchJersey(p: UIProduct): boolean {
  const n = normName(p);
  if (!n) return false;

  const isPreMatch =
    n.includes("PRE-MATCH") ||
    n.includes("PRE MATCH") ||
    n.includes("PREMATCH") ||
    n.includes("WARM-UP") ||
    n.includes("WARM UP") ||
    n.includes("WARMUP");

  if (!isPreMatch) return false;

  if (n.includes("SHORTS")) return false;
  if (n.includes("TRACKSUIT")) return false;
  if (n.includes("CROP TOP")) return false;
  if (n.includes("SCARF")) return false;
  if (n.includes("BALL")) return false;
  if (n.includes("POSTER")) return false;

  if (n.includes("KIDS KIT")) return false;
  if (n.includes("BABY")) return false;
  if (n.includes("INFANT")) return false;

  if (n.includes("FULL KIT")) return false;
  if (n.includes("KIT SET")) return false;
  if (n.includes("JERSEY + SHORTS")) return false;
  if (n.includes("WITH SHORTS")) return false;

  if (n.includes(" KIT") && !(n.includes("JERSEY") || n.includes("TOP"))) {
    return false;
  }

  return true;
}

/* ============================================================
   Card de produto (mobile-first)
============================================================ */

function ProductCard({ p }: { p: UIProduct }) {
  const href = p.slug ? `/products/${p.slug}` : undefined;
  const cents = typeof p.price === "number" ? toCents(p.price)! : null;
  const sale = cents != null ? getSale(p.price!) : null;
  const parts = cents != null ? pricePartsFromCents(cents) : null;
  const teamLabel = getClubLabel(p);

  return (
    <a
      key={String(p.id)}
      href={href}
      className="group block h-full rounded-2xl bg-white/90 backdrop-blur-sm ring-1 ring-slate-200 shadow-sm hover:shadow-md hover:ring-sky-200 transition duration-200 overflow-hidden relative"
    >
      {sale && (
        <div className="absolute left-2.5 top-2.5 z-10 rounded-full bg-red-600 text-white px-2.5 py-1 text-[11px] font-extrabold shadow-md ring-1 ring-red-700/40">
          -{sale.pct}%
        </div>
      )}

      <div className="flex flex-col h-full">
        <div className="relative aspect-[4/5] bg-gradient-to-b from-slate-50 to-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={p.name}
            src={p.img || FALLBACK_IMG}
            loading="lazy"
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              if ((img as any)._fallbackApplied) return;
              (img as any)._fallbackApplied = true;
              img.src = FALLBACK_IMG;
            }}
            className="absolute inset-0 h-full w-full object-contain p-4 sm:p-5 transition-transform duration-300 group-hover:scale-105"
          />
        </div>

        <div className="p-3 sm:p-4 flex flex-col grow">
          <div className="text-[10px] sm:text-[11px] uppercase tracking-wide text-sky-600 font-semibold">
            {teamLabel}
          </div>

          <div className="mt-1 text-[13px] sm:text-[14px] font-semibold text-slate-900 leading-snug line-clamp-2">
            {p.name}
          </div>

          <div className="mt-3">
            <div className="flex items-end gap-2">
              {sale && (
                <div className="text-[11px] sm:text-[12px] text-slate-500 line-through">
                  {moneyAfter(sale.compareAtCents)}
                </div>
              )}

              {parts && (
                <div className="flex items-end" style={{ color: "#1c40b7" }}>
                  <span className="text-lg sm:text-xl font-semibold tracking-tight leading-none">
                    {parts.int}
                  </span>
                  <span className="text-[11px] sm:text-[12px] font-medium translate-y-[1px]">
                    ,{parts.dec}
                  </span>
                  <span className="text-[12px] sm:text-[13px] font-medium translate-y-[1px] ml-1">
                    {parts.sym}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-auto">
            <div className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
            <div className="h-9 sm:h-10 flex items-center gap-2 text-[11px] sm:text-[12px] font-medium text-slate-700">
              <span className="transition group-hover:translate-x-0.5">
                View product
              </span>
              <svg
                className="h-3 w-3 sm:h-3.5 sm:w-3.5 opacity-70 group-hover:opacity-100 transition group-hover:translate-x-0.5"
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
    </a>
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
   Página Pre-Match Jerseys
   - Agora busca via /api/pre-match-jerseys (catálogo completo)
============================================================ */

export default function PreMatchJerseysPage() {
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

    fetch(`/api/pre-match-jerseys`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Fetch failed (${r.status})`);
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
          setError(e?.message || "Fetch error");
        }
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, []);

  const jerseysFiltered = useMemo(() => {
    let base = results.filter(isPreMatchJersey);

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
    () => Math.max(1, Math.ceil(jerseysFiltered.length / PAGE_SIZE)),
    [jerseysFiltered.length]
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return jerseysFiltered.slice(start, end);
  }, [jerseysFiltered, page]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [page]);

  return (
    <div className="min-h-screen bg-white">
      {/* HEADER */}
      <section className="border-b bg-gradient-to-b from-slate-50 via-white to-slate-50">
        <div className="container-fw px-4 sm:px-6 py-5 sm:py-6">
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">
                Pre-Match Jerseys
              </p>
              <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight">
                Pre-match jerseys
              </h1>
              <p className="mt-2 max-w-xl text-xs sm:text-sm text-gray-600">
                Warm-up and pre-game tops — what players wear before kick-off.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 justify-start mt-1">
              <a href="/" className="btn-outline text-xs sm:text-sm">
                ← Back to Home Page
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CONTEÚDO */}
      <section className="container-fw px-4 sm:px-6 section-gap">
        <div className="mb-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-[11px] sm:text-xs text-gray-500">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            {loading ? (
              <span>Loading pre-match jerseys…</span>
            ) : (
              <span>{jerseysFiltered.length} pre-match jerseys found</span>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by team or jersey name"
                className="w-full rounded-2xl border px-9 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] sm:text-xs">
              <span className="text-gray-500">Sort by:</span>
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as any);
                  setPage(1);
                }}
                className="rounded-2xl border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="team">Team & name</option>
                <option value="price-asc">Price (low → high)</option>
                <option value="price-desc">Price (high → low)</option>
                <option value="random">Random</option>
              </select>
            </div>
          </div>
        </div>

        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl bg-white/90 backdrop-blur-sm ring-1 ring-slate-200 shadow-sm overflow-hidden animate-pulse"
              >
                <div className="aspect-[4/5] bg-slate-100" />
                <div className="p-3 sm:p-4">
                  <div className="h-3 w-20 bg-slate-200 rounded mb-2" />
                  <div className="h-4 w-3/4 bg-slate-200 rounded mb-4" />
                  <div className="h-3 w-16 bg-slate-200 rounded" />
                  <div className="mt-4 h-px bg-slate-200/70" />
                  <div className="h-8 sm:h-9" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && <p className="text-red-600 text-sm">{error}</p>}

        {!loading && !error && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {pageItems.length === 0 && (
                <p className="text-gray-500 col-span-full text-sm">
                  Nenhum pre-match jersey encontrado.
                </p>
              )}

              {pageItems.map((p) => (
                <ProductCard key={String(p.id)} p={p} />
              ))}
            </div>

            {pageItems.length > 0 && totalPages > 1 && (
              <nav className="mt-8 flex items-center justify-center gap-2 select-none">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-2.5 sm:px-3 py-2 rounded-xl ring-1 ring-slate-200 bg-white/80 disabled:opacity-40 hover:ring-sky-200 hover:shadow-sm transition text-xs sm:text-sm"
                  aria-label="Página anterior"
                >
                  «
                </button>

                {buildPaginationRange(page, totalPages).map((item, idx) => {
                  if (item === "dots") {
                    return (
                      <span
                        key={`dots-${idx}`}
                        className="px-2.5 sm:px-3 py-2 text-xs sm:text-sm text-slate-500"
                      >
                        ...
                      </span>
                    );
                  }

                  const n = item as number;
                  const active = n === page;

                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPage(n)}
                      className={[
                        "min-w-[32px] sm:min-w-[36px] px-2.5 sm:px-3 py-2 rounded-xl ring-1 text-xs sm:text-sm transition",
                        active
                          ? "bg-sky-600 text-white ring-sky-600 shadow-sm"
                          : "bg-white/80 text-slate-800 ring-slate-200 hover:ring-sky-200 hover:shadow-sm",
                      ].join(" ")}
                      aria-current={active ? "page" : undefined}
                    >
                      {n}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-2.5 sm:px-3 py-2 rounded-xl ring-1 ring-slate-200 bg-white/80 disabled:opacity-40 hover:ring-sky-200 hover:shadow-sm transition text-xs sm:text-sm"
                  aria-label="Próxima página"
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
