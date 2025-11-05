// src/app/search/ResultsClient.tsx
"use client";

import { useEffect, useState } from "react";

type UIProduct = {
  id: string | number;
  name: string;
  slug?: string;
  img?: string;
  price?: number; // EUR (ex.: 34.99)
  team?: string | null; // <- pode vir da API
};

/* ============================ Promo map (EUR) ============================ */
const SALE_MAP_EUR: Record<number, number> = {
  34.99: 100,
  39.99: 120,
  44.99: 150,
  49.99: 160,
};

function toCents(eur?: number | null) {
  if (typeof eur !== "number" || Number.isNaN(eur)) return null;
  return Math.round(eur * 100);
}

function getSale(priceEur?: number | null) {
  if (typeof priceEur !== "number") return null;
  const key = Number(priceEur.toFixed(2));
  const oldEur = SALE_MAP_EUR[key as keyof typeof SALE_MAP_EUR];
  if (!oldEur) return null;
  const now = toCents(priceEur)!;
  const old = toCents(oldEur)!;
  const pct = Math.round((1 - now / old) * 100);
  return { compareAtCents: old, pct };
}

function money(cents: number) {
  return (cents / 100).toLocaleString(undefined, { style: "currency", currency: "EUR" });
}

/** Divide o preço em partes para estilização (€ / euros / cêntimos) */
function pricePartsFromCents(cents: number) {
  const euros = Math.floor(cents / 100).toString();
  const dec = (cents % 100).toString().padStart(2, "0");
  return { sym: "€", int: euros, dec };
}

/* ========= Heurística simples para extrair clube do nome quando a API não envia ========= */
const STOP_WORDS = [
  "home", "away", "second", "third", "fourth", "jersey", "shirt", "kit",
  "adult", "kids", "youth",
];
const YEAR_RE = /\b(19|20)\d{2}\/?(?:\d{2})?\b/gi;

function guessTeamFromName(name?: string): string | null {
  if (!name) return null;
  let s = name.replace(YEAR_RE, "").trim();

  // corta no primeiro stop word (ex.: "FC Barcelona Third Jersey" -> "FC Barcelona")
  const lower = s.toLowerCase();
  let cutIdx = -1;
  for (const w of STOP_WORDS) {
    const i = lower.indexOf(` ${w} `);
    if (i !== -1) cutIdx = cutIdx === -1 ? i : Math.min(cutIdx, i);
  }
  if (cutIdx !== -1) s = s.slice(0, cutIdx).trim();

  // remove números/resíduos finais
  s = s.replace(/\s+\d+.*/, "").trim();

  // normalizações rápidas
  s = s
    .replace(/^club\s+de\s+futebol\s+/i, "")
    .replace(/^futebol\s+clube\s+/i, "")
    .replace(/^sport\s+club\s+/i, "")
    .replace(/^sporting\s+clube\s+de\s+/i, "")
    .replace(/\s+football\s+club$/i, "")
    .replace(/\s+fc$/i, (m) => (/\bbarcelona\b|\bporto\b|\bbenfica\b/i.test(s) ? "" : m)) // mantém FC quando for parte do nome
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!s) return null;

  // Se o nome incluir "FC <Team>" mostra só o <Team> em maiúsculas como no resto do site
  const fc = s.match(/^(?:[A-Z]{0,3}\s*)?(?:FC|S?L|SC)\s+(.+)$/i);
  const out = (fc ? fc[1] : s).trim();
  return out ? out.toUpperCase() : null;
}

/* ============================ Componente ============================ */
export default function ResultsClient({ initialQuery }: { initialQuery: string }) {
  const [q, setQ] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<UIProduct[]>([]);
  const [error, setError] = useState<string | null>(null);

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
    return <p className="text-gray-500">Type something in the search box above.</p>;
  }

  if (loading) {
    return (
      <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="rounded-3xl bg-white/90 backdrop-blur-sm ring-1 ring-slate-200 shadow-sm overflow-hidden animate-pulse"
          >
            <div className="aspect-[4/5] bg-slate-100" />
            <div className="p-5">
              <div className="h-3 w-24 bg-slate-200 rounded mb-2" />
              <div className="h-4 w-3/4 bg-slate-200 rounded mb-4" />
              <div className="h-3 w-20 bg-slate-200 rounded" />
              <div className="mt-6 h-px bg-slate-200/70" />
              <div className="h-12" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  return (
    <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {results.length === 0 && (
        <p className="text-gray-500 col-span-full">No products found. Try another term.</p>
      )}

      {results.map((p) => {
        const href = p.slug ? `/products/${p.slug}` : undefined;
        const cents = typeof p.price === "number" ? toCents(p.price)! : null;
        const sale = cents != null ? getSale(p.price!) : null;
        const parts = cents != null ? pricePartsFromCents(cents) : null;

        // etiqueta: usa p.team se houver; senão, tenta adivinhar; fallback "Product"
        const teamLabel =
          (typeof p.team === "string" && p.team.trim()) ||
          guessTeamFromName(p.name) ||
          "Product";

        return (
          <a
            key={String(p.id)}
            href={href}
            className="group block rounded-3xl bg-white/90 backdrop-blur-sm ring-1 ring-slate-200 shadow-sm hover:shadow-xl hover:ring-sky-200 transition duration-300 overflow-hidden"
          >
            {/* Sticker vermelho com % */}
            {sale && (
              <div className="absolute left-3 top-3 z-10 rounded-full bg-red-600 text-white px-2.5 py-1 text-xs font-extrabold shadow-md ring-1 ring-red-700/40">
                -{sale.pct}%
              </div>
            )}

            {/* Layout em coluna para fixar footer */}
            <div className="flex flex-col h-full">
              {/* Imagem */}
              <div className="relative aspect-[4/5] bg-gradient-to-b from-slate-50 to-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={p.name}
                  src={
                    p.img ||
                    "data:image/svg+xml;utf8," +
                      encodeURIComponent(
                        `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='1000' viewBox='0 0 800 1000'>
                          <rect width='100%' height='100%' fill='#f3f4f6'/>
                          <text x='50%' y='50%' text-anchor='middle' dominant-baseline='middle'
                            font-family='system-ui,Segoe UI,Roboto,Ubuntu,Helvetica,Arial' font-size='26' fill='#9ca3af'>No image</text>
                        </svg>`
                      )
                  }
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-contain p-6 transition-transform duration-300 group-hover:scale-105"
                />
              </div>

              {/* Conteúdo */}
              <div className="p-5 flex flex-col grow">
                {/* Etiqueta com o nome do clube */}
                <div className="text-[11px] uppercase tracking-wide text-sky-600 font-semibold/relaxed">
                  {teamLabel}
                </div>

                <div className="mt-1 text-base font-semibold text-slate-900 leading-tight line-clamp-2">
                  {p.name}
                </div>

                {/* Preços */}
                <div className="mt-4">
                  {sale && (
                    <div className="mb-1 text-[13px] text-slate-500 line-through">
                      {money(sale.compareAtCents)}
                    </div>
                  )}

                  {parts && (
                    <div className="flex items-end gap-0.5 text-slate-900">
                      <span className="text-[15px] font-medium translate-y-[1px]">
                        {parts.sym}
                      </span>
                      <span className="text-2xl font-semibold tracking-tight leading-none">
                        {parts.int}
                      </span>
                      <span className="text-[13px] font-medium translate-y-[1px]">
                        ,{parts.dec}
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer preso ao fundo com CTA centrada verticalmente */}
                <div className="mt-auto">
                  <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                  <div className="h-12 flex items-center gap-2 text-sm font-medium text-slate-700">
                    <span className="transition group-hover:translate-x-0.5">
                      View product
                    </span>
                    <svg
                      className="h-4 w-4 opacity-70 group-hover:opacity-100 transition group-hover:translate-x-0.5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}
