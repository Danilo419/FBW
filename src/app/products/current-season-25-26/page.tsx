// src/app/products/current-season-25-26/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";

type HomeProduct = any;

const FALLBACK_IMG = "/images/players/RealMadrid/RealMadrid12.png";

/* ============================================================
   Helpers
============================================================ */

function normalize(str: any): string {
  return (str ?? "").toString().toUpperCase();
}

function includes25_26(name: string): boolean {
  return name.includes("25/26");
}

function isPlayerVersion(name: string): boolean {
  return name.includes("PLAYER VERSION");
}

function getProductImage(p: any): string {
  return (
    p.imageUrls?.[0] ??
    p.image ??
    p.img ??
    p.src ??
    p.url ??
    p.mainImage ??
    FALLBACK_IMG
  );
}

function getProductPricing(p: any) {
  const priceCents =
    typeof p.basePrice === "number"
      ? p.basePrice
      : typeof p.priceCents === "number"
      ? p.priceCents
      : typeof p.price === "number"
      ? Math.round(p.price * 100)
      : null;

  return {
    priceCents,
  };
}

function formatEurFromCents(cents: number | null | undefined) {
  if (cents == null) return "";
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
}

/* ============================================================
   Product Card
============================================================ */

function ProductCard({ product }: { product: HomeProduct }) {
  const href = `/products/${product.slug ?? product.id}`;
  const imgSrc = getProductImage(product);
  const { priceCents } = getProductPricing(product);

  return (
    <Link
      href={href}
      className="group rounded-3xl overflow-hidden bg-white ring-1 ring-black/5 hover:ring-blue-300 hover:shadow-lg flex flex-col"
    >
      <div className="relative h-[240px] bg-slate-100">
        <img
          src={imgSrc}
          alt={product.name}
          className="h-full w-full object-cover"
        />
      </div>

      <div className="p-3">
        <p className="text-[11px] uppercase text-blue-700 tracking-wide">
          {product.team ?? ""}
        </p>

        <h3 className="text-sm font-semibold leading-snug mt-1">
          {product.name}
        </h3>

        <p className="text-blue-800 font-semibold mt-2">
          {formatEurFromCents(priceCents)}
        </p>
      </div>
    </Link>
  );
}

/* ============================================================
   FETCH + FILTRO (VERSÃO FINAL)
============================================================ */

async function getCurrentSeasonProducts(): Promise<HomeProduct[]> {
  let res;
  try {
    const base =
      process.env.NEXT_PUBLIC_VERCEL_URL &&
      !process.env.NEXT_PUBLIC_VERCEL_URL.startsWith("http")
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
        : process.env.NEXT_PUBLIC_VERCEL_URL || "";

    const url = `${base}/api/home-products?limit=500`;

    res = await fetch(url, { cache: "no-store" }).catch(() =>
      fetch("/api/home-products?limit=500", { cache: "no-store" })
    );
  } catch (err) {
    console.error("ERROR FETCHING:", err);
    return [];
  }

  if (!res || !res.ok) {
    console.error("FAILED REQUEST");
    return [];
  }

  const data = await res.json();
  const list = Array.isArray(data?.products)
    ? data.products
    : Array.isArray(data)
    ? data
    : [];

  // DEBUG — ver no terminal o nome dos produtos que chegaram
  console.log("TOTAL PRODUCTS:", list.length);
  console.log(
    "PRODUCT SAMPLES:",
    list.slice(0, 20).map((p: any) => p.name)
  );

  const filtered = list.filter((p: any) => {
    const name = normalize(p.name);
    return includes25_26(name) && !isPlayerVersion(name);
  });

  console.log("MATCHING 25/26:", filtered.length);
  console.log(
    "MATCHED ITEMS:",
    filtered.map((p: any) => p.name)
  );

  return filtered;
}

/* ============================================================
   PAGE
============================================================ */

export default async function CurrentSeasonPage() {
  const products = await getCurrentSeasonProducts();

  return (
    <main className="min-h-screen bg-white">
      <section className="container-fw pt-10 pb-20">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Current Season 25/26
        </h1>

        <p className="text-sm text-gray-600 mt-2">
          Showing all products with <b>"25/26"</b> in the name,
          excluding <b>Player Version</b>.
        </p>

        <div className="text-xs text-gray-500 mt-1">
          Found: <b>{products.length}</b> products
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mt-8">
            {products.map((p: any, i: number) => (
              <ProductCard key={i} product={p} />
            ))}
          </div>
        ) : (
          <div className="mt-10 p-6 border border-dashed rounded-xl bg-slate-50 text-sm text-gray-600">
            No products found with “25/26”.
          </div>
        )}

        <div className="mt-10 text-center">
          <Link href="/products" className="text-blue-700 underline">
            ← Back to all products
          </Link>
        </div>
      </section>
    </main>
  );
}
