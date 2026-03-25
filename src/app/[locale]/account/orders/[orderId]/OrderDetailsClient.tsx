'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { Loader2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

function money(cents?: number | null, currency = 'EUR', locale = 'en') {
  const n = typeof cents === 'number' ? cents : 0
  return (n / 100).toLocaleString(locale, { style: 'currency', currency })
}

/* ========================= Translator helper types ========================= */

type TString = (key: string) => string

/* ========================= Badge labels (i18n keys) ========================= */

const BADGE_LABEL_KEYS: Record<string, string> = {
  'premier-league-regular': 'premierLeagueRegular',
  'premier-league-champions': 'premierLeagueChampions',
  'la-liga-regular': 'laLigaRegular',
  'la-liga-champions': 'laLigaChampions',
  'serie-a-regular': 'serieARegular',
  'serie-a-scudetto': 'serieAScudetto',
  'bundesliga-regular': 'bundesligaRegular',
  'bundesliga-champions': 'bundesligaChampions',
  'ligue1-regular': 'ligue1Regular',
  'ligue1-champions': 'ligue1Champions',
  'primeira-liga-regular': 'primeiraLigaRegular',
  'primeira-liga-champions': 'primeiraLigaChampions',
  'eredivisie-regular': 'eredivisieRegular',
  'eredivisie-champions': 'eredivisieChampions',
  'scottish-premiership-regular': 'scottishPremiershipRegular',
  'scottish-premiership-champions': 'scottishPremiershipChampions',
  'mls-regular': 'mlsRegular',
  'mls-champions': 'mlsChampions',
  'brasileirao-regular': 'brasileiraoRegular',
  'brasileirao-champions': 'brasileiraoChampions',
  'super-lig-regular': 'superLigRegular',
  'super-lig-champions': 'superLigChampions',
  'spl-saudi-regular': 'splSaudiRegular',
  'spl-saudi-champions': 'splSaudiChampions',
  'ucl-regular': 'uclRegular',
  'ucl-winners': 'uclWinners',
  'uel-regular': 'uelRegular',
  'uel-winners': 'uelWinners',
  'uecl-regular': 'ueclRegular',
  'uecl-winners': 'ueclWinners',
  'club-world-cup-champions': 'clubWorldCupChampions',
  'intercontinental-cup-champions': 'intercontinentalCupChampions',
}

function humanizeBadge(value: string, tBadges: TString) {
  const key = String(value ?? '').trim()
  if (!key) return ''

  const i18nKey = BADGE_LABEL_KEYS[key]
  if (i18nKey) return tBadges(i18nKey)

  return key
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
  unitPrice: number
  totalPrice: number
  name: string
  image?: string | null
  snapshotJson?: unknown
  personalizationJson?: unknown
  product: {
    id: string
    name: string
    slug?: string | null
    imageUrls: unknown
    badges: unknown
  }
}

type OrderDetailsDTO = {
  id: string
  createdAt: string
  paidAt?: string | null
  status: string
  paymentStatus?: string | null

  currency: string
  subtotal?: number | null
  shipping?: number | null
  tax?: number | null
  totalCents?: number | null
  total?: number | null

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

function safeParseJSON(input: unknown): Record<string, unknown> {
  if (!input) return {}

  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
      return {}
    } catch {
      return {}
    }
  }

  if (typeof input === 'object' && input !== null && !Array.isArray(input)) {
    return input as Record<string, unknown>
  }

  return {}
}

function pickStr(o: unknown, keys: string[]): string | null {
  if (!o || typeof o !== 'object') return null

  const obj = o as Record<string, unknown>

  for (const k of keys) {
    const v = obj[k]
    if (v != null && String(v).trim() !== '') return String(v)
  }

  return null
}

function isExternalUrl(u: string): boolean {
  return /^https?:\/\//i.test(u) || u.startsWith('//')
}

function normalizeUrl(u: string): string {
  if (!u) return ''
  if (u.startsWith('//')) return `https:${u}`
  return u
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === 'object' && !Array.isArray(x)
}

function getCoverUrl(imageUrls: unknown): string {
  try {
    if (!imageUrls) return '/placeholder.png'

    if (Array.isArray(imageUrls)) {
      const first = String(imageUrls[0] ?? '').trim()
      return normalizeUrl(first) || '/placeholder.png'
    }

    if (typeof imageUrls === 'string') {
      const s = imageUrls.trim()
      if (!s) return '/placeholder.png'

      if (s.startsWith('[') && s.endsWith(']')) {
        const parsed: unknown = JSON.parse(s)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const first = String(parsed[0] ?? '').trim()
          return normalizeUrl(first) || '/placeholder.png'
        }
      }

      return normalizeUrl(s) || '/placeholder.png'
    }

    if (isRecord(imageUrls)) {
      for (const v of Object.values(imageUrls)) {
        const candidate = getCoverUrl(v)
        if (candidate && candidate !== '/placeholder.png') return candidate
      }
      return '/placeholder.png'
    }

    return '/placeholder.png'
  } catch {
    return '/placeholder.png'
  }
}

function shippingFromOrder(order: OrderDetailsDTO): ShippingJson {
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

function computeTotalCents(order: OrderDetailsDTO): number {
  if (typeof order?.totalCents === 'number') return order.totalCents
  if (typeof order?.total === 'number') return Math.round(order.total * 100)

  const itemsSum =
    (order?.items || []).reduce((acc: number, it: OrderItemDTO) => acc + (Number(it?.totalPrice) || 0), 0) || 0

  const shipping = Number(order?.shipping) || 0
  const tax = Number(order?.tax) || 0

  return itemsSum + shipping + tax
}

/* ========================= Item detail extraction ========================= */

function extractPersonalization(
  it: OrderItemDTO,
  snap: Record<string, unknown>,
  optionsObj: Record<string, unknown>
) {
  const snapPers =
    snap.personalization && typeof snap.personalization === 'object'
      ? (snap.personalization as Record<string, unknown>)
      : null

  const snapPersName = snapPers
    ? pickStr(snapPers, ['name', 'playerName', 'customName', 'shirtName'])
    : null

  const snapPersNumber = snapPers
    ? pickStr(snapPers, ['number', 'playerNumber', 'customNumber', 'shirtNumber'])
    : null

  const snapJ = safeParseJSON(snap.personalizationJson)
  const itJ = safeParseJSON(it.personalizationJson)

  const snapJName = pickStr(snapJ, ['name', 'playerName', 'customName', 'shirtName']) ?? null
  const snapJNumber = pickStr(snapJ, ['number', 'playerNumber', 'customNumber', 'shirtNumber']) ?? null

  const itJName = pickStr(itJ, ['name', 'playerName', 'customName', 'shirtName']) ?? null
  const itJNumber = pickStr(itJ, ['number', 'playerNumber', 'customNumber', 'shirtNumber']) ?? null

  const directName =
    pickStr(it as unknown, [
      'personalizationName',
      'playerName',
      'custName',
      'nameOnShirt',
      'shirtName',
      'customName',
    ]) ?? null

  const directNumber =
    pickStr(it as unknown, [
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
    pickStr(snap, ['custNumber', 'customerNumber', 'numberOnShirt', 'shirtNumber', 'playerNumber']) ?? null

  const optName =
    pickStr(optionsObj, [
      'custName',
      'playerName',
      'player_name',
      'shirtName',
      'shirt_name',
      'nameOnShirt',
    ]) ?? null

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
    (snapPersNumber ??
      snapJNumber ??
      itJNumber ??
      directNumber ??
      snapRootNumber ??
      optNumber ??
      null)?.trim() || ''

  const onlyDigits = String(numRaw).replace(/\D/g, '')
  const number = onlyDigits ? onlyDigits : null

  if (!name && !number) return null

  return { name, number }
}

function splitBadgesString(s: string): string[] {
  const raw = String(s ?? '').trim()
  if (!raw) return []

  const parts = raw.split(/[,\n;|]+/g).map((x) => x.trim())
  return parts.filter(Boolean)
}

function normalizeBadges(rawBadges: unknown): string[] {
  if (!rawBadges) return []

  if (Array.isArray(rawBadges)) {
    const out: string[] = []

    for (const v of rawBadges) {
      if (v == null) continue
      if (typeof v === 'string') out.push(...splitBadgesString(v))
      else if (isRecord(v)) out.push(...splitBadgesString(Object.values(v).join(',')))
      else out.push(...splitBadgesString(String(v)))
    }

    return out
  }

  if (isRecord(rawBadges)) {
    const out: string[] = []

    for (const v of Object.values(rawBadges)) {
      if (v == null) continue
      if (typeof v === 'string') out.push(...splitBadgesString(v))
      else if (isRecord(v)) out.push(...splitBadgesString(Object.values(v).join(',')))
      else out.push(...splitBadgesString(String(v)))
    }

    return out
  }

  return splitBadgesString(String(rawBadges))
}

function deriveItemDetails(it: OrderItemDTO) {
  const snap = safeParseJSON(it?.snapshotJson)

  const optionsObj =
    safeParseJSON(snap.optionsJson) ||
    safeParseJSON(snap.options) ||
    safeParseJSON(snap.selected) ||
    {}

  const personalization = extractPersonalization(it, snap, optionsObj)

  const rawSize = optionsObj.size ?? snap.size ?? pickStr(snap, ['sizeLabel', 'variant', 'skuSize']) ?? null
  const size = rawSize == null ? null : String(rawSize)

  const rawBadges = optionsObj.badges ?? snap.badges ?? optionsObj.competition_badge ?? null

  const badgesFromSnap = normalizeBadges(rawBadges)
  const badgesFromProduct = normalizeBadges(it?.product?.badges)
  const allBadges = Array.from(new Set([...badgesFromSnap, ...badgesFromProduct])).filter(Boolean)

  const optionsPairs: Array<{ k: string; v: string }> = []

  for (const [k, v] of Object.entries(optionsObj)) {
    if (v == null || v === '') continue
    if (k.toLowerCase().includes('json')) continue

    let vs = ''

    if (Array.isArray(v)) vs = v.join(', ')
    else if (isRecord(v)) vs = Object.values(v).join(', ')
    else vs = String(v)

    vs = vs.trim()
    if (!vs) continue

    if (k.toLowerCase() === 'badges') continue
    if (k.toLowerCase() === 'size') continue

    optionsPairs.push({ k, v: vs })
  }

  return { size, personalization, badges: allBadges, optionsPairs }
}

function prettyKey(k: string, t: TString) {
  const map: Record<string, string> = {
    custName: 'name',
    custNumber: 'number',
    nameOnShirt: 'name',
    numberOnShirt: 'number',
    playerName: 'name',
    playerNumber: 'number',
  }

  if (map[k]) return t(map[k])

  return k
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (m) => m.toUpperCase())
}

/* ========================= Component ========================= */

export default function OrderDetailsClient({ orderId }: { orderId: string }) {
  const tRaw = useTranslations('OrderDetailsPage')
  const tBadgesRaw = useTranslations('OrderDetailsPage.badges')
  const locale = useLocale()

  const t: TString = (key) => String(tRaw(key))
  const tBadges: TString = (key) => String(tBadgesRaw(key))

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
        const j: unknown = await r.json()

        const data = j as {
          error?: string
          order?: OrderDetailsDTO
          data?: { order?: OrderDetailsDTO }
        }

        if (!r.ok) throw new Error(data?.error || t('errors.failedToLoad'))
        if (!alive) return

        setOrder(data?.order ?? data?.data?.order ?? null)
      } catch (e: unknown) {
        if (!alive) return
        setErr(e instanceof Error ? e.message : t('errors.somethingWentWrong'))
      } finally {
        if (!alive) return
        setLoading(false)
      }
    }

    run()

    return () => {
      alive = false
    }
  }, [orderId, t])

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
          ← {t('backToAccount')}
        </Link>
      </div>

      <div className="space-y-5 rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl font-bold">{t('title')}</h1>

          {order?.status ? (
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusStyle}`}
            >
              {order.status}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full border bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
              —
            </span>
          )}
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('loading')}
          </div>
        )}

        {!loading && err && (
          <div className="rounded-2xl border bg-red-50 p-4 text-sm text-red-700">{err}</div>
        )}

        {!loading && !err && !order && (
          <div className="rounded-2xl border bg-white/70 p-6 text-center text-sm text-gray-600">
            {t('notFound')}
          </div>
        )}

        {!loading && !err && order && (
          <div className="grid gap-6 md:grid-cols-3">
            <section className="space-y-4 md:col-span-2">
              <div className="rounded-xl border">
                <div className="border-b px-4 py-3 font-semibold">{t('items')}</div>

                <ul className="divide-y">
                  {order.items.map((it) => {
                    const title = it.name || it.product?.name || t('itemFallback')
                    const details = deriveItemDetails(it)

                    const cover = getCoverUrl(it.product?.imageUrls)
                    const img = normalizeUrl(cover) || '/placeholder.png'
                    const external = isExternalUrl(img)

                    const productHref = it.product?.slug ? `/products/${it.product.slug}` : null

                    return (
                      <li key={it.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:gap-4">
                        <div className="flex items-start justify-between gap-3 sm:hidden">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border bg-gray-50">
                              <Image
                                src={img}
                                alt={title}
                                fill
                                className="object-cover"
                                sizes="56px"
                                priority={false}
                                unoptimized={external}
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
                                {t('qty')}: {it.qty}
                                <span className="mx-2">·</span>
                                {money(it.unitPrice, currency, locale)} {t('each')}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 font-semibold">
                            {money(it.totalPrice, currency, locale)}
                          </div>
                        </div>

                        <div className="relative mt-0.5 hidden h-14 w-14 shrink-0 overflow-hidden rounded-md border bg-gray-50 sm:block">
                          <Image
                            src={img}
                            alt={title}
                            fill
                            className="object-cover"
                            sizes="56px"
                            priority={false}
                            unoptimized={external}
                          />
                        </div>

                        <div className="hidden min-w-0 flex-1 sm:block">
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
                            {t('qty')}: {it.qty}
                            <span className="mx-2">·</span>
                            {money(it.unitPrice, currency, locale)} {t('each')}
                          </div>

                          {(details.size || details.personalization?.name || details.personalization?.number) && (
                            <div className="mt-2 space-y-0.5 text-sm text-gray-700">
                              {details.size ? (
                                <div>
                                  <span className="text-gray-500">{t('size')}:</span> {details.size}
                                </div>
                              ) : null}

                              {details.personalization ? (
                                <div>
                                  <span className="text-gray-500">{t('personalization')}:</span>{' '}
                                  {details.personalization.name ? details.personalization.name : '—'}
                                  {details.personalization.number
                                    ? ` · #${details.personalization.number}`
                                    : ''}
                                </div>
                              ) : null}
                            </div>
                          )}

                          {details.optionsPairs.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {details.optionsPairs.map((p, idx) => (
                                <span
                                  key={`${p.k}-${idx}`}
                                  className="rounded-full border bg-white px-2 py-1 text-xs"
                                  title={p.k}
                                >
                                  <span className="text-gray-500">{prettyKey(p.k, t)}:</span> {p.v}
                                </span>
                              ))}
                            </div>
                          )}

                          {details.badges.length > 0 && (
                            <div className="mt-2">
                              <div className="mb-1 text-xs font-semibold text-gray-500">
                                {t('badgesLabel')}
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {details.badges.map((b, idx) => (
                                  <span
                                    key={`${b}-${idx}`}
                                    className="max-w-full break-words rounded-full border bg-white px-2 py-1 text-xs"
                                    title={b}
                                  >
                                    {humanizeBadge(b, tBadges)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="hidden shrink-0 font-semibold sm:block">
                          {money(it.totalPrice, currency, locale)}
                        </div>

                        <div className="sm:hidden">
                          {(details.size || details.personalization?.name || details.personalization?.number) && (
                            <div className="mt-2 space-y-0.5 text-sm text-gray-700">
                              {details.size ? (
                                <div>
                                  <span className="text-gray-500">{t('size')}:</span> {details.size}
                                </div>
                              ) : null}

                              {details.personalization ? (
                                <div>
                                  <span className="text-gray-500">{t('personalization')}:</span>{' '}
                                  {details.personalization.name ? details.personalization.name : '—'}
                                  {details.personalization.number
                                    ? ` · #${details.personalization.number}`
                                    : ''}
                                </div>
                              ) : null}
                            </div>
                          )}

                          {details.optionsPairs.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {details.optionsPairs.map((p, idx) => (
                                <span
                                  key={`${p.k}-${idx}`}
                                  className="max-w-full break-words rounded-full border bg-white px-2 py-1 text-xs"
                                  title={p.k}
                                >
                                  <span className="text-gray-500">{prettyKey(p.k, t)}:</span> {p.v}
                                </span>
                              ))}
                            </div>
                          )}

                          {details.badges.length > 0 && (
                            <div className="mt-2">
                              <div className="mb-1 text-xs font-semibold text-gray-500">
                                {t('badgesLabel')}
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {details.badges.map((b, idx) => (
                                  <span
                                    key={`${b}-${idx}`}
                                    className="max-w-full break-words rounded-full border bg-white px-2 py-1 text-xs"
                                    title={b}
                                  >
                                    {humanizeBadge(b, tBadges)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>

              <div className="rounded-xl border p-4">
                <h2 className="font-semibold">{t('summary')}</h2>

                <div className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>{t('subtotal')}</span>
                    <span>{money(order.subtotal ?? itemsSubtotal, currency, locale)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>{t('shipping')}</span>
                    <span>{money(order.shipping ?? 0, currency, locale)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>{t('tax')}</span>
                    <span>{money(order.tax ?? 0, currency, locale)}</span>
                  </div>

                  <div className="mt-2 flex justify-between border-t pt-2 font-bold">
                    <span>{t('total')}</span>
                    <span>{money(totalCents, currency, locale)}</span>
                  </div>
                </div>
              </div>
            </section>

            <aside className="space-y-4">
              <div className="rounded-xl border p-4">
                <h2 className="font-semibold">{t('meta')}</h2>

                <div className="mt-2 space-y-1 text-sm text-gray-700">
                  <div>
                    <span className="text-gray-500">{t('id')}:</span>{' '}
                    <span className="font-mono break-all">{order.id}</span>
                  </div>

                  <div>
                    <span className="text-gray-500">{t('created')}:</span>{' '}
                    {new Date(order.createdAt).toLocaleString(locale)}
                  </div>

                  {order.paidAt && (
                    <div>
                      <span className="text-gray-500">{t('paidAt')}:</span>{' '}
                      {new Date(order.paidAt).toLocaleString(locale)}
                    </div>
                  )}

                  {order.paymentStatus && (
                    <div>
                      <span className="text-gray-500">{t('payment')}:</span> {order.paymentStatus}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <h2 className="font-semibold">{t('shippingTitle')}</h2>

                {ship ? (
                  <div className="mt-2 space-y-1 text-sm text-gray-700">
                    {ship.name && <div>{ship.name}</div>}
                    {ship.email && <div>{ship.email}</div>}
                    {ship.phone && <div>{ship.phone}</div>}

                    {ship.address ? (
                      <div>
                        {ship.address.line1 && <div>{ship.address.line1}</div>}
                        {ship.address.line2 && <div>{ship.address.line2}</div>}
                        <div>{[ship.address.postal_code, ship.address.city].filter(Boolean).join(' ')}</div>
                        <div>{[ship.address.state, ship.address.country].filter(Boolean).join(', ')}</div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-gray-500">{t('noShippingInfo')}</p>
                )}
              </div>

              <div className="rounded-xl border p-4">
                <h2 className="font-semibold">{t('actions')}</h2>

                <div className="mt-2 flex flex-col gap-2">
                  <Link href="/" className="rounded-lg border px-3 py-2 text-center hover:bg-gray-50">
                    {t('continueShopping')}
                  </Link>

                  <Link href="/account" className="rounded-lg border px-3 py-2 text-center hover:bg-gray-50">
                    {t('goToMyAccount')}
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