// src/app/search/ResultsClient.tsx
"use client";

import { useEffect, useState } from "react";

type UIProduct = {
  id: string | number;
  name: string;
  slug?: string;
  img?: string;
  price?: number; // EUR
};

function formatEUR(value: number) {
  try {
    return value
      .toLocaleString("pt-PT", { style: "currency", currency: "EUR" })
      .replace(/\s/g, "");
  } catch {
    return `${value.toFixed(2)}€`;
  }
}

export default function ResultsClient({ initialQuery }: { initialQuery: string }) {
  const [q, setQ] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<UIProduct[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Sempre que a query muda (navegação ou submit), refaz o fetch
  useEffect(() => {
    setQ(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (!q) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/search?q=${encodeURIComponent(q)}`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Search failed (${r.status})`);
        const json = await r.json();
        const arr: UIProduct[] = Array.isArray(json?.products) ? json.products : [];
        if (!cancelled) setResults(arr);
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
  }, [q]);

  if (!q) {
    return (
      <p className="text-gray-500">
        Type something in the search box above.
      </p>
    );
  }

  if (loading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-3xl border bg-white/60 animate-pulse overflow-hidden">
            <div className="aspect-[4/5] bg-gray-200" />
            <div className="p-4 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-red-600">
        {error}
      </p>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {results.length === 0 && (
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
  );
}
