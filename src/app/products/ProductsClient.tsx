// src/app/products/ProductsClient.tsx
"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function ProductsClient() {
  const sp = useSearchParams();
  const q = sp.get("q") || "";

  return (
    <div className="container-fw py-16">
      <h1 className="text-3xl font-extrabold mb-6">Products</h1>

      {q ? (
        <p className="mb-4 text-sm text-gray-600">
          Filtering by: <b>{q}</b>
        </p>
      ) : null}

      <p className="text-gray-600">Browse our catalog.</p>

      <div className="mt-6">
        <Link className="btn-outline" href="/clubs?league=premier-league">
          Shop by clubs →
        </Link>
      </div>
    </div>
  );
}
