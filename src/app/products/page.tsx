// src/app/products/page.tsx
import { Suspense } from "react";
import dynamic from "next/dynamic";

const ProductsClient = dynamic(() => import("./ProductsClient"), {
  ssr: false, // garante que qualquer hook de navegação só corre no cliente
});

export default function Page() {
  return (
    <Suspense fallback={<div className="container-fw py-16">Loading…</div>}>
      <ProductsClient />
    </Suspense>
  );
}
