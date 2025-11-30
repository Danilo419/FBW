// src/app/search/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import ResultsClient from "./ResultsClient";

export default function SearchPage({ searchParams }: any) {
  // Suporta tanto objeto simples como algo tipo URLSearchParams
  const rawQ =
    searchParams?.q ??
    (typeof searchParams?.get === "function"
      ? searchParams.get("q")
      : undefined);

  const query =
    typeof rawQ === "string"
      ? rawQ.trim()
      : Array.isArray(rawQ)
      ? (rawQ[0] ?? "").trim()
      : "";

  return (
    <div className="min-h-screen bg-white">
      <div className="container-fw pt-4 pb-8 md:pt-6 md:pb-12">
        {/* Sem barra de pesquisa. Apenas os resultados + paginação */}
        <ResultsClient initialQuery={query} />
      </div>
    </div>
  );
}
