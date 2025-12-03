// src/app/products/jerseys/JerseysClient.tsx
'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Loader2, Search } from 'lucide-react'

const FALLBACK_IMG = '/images/players/RealMadrid/RealMadrid12.png'

type HomeProduct = any

// ---------- Helpers partilhados com a Home ----------

function normalizeName(p: HomeProduct): string {
  return ((p.name ?? '') as string).toUpperCase()
}

function hasTerm(p: HomeProduct, term: string): boolean {
  return normalizeName(p).includes(term.toUpperCase())
}

function isPlayerVersion(p: HomeProduct): boolean {
  return hasTerm(p, 'PLAYER VERSION')
}

function isLongSleeve(p: HomeProduct): boolean {
  return hasTerm(p, 'LONG SLEEVE')
}

function isRetro(p: HomeProduct): boolean {
  return hasTerm(p, 'RETRO')
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const SALE_MAP_EUR: Record<number, number> = {
  29.99: 70,
  34.99: 100,
  39.99: 120,
  44.99: 150,
  49.99: 165,
  59.99: 200,
  69.99: 230,
}

const SALE_MAP_CENTS: Record<number, number> = Object.fromEntries(
  Object.entries(SALE_MAP_EUR).map(([k, v]) => [
    Math.round(parseFloat(k) * 100),
    Math.round(v * 100),
  ])
) as Record<number, number>

function formatEurFromCents(cents: number | null | undefined) {
  if (cents == null) return ''
  const value = (cents / 100).toFixed(2)
  const withComma = value.replace('.', ',')
  return `${withComma} €`
}

function getProductImage(p: HomeProduct): string {
  return (
    p.imageUrls?.[0] ??
    p.imageUrls?.[0]?.url ??
    p.mainImage ??
    p.mainImageUrl ??
    p.mainImageURL ??
    p.image ??
    p.imageUrl ??
    p.imageURL ??
    p.coverImage ??
    p.coverImageUrl ??
    p.coverImageURL ??
    p.cardImage ??
    p.cardImageUrl ??
    p.cardImageURL ??
    p.listImage ??
    p.listImageUrl ??
    p.listImageURL ??
    p.gridImage ??
    p.gridImageUrl ??
    p.gridImageURL ??
    p.heroImage ??
    p.heroImageUrl ??
    p.heroImageURL ??
    p.primaryImage ??
    p.primaryImageUrl ??
    p.primaryImageURL ??
    p.thumbnail ??
    p.thumbnailUrl ??
    p.thumbnailURL ??
    p.thumb ??
    p.thumbUrl ??
    p.thumbURL ??
    p.picture ??
    p.pictureUrl ??
    p.pictureURL ??
    p.photo ??
    p.photoUrl ??
    p.photoURL ??
    p.img ??
    p.imgUrl ??
    p.imgURL ??
    p.url ??
    p.src ??
    p.gallery?.[0]?.url ??
    p.gallery?.[0]?.imageUrl ??
    p.gallery?.[0]?.imageURL ??
    p.images?.[0]?.url ??
    p.images?.[0]?.imageUrl ??
    p.images?.[0]?.imageURL ??
    p.productImages?.[0]?.url ??
    p.productImages?.[0]?.imageUrl ??
    p.productImages?.[0]?.imageURL ??
    p.media?.[0]?.url ??
    p.media?.[0]?.imageUrl ??
    p.media?.[0]?.imageURL ??
    FALLBACK_IMG
  )
}

function getProductPricing(p: HomeProduct) {
  const priceCents: number | null =
    typeof p.basePrice === 'number'
      ? p.basePrice
      : typeof p.priceCents === 'number'
      ? p.priceCents
      : typeof p.price === 'number'
      ? Math.round(p.price * 100)
      : null

  let compareAtCents: number | null =
    typeof p.compareAtPriceCents === 'number'
      ? p.compareAtPriceCents
      : typeof p.compareAtPrice === 'number'
      ? Math.round(p.compareAtPrice * 100)
      : null

  if (!compareAtCents && priceCents != null) {
    const mapped = SALE_MAP_CENTS[priceCents]
    if (mapped) compareAtCents = mapped
  }

  const hasDiscount =
    priceCents != null && compareAtCents != null && compareAtCents > priceCents

  const discountPercent = hasDiscount
    ? Math.round(((compareAtCents! - priceCents!) / compareAtCents!) * 100)
    : null

  return { priceCents, compareAtCents, hasDiscount, discountPercent }
}

// mesmo filtro que usas na Home para "jerseys"
function isStandardShortSleeveJersey(p: HomeProduct): boolean {
  const n = normalizeName(p)
  if (!n) return false
  if (isPlayerVersion(p)) return false
  if (isLongSleeve(p)) return false
  if (isRetro(p)) return false
  if (n.includes('SET')) return false
  if (n.includes('SHORTS')) return false
  if (n.includes('TRACKSUIT')) return false
  if (n.includes('CROP TOP')) return false
  if (n.includes('KIT')) return false
  return true
}

// ---------- Card ----------

function ProductCard({ product }: { product: HomeProduct }) {
  const href = `/products/${product.slug ?? product.id}`
  const imgSrc = getProductImage(product)
  const { priceCents, compareAtCents, hasDiscount, discountPercent } =
    getProductPricing(product)
  const team = (product.team ?? product.club ?? product.clubName ?? '') as string

  return (
    <motion.a
      href={href}
      whileHover={{ y: -6 }}
      className="group product-hover transition rounded-3xl overflow-hidden bg-white ring-1 ring-black/5 flex flex-col hover:ring-blue-200 hover:shadow-lg"
    >
      <div className="relative h-64 sm:h-72 md:h-80 bg-slate-50">
        <img
          src={imgSrc}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement
            if ((img as any)._fallbackApplied) return
            ;(img as any)._fallbackApplied = true
            img.src = FALLBACK_IMG
          }}
        />
        {discountPercent != null && (
          <div className="absolute left-2 top-2 sm:left-3 sm:top-3 rounded-full bg-red-600 px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-semibold text-white shadow">
            -{discountPercent}%
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col px-3 py-3 sm:px-4 sm:py-4">
        {team && (
          <div className="text-[10px] sm:text-[11px] font-semibold tracking-[0.16em] text-blue-700 uppercase">
            {team}
          </div>
        )}
        <h3 className="mt-1 text-[12px] sm:text-[15px] font-semibold leading-snug line-clamp-2">
          {product.name}
        </h3>

        <div className="mt-2 sm:mt-3 flex items-baseline gap-1 sm:gap-2">
          {hasDiscount && (
            <span className="text-[11px] sm:text-xs text-gray-400 line-through">
              {formatEurFromCents(compareAtCents)}
            </span>
          )}
          <span className="text-sm sm:text-lg font-semibold text-blue-800">
            {formatEurFromCents(priceCents)}
          </span>
        </div>

        <div className="mt-2 sm:mt-4 flex items-center text-[11px] sm:text-sm text-blue-700">
          View product
          <ArrowRight className="ml-1 h-3 w-3" />
        </div>
      </div>
    </motion.a>
  )
}

// ---------- Página client ----------

export default function JerseysClient() {
  const [allProducts, setAllProducts] = useState<HomeProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'random' | 'team' | 'price-asc' | 'price-desc'>(
    'team'
  )

  useEffect(() => {
    let cancelled = false

    const loadProducts = async () => {
      try {
        const res = await fetch('/api/home-products?limit=300', {
          cache: 'no-store',
        })
        if (!res.ok) throw new Error('Failed to load jerseys')
        const data = await res.json()
        const list = Array.isArray(data?.products)
          ? data.products
          : Array.isArray(data)
          ? data
          : []

        if (!cancelled) setAllProducts(list)
      } catch (err) {
        console.error(err)
        if (!cancelled) setAllProducts([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadProducts()
    return () => {
      cancelled = true
    }
  }, [])

  const jerseys = useMemo(() => {
    const base = allProducts.filter(isStandardShortSleeveJersey)

    // filtro por pesquisa (nome ou equipa)
    const filtered = base.filter((p) => {
      if (!search.trim()) return true
      const term = search.trim().toUpperCase()
      const name = (p.name ?? '').toString().toUpperCase()
      const team = (
        p.team ??
        p.club ??
        p.clubName ??
        ''
      )
        .toString()
        .toUpperCase()
      return name.includes(term) || team.includes(term)
    })

    // ordenação
    if (sort === 'random') {
      return shuffle(filtered)
    }

    const withPrice = filtered.map((p) => ({
      p,
      pricing: getProductPricing(p),
    }))

    if (sort === 'price-asc' || sort === 'price-desc') {
      return withPrice
        .slice()
        .sort((a, b) => {
          const pa = a.pricing.priceCents ?? Number.MAX_SAFE_INTEGER
          const pb = b.pricing.priceCents ?? Number.MAX_SAFE_INTEGER
          return sort === 'price-asc' ? pa - pb : pb - pa
        })
        .map((x) => x.p)
    }

    // default: ordenar por equipa + nome
    return filtered.slice().sort((a, b) => {
      const teamA = (
        a.team ??
        a.club ??
        a.clubName ??
        ''
      )
        .toString()
        .toUpperCase()
      const teamB = (
        b.team ??
        b.club ??
        b.clubName ??
        ''
      )
        .toString()
        .toUpperCase()

      if (teamA === teamB) {
        const nameA = normalizeName(a)
        const nameB = normalizeName(b)
        return nameA.localeCompare(nameB)
      }
      return teamA.localeCompare(teamB)
    })
  }, [allProducts, search, sort])

  return (
    <section className="container-fw section-gap">
      {/* Barra de filtros */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          {loading ? (
            <span>Loading jerseys…</span>
          ) : (
            <span>{jerseys.length} jerseys found</span>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by team or jersey name"
              className="w-full rounded-2xl border px-9 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <span className="text-gray-500">Sort by:</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="rounded-2xl border bg-white px-3 py-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="team">Team & name</option>
              <option value="price-asc">Price (low → high)</option>
              <option value="price-desc">Price (high → low)</option>
              <option value="random">Random</option>
            </select>
          </div>
        </div>
      </div>

      {/* Skeleton enquanto carrega */}
      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-72 sm:h-80 rounded-3xl bg-gradient-to-br from-slate-100 via-slate-50 to-white animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Grid de produtos */}
      {!loading && jerseys.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {jerseys.map((p: HomeProduct) => (
            <ProductCard key={p.id ?? p.slug ?? p.name} product={p} />
          ))}
        </div>
      )}

      {/* Estado vazio */}
      {!loading && jerseys.length === 0 && (
        <div className="mt-10 flex flex-col items-center text-center text-gray-500">
          <Loader2 className="mb-3 h-8 w-8 animate-spin" />
          <p className="text-sm">
            Não encontrámos jerseys com estes filtros.
            <br />
            Tenta limpar a pesquisa ou verificar o catálogo completo.
          </p>
          <a href="/products" className="mt-4 btn-primary text-sm">
            Go to all products
          </a>
        </div>
      )}
    </section>
  )
}
