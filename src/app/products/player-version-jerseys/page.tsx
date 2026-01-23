// src/app/products/player-version-jerseys/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";

/* ============================================================
   Tipos (iguais ao ResultsClient / jerseys page)
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
   CLUB LABEL (FIX: sem "Chelsea Shadow", sem "Japan Samurai")
   + FIX CRÍTICO: "Madrid" NÃO pode mapear para "Real Madrid"
============================================================ */

const CLUB_PATTERNS: Array<[RegExp, string]> = [
  // Espanha
  [/\breal\s*madrid\b/i, "Real Madrid"],
  [/\b(fc\s*)?barcelona|barça\b/i, "FC Barcelona"],
  [/\batl[eé]tico\s*(de\s*)?madrid\b/i, "Atlético de Madrid"],
  [/\breal\s*betis\b/i, "Real Betis"],
  [/\bsevilla\b/i, "Sevilla FC"],
  [/\breal\s*sociedad\b/i, "Real Sociedad"],
  [/\bvillarreal\b/i, "Villarreal"],

  // Portugal
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

  // "X & Y" (cores) => fica só X
  const amp = s.split(/\s*&\s*/);
  if (amp.length > 1) s = normalizeStr(amp[0]);

  // remove trailing lixo (PRIMARY/cores/descritores)
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
    /\s+(Home|Away|Third|Fourth|Primary|Goalkeeper|GK|Kids|Kid|Women|Woman|Jersey|Kit|Tracksuit|Training|Pre-Match|Prematch|Warm-Up|Warmup|Retro|Concept)\b/i
  )[0];

  const cleaned = normalizeStr(
    cut.replace(
      /\b(20\d{2}\/\d{2}|25\/26|24\/25|23\/24|22\/23|2026|2025|2024|2023)\b/gi,
      ""
    )
  );

  return hardClampClubName(cleanTeamValue(cleaned));
}

/** ✅ Só o nome do clube (ou vazio). Nunca "Club" */
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
   Filtro: PLAYER VERSION, short-sleeve (exclui RETRO, etc.)
============================================================ */

function normName(p: UIProduct) {
  return (p.name ?? "").toUpperCase();
}

function isPlayerVersionShortSleeveJersey(p: UIProduct): boolean {
  const n = normName(p);
  if (!n) return false;

  // tem de ser player version
  if (!n.includes("PLAYER VERSION")) return false;

  // apenas manga curta
  if (n.includes("LONG SLEEVE")) return false;

  // excluir RETRO
  if (n.includes("RETRO")) return false;

  // excluir conjuntos / outros produtos
  if (n.includes("SET")) return false;
  if (n.includes("SHORTS")) return false;
  if (n.includes("TRACKSUIT")) return false;
  if (n.includes("CROP TOP")) return false;
  if (n.includes("KIDS KIT")) return false;
  if (n.includes("BABY")) return false;
  if (n.includes("INFANT")) return false;
  if (n.includes(" KIT")) return false; // kit completo

  return true;
}

/* ============================================================
   Card de produto (igual look & feel do search)
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
      className="group block rounded-3xl bg-white/90 backdrop-blur-sm ring-1 ring-slate-200 shadow-sm hover:shadow-xl hover:ring-sky-200 transition duration-300 overflow-hidden relative"
    >
      {sale && (
        <div className="absolute left-3 top-3 z-10 rounded-full bg-red-600 text-white px-2.5 py-1 text-xs font-extrabold shadow-md ring-1 ring-red-700/40">
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
            className="absolute inset-0 h-full w-full object-contain p-4 sm:p-6 transition-transform duration-300 group-hover:scale-105"
          />
        </div>

        <div className="p-4 sm:p-5 flex flex-col grow">
          {/* ✅ só mostra se existir (nunca "Club") */}
          {teamLabel && (
            <div className="text-[10px] sm:text-[11px] uppercase tracking-wide text-sky-600 font-semibold/relaxed">
              {teamLabel}
            </div>
          )}

          <div className="mt-1 text-[13px] sm:text-base font-semibold text-slate-900 leading-tight line-clamp-2">
            {p.name}
          </div>

          <div className="mt-3 sm:mt-4">
            <div className="flex items-end gap-2">
              {sale && (
                <div className="text-[11px] sm:text-[13px] text-slate-500 line-through">
                  {moneyAfter(sale.compareAtCents)}
                </div>
              )}

              {parts && (
                <div className="flex items-end" style={{ color: "#1c40b7" }}>
                  <span className="text-xl sm:text-2xl font-semibold tracking-tight leading-none">
                    {parts.int}
                  </span>
                  <span className="text-[12px] sm:text-[13px] font-medium translate-y-[1px]">
                    ,{parts.dec}
                  </span>
                  <span className="text-[13px] sm:text-[15px] font-medium translate-y-[1px] ml-1">
                    {parts.sym}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-auto">
            <div className="mt-3 sm:mt-4 h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
            <div className="h-10 sm:h-12 flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-700">
              <span className="transition group-hover:translate-x-0.5">
                View product
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
   Página Player Version Jerseys
============================================================ */

const DESKTOP_PAGE_SIZE = 12; // PC: 12 por página
const MOBILE_PAGE_SIZE = 2; // MOBILE: 2 por página

export default function PlayerVersionJerseysPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<UIProduct[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [sort, setSort] = useState<"team" | "price-asc" | "price-desc" | "random">(
    "team"
  );

  // detectar mobile vs desktop (sem mexer no PC)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateIsMobile = () => {
      setIsMobile(window.innerWidth < 640);
      setPage(1);
    };

    updateIsMobile();
    window.addEventListener("resize", updateIsMobile);
    return () => window.removeEventListener("resize", updateIsMobile);
  }, []);

  const pageSize = isMobile ? MOBILE_PAGE_SIZE : DESKTOP_PAGE_SIZE;

  // mesma API que a search, query "jersey"
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/search?q=jersey`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Search failed (${r.status})`);
        const json = await r.json();
        const arr: UIProduct[] = Array.isArray(json?.products) ? json.products : [];
        if (!cancelled) {
          setResults(arr);
          setPage(1);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setResults([]);
          setError(e?.message || "Search error");
        }
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, []);

  const jerseysFiltered = useMemo(() => {
    let base = results.filter(isPlayerVersionShortSleeveJersey);

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
    () => Math.max(1, Math.ceil(jerseysFiltered.length / pageSize)),
    [jerseysFiltered.length, pageSize]
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return jerseysFiltered.slice(start, end);
  }, [jerseysFiltered, page, pageSize]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [page]);

  return (
    <div className="min-h-screen bg-white">
      {/* HEADER */}
      <section className="border-b bg-gradient-to-b from-slate-50 via-white to-slate-50">
        <div className="container-fw py-10 sm:py-14">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">
                Player Version
              </p>
              <h1 className="mt-1 text-3xl sm:text-4xl font-bold tracking-tight">
                Player version jerseys (on-pitch fit, short-sleeve)
              </h1>
              <p className="mt-2 max-w-xl text-sm sm:text-base text-gray-600">
                Authentic on-pitch fit jerseys (player version), short-sleeve only.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 justify-start sm:justify-end mt-2 sm:mt-0">
              <a href="/" className="btn-outline text-sm">
                ← Back to Home Page
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CONTEÚDO */}
      <section className="container-fw section-gap">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            {loading ? (
              <span>Loading player version jerseys…</span>
            ) : (
              <span>{jerseysFiltered.length} player version jerseys found</span>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="relative w-full sm:w-64">
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

            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <span className="text-gray-500">Sort by:</span>
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as any);
                  setPage(1);
                }}
                className="rounded-2xl border bg-white px-3 py-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500"
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="rounded-3xl bg-white/90 backdrop-blur-sm ring-1 ring-slate-200 shadow-sm overflow-hidden animate-pulse"
              >
                <div className="aspect-[4/5] bg-slate-100" />
                <div className="p-5">
                  <div className="h-3 w-24 bg-slate-200 rounded mb-2" />
                  <div className="h-4 w-3/4 bg-slate-200 rounded mb-4" />
                  <div className="h-3 w-20 bg-slate-200 rounded" />
                  <div className="mt-6 h-px bg-slate-200/70" />
                  <div className="h-12" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && <p className="text-red-600">{error}</p>}

        {!loading && !error && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
              {pageItems.length === 0 && (
                <p className="text-gray-500 col-span-full">
                  Nenhum player version jersey encontrado.
                </p>
              )}

              {pageItems.map((p) => (
                <ProductCard key={String(p.id)} p={p} />
              ))}
            </div>

            {pageItems.length > 0 && totalPages > 1 && (
              <nav className="mt-10 flex items-center justify-center gap-2 select-none">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-2 rounded-xl ring-1 ring-slate-200 bg-white/80 disabled:opacity-40 hover:ring-sky-200 hover:shadow-sm transition"
                  aria-label="Página anterior"
                >
                  «
                </button>

                {buildPaginationRange(page, totalPages).map((item, idx) => {
                  if (item === "dots") {
                    return (
                      <span
                        key={`dots-${idx}`}
                        className="px-3 py-2 text-sm text-slate-500"
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
                        "min-w-[40px] px-3 py-2 rounded-xl ring-1 transition",
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
                  className="px-3 py-2 rounded-xl ring-1 ring-slate-200 bg-white/80 disabled:opacity-40 hover:ring-sky-200 hover:shadow-sm transition"
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
