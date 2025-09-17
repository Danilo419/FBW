// Server Component — apenas faz o wrap em <Suspense>
import { Suspense } from "react";
import ProductsClient from "./ProductsClient";

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="container-fw py-16">
          <div className="rounded-2xl border bg-white p-5 text-center">
            Loading…
          </div>
        </main>
      }
    >
      <ProductsClient />
    </Suspense>
  );
}
