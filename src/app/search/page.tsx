// src/app/search/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import ResultsClient from "./ResultsClient";

type PageProps = {
  searchParams?: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: PageProps) {
  const { q } = (await searchParams) ?? {};
  const query = (q ?? "").toString().trim();

  return (
    <div className="container-fw py-6 md:py-10">
      {/* Sem barra de pesquisa. Apenas os resultados + paginação */}
      <ResultsClient initialQuery={query} />
    </div>
  );
}
