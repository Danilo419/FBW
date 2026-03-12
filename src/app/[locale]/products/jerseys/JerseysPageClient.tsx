"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Link } from "@/i18n/navigation";

/* ============================================================
   Tipos
============================================================ */

type UIProduct = {
  id: string | number;
  name: string;
  slug?: string;
  img?: string | null;
  price?: number;
  team?: string | null;
};

const FALLBACK_IMG = "/images/players/RealMadrid/RealMadrid12.png";

/* ============================================================
   Promo / Preços
============================================================ */

const SALE_MAP_EUR: Record<number, number> = {
  29.99: 70,
  34.99: 100,
  39.99: 120,
  44.99: 150,
  49.99: 165,
  59.99: 200,
  69.99: 230,
};

function toCents(eur?: number | null) {
  if (typeof eur !== "number" || Number.isNaN(eur)) return null;
  return Math.round(eur * 100);
}

function getSale(priceEur?: number | null) {
  if (typeof priceEur !== "number") return null;

  const key = Number(priceEur.toFixed(2));
  const oldEur = SALE_MAP_EUR[key];

  if (!oldEur) return null;

  const now = toCents(priceEur)!;
  const old = toCents(oldEur)!;

  const pct = Math.round((1 - now / old) * 100);

  return { compareAtCents: old, pct };
}

function moneyAfter(cents: number) {
  const n = (cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${n} €`;
}

function pricePartsFromCents(cents: number) {
  const euros = Math.floor(cents / 100).toString();
  const dec = (cents % 100).toString().padStart(2, "0");

  return { int: euros, dec, sym: "€" };
}

/* ============================================================
   Club detection
============================================================ */

const CLUB_PATTERNS: Array<[RegExp, string]> = [
  [/\breal\s*madrid\b/i, "Real Madrid"],
  [/\b(fc\s*)?barcelona|barça\b/i, "FC Barcelona"],
  [/\batl[eé]tico\s*(de\s*)?madrid\b/i, "Atlético de Madrid"],
  [/\breal\s*betis\b/i, "Real Betis"],
  [/\bsevilla\b/i, "Sevilla FC"],
  [/\breal\s*sociedad\b/i, "Real Sociedad"],
  [/\bvillarreal\b/i, "Villarreal"],
  [/\bsl?\s*benfica|benfica\b/i, "SL Benfica"],
  [/\bfc\s*porto|porto\b/i, "FC Porto"],
  [/\bsporting\s*cp|sporting\b/i, "Sporting CP"],
  [/\bsc\s*braga|braga\b/i, "SC Braga"],
];

function normalizeStr(s?: string | null) {
  return (s ?? "").replace(/\s{2,}/g, " ").trim();
}

function clubFromString(input?: string | null): string | null {
  const s = normalizeStr(input);

  if (!s) return null;

  for (const [re, club] of CLUB_PATTERNS) {
    if (re.test(s)) return club;
  }

  return null;
}

function getClubLabel(p: UIProduct): string {
  const team = normalizeStr(p.team);

  if (team) {
    const byPattern = clubFromString(team);
    if (byPattern) return byPattern;
    return team.split(" ")[0];
  }

  const byName = clubFromString(p.name);

  if (byName) return byName;

  return "";
}

/* ============================================================
   Filtro jerseys
============================================================ */

function normName(p: UIProduct) {
  return (p.name ?? "").toUpperCase();
}

function isStandardShortSleeveJersey(p: UIProduct): boolean {
  const n = normName(p);

  if (!n) return false;

  if (n.includes("PLAYER VERSION")) return false;
  if (n.includes("LONG SLEEVE")) return false;
  if (n.includes("RETRO")) return false;

  if (n.includes("SET")) return false;
  if (n.includes("SHORTS")) return false;
  if (n.includes("TRACKSUIT")) return false;
  if (n.includes("CROP TOP")) return false;
  if (n.includes("KIT")) return false;

  return true;
}

/* ============================================================
   Card
============================================================ */

function ProductCard({ p }: { p: UIProduct }) {
  const href = p.slug ? `/products/${p.slug}` : undefined;

  const cents = typeof p.price === "number" ? toCents(p.price)! : null;
  const sale = cents != null ? getSale(p.price!) : null;
  const parts = cents != null ? pricePartsFromCents(cents) : null;

  const teamLabel = getClubLabel(p);

  const cardInner = (
    <>
      {sale && (
        <div className="absolute left-2 top-2 z-10 rounded-full bg-red-600 px-2 py-1 text-xs font-bold text-white">
          -{sale.pct}%
        </div>
      )}

      <div className="relative aspect-[4/5] bg-gray-100">
        <img
          alt={p.name}
          src={p.img || FALLBACK_IMG}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-contain p-4"
        />
      </div>

      <div className="p-4">
        {teamLabel && (
          <div className="text-xs font-semibold text-blue-700 uppercase">
            {teamLabel}
          </div>
        )}

        <div className="mt-1 line-clamp-2 text-sm font-semibold">
          {p.name}
        </div>

        <div className="mt-2 flex items-end gap-2">
          {sale && (
            <div className="text-xs text-gray-500 line-through">
              {moneyAfter(sale.compareAtCents)}
            </div>
          )}

          {parts && (
            <div className="text-lg font-semibold text-blue-700">
              {parts.int},{parts.dec}{parts.sym}
            </div>
          )}
        </div>
      </div>
    </>
  );

  if (!href) return <div className="border rounded-xl">{cardInner}</div>;

  return (
    <Link href={href} className="border rounded-xl block">
      {cardInner}
    </Link>
  );
}

/* ============================================================
   Página principal
============================================================ */

export default function JerseysPageClient() {
  const [results, setResults] = useState<UIProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    setLoading(true);

    fetch("/api/jerseys", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        setResults(Array.isArray(json?.products) ? json.products : []);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let base = results.filter(isStandardShortSleeveJersey);

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toUpperCase();

      base = base.filter((p) => {
        const name = (p.name ?? "").toUpperCase();
        const team = (p.team ?? "").toUpperCase();

        return name.includes(q) || team.includes(q);
      });
    }

    return base;
  }, [results, searchTerm]);

  return (
    <div className="min-h-screen bg-white">

      <section className="border-b py-10">
        <div className="container-fw px-4">

          <h1 className="text-3xl font-bold">
            Standard Short Sleeve Jerseys
          </h1>

          <p className="mt-2 text-gray-600 text-sm">
            Standard short sleeve jerseys (excluding Retro, Long Sleeve and Player Version)
          </p>

          <div className="mt-6 relative w-full max-w-sm">

            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />

            <input
              type="search"
              placeholder="Search by team or jersey name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-full border px-9 py-2"
            />

          </div>

        </div>
      </section>

      <section className="container-fw px-4 py-8">

        {loading && (
          <p className="text-gray-500 text-sm">Loading jerseys…</p>
        )}

        {!loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">

            {filtered.map((p) => (
              <ProductCard key={String(p.id)} p={p} />
            ))}

          </div>
        )}

      </section>

    </div>
  );
}