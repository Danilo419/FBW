// src/app/[locale]/orders/[id]/page.tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import OrderItemThumb from "@/components/OrderItemThumb";
import { Link } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* --------------------------- money --------------------------- */

function money(cents?: number | null, currency = "EUR", locale = "en") {
  const n = typeof cents === "number" ? cents : 0;

  const normalizedLocale =
    locale === "pt" ? "pt-PT" : locale === "en" ? "en" : locale;

  return (n / 100).toLocaleString(normalizedLocale, {
    style: "currency",
    currency,
  });
}

/* --------------------------- url helpers --------------------------- */

function normalizeUrl(u?: string | null) {
  if (!u) return "";
  if (u.startsWith("//")) return `https:${u}`;
  return u;
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === "object" && !Array.isArray(x);
}

/** ✅ robust cover extraction */
function getCoverUrl(imageUrls: unknown): string {
  try {
    if (!imageUrls) return "/placeholder.png";

    if (Array.isArray(imageUrls)) {
      const first = String(imageUrls[0] ?? "").trim();
      return normalizeUrl(first) || "/placeholder.png";
    }

    if (typeof imageUrls === "string") {
      const s = imageUrls.trim();
      if (!s) return "/placeholder.png";

      if (s.startsWith("[") && s.endsWith("]")) {
        const parsed: unknown = JSON.parse(s);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const first = String(parsed[0] ?? "").trim();
          return normalizeUrl(first) || "/placeholder.png";
        }
      }

      return normalizeUrl(s) || "/placeholder.png";
    }

    if (isRecord(imageUrls)) {
      for (const v of Object.values(imageUrls)) {
        const candidate = getCoverUrl(v);
        if (candidate && candidate !== "/placeholder.png") return candidate;
      }
      return "/placeholder.png";
    }

    return "/placeholder.png";
  } catch {
    return "/placeholder.png";
  }
}

function resolveItemImage(it: OrderItemRow) {
  const direct = normalizeUrl(it.image ?? null);
  const fromProduct = getCoverUrl(it.product?.imageUrls);
  return direct || fromProduct || "/placeholder.png";
}

/* ========================= Badge labels ========================= */

const BADGE_LABEL_KEYS: Record<string, string> = {
  "premier-league-regular": "premierLeagueRegular",
  "premier-league-champions": "premierLeagueChampions",
  "la-liga-regular": "laLigaRegular",
  "la-liga-champions": "laLigaChampions",
  "serie-a-regular": "serieARegular",
  "serie-a-scudetto": "serieAScudetto",
  "bundesliga-regular": "bundesligaRegular",
  "bundesliga-champions": "bundesligaChampions",
  "ligue1-regular": "ligue1Regular",
  "ligue1-champions": "ligue1Champions",
  "primeira-liga-regular": "primeiraLigaRegular",
  "primeira-liga-champions": "primeiraLigaChampions",
  "eredivisie-regular": "eredivisieRegular",
  "eredivisie-champions": "eredivisieChampions",
  "scottish-premiership-regular": "scottishPremiershipRegular",
  "scottish-premiership-champions": "scottishPremiershipChampions",
  "mls-regular": "mlsRegular",
  "mls-champions": "mlsChampions",
  "brasileirao-regular": "brasileiraoRegular",
  "brasileirao-champions": "brasileiraoChampions",
  "super-lig-regular": "superLigRegular",
  "super-lig-champions": "superLigChampions",
  "spl-saudi-regular": "splSaudiRegular",
  "spl-saudi-champions": "splSaudiChampions",
  "ucl-regular": "uclRegular",
  "ucl-winners": "uclWinners",
  "uel-regular": "uelRegular",
  "uel-winners": "uelWinners",
  "uecl-regular": "ueclRegular",
  "uecl-winners": "ueclWinners",
  "club-world-cup-champions": "clubWorldCupChampions",
  "intercontinental-cup-champions": "intercontinentalCupChampions",
};

function fallbackHumanize(value: string) {
  return value
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function humanizeBadge(value: string, t: (key: string) => string) {
  const key = String(value ?? "").trim();
  if (!key) return "";

  const translationKey = BADGE_LABEL_KEYS[key];
  if (translationKey) return t(`badges.${translationKey}`);

  return fallbackHumanize(key);
}

/* ----------------------------- shipping ----------------------------- */

type ShippingJson =
  | {
      name?: string | null;
      email?: string | null;
      phone?: string | null;
      address?: {
        line1?: string | null;
        line2?: string | null;
        city?: string | null;
        state?: string | null;
        postal_code?: string | null;
        country?: string | null;
      } | null;
    }
  | null;

function shippingFromOrder(order: OrderRow): ShippingJson {
  const canonical: ShippingJson = {
    name: order.shippingFullName ?? null,
    email: order.shippingEmail ?? null,
    phone: order.shippingPhone ?? null,
    address: {
      line1: order.shippingAddress1 ?? null,
      line2: order.shippingAddress2 ?? null,
      city: order.shippingCity ?? null,
      state: order.shippingRegion ?? null,
      postal_code: order.shippingPostalCode ?? null,
      country: order.shippingCountry ?? null,
    },
  };

  const hasCanonical =
    canonical?.name ||
    canonical?.email ||
    canonical?.phone ||
    canonical?.address?.line1 ||
    canonical?.address?.city ||
    canonical?.address?.country;

  if (hasCanonical) return canonical;
  return (order.shippingJson ?? null) as ShippingJson;
}

function computeTotalCents(order: OrderRow) {
  if (typeof order.totalCents === "number") return order.totalCents;
  if (typeof order.total === "number") return Math.round(order.total * 100);

  const itemsSum =
    (order.items || []).reduce((acc: number, it: OrderItemRow) => {
      return acc + (Number(it.totalPrice) || 0);
    }, 0) || 0;

  const shipping = Number(order.shipping) || 0;
  const tax = Number(order.tax) || 0;
  return itemsSum + shipping + tax;
}

/* ---------------------- discount-aware helpers ---------------------- */

function allocateProportionally(values: number[], targetTotal: number): number[] {
  const safeValues = values.map((v) => Math.max(0, Math.round(Number(v) || 0)));
  const safeTarget = Math.max(0, Math.round(Number(targetTotal) || 0));

  const sourceTotal = safeValues.reduce((a, b) => a + b, 0);

  if (safeValues.length === 0) return [];
  if (safeTarget === 0) return safeValues.map(() => 0);
  if (sourceTotal <= 0) {
    const base = Math.floor(safeTarget / safeValues.length);
    let remainder = safeTarget - base * safeValues.length;
    return safeValues.map(() => {
      const extra = remainder > 0 ? 1 : 0;
      if (remainder > 0) remainder -= 1;
      return base + extra;
    });
  }

  const provisional = safeValues.map((v, idx) => {
    const exact = (v * safeTarget) / sourceTotal;
    const floor = Math.floor(exact);
    return { idx, floor, frac: exact - floor };
  });

  const result = new Array(safeValues.length).fill(0);
  let assigned = 0;

  for (const row of provisional) {
    result[row.idx] = row.floor;
    assigned += row.floor;
  }

  let remainder = safeTarget - assigned;

  provisional
    .slice()
    .sort((a, b) => {
      if (b.frac !== a.frac) return b.frac - a.frac;
      return a.idx - b.idx;
    })
    .forEach((row) => {
      if (remainder <= 0) return;
      result[row.idx] += 1;
      remainder -= 1;
    });

  return result;
}

function buildDiscountedPricing(order: OrderRow) {
  const originalItemTotals = (order.items || []).map(
    (it) => Math.max(0, Number(it.totalPrice) || 0)
  );

  const originalItemsSubtotal = originalItemTotals.reduce((a, b) => a + b, 0);
  const shippingCents = Math.max(0, Number(order.shipping) || 0);
  const taxCents = Math.max(0, Number(order.tax) || 0);
  const orderTotalCents = Math.max(0, computeTotalCents(order));

  const discountedItemsSubtotal = Math.max(0, orderTotalCents - shippingCents - taxCents);

  const discountedItemTotals =
    originalItemsSubtotal > 0
      ? allocateProportionally(originalItemTotals, discountedItemsSubtotal)
      : originalItemTotals.map(() => 0);

  const discountedUnitPrices = discountedItemTotals.map((itemTotal, idx) => {
    const qty = Math.max(1, Number(order.items[idx]?.qty) || 1);
    return Math.round(itemTotal / qty);
  });

  return {
    shippingCents,
    taxCents,
    orderTotalCents,
    originalItemsSubtotal,
    discountedItemsSubtotal,
    discountedItemTotals,
    discountedUnitPrices,
  };
}

/* ========================= Item detail extraction ========================= */

function safeParseJSON(input: unknown): Record<string, unknown> {
  if (!input) return {};
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
      return {};
    } catch {
      return {};
    }
  }
  if (typeof input === "object") return input as Record<string, unknown>;
  return {};
}

function pickStr(o: unknown, keys: string[]): string | null {
  if (!o || typeof o !== "object") return null;
  const obj = o as Record<string, unknown>;
  for (const k of keys) {
    const v = obj[k];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return null;
}

function splitBadgesString(s: string): string[] {
  const raw = String(s ?? "").trim();
  if (!raw) return [];
  const parts = raw.split(/[,\n;|]+/g).map((x) => x.trim());
  return parts.filter(Boolean);
}

function normalizeBadges(rawBadges: unknown): string[] {
  if (!rawBadges) return [];

  if (Array.isArray(rawBadges)) {
    const out: string[] = [];
    for (const v of rawBadges) {
      if (v == null) continue;
      if (typeof v === "string") out.push(...splitBadgesString(v));
      else if (isRecord(v)) out.push(...splitBadgesString(Object.values(v).join(",")));
      else out.push(...splitBadgesString(String(v)));
    }
    return out;
  }

  if (isRecord(rawBadges)) {
    const out: string[] = [];
    for (const v of Object.values(rawBadges)) {
      if (v == null) continue;
      if (typeof v === "string") out.push(...splitBadgesString(v));
      else if (isRecord(v)) out.push(...splitBadgesString(Object.values(v).join(",")));
      else out.push(...splitBadgesString(String(v)));
    }
    return out;
  }

  return splitBadgesString(String(rawBadges));
}

function extractPersonalization(
  it: OrderItemRow,
  snap: Record<string, unknown>,
  optionsObj: Record<string, unknown>
) {
  const snapPers =
    snap?.personalization && typeof snap.personalization === "object"
      ? (snap.personalization as Record<string, unknown>)
      : null;

  const snapPersName = snapPers ? pickStr(snapPers, ["name", "playerName", "customName", "shirtName"]) : null;
  const snapPersNumber = snapPers ? pickStr(snapPers, ["number", "playerNumber", "customNumber", "shirtNumber"]) : null;

  const directName =
    pickStr(it as any, ["personalizationName", "playerName", "custName", "nameOnShirt", "shirtName", "customName"]) ??
    null;

  const directNumber =
    pickStr(it as any, ["personalizationNumber", "playerNumber", "custNumber", "numberOnShirt", "shirtNumber", "customNumber"]) ??
    null;

  const snapRootName = pickStr(snap as any, ["custName", "customerName", "nameOnShirt", "shirtName", "playerName"]) ?? null;
  const snapRootNumber = pickStr(snap as any, ["custNumber", "customerNumber", "numberOnShirt", "shirtNumber", "playerNumber"]) ?? null;

  const optName =
    pickStr(optionsObj as any, ["custName", "playerName", "player_name", "shirtName", "shirt_name", "nameOnShirt"]) ??
    null;

  const optNumber =
    pickStr(optionsObj as any, ["custNumber", "playerNumber", "player_number", "shirtNumber", "shirt_number", "numberOnShirt"]) ??
    null;

  const name =
    (snapPersName ?? directName ?? snapRootName ?? optName ?? null)?.trim() || null;

  const numRaw =
    (snapPersNumber ?? directNumber ?? snapRootNumber ?? optNumber ?? null)?.trim() || "";

  const onlyDigits = String(numRaw).replace(/\D/g, "");
  const number = onlyDigits ? onlyDigits : null;

  if (!name && !number) return null;
  return { name, number };
}

function deriveItemDetails(it: OrderItemRow) {
  const snap = safeParseJSON(it.snapshotJson);

  const optionsObj =
    safeParseJSON((snap as any)?.optionsJson) ||
    safeParseJSON((snap as any)?.options) ||
    safeParseJSON((snap as any)?.selected) ||
    {};

  const personalization = extractPersonalization(it, snap, optionsObj);

  const size =
    (optionsObj as any).size ??
    (snap as any)?.size ??
    pickStr(snap, ["sizeLabel", "variant", "skuSize"]) ??
    null;

  const rawBadges =
    (optionsObj as any).badges ??
    (snap as any)?.badges ??
    (optionsObj as any)["competition_badge"] ??
    null;

  const badgesFromSnap = normalizeBadges(rawBadges);
  const badgesFromProduct = normalizeBadges(it.product?.badges);
  const allBadges = Array.from(new Set([...badgesFromSnap, ...badgesFromProduct])).filter(Boolean);

  const optionsPairs: Array<{ k: string; v: string }> = [];
  for (const [k, v] of Object.entries(optionsObj)) {
    if (v == null || v === "") continue;
    if (k.toLowerCase().includes("json")) continue;

    let vs = "";
    if (Array.isArray(v)) vs = v.join(", ");
    else if (isRecord(v)) vs = Object.values(v).join(", ");
    else vs = String(v);

    vs = vs.trim();
    if (!vs) continue;

    if (k.toLowerCase() === "badges") continue;
    if (k.toLowerCase() === "size") continue;

    optionsPairs.push({ k, v: vs });
  }

  return { size, personalization, badges: allBadges, optionsPairs };
}

function prettyKey(k: string, t: (key: string) => string) {
  const map: Record<string, string> = {
    custName: "name",
    custNumber: "number",
    nameOnShirt: "name",
    numberOnShirt: "number",
    playerName: "name",
    playerNumber: "number",
  };

  if (map[k]) return t(`fields.${map[k]}`);

  return k
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function formatStatus(status: string, t: (key: string) => string) {
  const normalized = String(status || "").trim().toLowerCase();

  const map: Record<string, string> = {
    pending: "pending",
    paid: "paid",
    processing: "processing",
    shipped: "shipped",
    delivered: "delivered",
    cancelled: "cancelled",
    canceled: "cancelled",
    refunded: "refunded",
    failed: "failed",
  };

  const key = map[normalized];
  if (key) return t(`status.${key}`);

  return normalized
    ? normalized.replace(/\b\w/g, (m) => m.toUpperCase())
    : t("status.unknown");
}

function formatPaymentStatus(paymentStatus: string, t: (key: string) => string) {
  const normalized = String(paymentStatus || "").trim().toLowerCase();

  const map: Record<string, string> = {
    pending: "pending",
    paid: "paid",
    processing: "processing",
    failed: "failed",
    refunded: "refunded",
    cancelled: "cancelled",
    canceled: "cancelled",
  };

  const key = map[normalized];
  if (key) return t(`status.${key}`);

  return normalized
    ? normalized.replace(/\b\w/g, (m) => m.toUpperCase())
    : t("status.unknown");
}

/* ========================= Types (local DTO to fix TS) ========================= */

type ProductMini = {
  id: string;
  name: string;
  slug: string | null;
  imageUrls: unknown;
  badges: unknown;
};

type OrderItemRow = {
  id: string;
  name: string;
  qty: number;
  unitPrice: number | null;
  totalPrice: number | null;
  image: string | null;
  snapshotJson: unknown;
  product: ProductMini | null;
};

type OrderRow = {
  id: string;
  createdAt: Date;
  paidAt: Date | null;
  status: string;
  paymentStatus: string | null;

  currency: string | null;
  subtotal: number | null;
  shipping: number | null;
  tax: number | null;
  totalCents: number | null;
  total: number | null;

  shippingFullName: string | null;
  shippingEmail: string | null;
  shippingPhone: string | null;
  shippingAddress1: string | null;
  shippingAddress2: string | null;
  shippingCity: string | null;
  shippingRegion: string | null;
  shippingPostalCode: string | null;
  shippingCountry: string | null;
  shippingJson: unknown;

  items: OrderItemRow[];
};

/* ----------------------------- data load ----------------------------- */

async function loadOrder(id: string): Promise<OrderRow | null> {
  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      createdAt: true,
      paidAt: true,
      status: true,
      paymentStatus: true,

      currency: true,
      subtotal: true,
      shipping: true,
      tax: true,
      totalCents: true,
      total: true,

      shippingFullName: true,
      shippingEmail: true,
      shippingPhone: true,
      shippingAddress1: true,
      shippingAddress2: true,
      shippingCity: true,
      shippingRegion: true,
      shippingPostalCode: true,
      shippingCountry: true,
      shippingJson: true,

      items: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          name: true,
          qty: true,
          unitPrice: true,
          totalPrice: true,
          image: true,
          snapshotJson: true,
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              imageUrls: true,
              badges: true,
            },
          },
        },
      },
    },
  });

  return (order as unknown as OrderRow) ?? null;
}

/* ------------------------------ page ------------------------------ */

export default async function OrderPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("OrderPage");
  const order = await loadOrder(id);

  if (!order) notFound();

  const ship = shippingFromOrder(order);
  const currency = (order.currency || "eur").toUpperCase();

  const pricing = buildDiscountedPricing(order);
  const totalCents = pricing.orderTotalCents;

  const status = String(order.status || "").toLowerCase();
  const statusStyle =
    status === "paid" || status === "shipped" || status === "delivered"
      ? "bg-green-100 text-green-700 border border-green-200"
      : status === "pending"
      ? "bg-amber-100 text-amber-800 border border-amber-200"
      : "bg-gray-100 text-gray-700 border";

  return (
    <main className="container-fw pt-12 pb-20">
      <div className="mb-6">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← {t("backToStore")}
        </Link>
      </div>

      <div className="rounded-2xl border bg-white p-4 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusStyle}`}
          >
            {formatStatus(order.status, t)}
          </span>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Main */}
          <section className="md:col-span-2 space-y-4">
            <div className="rounded-xl border">
              <div className="border-b px-4 py-3 font-semibold">{t("itemsTitle")}</div>

              <ul className="divide-y">
                {order.items.map((it: OrderItemRow, index: number) => {
                  const img = resolveItemImage(it);
                  const title = it.name || it.product?.name || t("itemFallback");
                  const productHref = it.product?.slug ? `/products/${it.product.slug}` : null;

                  const details = deriveItemDetails(it);
                  const discountedItemTotal = pricing.discountedItemTotals[index] ?? 0;
                  const discountedUnitPrice = pricing.discountedUnitPrices[index] ?? 0;

                  return (
                    <li key={it.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <OrderItemThumb
                            src={img}
                            alt={title}
                            className="relative h-14 w-14 rounded-md border bg-gray-50 overflow-hidden shrink-0"
                            size={56}
                          />

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
                              {t("qtyLabel")}: {it.qty}
                              <span className="mx-2">·</span>
                              {money(discountedUnitPrice, currency, locale)} {t("each")}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 font-semibold">
                          {money(discountedItemTotal, currency, locale)}
                        </div>
                      </div>

                      {(details.size ||
                        details.personalization?.name ||
                        details.personalization?.number ||
                        details.optionsPairs.length > 0 ||
                        details.badges.length > 0) && (
                        <div className="mt-3 pl-[68px] space-y-2">
                          {(details.size ||
                            details.personalization?.name ||
                            details.personalization?.number) && (
                            <div className="text-sm text-gray-700 space-y-0.5">
                              {details.size ? (
                                <div>
                                  <span className="text-gray-500">{t("sizeLabel")}:</span>{" "}
                                  {String(details.size)}
                                </div>
                              ) : null}

                              {details.personalization ? (
                                <div>
                                  <span className="text-gray-500">
                                    {t("personalizationLabel")}:
                                  </span>{" "}
                                  {details.personalization.name
                                    ? details.personalization.name
                                    : t("emptyValue")}
                                  {details.personalization.number
                                    ? ` · #${details.personalization.number}`
                                    : ""}
                                </div>
                              ) : null}
                            </div>
                          )}

                          {details.optionsPairs.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {details.optionsPairs.map((p, idx) => (
                                <span
                                  key={`${p.k}-${idx}`}
                                  className="text-xs px-2 py-1 rounded-full border bg-white max-w-full break-words"
                                  title={p.k}
                                >
                                  <span className="text-gray-500">
                                    {prettyKey(p.k, t)}:
                                  </span>{" "}
                                  {p.v}
                                </span>
                              ))}
                            </div>
                          )}

                          {details.badges.length > 0 && (
                            <div>
                              <div className="text-xs font-semibold text-gray-500 mb-1">
                                {t("badgesLabel")}:
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {details.badges.map((b, idx) => (
                                  <span
                                    key={`${b}-${idx}`}
                                    className="text-xs px-2 py-1 rounded-full border bg-white max-w-full break-words"
                                    title={b}
                                  >
                                    {humanizeBadge(b, t)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="rounded-xl border p-4">
              <h2 className="font-semibold">{t("summaryTitle")}</h2>
              <div className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>{t("subtotal")}</span>
                  <span>{money(pricing.discountedItemsSubtotal, currency, locale)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("shipping")}</span>
                  <span>{money(pricing.shippingCents, currency, locale)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("tax")}</span>
                  <span>{money(pricing.taxCents, currency, locale)}</span>
                </div>
                <div className="mt-2 flex justify-between border-t pt-2 font-bold">
                  <span>{t("total")}</span>
                  <span>{money(totalCents, currency, locale)}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Sidebar */}
          <aside className="space-y-4">
            <div className="rounded-xl border p-4">
              <h2 className="font-semibold">{t("metaTitle")}</h2>
              <div className="mt-2 text-sm text-gray-700 space-y-1">
                <div>
                  <span className="text-gray-500">{t("idLabel")}:</span>{" "}
                  <span className="font-mono break-all">{order.id}</span>
                </div>
                <div>
                  <span className="text-gray-500">{t("createdLabel")}:</span>{" "}
                  {new Date(order.createdAt).toLocaleString(
                    locale === "pt" ? "pt-PT" : "en"
                  )}
                </div>

                {order.paidAt ? (
                  <div>
                    <span className="text-gray-500">{t("paidAtLabel")}:</span>{" "}
                    {new Date(order.paidAt).toLocaleString(
                      locale === "pt" ? "pt-PT" : "en"
                    )}
                  </div>
                ) : null}

                {order.paymentStatus ? (
                  <div>
                    <span className="text-gray-500">{t("paymentLabel")}:</span>{" "}
                    {formatPaymentStatus(order.paymentStatus, t)}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-xl border p-4">
              <h2 className="font-semibold">{t("shippingTitle")}</h2>
              {ship ? (
                <div className="mt-2 text-sm text-gray-700 space-y-1">
                  {ship.name && <div>{ship.name}</div>}
                  {ship.email && <div>{ship.email}</div>}
                  {ship.phone && <div>{ship.phone}</div>}
                  {ship.address && (
                    <div>
                      {ship.address.line1 && <div>{ship.address.line1}</div>}
                      {ship.address.line2 && <div>{ship.address.line2}</div>}
                      <div>
                        {[ship.address.postal_code, ship.address.city].filter(Boolean).join(" ")}
                      </div>
                      <div>
                        {[ship.address.state, ship.address.country].filter(Boolean).join(", ")}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-sm text-gray-500">{t("noShippingInfo")}</p>
              )}
            </div>

            <div className="rounded-xl border p-4">
              <h2 className="font-semibold">{t("actionsTitle")}</h2>
              <div className="mt-2 flex flex-col gap-2">
                <Link href="/" className="rounded-lg border px-3 py-2 text-center hover:bg-gray-50">
                  {t("continueShopping")}
                </Link>
                <Link href="/account" className="rounded-lg border px-3 py-2 text-center hover:bg-gray-50">
                  {t("goToMyAccount")}
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

/* ----------------------------- metadata ---------------------------- */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "OrderPage" });

  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  const title = order
    ? `${t("metadataTitlePrefix")} ${order.id} — ${formatStatus(order.status, t)}`
    : t("metadataFallbackTitle");

  return { title };
}