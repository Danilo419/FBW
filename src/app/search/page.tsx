// src/app/search/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Search } from "lucide-react";
import ResultsClient from "./ResultsClient";

type PageProps = {
  searchParams?: { q?: string };
};

export default function SearchPage({ searchParams }: PageProps) {
  const query = (searchParams?.q ?? "").toString().trim();

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

      {/* Resultados carregados no cliente para evitar issues de SSR/cache */}
      <ResultsClient initialQuery={query} />
    </div>
  );
}
