// src/app/products/page.tsx
import { Suspense } from "react";
import ProductsClient from "./ProductsClient";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="container-fw py-16">
          <p>Loading…</p>
        </div>
      }
    >
      <ProductsClient />
    </Suspense>
  );
}
