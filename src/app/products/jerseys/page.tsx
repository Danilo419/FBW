"use client";

import { useEffect, useMemo, useState } from "react";

/* ============================================================
   Tipos
============================================================ */
type UIProduct = {
  id: string | number;
  name: string;
  slug?: string;
  img?: string;
  price?: number; // EUR (ex.: 34.99)
  team?: string | null;
};

/* ============================================================
   SALE MAP
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
  if (typeof eur !== "number") return null;
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
   CLUB NAME NORMALIZATION
============================================================ */
const CLUB_PATTERNS: Array<[RegExp, string]> = [
  [/\b(real\s*madrid|madrid)\b/i, "Real Madrid"],
  [/\b(fc\s*)?barcelona|barça\b/i, "FC Barcelona"],
  [/\batl[eé]tico\s*(de\s*)?madrid\b/i, "Atlético de Madrid"],
  [/\bsl?\s*benfica|benfica\b/i, "SL Benfica"],
  [/\bfc\s*porto|porto\b/i, "FC Porto"],
  [/\bsporting(?!.*gij[oó]n)\b|\bsporting\s*cp\b/i, "Sporting CP"],
  [/\bsc\s*braga|braga\b/i, "SC Braga"],
];

function normalizeStr(s?: string | null) {
  return (s ?? "").replace(/\s+/g, " ").trim();
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
  return (
    clubFromString(p.team) ||
    clubFromString(p.name) ||
    "Club"
  );
}

/* ============================================================
   FILTRO — AGORA INCLUI RETRO
============================================================ */
function isStandardShortSleeveJersey(p: UIProduct): boolean {
  const n = (p.name ?? "").toUpperCase();
  if (!n) return false;

  if (n.includes("PLAYER VERSION")) return false;
  if (n.includes("LONG SLEEVE")) return false;

  // ★★ IMPORTANTE ★★  
  // Removemos completamente:
  // if (n.includes("RETRO")) return false;

  if (n.includes("SET")) return false;
  if (n.includes("SHORTS")) return false;
  if (n.includes("TRACKSUIT")) return false;
  if (n.includes("CROP TOP")) return false;
  if (n.includes("KIDS KIT")) return false;
  if (n.includes("BABY")) return false;
  if (n.includes("INFANT")) return false;

  // Só excluímos KIT quando é kit completo – mas jerseys retro ficam incluídas
  if (n.includes(" KIT")) return false;

  return true;
}

/* ============================================================
   COMPONENTE DA PÁGINA
============================================================ */
export default function JerseysPage() {
  const [loading, setLoading] = useState(true);
  const [allProducts, setAllProducts] = useState<UIProduct[]>([]);
  const [error, setError] = useState<string | null>(null);

  // paginação
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);

  /* Fetch dos produtos (SEM LIMIT) */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch("/api/home-products?limit=9999", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load products");
        const json = await r.json();
        const arr: UIProduct[] = Array.isArray(json.products)
          ? json.products
          : [];
        if (!cancelled) setAllProducts(arr);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /* Filtrar jerseys */
  const jerseys = useMemo(
    () => allProducts.filter(isStandardShortSleeveJersey),
    [allProducts]
  );

  const totalPages = Math.max(1, Math.ceil(jerseys.length / PAGE_SIZE));

  // garantir que a página válida
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return jerseys.slice(start, start + PAGE_SIZE);
  }, [jerseys, page]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [page]);

  /* ============================================================
     RENDER
  ============================================================ */
  if (loading) {
    return <p className="text-gray-500">Loading…</p>;
  }

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  return (
    <div className="container-fw py-12">
      <h1 className="text-3xl font-bold mb-2">Jerseys</h1>
      <p className="text-gray-600 mb-8">
        Standard short-sleeve jerseys (non-player version)
      </p>

      <p className="text-sm text-gray-700 mb-6">
        <strong>{jerseys.length}</strong> jerseys found
      </p>

      {jerseys.length === 0 && (
        <p className="text-gray-500">No jerseys found.</p>
      )}

      {/* GRID */}
      <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {pageItems.map((p) => {
          const href = p.slug ? `/products/${p.slug}` : undefined;

          const cents = p.price ? toCents(p.price) : null;
          const sale = p.price ? getSale(p.price) : null;
          const parts =
            cents != null ? pricePartsFromCents(cents) : null;

          const teamLabel = getClubLabel(p);

          return (
            <a
              key={String(p.id)}
              href={href}
              className="group block rounded-3xl bg-white ring-1 ring-slate-200 shadow-sm hover:shadow-xl hover:ring-sky-200 transition overflow-hidden"
            >
              {sale && (
                <div className="absolute left-3 top-3 rounded-full bg-red-600 text-white px-2.5 py-1 text-xs font-extrabold">
                  -{sale.pct}%
                </div>
              )}

              <div className="aspect-[4/5] bg-slate-50 relative">
                <img
                  src={p.img}
                  alt={p.name}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-contain p-6 group-hover:scale-105 transition"
                />
              </div>

              <div className="p-5">
                <div className="text-[11px] uppercase tracking-wide text-sky-600 font-semibold">
                  {teamLabel}
                </div>

                <div className="mt-1 text-base font-semibold leading-tight line-clamp-2">
                  {p.name}
                </div>

                <div className="mt-4">
                  <div className="flex items-end gap-2">
                    {sale && (
                      <div className="text-[13px] text-gray-400 line-through">
                        {moneyAfter(sale.compareAtCents)}
                      </div>
                    )}

                    {parts && (
                      <div className="flex items-end text-blue-800">
                        <span className="text-2xl font-semibold">
                          {parts.int}
                        </span>
                        <span className="text-[13px] ml-0.5">
                          ,{parts.dec}
                        </span>
                        <span className="text-[15px] ml-1">€</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 h-px bg-slate-200" />
                <div className="h-10 flex items-center gap-2 text-sm text-slate-700">
                  View product →
                </div>
              </div>
            </a>
          );
        })}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <nav className="mt-10 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-2 rounded-xl ring-1 ring-slate-300 bg-white disabled:opacity-40"
          >
            «
          </button>

          {Array.from({ length: totalPages }).map((_, i) => {
            const n = i + 1;
            const active = n === page;
            return (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={
                  active
                    ? "px-3 py-2 rounded-xl bg-sky-600 text-white"
                    : "px-3 py-2 rounded-xl bg-white ring-1 ring-slate-300"
                }
              >
                {n}
              </button>
            );
          })}

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-2 rounded-xl ring-1 ring-slate-300 bg-white disabled:opacity-40"
          >
            »
          </button>
        </nav>
      )}
    </div>
  );
}
