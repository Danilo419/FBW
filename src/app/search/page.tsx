// src/app/search/page.tsx
import { Search } from "lucide-react";

/* =========================== helpers =========================== */

function normalizePrice(input: unknown): number | undefined {
  if (input == null) return undefined;
  if (typeof input === "number") {
    if (input >= 1000) return Math.round(input) / 100;
    return input;
  }
  if (typeof input === "string") {
    const raw = input.trim().replace(/\s/g, "");
    if (/^\d+$/.test(raw)) return Number(raw) / 100;
    const n = Number(raw.replace(",", "."));
    return Number.isFinite(n) ? n : undefined;
  }
  if (typeof (input as any)?.toNumber === "function") {
    try {
      const n = (input as any).toNumber();
      return normalizePrice(n);
    } catch {}
  }
  if (typeof (input as any)?.toString === "function") {
    return normalizePrice((input as any).toString());
  }
  return undefined;
}

function formatEUR(value: number) {
  return value
    .toLocaleString("pt-PT", { style: "currency", currency: "EUR" })
    .replace(/\s/g, "");
}

/* =========================== tipos =========================== */

type UIProduct = {
  id: string | number;
  name: string;
  slug?: string;
  img?: string;
  price?: number; // EUR
};

export const revalidate = 0;

type PageProps = {
  searchParams?: { q?: string };
};

export default async function SearchPage({ searchParams }: PageProps) {
  const query = (searchParams?.q ?? "").toString().trim();

  let results: UIProduct[] = [];
  if (query) {
    try {
      // URL relativa — corre em RSC no servidor
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        const arr: any[] = Array.isArray(json?.products) ? json.products : [];
        results = arr.map((p: any): UIProduct => {
          const price = normalizePrice(
            p.price ?? p.basePrice ?? p.price_eur ?? p.amount ?? p.value
          );
          const img =
            p.img ??
            p.image ??
            p.imageUrl ??
            (Array.isArray(p.images) ? (p.images[0]?.url ?? p.images[0]) : undefined);

          return {
            id: p.id ?? p.slug ?? p.name,
            name: p.name ?? p.title ?? p.productName ?? "Product",
            slug: p.slug,
            img,
            price,
          };
        });
      }
    } catch {
      // mantém results=[]
    }
  }

  return (
    <div className="container-fw py-6 md:py-10">
      {/* Barra de pesquisa (mesmo estilo do header) */}
      <form
        action="/search"
        method="GET"
        className="relative mx-auto mb-8 max-w-4xl"
        role="search"
        aria-label="Site search"
      >
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-600/70" />
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search products..."
          className="w-full rounded-full border bg-gradient-to-r from-cyan-50 to-blue-50 pl-10 pr-28 py-3 outline-none ring-1 ring-blue-200/70 focus:ring-2 focus:ring-blue-500 shadow-[0_3px_0_0_rgba(37,99,235,0.15)_inset,0_1px_8px_rgba(59,130,246,0.15)]"
          autoComplete="off"
        />
        <button
          type="submit"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 active:scale-[0.99] transition"
        >
          Search
        </button>
      </form>

      {/* Resultados */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {!!query && results.length === 0 && (
          <p className="text-gray-500 col-span-full">
            No products found. Try another term.
          </p>
        )}

        {results.map((p) => {
          const href = p.slug ? `/products/${p.slug}` : undefined;
          const priceLabel =
            typeof p.price === "number" ? formatEUR(p.price) : undefined;

          return (
            <a
              key={String(p.id)}
              href={href}
              className="group rounded-3xl border bg-white/60 backdrop-blur hover:bg-white transition shadow-sm hover:shadow-lg overflow-hidden flex flex-col"
            >
              <div className="relative aspect-[4/5]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={p.name}
                  src={
                    p.img ||
                    "https://dummyimage.com/800x1000/f3f4f6/8f9094&text=No+image"
                  }
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>

              <div className="p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{p.name}</div>
                  {href && (
                    <div className="text-xs text-gray-500 group-hover:underline">
                      Open product page
                    </div>
                  )}
                </div>

                {priceLabel && (
                  <div className="shrink-0 text-sm font-semibold text-black">
                    {priceLabel}
                  </div>
                )}
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
