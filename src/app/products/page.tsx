// src/app/products/page.tsx
import { Suspense } from "react";
import ProductsClient from "./ProductsClient";

// Re-export para manter compatibilidade com importações existentes,
// p.ex. src/app/clubs/ClubsClient.tsx importa de "../products/page"
export { leagueClubs, type LeagueKey, clubImg } from "./data";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="container-fw py-16">
          <div className="rounded-2xl border bg-white p-6">Loading products…</div>
        </div>
      }
    >
      <ProductsClient />
    </Suspense>
  );
}
