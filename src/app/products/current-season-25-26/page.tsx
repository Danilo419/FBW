// src/app/products/current-season-25-26/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

/* ============================ Tipagem (igual ao search) ============================ */

type UIProduct = {
  id: string | number
  name: string
  slug?: string
  img?: string
  price?: number // EUR (ex.: 34.99)
  team?: string | null
}

/* ============================ Promo map (EUR) ============================ */
const SALE_MAP_EUR: Record<number, number> = {
  29.99: 70,
  34.99: 100,
  39.99: 120,
  44.99: 150,
  49.99: 165,
  59.99: 200,
  69.99: 230,
}

function toCents(eur?: number | null) {
  if (typeof eur !== 'number' || Number.isNaN(eur)) return null
  return Math.round(eur * 100)
}

function getSale(priceEur?: number | null) {
  if (typeof priceEur !== 'number') return null
  const key = Number(priceEur.toFixed(2))
  const oldEur = SALE_MAP_EUR[key as keyof typeof SALE_MAP_EUR]
  if (!oldEur) return null
  const now = toCents(priceEur)!
  const old = toCents(oldEur)!
  const pct = Math.round((1 - now / old) * 100)
  return { compareAtCents: old, pct }
}

/** "150,00 €" */
function moneyAfter(cents: number) {
  const n = (cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${n} €`
}

/** Euros / cêntimos / símbolo */
function pricePartsFromCents(cents: number) {
  const euros = Math.floor(cents / 100).toString()
  const dec = (cents % 100).toString().padStart(2, '0')
  return { int: euros, dec, sym: '€' }
}

/* ========= Extração do NOME DO CLUBE (mesmo código do search) ========= */

const CLUB_PATTERNS: Array<[RegExp, string]> = [
  [/\b(real\s*madrid|madrid)\b/i, 'Real Madrid'],
  [/\b(fc\s*)?barcelona|barça\b/i, 'FC Barcelona'],
  [/\batl[eé]tico\s*(de\s*)?madrid\b/i, 'Atlético de Madrid'],
  [/\b(real\s*)?betis\b/i, 'Real Betis'],
  [/\bsevilla\b/i, 'Sevilla FC'],
  [/\breal\s*sociedad\b/i, 'Real Sociedad'],
  [/\bvillarreal\b/i, 'Villarreal'],
  [/\bsl?\s*benfica|benfica\b/i, 'SL Benfica'],
  [/\bfc\s*porto|porto\b/i, 'FC Porto'],
  [/\bsporting(?!.*gij[oó]n)\b|\bsporting\s*cp\b/i, 'Sporting CP'],
  [/\bsc\s*braga|braga\b/i, 'SC Braga'],
  [/\bv[itó|ito]ria\s*(sc)?\b/i, 'Vitória SC'],
]

function normalizeStr(s?: string | null) {
  return (s ?? '').replace(/\s{2,}/g, ' ').trim()
}

function clubFromString(input?: string | null): string | null {
  const s = normalizeStr(input)
  if (!s) return null
  for (const [re, club] of CLUB_PATTERNS) {
    if (re.test(s)) return club
  }
  return null
}

/** Obtém SEMPRE só o nome do clube (capitalização normal) */
function getClubLabel(p: UIProduct): string {
  const byTeam = clubFromString(p.team)
  if (byTeam) return byTeam

  const byName = clubFromString(p.name)
  if (byName) return byName

  return 'Club'
}

/* ============================ Card de produto (igual ao da search) ============================ */

function ProductCard({ p }: { p: UIProduct }) {
  const href = p.slug ? `/products/${p.slug}` : '#'
  const cents = typeof p.price === 'number' ? toCents(p.price)! : null
  const sale = cents != null ? getSale(p.price!) : null
  const parts = cents != null ? pricePartsFromCents(cents) : null
  const teamLabel = getClubLabel(p)

  return (
    <a
      key={String(p.id)}
      href={href}
      className="group block rounded-3xl bg-white/90 backdrop-blur-sm ring-1 ring-slate-200 shadow-sm hover:shadow-xl hover:ring-sky-200 transition duration-300 overflow-hidden relative"
    >
      {sale && (
        <div className="absolute left-3 top-3 z-10 rounded-full bg-red-600 text-white px-2.5 py-1 text-xs font-extrabold shadow-md ring-1 ring-red-700/40">
          -{sale.pct}%
        </div>
      )}

      <div className="flex flex-col h-full">
        <div className="relative aspect-[4/5] bg-gradient-to-b from-slate-50 to-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={p.name}
            src={
              p.img ||
              'data:image/svg+xml;utf8,' +
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

        <div className="p-5 flex flex-col grow">
          <div className="text-[11px] uppercase tracking-wide text-sky-600 font-semibold/relaxed">
            {teamLabel}
          </div>

          <div className="mt-1 text-base font-semibold text-slate-900 leading-tight line-clamp-2">
            {p.name}
          </div>

          <div className="mt-4">
            <div className="flex items-end gap-2">
              {sale && (
                <div className="text-[13px] text-slate-500 line-through">
                  {moneyAfter(sale.compareAtCents)}
                </div>
              )}

              {parts && (
                <div className="flex items-end" style={{ color: '#1c40b7' }}>
                  <span className="text-2xl font-semibold tracking-tight leading-none">
                    {parts.int}
                  </span>
                  <span className="text-[13px] font-medium translate-y-[1px]">
                    ,{parts.dec}
                  </span>
                  <span className="text-[15px] font-medium translate-y-[1px] ml-1">
                    {parts.sym}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-auto">
            <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
            <div className="h-12 flex items-center gap-2 text-sm font-medium text-slate-700">
              <span className="transition group-hover:translate-x-0.5">View product</span>
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
  )
}

/* ============================ Página 25/26 ============================ */

const PAGE_SIZE = 12

export default function CurrentSeasonPage() {
  const [results, setResults] = useState<UIProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  // fetch FIXO: q=25/26  → o backend devolve todos os produtos cujo nome contém "25/26"
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const qParam = `?q=${encodeURIComponent('25/26')}`

    fetch(`/api/search${qParam}`, { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Search failed (${r.status})`)
        const json = await r.json()
        const arr: UIProduct[] = Array.isArray(json?.products)
          ? json.products
          : []

        // por precaução, ainda filtramos pelo nome conter "25/26"
        const filtered = arr.filter((p) =>
          p.name?.toLowerCase().includes('25/26'.toLowerCase())
        )

        if (!cancelled) {
          setResults(filtered)
          setPage(1)
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setResults([])
          setError(e?.message || 'Search error')
        }
      })
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [])

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(results.length / PAGE_SIZE)),
    [results.length]
  )

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    const end = start + PAGE_SIZE
    return results.slice(start, end)
  }, [results, page])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [page])

  return (
    <main className="min-h-screen bg-white">
      <section className="container-fw pt-10 pb-16 md:pt-12 md:pb-20">
        {/* Header */}
        <header className="mb-8 md:mb-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">
            Product category
          </p>
          <h1 className="mt-2 text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
            Current season 25/26
          </h1>
          <p className="mt-3 max-w-2xl text-sm sm:text-base text-gray-600">
            All products whose name contains <strong>&quot;25/26&quot;</strong>.
          </p>

          <div className="mt-3 text-xs sm:text-sm text-gray-500">
            {loading ? (
              'Loading products...'
            ) : error ? (
              <>Error loading products: {error}</>
            ) : results.length > 0 ? (
              <>
                Showing{' '}
                <span className="font-semibold">{pageItems.length}</span> of{' '}
                <span className="font-semibold">{results.length}</span> products (page{' '}
                {page} of {totalPages}).
              </>
            ) : (
              'No products with "25/26" in the name were found.'
            )}
          </div>
        </header>

        {/* GRID – máx 4 por linha, 12 por página */}
        {loading && (
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
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
        )}

        {!loading && !error && (
          <>
            <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {pageItems.length === 0 && (
                <p className="text-gray-500 col-span-full">
                  No products with &quot;25/26&quot; in the name were found.
                </p>
              )}

              {pageItems.map((p) => (
                <ProductCard key={String(p.id)} p={p} />
              ))}
            </div>

            {/* Paginação: « 1 2 3 » */}
            {results.length > PAGE_SIZE && (
              <nav className="mt-10 flex items-center justify-center gap-2 select-none">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-2 rounded-xl ring-1 ring-slate-200 bg-white/80 disabled:opacity-40 hover:ring-sky-200 hover:shadow-sm transition"
                  aria-label="Previous page"
                >
                  «
                </button>

                <div className="flex flex-wrap items-center justify-center gap-2">
                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const n = idx + 1
                    const active = n === page
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setPage(n)}
                        className={[
                          'min-w-[40px] px-3 py-2 rounded-xl ring-1 transition',
                          active
                            ? 'bg-sky-600 text-white ring-sky-600 shadow-sm'
                            : 'bg-white/80 text-slate-800 ring-slate-200 hover:ring-sky-200 hover:shadow-sm',
                        ].join(' ')}
                        aria-current={active ? 'page' : undefined}
                      >
                        {n}
                      </button>
                    )
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-2 rounded-xl ring-1 ring-slate-200 bg-white/80 disabled:opacity-40 hover:ring-sky-200 hover:shadow-sm transition"
                  aria-label="Next page"
                >
                  »
                </button>
              </nav>
            )}
          </>
        )}

        {/* Link de fallback para catálogo completo */}
        <div className="mt-10 text-center">
          <Link
            href="/products"
            className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 hover:border-blue-500 hover:text-blue-700"
          >
            ← Back to all products
          </Link>
        </div>
      </section>
    </main>
  )
}
