// src/app/HomeClient.tsx
'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from 'framer-motion'
import {
  ArrowRight,
  Shield,
  Send,
  Truck,
  BadgePercent,
  Globe2,
  Zap,
  MousePointer2,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  Package,
  HeartHandshake,
  Clock,
  Shirt,
} from 'lucide-react'

/* ======================================================================================
   1) REUSABLE PIECES
====================================================================================== */

const FALLBACK_IMG = '/images/players/RealMadrid/RealMadrid12.png'

/** Spotlight that follows the cursor */
function Spotlight({
  className = '',
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    setPos({ x: e.clientX - r.left, y: e.clientY - r.top })
  }, [])
  return (
    <div onMouseMove={onMouseMove} className={`relative overflow-hidden ${className}`}>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(600px circle at ${pos.x}px ${pos.y}px, rgba(41,152,255,0.18), transparent 60%)`,
        }}
      />
      <div className="relative">{children}</div>
    </div>
  )
}

/** Magnetic button (leans towards the cursor) */
function MagneticButton({
  children,
  className = '',
  href,
  onClick,
}: {
  children: React.ReactNode
  className?: string
  href?: string
  onClick?: () => void
}) {
  const ref = useRef<HTMLAnchorElement | HTMLButtonElement | null>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 300, damping: 20 })
  const springY = useSpring(y, { stiffness: 300, damping: 20 })

  const handleMouseMove = (e: React.MouseEvent) => {
    const el = ref.current as HTMLElement
    if (!el) return
    const rect = el.getBoundingClientRect()
    const mx = e.clientX - rect.left - rect.width / 2
    const my = e.clientY - rect.top - rect.height / 2
    x.set(mx * 0.3)
    y.set(my * 0.3)
  }
  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  const Comp: any = href ? 'a' : 'button'
  return (
    <motion.div style={{ x: springX, y: springY }}>
      <Comp
        ref={ref as any}
        href={href}
        onClick={onClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={`btn-primary ${className}`}
      >
        {children}
      </Comp>
    </motion.div>
  )
}

/** 3D tilt card with glow */
function TiltCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const [t, setT] = useState({ rx: 0, ry: 0 })
  const [glow, setGlow] = useState({ x: 50, y: 50 })

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    const rx = (py - 0.5) * 10
    const ry = (0.5 - px) * 10
    setT({ rx, ry })
    setGlow({ x: px * 100, y: py * 100 })
  }

  return (
    <motion.div
      onMouseMove={onMouseMove}
      onMouseLeave={() => setT({ rx: 0, ry: 0 })}
      style={{ transform: `perspective(900px) rotateX(${t.rx}deg) rotateY(${t.ry}deg)` }}
      className={`card ${className}`}
    >
      <div
        className="pointer-events-none absolute -inset-px opacity-0 hover:opacity-100 transition"
        style={{
          background: `radial-gradient(650px circle at ${glow.x}% ${glow.y}%, rgba(41,152,255,0.25), transparent 45%)`,
        }}
      />
      {children}
    </motion.div>
  )
}

/* ======================================================================================
   2) HERO IMAGE CYCLER — black placeholder while loading, no blur
====================================================================================== */

const heroImages: { src: string; alt: string }[] = [
  { src: '/images/players/Arsenal/Arsenal1.png', alt: 'image' },
  // ... (resto igual, não mexi)
  { src: '/images/players/Feyenoord/Feyenoord9.png', alt: 'image' },
]

function shuffle<T>(arr: T[]) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Black placeholder until first image is preloaded,
 * then cross-fade (no blur). The first image holds `firstHold` ms.
 */
function HeroImageCycler({
  interval = 4200,
  firstHold = 10000,
}: {
  interval?: number
  firstHold?: number
}) {
  const fade = 800

  const orderRef = useRef<number[]>(shuffle([...Array(heroImages.length).keys()]))
  const ptrRef = useRef<number>(0)

  const firstIndex = orderRef.current[ptrRef.current]
  const secondIndex = orderRef.current[(ptrRef.current + 1) % orderRef.current.length]

  const aRef = useRef<HTMLImageElement>(null)
  const bRef = useRef<HTMLImageElement>(null)
  const frontIsARef = useRef(true)
  const timerRef = useRef<number | null>(null)
  const [firstShown, setFirstShown] = useState(false)

  const playKenBurns = (img: HTMLImageElement | null, dur: number) => {
    if (!img) return
    try {
      const ox = ['center', 'left', 'right'][Math.floor(Math.random() * 3)]
      const oy = ['center', 'top', 'bottom'][Math.floor(Math.random() * 3)]
      img.style.transformOrigin = `${ox} ${oy}`
      ;(img as any).getAnimations?.forEach((a: Animation) => a.cancel())
      img.animate([{ transform: 'scale(1.03)' }, { transform: 'scale(1.0)' }], {
        duration: Math.max(1000, dur),
        easing: 'ease-out',
        fill: 'forwards',
      })
    } catch {}
  }

  const load = (src: string) =>
    new Promise<void>((resolve) => {
      const i = new Image()
      i.onload = () => resolve()
      i.onerror = () => resolve()
      i.src = src
    })

  const swapTo = async (nextIndex: number) => {
    const nextSrc = heroImages[nextIndex]?.src || FALLBACK_IMG
    await load(nextSrc)
    const frontIsA = frontIsARef.current
    const front = frontIsA ? aRef.current : bRef.current
    const back = frontIsA ? bRef.current : aRef.current
    if (!front || !back) return

    back.src = nextSrc
    back.alt = heroImages[nextIndex]?.alt || 'image'
    back.style.transitionDuration = `${fade}ms`
    // reflow
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    back.offsetHeight
    back.classList.add('is-visible')
    front.classList.remove('is-visible')
    playKenBurns(back, interval - fade)
    frontIsARef.current = !frontIsA
  }

  useEffect(() => {
    let killed = false

    const start = async () => {
      const firstSrc = heroImages[firstIndex]?.src || FALLBACK_IMG
      const secondSrc = heroImages[secondIndex]?.src || FALLBACK_IMG
      await Promise.all([load(firstSrc), load(secondSrc)])
      if (killed) return

      if (aRef.current) {
        aRef.current.src = firstSrc
        aRef.current.alt = heroImages[firstIndex]?.alt || 'image'
        aRef.current.classList.add('is-visible')
        setFirstShown(true)
        playKenBurns(aRef.current, firstHold - fade)
      }

      const tick = async () => {
        if (killed) return
        ptrRef.current = (ptrRef.current + 1) % orderRef.current.length
        if (ptrRef.current === 0) orderRef.current = shuffle(orderRef.current)
        const nextIdx = orderRef.current[ptrRef.current]
        await swapTo(nextIdx)
        timerRef.current = window.setTimeout(tick, interval) as any
      }

      timerRef.current = window.setTimeout(tick, firstHold) as any
    }

    start()
    return () => {
      killed = true
      if (timerRef.current != null) window.clearTimeout(timerRef.current)
    }
  }, [interval, firstHold])

  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-3xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_80%_-10%,rgba(59,130,246,0.18),transparent_60%)]" />
      {!firstShown && <div className="absolute inset-0 bg-black" />}

      <img
        ref={aRef}
        className="hero-layer"
        src=""
        alt="image"
        decoding="async"
        onError={(e: any) => {
          const img = e.currentTarget as HTMLImageElement
          if ((img as any)._fallbackApplied) return
          ;(img as any)._fallbackApplied = true
          img.src = FALLBACK_IMG
        }}
      />
      <img
        ref={bRef}
        className="hero-layer"
        src=""
        alt="image"
        decoding="async"
        onError={(e: any) => {
          const img = e.currentTarget as HTMLImageElement
          if ((img as any)._fallbackApplied) return
          ;(img as any)._fallbackApplied = true
          img.src = FALLBACK_IMG
        }}
      />

      <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-black/5" />

      <style jsx>{`
        .hero-layer {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0;
          transform: scale(1.0);
          transition-property: opacity, transform;
          transition-timing-function: ease-in-out;
          transition-duration: 800ms;
          will-change: opacity, transform;
        }
        .hero-layer.is-visible {
          opacity: 1;
        }
      `}</style>
    </div>
  )
}

/* ======================================================================================
   4) HIGHLIGHT SPACES — image banners
====================================================================================== */
type HighlightSpace = {
  key: 'adult' | 'kids' | 'retro' | 'concept'
  label: string
  href: string
  img: string
  alt?: string
  subtitle?: string
}

const highlightSpaces: HighlightSpace[] = [
  {
    key: 'adult',
    label: 'Adult',
    href: '/products?group=adult',
    img: '/images/spaces/adult.png',
    alt: 'Adult Collection',
    subtitle: 'Sizes S–4XL',
  },
  {
    key: 'kids',
    label: 'Kids',
    href: '/products?group=kids',
    img: '/images/spaces/kids.png',
    alt: 'Kids Collection',
    subtitle: 'Ages 2–13',
  },
  {
    key: 'retro',
    label: 'Retro',
    href: '/products?group=retro',
    img: '/images/spaces/retro.png',
    alt: 'Retro Collection',
    subtitle: 'Timeless classics',
  },
  {
    key: 'concept',
    label: 'Concept Kits',
    href: '/products?group=concept-kits',
    img: '/images/spaces/concept.png',
    alt: 'Concept Kits',
    subtitle: 'Original designs',
  },
]

function ImageSpaces() {
  return (
    <div className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {highlightSpaces.map((s) => (
        <motion.a
          key={s.key}
          href={s.href}
          whileHover={{ y: -4 }}
          className="group relative overflow-hidden rounded-3xl ring-1 ring-black/5"
        >
          <div className="relative aspect-[16/10] sm:aspect-[5/6]">
            <img
              src={s.img}
              alt={s.alt || s.label}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement
                if ((img as any)._fallbackApplied) return
                ;(img as any)._fallbackApplied = true
                img.src = FALLBACK_IMG
                img.style.objectPosition = 'center'
              }}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
            <div className="absolute inset-x-0 bottom-0 p-4">
              <div className="flex items-end justify-between gap-2">
                <div>
                  <h3 className="text-white font-semibold tracking-tight">
                    {s.label}
                  </h3>
                  {s.subtitle && (
                    <p className="text-white/80 text-xs">{s.subtitle}</p>
                  )}
                </div>
                <div className="shrink-0 rounded-full bg-white/90 p-2 backdrop-blur-sm ring-1 ring-black/5 group-hover:bg-white transition">
                  <ArrowRight className="h-4 w-4 text-blue-700" />
                </div>
              </div>
            </div>
          </div>
        </motion.a>
      ))}
    </div>
  )
}

/* ======================================================================================
   Helpers for products
====================================================================================== */

function formatEurFromCents(cents: number | null | undefined) {
  if (cents == null) return ''
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'EUR',
  })
}

/* ======================================================================================
   5) PAGE
====================================================================================== */
export default function Home() {
  const { scrollY } = useScroll()
  const START = 420
  const SPAN = 560

  const y1 = useTransform(scrollY, [0, START + SPAN], [0, -80])
  const y2 = useTransform(scrollY, [0, START + SPAN], [0, -140])
  const opacityHero = useTransform(scrollY, [0, START, START + SPAN], [1, 1, 0.18])

  const velocity = useVelocity(scrollY)
  const showShadow = useTransform(velocity, [0, 100], [0, 1])
  const shadowSpring = useSpring(showShadow, { stiffness: 200, damping: 30 })
  const sectionShadow = useTransform(shadowSpring, (v) =>
    v > 0.2 ? '0 10px 30px -15px rgba(2,8,23,0.12)' : 'none'
  )

  // ====== Home products from DB (random 12 each load) ======
  const [homeProducts, setHomeProducts] = useState<any[]>([])
  const [loadingHomeProducts, setLoadingHomeProducts] = useState(true)

  useEffect(() => {
    let cancelled = false

    const loadProducts = async () => {
      try {
        const res = await fetch('/api/home-products?limit=40', { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed to load home products')
        const data = await res.json()
        const list = Array.isArray(data?.products)
          ? data.products
          : Array.isArray(data)
          ? data
          : []

        const shuffled = shuffle(list)
        const selected = shuffled.slice(0, 12) // 12 espaços
        if (!cancelled) setHomeProducts(selected)
      } catch (err) {
        console.error(err)
        if (!cancelled) setHomeProducts([])
      } finally {
        if (!cancelled) setLoadingHomeProducts(false)
      }
    }

    loadProducts()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen">
      {/* =================== HERO =================== */}
      <section className="relative overflow-hidden">
        <motion.div style={{ y: y2 }} className="pointer-events-none absolute -top-40 right-[-10%] h-96 w-96 rounded-full blur-3xl opacity-30 bg-blue-300" />
        <motion.div style={{ y: y1 }} className="pointer-events-none absolute -top-20 left-[-10%] h-[28rem] w-[28rem] rounded-full blur-3xl opacity-30 bg-cyan-300" />

        <Spotlight>
          <motion.div style={{ opacity: opacityHero }} className="container-fw py-20 sm:py-28">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              {/* left copy */}
              <div>
                <h1 className="mt-4 text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
                  Authentic &amp; Concept Football Jerseys
                </h1>
                <p className="mt-4 text-gray-600 max-w-prose">
                  We sell existing club and national-team jerseys, as well as original concept jerseys, made to order with reliable worldwide tracked shipping.
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <MagneticButton href="/products">
                    Browse products <ArrowRight className="h-4 w-4" />
                  </MagneticButton>
                </div>

                {/* trust badges */}
                <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  {[
                    { Icon: Truck, t: 'Worldwide shipping' },
                    { Icon: BadgePercent, t: 'Fair pricing' },
                    { Icon: Shield, t: 'Secure checkout' },
                    { Icon: Globe2, t: 'English Support' },
                  ].map(({ Icon, t }) => (
                    <div key={t} className="flex items-center gap-2 rounded-xl border glass px-3 py-2">
                      <Icon className="h-4 w-4 text-blue-600" />
                      <span>{t}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* right mockup */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
                className="relative"
              >
                <TiltCard className="shadow-glow overflow-hidden">
                  <HeroImageCycler interval={4200} firstHold={10000} />
                </TiltCard>
              </motion.div>
            </div>
          </motion.div>
        </Spotlight>

        {/* marquee of tech specs */}
        <div className="relative border-y bg-white">
          <div className="container-fw py-4 overflow-hidden">
            <div className="flex gap-12 animate-marquee whitespace-nowrap opacity-60">
              {['ULTRA-FIT','AERO-MESH','COOL-DRY','PRO STITCH','HYPER PRINT','GHOST-SEAM','NANO INK','STREET-EDITION'].map((b) => (
                <span key={b} className="text-xs tracking-widest">{b}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =================== HIGHLIGHTS =================== */}
      <section id="products" className="container-fw section-gap">
        <div className="flex items-end justify-between mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Highlights</h2>
          <a href="/products" className="text-sm text-blue-700 hover:underline">See all →</a>
        </div>

        {/* Spaces: Adult / Kids / Retro / Concept Kits */}
        <ImageSpaces />

        {/* Gap between "Highlights" and product grid */}
        <div className="h-2 sm:h-3" />

        {/* Products block pulled from DB */}
        <div className="relative">
          <div className="rounded-3xl bg-white/70 ring-1 ring-black/5 p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Some of our products</h3>
              <span className="text-xs text-gray-500">
                Discover a few pieces from the collection
              </span>
            </div>

            {loadingHomeProducts && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-[320px] rounded-3xl bg-gray-100 animate-pulse"
                  />
                ))}
              </div>
            )}

            {!loadingHomeProducts && homeProducts.length > 0 && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {homeProducts.slice(0, 12).map((p: any) => {
                  const href = `/products/${p.slug ?? p.id}`

                  // 👇 TENTA VÁRIOS CAMPOS COMUNS DE IMAGEM
                  const imgSrc =
                    p.mainImage ??
                    p.mainImageUrl ??
                    p.image ??
                    p.imageUrl ??
                    p.coverImage ??
                    p.thumbnail ??
                    p.thumbnailUrl ??
                    FALLBACK_IMG

                  const priceCents: number | null =
                    typeof p.priceCents === 'number'
                      ? p.priceCents
                      : typeof p.price === 'number'
                      ? Math.round(p.price * 100)
                      : null

                  const compareAtCents: number | null =
                    typeof p.compareAtPriceCents === 'number'
                      ? p.compareAtPriceCents
                      : typeof p.compareAtPrice === 'number'
                      ? Math.round(p.compareAtPrice * 100)
                      : null

                  const hasDiscount =
                    priceCents != null &&
                    compareAtCents != null &&
                    compareAtCents > priceCents

                  const discountPercent = hasDiscount
                    ? Math.round(
                        ((compareAtCents! - priceCents!) / compareAtCents!) * 100
                      )
                    : null

                  const team = (p.team ?? p.club ?? p.clubName ?? '') as string

                  return (
                    <motion.a
                      key={p.id}
                      href={href}
                      whileHover={{ y: -6 }}
                      className="group product-hover transition rounded-3xl overflow-hidden bg-white ring-1 ring-black/5 flex flex-col"
                    >
                      <div className="relative aspect-[4/3]">
                        <img
                          src={imgSrc}
                          alt={p.name}
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
                          <div className="absolute left-3 top-3 rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white shadow">
                            -{discountPercent}%
                          </div>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col px-4 py-3">
                        {team && (
                          <div className="text-[11px] font-semibold tracking-[0.16em] text-blue-700 uppercase">
                            {team}
                          </div>
                        )}
                        <h3 className="mt-1 text-sm font-semibold leading-snug line-clamp-2">
                          {p.name}
                        </h3>

                        <div className="mt-3 flex items-baseline gap-2">
                          {hasDiscount && (
                            <span className="text-xs text-gray-400 line-through">
                              {formatEurFromCents(compareAtCents)}
                            </span>
                          )}
                          <span className="text-base font-semibold text-blue-800">
                            {formatEurFromCents(priceCents)}
                          </span>
                        </div>

                        <div className="mt-4 flex items-center text-xs text-blue-700">
                          View product
                          <ArrowRight className="ml-1 h-3 w-3" />
                        </div>
                      </div>
                    </motion.a>
                  )
                })}
              </div>
            )}

            {!loadingHomeProducts && homeProducts.length === 0 && (
              <p className="text-sm text-gray-500">
                No products to show here yet. Please check the full catalog.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* =================== HOW IT WORKS =================== */}
      <section id="how" className="bg-white/70 border-y">
        <motion.div style={{ boxShadow: sectionShadow as any }} className="container-fw section-gap">
          <div className="grid lg:grid-cols-4 gap-6">
            {[
              {
                icon: <Shirt className="h-5 w-5 text-blue-600" />,
                t: 'Choose an authentic jersey',
                s: 'Select an existing club or national-team shirt.',
              },
              { icon: <MousePointer2 className="h-5 w-5 text-blue-600" />, t: 'Pick a design', s: 'Explore concepts and choose your favorite.' },
              { icon: <Send className="h-5 w-5 text-blue-600" />, t: 'Made-to-order', s: 'Produced on demand with wonderful quality.' },
              { icon: <Truck className="h-5 w-5 text-blue-600" />, t: 'Global shipping', s: 'Worldwide delivery in 5–7 business days, with tracking on every order.' },
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: i * 0.1 }}
                className="group card p-6 hover:shadow-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-blue-50 p-2">{f.icon}</div>
                  <h3 className="font-semibold">{f.t}</h3>
                </div>
                <p className="mt-2 text-sm text-gray-600">{f.s}</p>
                <div className="mt-4 h-1 rounded bg-gradient-to-r from-blue-600 to-cyan-400 w-0 group-hover:w-full transition-all" />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* =================== CTA =================== */}
      <section className="container-fw pb-20">
        <TiltCard>
          <div className="grid md:grid-cols-2 gap-6 items-center p-8">
            <div>
              <h3 className="text-2xl font-bold">Choose your next jersey with confidence</h3>
              <p className="mt-2 text-gray-600">
                Discover authentic club and national-team kits alongside our original concept designs, then pick your next favorite.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600"/> Name & number personalization</li>
                <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-blue-600"/> Secure payments via Stripe</li>
                <li className="flex items-center gap-2"><Clock className="h-4 w-4 text-amber-600"/> Economy shipping with tracking</li>
              </ul>
            </div>
            <div className="flex md:justify-end items-center gap-3">
              <MagneticButton href="/products">
                Get started <Zap className="h-4 w-4" />
              </MagneticButton>
              <a href="#faq" className="btn-outline">
                See frequently <br />asked questions
              </a>
            </div>
          </div>
        </TiltCard>
      </section>

      {/* =================== EXTRA: GUARANTEES =================== */}
      <section className="bg-white/70 border-y">
        <div className="container-fw section-gap grid md:grid-cols-4 gap-6">
          {[
            { Icon: ShieldCheck, title: '14-day guarantee', desc: 'Size/fit exchange within 14 days (policy applies).' },
            {
              Icon: CreditCard,
              title: 'Secure checkout',
              desc: 'Visa, Mastercard, American Express, PayPal, Amazon Pay, Multibanco (PT), Revolut Pay, Klarna, Satispay, Link, all processed securely via Stripe.',
            },
            {
              Icon: Package,
              title: 'On-demand production',
              desc: 'Incredible stitching and print quality.',
            },
            {
              Icon: HeartHandshake,
              title: 'Dedicated support',
              desc: 'Dedicated support in English via email and Instagram.',
            },
          ].map((f, i) => (
            <div key={i} className="group card p-5 hover:shadow-xl">
              <div className="flex items-center gap-3">
                <f.Icon className="h-5 w-5 text-blue-600" />
                <div className="font-semibold">{f.title}</div>
              </div>
              <p className="mt-2 text-sm text-gray-600">{f.desc}</p>
              <div className="mt-4 h-1 rounded bg-gradient-to-r from-blue-600 to-cyan-400 w-0 group-hover:w-full transition-all" />
            </div>
          ))}
        </div>
      </section>

      {/* =================== FAQ =================== */}
      <section id="faq" className="container-fw pb-24 pt-16">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6">Frequently asked questions</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { q: 'How long does shipping take?', a: 'It takes 5–7 business days, with tracking code on every order.' },
            { q: 'Can I personalize name and number?', a: 'Yes!' },
            {
              q: 'Which payment methods are accepted?',
              a: 'Visa, Mastercard, American Express, PayPal, Amazon Pay, Multibanco (PT), Revolut Pay, Klarna, Satispay, and MB Way.',
            },
            { q: 'How can I track my order?', a: 'Once your order has been shipped, you will receive an email with your tracking code and a link to track it online. You can track your order at any time through 17track.net or on your national postal website. All orders include worldwide tracked shipping.' },
            { q: 'Which countries do you ship to?', a: 'We ship worldwide. Delivery times vary by destination.' },
            { q: 'How do I pick the size?', a: 'We will provide a detailed size chart and measurement tips in the Size Guide page.' },
          ].map((f, i) => (
            <details key={i} className="group card px-5 py-4 open:shadow-md">
              <summary className="flex cursor-pointer items-center justify-between font-medium">
                {f.q}
                <span className="text-blue-600 group-open:rotate-45 transition">+</span>
              </summary>
              <p className="mt-2 text-sm text-gray-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* =================== NEWSLETTER =================== */}
      <section className="container-fw pb-24">
        <TiltCard>
          <div className="grid md:grid-cols-2 gap-6 items-center p-8">
            <div>
              <h3 className="text-2xl font-bold">Get launches & news</h3>
              <p className="mt-2 text-gray-600">Occasional discounts, pre-sales and special drops.</p>
            </div>
            <form className="flex w-full gap-3" onSubmit={(e)=>e.preventDefault()}>
              <input
                type="email"
                required
                placeholder="Your email"
                className="flex-1 rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button className="btn-primary">Subscribe</button>
            </form>
          </div>
        </TiltCard>
      </section>
    </div>
  )
}
