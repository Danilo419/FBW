// src/app/search/ResultsClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type UIProduct = {
  id: string | number;
  name: string;
  slug?: string;
  img?: string;
  price?: number; // EUR (ex.: 34.99)
  team?: string | null;
};

const FALLBACK_IMG = "/images/players/RealMadrid/RealMadrid12.png";

/* ============================ Promo map (EUR) ============================ */
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

/** "150,00 €" */
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

/* ============================ CLUB LABEL (100%) ============================ */

function normalizeStr(s?: string | null) {
  return (s ?? "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // remove acentos
}

/**
 * Patterns só para os MAIS IMPORTANTES / QUE DÃO ERRO COM FREQUÊNCIA.
 * (o fallback garante sempre um label mesmo sem bater em patterns)
 */
const CLUB_PATTERNS: Array<[RegExp, string]> = [
  [/\batletico\s*(de\s*)?madrid\b/i, "Atlético de Madrid"],
  [/\breal\s*madrid\b/i, "Real Madrid"],
  [/\b(fc\s*)?barcelona\b|\bbarca\b/i, "Barcelona"],

  [/\bmanchester\s*city\b/i, "Manchester City"],
  [/\bmanchester\s*united\b/i, "Manchester United"],
  [/\bparis\s*saint\s*germain\b|\bpsg\b/i, "PSG"],
  [/\b(bayern\s*munich|bayern)\b/i, "Bayern Munich"],
  [/\bborussia\s*dortmund\b|\bbvb\b/i, "Borussia Dortmund"],
  [/\bjuventus\b/i, "Juventus"],
  [/\bac\s*milan\b/i, "AC Milan"],
  [/\binter\s*milan\b|\binter\b/i, "Inter Milan"],

  [/\b(sevilla)\b/i, "Sevilla FC"],
  [/\b(real\s*sociedad)\b/i, "Real Sociedad"],
  [/\b(villarreal)\b/i, "Villarreal"],
  [/\b(real\s*betis)\b/i, "Real Betis"],

  // Portugal
  [/\bbenfica\b|\bsl\s*benfica\b/i, "Benfica"],
  [/\bfc\s*porto\b|\bporto\b/i, "FC Porto"],
  [/\bsporting\s*cp\b|\bsporting\b(?!.*gijon)\b/i, "Sporting CP"],
  [/\bsc\s*braga\b|\bbraga\b/i, "SC Braga"],
  // ✅ Vitória SC -> Vitória de Guimarães
  [/\bvitoria\s*(sc)?\b/i, "Vitória de Guimarães"],

  // seleções (algumas comuns)
  [/\bportugal\b/i, "Portugal"],
  [/\bspain\b|\bespana\b/i, "Spain"],
  [/\bfrance\b/i, "France"],
  [/\bengland\b/i, "England"],
  [/\bargentina\b/i, "Argentina"],
  [/\bbrazil\b|brasil/i, "Brazil"],
  [/\bjapan\b/i, "Japan"],
];

function clubFromString(input?: string | null): string | null {
  const s = normalizeStr(input);
  if (!s) return null;

  for (const [re, club] of CLUB_PATTERNS) {
    if (re.test(s)) return club;
  }
  return null;
}

/**
 * Palavras que não fazem parte do “nome do clube” e aparecem depois do nome.
 */
const CUT_WORDS_RE =
  /\b(Home|Away|Third|Fourth|Primary|Goalkeeper|GK|Jersey|Kit|Kids|Kid|Women|Woman|Man|Men|Player|Version|Authentic|Fan|Retro|Vintage|Classic|Long|Sleeve|Short|Sleeve|Training|Pre-Match|Prematch|Warm-Up|Warmup|Tracksuit|Track\s*Suit|Tracksuits|Suit|Set|Pants|Trousers|Shorts|Jacket|Hoodie|Zip|Top|Edition|Special|Limited|Concept|World|Cup|UCL|Champions|League|Europa|Conference)\b/i;

const YEAR_RE =
  /\b(19|20)\d{2}\s*\/\s*\d{2}\b|\b(19|20)\d{2}\b|\b\d{2}\s*\/\s*\d{2}\b/gi;

const COLORISH_RE =
  /\b(Black|White|Blue|Navy|Sky|Red|Green|Yellow|Pink|Purple|Orange|Grey|Gray|Gold|Silver|Beige|Brown|Maroon|Burgundy|Cream|Teal|Lime|Aqua|Cyan)\b/gi;

const CONNECTORS = new Set([
  "FC",
  "SC",
  "AC",
  "AS",
  "CD",
  "UD",
  "CF",
  "FK",
  "SK",
  "SV",
  "RB",
  "IF",
  "BK",
]);

function inferFromNameGuaranteed(p: UIProduct): string {
  const rawName = normalizeStr(p.name);
  if (!rawName) return "Unknown";

  const byPattern = clubFromString(rawName);
  if (byPattern) return byPattern;

  const rawTeam = normalizeStr(p.team);
  if (rawTeam) {
    const teamPattern = clubFromString(rawTeam);
    if (teamPattern) return teamPattern;

    let t = rawTeam.replace(YEAR_RE, " ").replace(COLORISH_RE, " ");
    t = t.replace(/\s{2,}/g, " ").trim();

    const up = t.toUpperCase();
    if (up && up !== "CLUB" && up !== "TEAM") {
      const tokens = t.split(/\s+/).filter(Boolean);
      const picked = tokens.slice(0, 4);
      const teamGuess = picked.join(" ").trim();
      if (teamGuess) return teamGuess;
    }
  }

  let cut = rawName.split(CUT_WORDS_RE)[0].trim();
  cut = cut.replace(YEAR_RE, " ").replace(COLORISH_RE, " ");
  cut = cut.replace(/[–—\-|]+/g, " ");
  cut = cut.replace(/\s{2,}/g, " ").trim();

  if (!cut) cut = rawName;

  const tokens = cut.split(/\s+/).filter(Boolean);

  const allowSmall = new Set([
    "de",
    "da",
    "do",
    "dos",
    "das",
    "of",
    "al",
    "el",
    "la",
    "le",
    "los",
    "las",
    "di",
    "del",
  ]);

  const label: string[] = [];

  for (let i = 0; i < tokens.length && label.length < 4; i++) {
    const w = tokens[i];
    const wClean = w.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, "");
    if (!wClean) continue;

    if (label.length === 0) {
      label.push(w);
      continue;
    }

    const up = wClean.toUpperCase();
    if (CONNECTORS.has(up)) {
      label.push(w);
      continue;
    }

    if (allowSmall.has(wClean.toLowerCase())) {
      label.push(w);
      continue;
    }

    label.push(w);
  }

  const out = label.join(" ").trim();
  if (out) return out;

  return tokens.slice(0, 2).join(" ") || "Unknown";
}

/** ✅ final: nunca retorna "Club" */
function getSafeClubLabel(p: UIProduct): string {
  const byTeam = clubFromString(p.team);
  if (byTeam) return byTeam;

  const byName = clubFromString(p.name);
  if (byName) return byName;

  const inferred = inferFromNameGuaranteed(p);
  if (inferred && inferred.toUpperCase() !== "CLUB") return inferred;

  return "Unknown";
}

/* ============================ Paginação com "..." ============================ */

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

/* ============================ Componente ============================ */

export default function ResultsClient({
  initialQuery = "",
}: {
  initialQuery?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<UIProduct[]>([]);
  const [error, setError] = useState<string | null>(null);

  const PAGE_SIZE = 12;
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const qParam = initialQuery ? `?q=${encodeURIComponent(initialQuery)}` : "";
    fetch(`/api/search${qParam}`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Search failed (${r.status})`);
        const json = await r.json();

        const arr: UIProduct[] = Array.isArray(json?.products)
          ? json.products
          : Array.isArray(json)
          ? json
          : [];

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
  }, [initialQuery]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(results.length / PAGE_SIZE)),
    [results.length]
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return results.slice(start, end);
  }, [results, page]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [page]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="rounded-3xl bg-white/90 backdrop-blur-sm ring-1 ring-slate-200 shadow-sm overflow-hidden animate-pulse"
          >
            <div className="aspect-[4/5] bg-slate-100" />
            <div className="p-4 sm:p-5">
              <div className="h-3 w-24 bg-slate-200 rounded mb-2" />
              <div className="h-4 w-3/4 bg-slate-200 rounded mb-4" />
              <div className="h-3 w-20 bg-slate-200 rounded" />
              <div className="mt-6 h-px bg-slate-200/70" />
              <div className="h-11 sm:h-12" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  return (
    <>
      {/* ✅ Grid com 2 por linha no mobile */}
      <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
        {pageItems.length === 0 && (
          <p className="text-gray-500 col-span-full">
            Nenhum produto encontrado.
          </p>
        )}

        {pageItems.map((p) => {
          const href = p.slug ? `/products/${p.slug}` : undefined;
          const cents = typeof p.price === "number" ? toCents(p.price)! : null;
          const sale = cents != null ? getSale(p.price!) : null;
          const parts = cents != null ? pricePartsFromCents(cents) : null;

          const teamLabel = getSafeClubLabel(p);

          return (
            <a
              key={String(p.id)}
              href={href}
              className="group relative block overflow-hidden rounded-3xl bg-white/90 backdrop-blur-sm ring-1 ring-slate-200 shadow-sm transition duration-300 hover:shadow-xl hover:ring-sky-200"
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
                      const img = e.currentTarget as HTMLImageElement & {
                        _fallbackApplied?: boolean;
                      };
                      if (img._fallbackApplied) return;
                      img._fallbackApplied = true;
                      img.src = FALLBACK_IMG;
                    }}
                    className="absolute inset-0 h-full w-full object-contain p-4 sm:p-6 transition-transform duration-300 group-hover:scale-105"
                  />
                </div>

                <div className="p-4 sm:p-5 flex flex-col grow">
                  <div className="text-[11px] uppercase tracking-wide text-sky-600 font-semibold/relaxed">
                    {teamLabel}
                  </div>

                  <div className="mt-1 text-[13px] sm:text-base font-semibold text-slate-900 leading-tight line-clamp-2">
                    {p.name}
                  </div>

                  <div className="mt-3 sm:mt-4">
                    <div className="flex items-end gap-2">
                      {sale && (
                        <div className="text-[12px] sm:text-[13px] text-slate-500 line-through">
                          {moneyAfter(sale.compareAtCents)}
                        </div>
                      )}

                      {parts && (
                        <div
                          className="flex items-end"
                          style={{ color: "#1c40b7" }}
                        >
                          <span className="text-[20px] sm:text-2xl font-semibold tracking-tight leading-none">
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
                    <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                    <div className="h-11 sm:h-12 flex items-center gap-2 text-[13px] sm:text-sm font-medium text-slate-700">
                      <span className="transition group-hover:translate-x-0.5">
                        View product
                      </span>
                      <svg
                        className="h-4 w-4 opacity-70 group-hover:opacity-100 transition group-hover:translate-x-0.5"
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

      {totalPages > 1 && (
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
  );
}
