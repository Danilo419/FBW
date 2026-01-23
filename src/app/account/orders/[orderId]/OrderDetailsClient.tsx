'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Loader2 } from 'lucide-react'

function money(cents?: number | null, currency = 'EUR') {
  const n = typeof cents === 'number' ? cents : 0
  return (n / 100).toLocaleString(undefined, { style: 'currency', currency })
}

/* ========================= Badge labels (same as ProductConfigurator) ========================= */
const BADGE_LABELS: Record<string, string> = {
  'premier-league-regular': 'Premier League – League Badge',
  'premier-league-champions': 'Premier League – Champions (Gold)',
  'la-liga-regular': 'La Liga – League Badge',
  'la-liga-champions': 'La Liga – Champion',
  'serie-a-regular': 'Serie A – League Badge',
  'serie-a-scudetto': 'Italy – Scudetto (Serie A Champion)',
  'bundesliga-regular': 'Bundesliga – League Badge',
  'bundesliga-champions': 'Bundesliga – Champion (Meister Badge)',
  'ligue1-regular': 'Ligue 1 – League Badge',
  'ligue1-champions': 'Ligue 1 – Champion',
  'primeira-liga-regular': 'Primeira Liga – League Badge',
  'primeira-liga-champions': 'Primeira Liga – Champion',
  'eredivisie-regular': 'Eredivisie – League Badge',
  'eredivisie-champions': 'Eredivisie – Champion',
  'scottish-premiership-regular': 'Scottish Premiership – League Badge',
  'scottish-premiership-champions': 'Scottish Premiership – Champion',
  'mls-regular': 'MLS – League Badge',
  'mls-champions': 'MLS – Champions (MLS Cup Holders)',
  'brasileirao-regular': 'Brasileirão – League Badge',
  'brasileirao-champions': 'Brasileirão – Champion',
  'super-lig-regular': 'Süper Lig – League Badge',
  'super-lig-champions': 'Süper Lig – Champion',
  'spl-saudi-regular': 'Saudi Pro League – League Badge',
  'spl-saudi-champions': 'Saudi Pro League – Champion',
  'ucl-regular': 'UEFA Champions League – Starball Badge',
  'ucl-winners': 'UEFA Champions League – Winners Badge',
  'uel-regular': 'UEFA Europa League – Badge',
  'uel-winners': 'UEFA Europa League – Winners Badge',
  'uecl-regular': 'UEFA Europa Conference League – Badge',
  'uecl-winners': 'UEFA Europa Conference League – Winners Badge',
  'club-world-cup-champions': 'FIFA Club World Cup – Champions Badge',
}

function humanizeBadge(value: string) {
  if (BADGE_LABELS[value]) return BADGE_LABELS[value]
  return String(value)
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase())
}

/* ========================= Types ========================= */

type ShippingJson =
  | {
      name?: string | null
      email?: string | null
      phone?: string | null
      address?: {
        line1?: string | null
        line2?: string | null
        city?: string | null
        state?: string | null
        postal_code?: string | null
        country?: string | null
      } | null
    }
  | null

type OrderItemDTO = {
  id: string
  qty: number
  unitPrice: number // cents
  totalPrice: number // cents
  name: string
  image?: string | null
  snapshotJson?: any
  personalizationJson?: any
  product: {
    id: string
    name: string
    slug?: string | null
    imageUrls: string[]
    badges: any
  }
}

type OrderDetailsDTO = {
  id: string
  createdAt: string
  paidAt?: string | null
  status: string
  paymentStatus?: string | null

  currency: string
  subtotal?: number | null // cents
  shipping?: number | null // cents
  tax?: number | null // cents
  totalCents?: number | null // cents (preferred)
  total?: number | null // legacy float

  shippingFullName?: string | null
  shippingEmail?: string | null
  shippingPhone?: string | null
  shippingAddress1?: string | null
  shippingAddress2?: string | null
  shippingCity?: string | null
  shippingRegion?: string | null
  shippingPostalCode?: string | null
  shippingCountry?: string | null

  shippingJson?: ShippingJson

  items: OrderItemDTO[]
}

/* ========================= Helpers ========================= */

function safeParseJSON(input: any): Record<string, any> {
  if (!input) return {}
  if (typeof input === 'string') {
    try {
      return JSON.parse(input)
    } catch {
      return {}
    }
  }
  if (typeof input === 'object') return input as Record<string, any>
  return {}
}

function pickStr(o: any, keys: string[]): string | null {
  if (!o || typeof o !== 'object') return null
  for (const k of keys) {
    const v = (o as any)?.[k]
    if (v != null && String(v).trim() !== '') return String(v)
  }
  return null
}

function shippingFromOrder(order: any): ShippingJson {
  const canonical: ShippingJson = {
    name: order?.shippingFullName ?? null,
    email: order?.shippingEmail ?? null,
    phone: order?.shippingPhone ?? null,
    address: {
      line1: order?.shippingAddress1 ?? null,
      line2: order?.shippingAddress2 ?? null,
      city: order?.shippingCity ?? null,
      state: order?.shippingRegion ?? null,
      postal_code: order?.shippingPostalCode ?? null,
      country: order?.shippingCountry ?? null,
    },
  }

  const hasCanonical =
    canonical?.name ||
    canonical?.email ||
    canonical?.phone ||
    canonical?.address?.line1 ||
    canonical?.address?.city ||
    canonical?.address?.country

  if (hasCanonical) return canonical

  const snap = (order?.shippingJson ?? null) as ShippingJson
  return snap ?? { name: null, email: null, phone: null, address: null }
}

function computeTotalCents(order: any) {
  if (typeof order?.totalCents === 'number') return order.totalCents
  if (typeof order?.total === 'number') return Math.round(order.total * 100)

  const itemsSum =
    (order?.items || []).reduce((acc: number, it: any) => acc + (Number(it?.totalPrice) || 0), 0) || 0

  const shipping = Number(order?.shipping) || 0
  const tax = Number(order?.tax) || 0
  return itemsSum + shipping + tax
}

/* ========================= Item detail extraction ========================= */

function extractPersonalization(it: any, snap: any, optionsObj: any) {
  const snapPers =
    snap?.personalization && typeof snap.personalization === 'object' ? snap.personalization : null

  const snapPersName = snapPers
    ? pickStr(snapPers, ['name', 'playerName', 'customName', 'shirtName'])
    : null

  const snapPersNumber = snapPers
    ? pickStr(snapPers, ['number', 'playerNumber', 'customNumber', 'shirtNumber'])
    : null

  const snapPersJ = safeParseJSON(snap?.personalizationJson)
  const snapJName = pickStr(snapPersJ, ['name', 'playerName', 'customName', 'shirtName']) ?? null
  const snapJNumber = pickStr(snapPersJ, ['number', 'playerNumber', 'customNumber', 'shirtNumber']) ?? null

  const itPersJ = safeParseJSON(it?.personalizationJson)
  const itJName = pickStr(itPersJ, ['name', 'playerName', 'customName', 'shirtName']) ?? null
  const itJNumber = pickStr(itPersJ, ['number', 'playerNumber', 'customNumber', 'shirtNumber']) ?? null

  const directName =
    pickStr(it, [
      'personalizationName',
      'playerName',
      'custName',
      'nameOnShirt',
      'shirtName',
      'customName',
    ]) ?? null

  const directNumber =
    pickStr(it, [
      'personalizationNumber',
      'playerNumber',
      'custNumber',
      'numberOnShirt',
      'shirtNumber',
      'customNumber',
    ]) ?? null

  const snapRootName =
    pickStr(snap, ['custName', 'customerName', 'nameOnShirt', 'shirtName', 'playerName']) ?? null
  const snapRootNumber =
    pickStr(snap, ['custNumber', 'customerNumber', 'numberOnShirt', 'shirtNumber', 'playerNumber']) ??
    null

  const optName =
    pickStr(optionsObj, ['custName', 'playerName', 'player_name', 'shirtName', 'shirt_name', 'nameOnShirt']) ??
    null

  const optNumber =
    pickStr(optionsObj, [
      'custNumber',
      'playerNumber',
      'player_number',
      'shirtNumber',
      'shirt_number',
      'numberOnShirt',
    ]) ?? null

  const name =
    (snapPersName ?? snapJName ?? itJName ?? directName ?? snapRootName ?? optName ?? null)?.trim() || null

  const numRaw =
    (snapPersNumber ?? snapJNumber ?? itJNumber ?? directNumber ?? snapRootNumber ?? optNumber ?? null)?.trim() ||
    ''

  const onlyDigits = String(numRaw).replace(/\D/g, '')
  const number = onlyDigits ? onlyDigits : null

  if (!name && !number) return null
  return { name, number }
}

/* ✅ badges split (fix) */
function splitBadgesString(s: string): string[] {
  const raw = String(s ?? '').trim()
  if (!raw) return []
  const parts = raw.split(/[,\n;|]+/g).map((x) => x.trim())
  return parts.filter(Boolean)
}

function normalizeBadges(rawBadges: any): string[] {
  if (!rawBadges) return []

  if (Array.isArray(rawBadges)) {
    const out: string[] = []
    for (const v of rawBadges) {
      if (v == null) continue
      if (typeof v === 'string') out.push(...splitBadgesString(v))
      else if (typeof v === 'object') out.push(...splitBadgesString(Object.values(v as any).join(',')))
      else out.push(...splitBadgesString(String(v)))
    }
    return out
  }

  if (typeof rawBadges === 'object') {
    const out: string[] = []
    for (const v of Object.values(rawBadges)) {
      if (v == null) continue
      if (typeof v === 'string') out.push(...splitBadgesString(v))
      else if (typeof v === 'object') out.push(...splitBadgesString(Object.values(v as any).join(',')))
      else out.push(...splitBadgesString(String(v)))
    }
    return out
  }

  return splitBadgesString(String(rawBadges))
}

function deriveItemDetails(it: OrderItemDTO) {
  const snap = safeParseJSON(it?.snapshotJson)

  const optionsObj =
    safeParseJSON(snap?.optionsJson) ||
    safeParseJSON(snap?.options) ||
    safeParseJSON(snap?.selected) ||
    {}

  const personalization = extractPersonalization(it, snap, optionsObj)

  const size =
    (optionsObj as any).size ??
    snap?.size ??
    pickStr(snap, ['sizeLabel', 'variant', 'skuSize']) ??
    null

  const rawBadges =
    (optionsObj as any).badges ??
    snap?.badges ??
    (optionsObj as any)['competition_badge'] ??
    null

  const badgesFromSnap = normalizeBadges(rawBadges)
  const badgesFromProduct = normalizeBadges(it?.product?.badges)
  const allBadges = Array.from(new Set([...badgesFromSnap, ...badgesFromProduct])).filter(Boolean)

  const optionsPairs: Array<{ k: string; v: string }> = []
  for (const [k, v] of Object.entries(optionsObj)) {
    if (v == null || v === '') continue
    if (k.toLowerCase().includes('json')) continue

    let vs = ''
    if (Array.isArray(v)) vs = v.join(', ')
    else if (typeof v === 'object') vs = Object.values(v as any).join(', ')
    else vs = String(v)

    vs = vs.trim()
    if (!vs) continue

    if (k.toLowerCase() === 'badges') continue
    if (k.toLowerCase() === 'size') continue

    optionsPairs.push({ k, v: vs })
  }

  return { size, personalization, badges: allBadges, optionsPairs }
}

function prettyKey(k: string) {
  const map: Record<string, string> = {
    custName: 'Name',
    custNumber: 'Number',
    nameOnShirt: 'Name',
    numberOnShirt: 'Number',
    playerName: 'Name',
    playerNumber: 'Number',
  }
  if (map[k]) return map[k]
  return k
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (m) => m.toUpperCase())
}

/* ========================= Component ========================= */

export default function OrderDetailsClient({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [order, setOrder] = useState<OrderDetailsDTO | null>(null)

  useEffect(() => {
    let alive = true

    async function run() {
      setLoading(true)
      setErr(null)
      try {
        const r = await fetch(`/api/account/orders/${encodeURIComponent(orderId)}`, { method: 'GET' })
        const j = await r.json()
        if (!r.ok) throw new Error(j?.error || 'Failed to load order details')
        if (!alive) return
        setOrder(j?.order ?? j?.data?.order ?? null)
      } catch (e: any) {
        if (!alive) return
        setErr(e?.message ?? 'Something went wrong')
      } finally {
        if (!alive) return
        setLoading(false)
      }
    }

    run()
    return () => {
      alive = false
    }
  }, [orderId])

  const currency = useMemo(() => (order?.currency || 'eur').toUpperCase(), [order?.currency])

  const itemsSubtotal = useMemo(() => {
    if (!order) return 0
    return order.items.reduce((acc, it) => acc + (Number(it.totalPrice) || 0), 0)
  }, [order])

  const ship = useMemo(() => (order ? shippingFromOrder(order) : null), [order])

  const totalCents = useMemo(() => (order ? computeTotalCents(order) : 0), [order])

  const statusStyle = useMemo(() => {
    const status = String(order?.status || '').toLowerCase()
    return status === 'paid' || status === 'shipped' || status === 'delivered'
      ? 'bg-green-100 text-green-700 border border-green-200'
      : status === 'pending'
        ? 'bg-amber-100 text-amber-800 border border-amber-200'
        : 'bg-gray-100 text-gray-700 border'
  }, [order?.status])

  return (
    <main className="container-fw pt-12 pb-20">
      <div className="mb-6">
        <Link href="/account" className="text-sm text-blue-600 hover:underline">
          ← Back to account
        </Link>
      </div>

      <div className="rounded-2xl border bg-white p-4 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl font-bold">Order details</h1>

          {order?.status ? (
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusStyle}`}>
              {order.status}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-gray-100 text-gray-700 border">
              —
            </span>
          )}
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading order…
          </div>
        )}

        {!loading && err && <div className="rounded-2xl border p-4 bg-red-50 text-red-700 text-sm">{err}</div>}

        {!loading && !err && !order && (
          <div className="rounded-2xl border p-6 bg-white/70 text-center text-sm text-gray-600">Order not found.</div>
        )}

        {!loading && !err && order && (
          <div className="grid gap-6 md:grid-cols-3">
            {/* Main column */}
            <section className="md:col-span-2 space-y-4">
              <div className="rounded-xl border">
                <div className="border-b px-4 py-3 font-semibold">Items</div>

                <ul className="divide-y">
                  {order.items.map((it) => {
                    const img = it.image || it.product?.imageUrls?.[0] || '/placeholder.png'
                    const title = it.name || it.product?.name || 'Item'

                    const details = deriveItemDetails(it)

                    // ✅ match your real route: /products/[slug]
                    const productHref = it.product?.slug ? `/products/${it.product.slug}` : null

                    return (
                      <li key={it.id} className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 p-4">
                        {/* top row (mobile): image + price */}
                        <div className="flex items-start justify-between gap-3 sm:hidden">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="relative h-14 w-14 rounded-md border bg-gray-50 overflow-hidden shrink-0">
                              <Image
                                src={img}
                                alt={title}
                                fill
                                className="object-cover"
                                sizes="56px"
                                priority={false}
                                unoptimized
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="truncate font-medium">
                                {productHref ? (
                                  <Link href={productHref} className="hover:underline">
                                    {title}
                                  </Link>
                                ) : (
                                  title
                                )}
                              </div>
                              <div className="text-sm text-gray-600">
                                Qty: {it.qty}
                                <span className="mx-2">·</span>
                                {money(it.unitPrice, currency)} each
                              </div>
                            </div>
                          </div>
                          <div className="shrink-0 font-semibold">{money(it.totalPrice, currency)}</div>
                        </div>

                        {/* desktop/tablet: image */}
                        <div className="relative h-14 w-14 rounded-md border bg-gray-50 overflow-hidden shrink-0 hidden sm:block mt-0.5">
                          <Image
                            src={img}
                            alt={title}
                            fill
                            className="object-cover"
                            sizes="56px"
                            priority={false}
                            unoptimized
                          />
                        </div>

                        {/* desktop/tablet: content */}
                        <div className="min-w-0 flex-1 hidden sm:block">
                          <div className="truncate font-medium">
                            {productHref ? (
                              <Link href={productHref} className="hover:underline">
                                {title}
                              </Link>
                            ) : (
                              title
                            )}
                          </div>

                          <div className="text-sm text-gray-600">
                            Qty: {it.qty}
                            <span className="mx-2">·</span>
                            {money(it.unitPrice, currency)} each
                          </div>

                          {(details.size || details.personalization?.name || details.personalization?.number) && (
                            <div className="mt-2 text-sm text-gray-700 space-y-0.5">
                              {details.size ? (
                                <div>
                                  <span className="text-gray-500">Size:</span> {details.size}
                                </div>
                              ) : null}

                              {details.personalization ? (
                                <div>
                                  <span className="text-gray-500">Personalization:</span>{' '}
                                  {details.personalization.name ? details.personalization.name : '—'}
                                  {details.personalization.number ? ` · #${details.personalization.number}` : ''}
                                </div>
                              ) : null}
                            </div>
                          )}

                          {details.optionsPairs.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {details.optionsPairs.map((p, idx) => (
                                <span
                                  key={`${p.k}-${idx}`}
                                  className="text-xs px-2 py-1 rounded-full border bg-white"
                                  title={p.k}
                                >
                                  <span className="text-gray-500">{prettyKey(p.k)}:</span> {p.v}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* ✅ badges with the SAME names as ProductConfigurator */}
                          {details.badges.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {details.badges.map((b, idx) => (
                                <span
                                  key={`${b}-${idx}`}
                                  className="text-xs px-2 py-1 rounded-full border bg-white max-w-full break-words"
                                  title={b} // keep raw as tooltip
                                >
                                  {humanizeBadge(b)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* desktop/tablet: price */}
                        <div className="shrink-0 font-semibold hidden sm:block">{money(it.totalPrice, currency)}</div>

                        {/* mobile: details block below */}
                        <div className="sm:hidden">
                          {(details.size || details.personalization?.name || details.personalization?.number) && (
                            <div className="mt-2 text-sm text-gray-700 space-y-0.5">
                              {details.size ? (
                                <div>
                                  <span className="text-gray-500">Size:</span> {details.size}
                                </div>
                              ) : null}

                              {details.personalization ? (
                                <div>
                                  <span className="text-gray-500">Personalization:</span>{' '}
                                  {details.personalization.name ? details.personalization.name : '—'}
                                  {details.personalization.number ? ` · #${details.personalization.number}` : ''}
                                </div>
                              ) : null}
                            </div>
                          )}

                          {details.optionsPairs.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {details.optionsPairs.map((p, idx) => (
                                <span
                                  key={`${p.k}-${idx}`}
                                  className="text-xs px-2 py-1 rounded-full border bg-white max-w-full break-words"
                                  title={p.k}
                                >
                                  <span className="text-gray-500">{prettyKey(p.k)}:</span> {p.v}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* ✅ badges with the SAME names as ProductConfigurator */}
                          {details.badges.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {details.badges.map((b, idx) => (
                                <span
                                  key={`${b}-${idx}`}
                                  className="text-xs px-2 py-1 rounded-full border bg-white max-w-full break-words"
                                  title={b}
                                >
                                  {humanizeBadge(b)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>

              <div className="rounded-xl border p-4">
                <h2 className="font-semibold">Summary</h2>
                <div className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{money(order.subtotal ?? itemsSubtotal, currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span>{money(order.shipping ?? 0, currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span>{money(order.tax ?? 0, currency)}</span>
                  </div>
                  <div className="mt-2 flex justify-between border-t pt-2 font-bold">
                    <span>Total</span>
                    <span>{money(totalCents, currency)}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Sidebar */}
            <aside className="space-y-4">
              <div className="rounded-xl border p-4">
                <h2 className="font-semibold">Meta</h2>
                <div className="mt-2 text-sm text-gray-700 space-y-1">
                  <div>
                    <span className="text-gray-500">ID:</span>{' '}
                    <span className="font-mono break-all">{order.id}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Created:</span> {new Date(order.createdAt).toLocaleString()}
                  </div>

                  {order.paidAt && (
                    <div>
                      <span className="text-gray-500">Paid at:</span> {new Date(order.paidAt).toLocaleString()}
                    </div>
                  )}

                  {order.paymentStatus && (
                    <div>
                      <span className="text-gray-500">Payment:</span> {order.paymentStatus}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <h2 className="font-semibold">Shipping</h2>

                {ship ? (
                  <div className="mt-2 text-sm text-gray-700 space-y-1">
                    {ship.name && <div>{ship.name}</div>}
                    {ship.email && <div>{ship.email}</div>}
                    {ship.phone && <div>{ship.phone}</div>}

                    {ship.address && (
                      <div>
                        {ship.address.line1 && <div>{ship.address.line1}</div>}
                        {ship.address.line2 && <div>{ship.address.line2}</div>}
                        <div>{[ship.address.postal_code, ship.address.city].filter(Boolean).join(' ')}</div>
                        <div>{[ship.address.state, ship.address.country].filter(Boolean).join(', ')}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-gray-500">No shipping info.</p>
                )}
              </div>

              <div className="rounded-xl border p-4">
                <h2 className="font-semibold">Actions</h2>
                <div className="mt-2 flex flex-col gap-2">
                  <Link href="/" className="rounded-lg border px-3 py-2 text-center hover:bg-gray-50">
                    Continue shopping
                  </Link>
                  <Link href="/account" className="rounded-lg border px-3 py-2 text-center hover:bg-gray-50">
                    Go to my account
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  )
}
