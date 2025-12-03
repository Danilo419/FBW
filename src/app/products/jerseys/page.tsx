// src/app/products/jerseys/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

/* ============================================================
   Tipagens / Helpers (iguais aos da Home)
============================================================ */

type HomeProduct = any;

const FALLBACK_IMG = "/images/players/RealMadrid/RealMadrid12.png";

const SALE_MAP_EUR: Record<number, number> = {
  29.99: 70,
  34.99: 100,
  39.99: 120,
  44.99: 150,
  49.99: 165,
  59.99: 200,
  69.99: 230,
};

const SALE_MAP_CENTS: Record<number, number> = Object.fromEntries(
  Object.entries(SALE_MAP_EUR).map(([k, v]) => [
    Math.round(parseFloat(k) * 100),
    Math.round(v * 100),
  ])
) as Record<number, number>;

function formatEurFromCents(cents: number | null | undefined) {
  if (cents == null) return "";
  const value = (cents / 100).toFixed(2);
  const withComma = value.replace(".", ",");
  return `${withComma} €`;
}

function getProductImage(p: HomeProduct): string {
  return (
    p.imageUrls?.[0] ??
    p.imageUrls?.[0]?.url ??
    p.mainImage ??
    p.mainImageUrl ??
    p.mainImageURL ??
    p.image ??
    p.imageUrl ??
    p.imageURL ??
    p.coverImage ??
    p.coverImageUrl ??
    p.coverImageURL ??
    p.cardImage ??
    p.cardImageUrl ??
    p.cardImageURL ??
    p.listImage ??
    p.listImageUrl ??
    p.listImageURL ??
    p.gridImage ??
    p.gridImageUrl ??
    p.gridImageURL ??
    p.heroImage ??
    p.heroImageUrl ??
    p.heroImageURL ??
    p.primaryImage ??
    p.primaryImageUrl ??
    p.primaryImageURL ??
    p.thumbnail ??
    p.thumbnailUrl ??
    p.thumbnailURL ??
    p.thumb ??
    p.thumbUrl ??
    p.thumbURL ??
    p.picture ??
    p.pictureUrl ??
    p.pictureURL ??
    p.photo ??
    p.photoUrl ??
    p.photoURL ??
    p.img ??
    p.imgUrl ??
    p.imgURL ??
    p.url ??
    p.src ??
    p.gallery?.[0]?.url ??
    p.gallery?.[0]?.imageUrl ??
    p.gallery?.[0]?.imageURL ??
    p.images?.[0]?.url ??
    p.images?.[0]?.imageUrl ??
    p.images?.[0]?.imageURL ??
    p.productImages?.[0]?.url ??
    p.productImages?.[0]?.imageUrl ??
    p.productImages?.[0]?.imageURL ??
    p.media?.[0]?.url ??
    p.media?.[0]?.imageUrl ??
    p.media?.[0]?.imageURL ??
    FALLBACK_IMG
  );
}

function getProductPricing(p: HomeProduct) {
  const priceCents: number | null =
    typeof p.basePrice === "number"
      ? p.basePrice
      : typeof p.priceCents === "number"
      ? p.priceCents
      : typeof p.price === "number"
      ? Math.round(p.price * 100)
      : null;

  let compareAtCents: number | null =
    typeof p.compareAtPriceCents === "number"
      ? p.compareAtPriceCents
      : typeof p.compareAtPrice === "number"
      ? Math.round(p.compareAtPrice * 100)
      : null;

  if (!compareAtCents && priceCents != null) {
    const mapped = SALE_MAP_CENTS[priceCents];
    if (mapped) compareAtCents = mapped;
  }

  const hasDiscount =
    priceCents != null && compareAtCents != null && compareAtCents > priceCents;

  const discountPercent = hasDiscount
    ? Math.round(((compareAtCents! - priceCents!) / compareAtCents!) * 100)
    : null;

  return { priceCents, compareAtCents, hasDiscount, discountPercent };
}

function normalizeName(p: HomeProduct): string {
  return ((p.name ?? "") as string).toUpperCase();
}

function hasTerm(p: HomeProduct, term: string): boolean {
  return normalizeName(p).includes(term.toUpperCase());
}

function isPlayerVersion(p: HomeProduct): boolean {
  return hasTerm(p, "PLAYER VERSION");
}

function isLongSleeve(p: HomeProduct): boolean {
  return hasTerm(p, "LONG SLEEVE");
}

function isRetro(p: HomeProduct): boolean {
  return hasTerm(p, "RETRO");
}

/** ✨ MESMO FILTRO "jerseys" DA HOME ✨ */
function filterJerseys(p: HomeProduct): boolean {
  const n = normalizeName(p);
  if (!n) return false;
  if (isPlayerVersion(p)) return false;
  if (isLongSleeve(p)) return false;
  if (isRetro(p)) return false;
  if (n.includes("SET")) return false;
  if (n.includes("SHORTS")) return false;
  if (n.includes("TRACKSUIT")) return false;
  if (n.includes("CROP TOP")) return false;
  if (n.includes("KIT")) return false;
  return true;
}

/* ============================================================
   Card de produto (4 por linha)
============================================================ */

function ProductCard({ product }: { product: HomeProduct }) {
  const href = `/products/${product.slug ?? product.id}`;
  const imgSrc = getProductImage(product);
  const { priceCents, compareAtCents, hasDiscount, discountPercent } =
    getProductPricing(product);

  const team = (product.team ?? product.club ?? product.clubName ?? "") as string;

  return (
    <Link
      href={href}
      className="group product-hover transition rounded-3xl overflow-hidden bg-white ring-1 ring-black/5 flex flex-col hover:ring-blue-200 hover:shadow-lg"
    >
      <div className="relative h-[220px] sm:h-[260px] md:h-[300px] bg-slate-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            if ((img as any)._fallbackApplied) return;
            (img as any)._fallbackApplied = true;
            img.src = FALLBACK_IMG;
          }}
        />
        {discountPercent != null && (
          <div className="absolute left-2 top-2 sm:left-3 sm:top-3 rounded-full bg-red-600 px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-semibold text-white shadow">
            -{discountPercent}%
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col px-3 py-3 sm:px-4 sm:py-4">
        {team && (
          <div className="text-[10px] sm:text-[11px] font-semibold tracking-[0.16em] text-blue-700 uppercase">
            {team}
          </div>
        )}
        <h3 className="mt-1 text-[12px] sm:text-[15px] font-semibold leading-snug line-clamp-2">
          {product.name}
        </h3>

        <div className="mt-2 flex items-baseline gap-1 sm:gap-2">
          {hasDiscount && (
            <span className="text-[11px] sm:text-xs text-gray-400 line-through">
              {formatEurFromCents(compareAtCents)}
            </span>
          )}
          <span className="text-sm sm:text-lg font-semibold text-blue-800">
            {formatEurFromCents(priceCents)}
          </span>
        </div>

        <div className="mt-3 text-[11px] sm:text-sm text-blue-700">
          View product →
        </div>
      </div>
    </Link>
  );
}

/* ============================================================
   Página "Jerseys" com paginação (12 por página, 4 por linha)
============================================================ */

const PAGE_SIZE = 12;

export default function JerseysPage() {
  const [allProducts, setAllProducts] = useState<HomeProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // 🔍 Buscar TODOS os produtos via /api/search (mesmo endpoint do search)
  // e depois aplicar o MESMO filterJerseys da Home
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch("/api/search", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to load products (${res.status})`);
        const data = await res.json();
        const list = Array.isArray(data?.products)
          ? data.products
          : Array.isArray(data)
          ? data
          : [];

        if (!cancelled) {
          setAllProducts(list);
          setPage(1);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e?.message || "Error loading products");
          setAllProducts([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // aplica o MESMO filtro jerseys da Home, e ordena por equipa + nome
  const jerseys = useMemo(() => {
    const filtered = allProducts.filter(filterJerseys);

    filtered.sort((a: HomeProduct, b: HomeProduct) => {
      const ta = (a.team ?? a.club ?? a.clubName ?? "") as string;
      const tb = (b.team ?? b.club ?? b.clubName ?? "") as string;
      const tn = ta.localeCompare(tb);
      if (tn !== 0) return tn;
      const na = (a.name ?? "") as string;
      const nb = (b.name ?? "") as string;
      return na.localeCompare(nb);
    });

    return filtered;
  }, [allProducts]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(jerseys.length / PAGE_SIZE)),
    [jerseys.length]
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return jerseys.slice(start, end);
  }, [jerseys, page]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [page]);

  return (
    <main className="min-h-screen bg-white">
      <section className="container-fw pt-10 pb-16 md:pt-12 md:pb-20">
        {/* Header */}
        <header className="mb-8 md:mb-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">
            Product category
          </p>
          <h1 className="mt-2 text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
            Jerseys
          </h1>
          <p className="mt-3 max-w-2xl text-sm sm:text-base text-gray-600">
            Standard short-sleeve jerseys (non-player version).
          </p>

          <div className="mt-3 text-xs sm:text-sm text-gray-500">
            {loading ? (
              "Loading products..."
            ) : error ? (
              <>Error loading products: {error}</>
            ) : jerseys.length > 0 ? (
              <>
                Showing <span className="font-semibold">{pageItems.length}</span> of{" "}
                <span className="font-semibold">{jerseys.length}</span> jerseys (page{" "}
                {page} of {totalPages}).
              </>
            ) : (
              "No standard short-sleeve jerseys found yet."
            )}
          </div>
        </header>

        {/* GRID – máx 4 por linha, 12 por página */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="rounded-3xl bg-white/90 backdrop-blur-sm ring-1 ring-slate-200 shadow-sm overflow-hidden animate-pulse"
              >
                <div className="h-[220px] sm:h-[260px] md:h-[300px] bg-slate-100" />
                <div className="p-4">
                  <div className="h-3 w-24 bg-slate-200 rounded mb-2" />
                  <div className="h-4 w-3/4 bg-slate-200 rounded mb-3" />
                  <div className="h-3 w-20 bg-slate-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
              {pageItems.length === 0 && (
                <p className="text-gray-500 col-span-full">
                  No standard short-sleeve jerseys found.
                </p>
              )}

              {pageItems.map((p: HomeProduct, i: number) => (
                <ProductCard key={`${p.id ?? p.slug ?? i}-${i}`} product={p} />
              ))}
            </div>

            {/* Paginação: « 1 2 3 » */}
            {jerseys.length > PAGE_SIZE && (
              <nav className="mt-10 flex items-center justify-center gap-2 select-none">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-2 rounded-xl ring-1 ring-slate-200 bg-white/80 disabled:opacity-40 hover:ring-sky-200 hover:shadow-sm transition"
                  aria-label="Previous page"
                >
                  «
                </button>

                <div className="flex flex-wrap items-center justify-center gap-2">
                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const n = idx + 1;
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
                </div>

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-2 rounded-xl ring-1 ring-slate-200 bg-white/80 disabled:opacity-40 hover:ring-sky-200 hover:shadow-sm transition"
                  aria-label="Next page"
                >
                  »
                </button>
              </nav>
            )}
          </>
        )}

        {/* Link de fallback para catálogo completo */}
        <div className="mt-10 text-center">
          <Link
            href="/products"
            className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 hover:border-blue-500 hover:text-blue-700"
          >
            ← Back to all products
          </Link>
        </div>
      </section>
    </main>
  );
}
