// src/app/products/current-season-25-26/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";

/* ============================================================
   Tipagens / Helpers básicos
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

/* ============================================================
   Filtro: "25/26" no nome, sem "PLAYER VERSION"
============================================================ */

function matchesCurrentSeasonNoPlayerVersion(p: HomeProduct): boolean {
  const rawName = (p.name ?? "").toString();
  const name = rawName.toUpperCase();

  const has25_26 = name.includes("25/26");
  const isPlayerVersion = name.includes("PLAYER VERSION");

  return has25_26 && !isPlayerVersion;
}

/* ============================================================
   Card de produto (grid)
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
   Fetch + filtro "25/26" no nome, sem "PLAYER VERSION"
============================================================ */

async function getCurrentSeasonProducts(): Promise<HomeProduct[]> {
  try {
    // tenta URL absoluto com NEXT_PUBLIC_VERCEL_URL (produção),
    // senão faz fetch relativo (dev / fallback)
    const baseEnv = process.env.NEXT_PUBLIC_VERCEL_URL || "";
    const base =
      baseEnv && !baseEnv.startsWith("http")
        ? `https://${baseEnv}`
        : baseEnv;

    const primaryUrl = `${base}/api/home-products?limit=500`;

    const res = await fetch(primaryUrl, {
      cache: "no-store",
    }).catch(() =>
      fetch("/api/home-products?limit=500", { cache: "no-store" }) as any
    );

    if (!res || !("ok" in res) || !res.ok) {
      console.error("Failed to load products for current season");
      return [];
    }

    const data = await res.json();

    // aceita:
    // - { products: [...] }
    // - [ ... ]
    // - { "0": {...}, "1": {...} }
    let raw: any = (data as any)?.products ?? data;
    let list: HomeProduct[] = [];

    if (Array.isArray(raw)) {
      list = raw;
    } else if (raw && typeof raw === "object") {
      list = Object.values(raw);
    } else {
      list = [];
    }

    const filtered = list.filter(matchesCurrentSeasonNoPlayerVersion);

    // ordena por equipa + nome para ficar mais "loja"
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
  } catch (err) {
    console.error("Error loading 25/26 products", err);
    return [];
  }
}

/* ============================================================
   PAGE
============================================================ */

export default async function CurrentSeasonPage() {
  const products = await getCurrentSeasonProducts();

  return (
    <main className="min-h-screen bg-white">
      <section className="container-fw pt-10 pb-16 md:pt-12 md:pb-20">
        {/* Header */}
        <header className="mb-8 md:mb-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">
            Product category
          </p>
          <h1 className="mt-2 text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
            Current season 25/26
          </h1>
          <p className="mt-3 max-w-2xl text-sm sm:text-base text-gray-600">
            All products whose name contains <strong>&quot;25/26&quot;</strong>,
            excluding any item that contains{" "}
            <strong>&quot;Player Version&quot;</strong> in the name.
          </p>

          <div className="mt-3 text-xs sm:text-sm text-gray-500">
            {products.length > 0 ? (
              <>
                Showing <span className="font-semibold">{products.length}</span>{" "}
                products.
              </>
            ) : (
              "No products matching 25/26 (non Player Version) were found."
            )}
          </div>
        </header>

        {/* Grid de produtos */}
        {products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
            {products.map((p: HomeProduct, i: number) => (
              <ProductCard key={`${p.id ?? p.slug ?? i}-${i}`} product={p} />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-6 sm:px-6 sm:py-8 text-sm text-gray-600">
            We couldn&apos;t find any products with &quot;25/26&quot; in the
            name (excluding Player Version).{" "}
            <Link href="/products" className="text-blue-700 underline">
              Browse all products
            </Link>{" "}
            to see the rest of the catalog.
          </div>
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
