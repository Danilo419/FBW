// src/app/products/adult/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

/* ============================ Tipagem ============================ */

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

/** Euros / cêntimos / símbolo */
function pricePartsFromCents(cents: number) {
  const euros = Math.floor(cents / 100).toString();
  const dec = (cents % 100).toString().padStart(2, "0");
  return { int: euros, dec, sym: "€" };
}

/* ========= NOME DO CLUBE/SELEÇÃO (FIX TOTAL: nunca “CLUB”, nunca cores/PRIMARY, etc.) ========= */

function normalizeStr(s?: string | null) {
  return (s ?? "").replace(/\s{2,}/g, " ").trim();
}

function toTitleCaseSmart(input: string) {
  const s = normalizeStr(input);
  if (!s) return "";
  const lowerKeep = new Set(["de", "da", "do", "dos", "das", "of", "and", "the"]);
  return s
    .split(/\s+/)
    .map((w) => {
      const raw = w.replace(/\s+/g, "");
      if (!raw) return raw;

      const onlyLetters = raw.replace(/[^A-Za-z]/g, "");
      if (
        onlyLetters.length > 0 &&
        onlyLetters.length <= 4 &&
        raw.toUpperCase() === raw
      ) {
        return raw;
      }

      const lw = raw.toLowerCase();
      if (lowerKeep.has(lw)) return lw;

      return lw.charAt(0).toUpperCase() + lw.slice(1);
    })
    .join(" ");
}

// ✅ FIX Madrid (Real Madrid só com "real madrid")
const CLUB_PATTERNS: Array<[RegExp, string]> = [
  // Espanha
  [/\breal\s*madrid\b/i, "Real Madrid"],
  [/\b(fc\s*)?barcelona|barça\b/i, "Barcelona"],
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

// palavras “lixo” comuns
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

// descritores/coleções que NÃO podem ficar no label do clube
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

    // ✅ exemplos do teu problema (genérico)
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
    "SPECIAL",
    "LIMITED",
  ].map((x) => x.toUpperCase())
);

/**
 * ✅ Lista de “começos” que normalmente fazem parte de nomes multi-palavra
 * (para NÃO cortar "Real Madrid", "Manchester City", "South Korea", etc.)
 */
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

function cleanTeamValue(v?: string | null): string {
  let s = normalizeStr(v);
  if (!s) return "";

  s = s.replace(/[|]+/g, " ").replace(/\s{2,}/g, " ").trim();
  if (!s) return "";

  const up = s.toUpperCase();
  if (up === "CLUB" || up === "TEAM") return "";

  // se vier "X & Y" (cores), mantemos só a esquerda
  const amp = s.split(/\s*&\s*/);
  if (amp.length > 1) s = normalizeStr(amp[0]);

  // remove trailing lixo
  const tokens = s.split(/\s+/);
  let out = tokens.slice();

  while (out.length > 1) {
    const lastRaw = out[out.length - 1];
    const last = lastRaw.toUpperCase().replace(/[^A-Z-]/g, "");
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

  // fallback extra (variações com hífen / spelling)
  joined = joined.replace(
    /\s+(TRI-?COL(OU)?R|BI-?COL(OU)?R|MULTI-?COL(OU)?R)\b/gi,
    ""
  );
  joined = normalizeStr(joined);

  return joined;
}

function clubFromString(input?: string | null): string | null {
  const s = normalizeStr(input);
  if (!s) return null;
  for (const [re, club] of CLUB_PATTERNS) {
    if (re.test(s)) return club;
  }
  return null;
}

/**
 * ✅ REGRA FINAL (a que estava a faltar):
 * Se depois de limpar ainda vier "Chelsea Shadow" / "Japan Samurai",
 * cortamos para só o clube (primeira palavra), EXCETO em casos multi-palavra.
 */
function hardClampClubName(label: string): string {
  const s = normalizeStr(label);
  if (!s) return "";

  // se bater nos patterns, devolve exatamente o “canon”
  const byPattern = clubFromString(s);
  if (byPattern) return byPattern;

  const parts = s.split(/\s+/);
  if (parts.length <= 1) return s;

  const firstUp = parts[0].toUpperCase().replace(/[^A-ZÀ-ÖØ-Ý]/g, "");
  if (MULTIWORD_STARTERS.has(firstUp)) {
    // mantém como veio (já limpo), porque provavelmente é multi-palavra legítimo
    return s;
  }

  // se a 2ª palavra for descriptor (Shadow/Samurai/etc), corta
  const secondUp = (parts[1] ?? "")
    .toUpperCase()
    .replace(/[^A-ZÀ-ÖØ-Ý-]/g, "");
  const secondUp2 = secondUp.replace(/-/g, "");
  if (DESCRIPTOR_WORDS.has(secondUp) || DESCRIPTOR_WORDS.has(secondUp2)) {
    return parts[0];
  }

  // ✅ regra “garantia”: se for 2+ palavras e NÃO for multiword starter,
  // e o teu objetivo é “NUNCA aparecer apelido”, então corta sempre no 1º token.
  // (isto é o que garante que "Chelsea Shadow" vira "Chelsea" SEM lista infinita)
  return parts[0];
}

/**
 * Inferir nome (clube/seleção) pelo nome do produto:
 * - "Argentina Primary Goalkeeper Jersey 2026 – World Cup" -> "Argentina"
 * - "Arsenal Red & Black Training Tracksuit 25/26" -> "Arsenal"
 * - "Chelsea Shadow Training Sleeveless Set 24/25" -> "Chelsea"
 */
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

  // limpa lixo e depois aplica clamp final
  return hardClampClubName(cleanTeamValue(cleaned));
}

/** ✅ label final: team -> patterns -> infer; SEMPRE passa pelo clamp final */
function getClubLabel(p: UIProduct): string {
  // 1) team
  const teamClean = cleanTeamValue(p.team ?? null);
  if (teamClean) {
    const clamped = hardClampClubName(teamClean);
    const byTeamPattern = clubFromString(clamped);
    return byTeamPattern ?? toTitleCaseSmart(clamped);
  }

  // 2) patterns no nome
  const byNamePattern = clubFromString(p.name);
  if (byNamePattern) return byNamePattern;

  // 3) infer pelo nome
  const inferred = inferClubFromName(p.name);
  if (inferred) return toTitleCaseSmart(inferred);

  return "";
}

/* ============================ Helpers de filtro ============================ */

function normName(p: UIProduct) {
  return (p.name ?? "").toUpperCase();
}

function isAdultProduct(p: UIProduct): boolean {
  const n = normName(p);
  if (!n) return false;
  if (n.includes("KID")) return false;
  if (n.includes("CROP TOP")) return false;
  return true;
}

/* ============================ MAPEAR API → UIProduct ============================ */

function getImageFromApi(raw: any): string | undefined {
  return (
    raw.img ??
    raw.image ??
    raw.imageUrl ??
    raw.imageURL ??
    raw.mainImage ??
    raw.mainImageUrl ??
    raw.mainImageURL ??
    raw.thumbnail ??
    raw.thumbnailUrl ??
    raw.coverImage ??
    raw.coverImageUrl ??
    raw.cardImage ??
    raw.cardImageUrl ??
    raw.listImage ??
    raw.listImageUrl ??
    raw.gridImage ??
    raw.gridImageUrl ??
    raw.heroImage ??
    raw.heroImageUrl ??
    raw.primaryImage ??
    raw.primaryImageUrl ??
    raw.picture ??
    raw.pictureUrl ??
    raw.photo ??
    raw.photoUrl ??
    raw.imageUrls?.[0] ??
    raw.images?.[0]?.url ??
    raw.gallery?.[0]?.url ??
    undefined
  );
}

function getPriceEurFromApi(raw: any): number | undefined {
  if (typeof raw.price === "number") return raw.price;
  if (typeof raw.currentPrice === "number") return raw.currentPrice;

  if (typeof raw.basePrice === "number") {
    const v = raw.basePrice;
    if (Number.isInteger(v) && v > 200) return Math.round(v) / 100;
    return v;
  }

  if (typeof raw.priceCents === "number") {
    return Math.round(raw.priceCents) / 100;
  }

  return undefined;
}

function mapApiToUIProduct(raw: any): UIProduct {
  const name =
    raw.name ??
    raw.title ??
    raw.productName ??
    raw.fullName ??
    "Unnamed product";

  const img = getImageFromApi(raw);
  const price = getPriceEurFromApi(raw);
  const team =
    raw.team ??
    raw.club ??
    raw.clubName ??
    raw.teamName ??
    raw.nationalTeam ??
    null;

  return {
    id: raw.id ?? raw.productId ?? raw._id ?? raw.slug ?? name,
    name,
    slug: raw.slug ?? raw.handle ?? undefined,
    img: img ?? FALLBACK_IMG,
    price,
    team,
  };
}

/* ============================ Card de produto ============================ */

function ProductCard({ p }: { p: UIProduct }) {
  const href = p.slug ? `/products/${p.slug}` : "#";
  const cents = typeof p.price === "number" ? toCents(p.price)! : null;
  const sale = cents != null ? getSale(p.price!) : null;
  const parts = cents != null ? pricePartsFromCents(cents) : null;

  const teamLabel = getClubLabel(p);

  return (
    <Link
      href={href}
      prefetch={false}
      className="group block rounded-2xl bg-white/90 backdrop-blur-sm ring-1 ring-slate-200 shadow-sm hover:shadow-lg hover:ring-sky-200 transition duration-300 overflow-hidden relative"
    >
      {sale && (
        <div className="absolute left-2.5 top-2.5 z-10 rounded-full bg-red-600 text-white px-2 py-0.5 text-[10px] sm:text-xs font-extrabold shadow-md ring-1 ring-red-700/40">
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
            className="absolute inset-0 h-full w-full object-contain p-3 sm:p-6 transition-transform duration-300 group-hover:scale-105"
          />
        </div>

        <div className="p-4 sm:p-5 flex flex-col grow">
          {teamLabel && (
            <div className="text-[10px] sm:text-[11px] uppercase tracking-wide text-sky-600 font-semibold/relaxed">
              {teamLabel}
            </div>
          )}

          <div className="mt-1 text-sm sm:text-base font-semibold text-slate-900 leading-tight line-clamp-2">
            {p.name}
          </div>

          <div className="mt-3 sm:mt-4">
            <div className="flex items-end gap-1.5 sm:gap-2">
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
    </Link>
  );
}

/* ============================ Paginação com ... ============================ */

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

/* ============================ Página Adult ============================ */

const PAGE_SIZE = 12;

const SEARCH_QUERIES = ["a", "e", "i", "o", "u", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

export default function AdultPage() {
  const [results, setResults] = useState<UIProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const [searchTerm, setSearchTerm] = useState("");
  const [sort, setSort] = useState<"team" | "price-asc" | "price-desc" | "random">("team");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const allRaw: any[] = [];

        for (const q of SEARCH_QUERIES) {
          const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
            cache: "no-store",
          });
          if (!res.ok) continue;
          const json = await res.json();
          const list: any[] = Array.isArray(json?.products)
            ? json.products
            : Array.isArray(json)
            ? json
            : [];
          allRaw.push(...list);
        }

        const seen = new Set<string>();
        const uniqueRaw: any[] = [];
        for (const p of allRaw) {
          const key = String(p.id ?? p.slug ?? p.name ?? Math.random());
          if (seen.has(key)) continue;
          seen.add(key);
          uniqueRaw.push(p);
        }

        const mapped: UIProduct[] = uniqueRaw.map(mapApiToUIProduct);
        const filtered = mapped.filter(isAdultProduct);

        if (!cancelled) {
          setResults(filtered);
          setPage(1);
        }
      } catch (e: any) {
        if (!cancelled) {
          setResults([]);
          setError(e?.message || "Error loading products");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredSorted = useMemo(() => {
    let base = results;

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
        const pa = typeof a.price === "number" ? a.price : Number.POSITIVE_INFINITY;
        const pb = typeof b.price === "number" ? b.price : Number.POSITIVE_INFINITY;
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
    () => Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE)),
    [filteredSorted.length]
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return filteredSorted.slice(start, end);
  }, [filteredSorted, page]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [page]);

  return (
    <div className="min-h-screen bg-white">
      <section className="border-b bg-gradient-to-b from-slate-50 via-white to-slate-50">
        <div className="container-fw py-6 sm:py-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">
                Product category
              </p>
              <h1 className="mt-1 text-2xl sm:text-4xl font-bold tracking-tight">
                Adult
              </h1>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-start sm:justify-end mt-2 sm:mt-0">
              <Link
                href="/"
                className="btn-outline text-xs sm:text-sm w-full sm:w-auto text-center"
              >
                ← Back to Home Page
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container-fw section-gap pb-10">
        <div className="mb-5 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            {loading ? (
              <span>Loading products…</span>
            ) : (
              <span>{filteredSorted.length} products found</span>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by team or product name"
                className="w-full rounded-2xl border px-9 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 text-xs sm:text-sm">
              <span className="text-gray-500">Sort by:</span>
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as any);
                  setPage(1);
                }}
                className="rounded-2xl border bg-white px-3 py-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500 w-40 sm:w-auto"
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 lg:gap-8">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl bg-white/90 backdrop-blur-sm ring-1 ring-slate-200 shadow-sm overflow-hidden animate-pulse"
              >
                <div className="aspect-[4/5] bg-slate-100" />
                <div className="p-4 sm:p-5">
                  <div className="h-3 w-24 bg-slate-200 rounded mb-2" />
                  <div className="h-4 w-3/4 bg-slate-200 rounded mb-4" />
                  <div className="h-3 w-20 bg-slate-200 rounded" />
                  <div className="mt-4 sm:mt-6 h-px bg-slate-200/70" />
                  <div className="h-8 sm:h-12" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <p className="text-red-600 text-sm sm:text-base mt-2">{error}</p>
        )}

        {!loading && !error && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 lg:gap-8">
              {pageItems.length === 0 && (
                <p className="text-gray-500 text-sm col-span-full">
                  No adult products were found (they might all be Kids or Crop Top items).
                </p>
              )}

              {pageItems.map((p) => (
                <ProductCard key={String(p.id)} p={p} />
              ))}
            </div>

            {pageItems.length > 0 && totalPages > 1 && (
              <nav className="mt-8 sm:mt-10 flex items-center justify-center gap-1.5 sm:gap-2 select-none text-sm">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-2 rounded-xl ring-1 ring-slate-200 bg-white/80 disabled:opacity-40 hover:ring-sky-200 hover:shadow-sm transition min-w-[40px]"
                  aria-label="Previous page"
                >
                  «
                </button>

                {buildPaginationRange(page, totalPages).map((item, idx) => {
                  if (item === "dots") {
                    return (
                      <span
                        key={`dots-${idx}`}
                        className="px-2 sm:px-3 py-2 text-xs sm:text-sm text-slate-500"
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
                        "min-w-[36px] sm:min-w-[40px] px-3 py-2 rounded-xl ring-1 transition",
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
                  className="px-3 py-2 rounded-xl ring-1 ring-slate-200 bg-white/80 disabled:opacity-40 hover:ring-sky-200 hover:shadow-sm transition min-w-[40px]"
                  aria-label="Next page"
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
