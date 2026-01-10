"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";

type Confederation = "UEFA" | "CONMEBOL" | "CONCACAF" | "CAF" | "AFC" | "OFC";

type Nation = {
  name: string;
  flag: string; // emoji
  confed: Confederation;
  slug: string; // usado para montar o link
  popular?: boolean;
};

const NATIONS: Nation[] = [
  // UEFA
  { name: "Portugal", flag: "🇵🇹", confed: "UEFA", slug: "portugal", popular: true },
  { name: "Spain", flag: "🇪🇸", confed: "UEFA", slug: "spain", popular: true },
  { name: "France", flag: "🇫🇷", confed: "UEFA", slug: "france", popular: true },
  { name: "England", flag: "🏴", confed: "UEFA", slug: "england", popular: true },
  { name: "Germany", flag: "🇩🇪", confed: "UEFA", slug: "germany", popular: true },
  { name: "Italy", flag: "🇮🇹", confed: "UEFA", slug: "italy" },
  { name: "Netherlands", flag: "🇳🇱", confed: "UEFA", slug: "netherlands" },
  { name: "Belgium", flag: "🇧🇪", confed: "UEFA", slug: "belgium" },
  { name: "Croatia", flag: "🇭🇷", confed: "UEFA", slug: "croatia" },

  // CONMEBOL
  { name: "Brazil", flag: "🇧🇷", confed: "CONMEBOL", slug: "brazil", popular: true },
  { name: "Argentina", flag: "🇦🇷", confed: "CONMEBOL", slug: "argentina", popular: true },
  { name: "Uruguay", flag: "🇺🇾", confed: "CONMEBOL", slug: "uruguay" },
  { name: "Colombia", flag: "🇨🇴", confed: "CONMEBOL", slug: "colombia" },
  { name: "Chile", flag: "🇨🇱", confed: "CONMEBOL", slug: "chile" },

  // CONCACAF
  { name: "USA", flag: "🇺🇸", confed: "CONCACAF", slug: "usa", popular: true },
  { name: "Mexico", flag: "🇲🇽", confed: "CONCACAF", slug: "mexico", popular: true },
  { name: "Canada", flag: "🇨🇦", confed: "CONCACAF", slug: "canada" },

  // CAF
  { name: "Morocco", flag: "🇲🇦", confed: "CAF", slug: "morocco", popular: true },
  { name: "Nigeria", flag: "🇳🇬", confed: "CAF", slug: "nigeria" },
  { name: "Senegal", flag: "🇸🇳", confed: "CAF", slug: "senegal" },
  { name: "Egypt", flag: "🇪🇬", confed: "CAF", slug: "egypt" },
  { name: "Ghana", flag: "🇬🇭", confed: "CAF", slug: "ghana" },

  // AFC
  { name: "Japan", flag: "🇯🇵", confed: "AFC", slug: "japan", popular: true },
  { name: "South Korea", flag: "🇰🇷", confed: "AFC", slug: "south-korea" },
  { name: "Saudi Arabia", flag: "🇸🇦", confed: "AFC", slug: "saudi-arabia" },

  // OFC
  { name: "New Zealand", flag: "🇳🇿", confed: "OFC", slug: "new-zealand" },
];

const CONFEDS: (Confederation | "ALL")[] = ["ALL", "UEFA", "CONMEBOL", "CONCACAF", "CAF", "AFC", "OFC"];

function cn(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

export default function NationsClient() {
  const [query, setQuery] = useState("");
  const [confed, setConfed] = useState<Confederation | "ALL">("ALL");
  const [onlyPopular, setOnlyPopular] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return NATIONS
      .filter((n) => (confed === "ALL" ? true : n.confed === confed))
      .filter((n) => (onlyPopular ? !!n.popular : true))
      .filter((n) => (q ? n.name.toLowerCase().includes(q) : true))
      .sort((a, b) => {
        // populares primeiro, depois alfabético
        const ap = a.popular ? 1 : 0;
        const bp = b.popular ? 1 : 0;
        if (bp !== ap) return bp - ap;
        return a.name.localeCompare(b.name);
      });
  }, [query, confed, onlyPopular]);

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Header / Hero */}
      <div className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        </div>

        <div className="relative mx-auto w-full max-w-6xl px-4 py-10 md:py-14">
          <div className="flex flex-col gap-3">
            <p className="text-xs tracking-widest text-white/60">SHOP BY COUNTRY</p>
            <h1 className="text-3xl font-semibold md:text-5xl">Nations</h1>
            <p className="max-w-2xl text-sm text-white/70 md:text-base">
              Encontra a tua seleção favorita e explora kits, treinos e mais. Usa a pesquisa e os filtros para chegar rápido ao que queres.
            </p>
          </div>

          {/* Controls */}
          <div className="mt-7 grid grid-cols-1 gap-3 md:grid-cols-12">
            {/* Search */}
            <div className="md:col-span-6">
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <span className="text-white/60">🔎</span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Pesquisar país (ex: Portugal, Brazil, Japan...)"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-white/40"
                />
              </div>
            </div>

            {/* Confederation */}
            <div className="md:col-span-4">
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                <span className="text-white/60">🌍</span>
                <select
                  value={confed}
                  onChange={(e) => setConfed(e.target.value as any)}
                  className="w-full bg-transparent text-sm outline-none"
                >
                  {CONFEDS.map((c) => (
                    <option key={c} value={c} className="bg-neutral-900">
                      {c === "ALL" ? "All confederations" : c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Popular toggle */}
            <div className="md:col-span-2">
              <button
                onClick={() => setOnlyPopular((v) => !v)}
                className={cn(
                  "w-full rounded-2xl border px-4 py-3 text-sm transition",
                  onlyPopular ? "border-white/20 bg-white text-neutral-950" : "border-white/10 bg-white/5 hover:bg-white/10"
                )}
              >
                {onlyPopular ? "⭐ Popular" : "Popular"}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 text-sm text-white/60">
            A mostrar <span className="text-white">{filtered.length}</span> {filtered.length === 1 ? "país" : "países"}.
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        {filtered.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
            <div className="text-3xl">😵‍💫</div>
            <h2 className="mt-3 text-lg font-semibold">Nada encontrado</h2>
            <p className="mt-1 text-sm text-white/60">
              Tenta outro termo de pesquisa ou muda o filtro da confederação.
            </p>
            <button
              onClick={() => {
                setQuery("");
                setConfed("ALL");
                setOnlyPopular(false);
              }}
              className="mt-5 rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm hover:bg-white/15"
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filtered.map((n) => (
              <NationCard key={n.slug} nation={n} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NationCard({ nation }: { nation: Nation }) {
  // Ajusta aqui o destino:
  // - se já tens páginas/rotas de seleções, usa `/nations/${nation.slug}`
  // - se queres filtrar produtos via query, usa `/products?nation=${nation.slug}`
  const href = `/products?nation=${encodeURIComponent(nation.slug)}`;

  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
    >
      <div className="flex items-start justify-between">
        <div className="text-3xl leading-none">{nation.flag}</div>
        {nation.popular && (
          <div className="rounded-full border border-white/10 bg-white/10 px-2 py-1 text-[10px] text-white/80">
            ⭐ Popular
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="text-sm font-semibold">{nation.name}</div>
        <div className="mt-1 text-xs text-white/60">{nation.confed}</div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-white/60">
        <span className="rounded-full border border-white/10 bg-white/10 px-2 py-1">Shop</span>
        <span className="opacity-0 transition group-hover:opacity-100">→</span>
      </div>

      <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
        <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
      </div>
    </Link>
  );
}
