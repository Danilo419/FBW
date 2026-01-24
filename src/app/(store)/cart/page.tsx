// src/app/(store)/cart/page.tsx
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import type { Prisma, CartItem } from "@prisma/client";
import { removeItem } from "./actions";
import { applyPromotions, MAX_FREE_ITEMS_PER_ORDER } from "@/lib/cartPromotions";

export const dynamic = "force-dynamic";

/* ========================= BADGE LABELS (same as ProductConfigurator) ========================= */
const BADGE_LABELS: Record<string, string> = {
  "premier-league-regular": "Premier League – League Badge",
  "premier-league-champions": "Premier League – Champions (Gold)",
  "la-liga-regular": "La Liga – League Badge",
  "la-liga-champions": "La Liga – Champion",
  "serie-a-regular": "Serie A – League Badge",
  "serie-a-scudetto": "Italy – Scudetto (Serie A Champion)",
  "bundesliga-regular": "Bundesliga – League Badge",
  "bundesliga-champions": "Bundesliga – Champion (Meister Badge)",
  "ligue1-regular": "Ligue 1 – League Badge",
  "ligue1-champions": "Ligue 1 – Champion",
  "primeira-liga-regular": "Primeira Liga – League Badge",
  "primeira-liga-champions": "Primeira Liga – Champion",
  "eredivisie-regular": "Eredivisie – League Badge",
  "eredivisie-champions": "Eredivisie – Champion",
  "scottish-premiership-regular": "Scottish Premiership – League Badge",
  "scottish-premiership-champions": "Scottish Premiership – Champion",
  "mls-regular": "MLS – League Badge",
  "mls-champions": "MLS – Champions (MLS Cup Holders)",
  "brasileirao-regular": "Brasileirão – League Badge",
  "brasileirao-champions": "Brasileirão – Champion",
  "super-lig-regular": "Süper Lig – League Badge",
  "super-lig-champions": "Süper Lig – Champion",
  "spl-saudi-regular": "Saudi Pro League – League Badge",
  "spl-saudi-champions": "Saudi Pro League – Champion",
  "ucl-regular": "UEFA Champions League – Starball Badge",
  "ucl-winners": "UEFA Champions League – Winners Badge",
  "uel-regular": "UEFA Europa League – Badge",
  "uel-winners": "UEFA Europa League – Winners Badge",
  "uecl-regular": "UEFA Europa Conference League – Badge",
  "uecl-winners": "UEFA Europa Conference League – Winners Badge",
  "club-world-cup-champions": "FIFA Club World Cup – Champions Badge",
  "intercontinental-cup-champions": "FIFA Intercontinental Cup – Champions Badge",
};

function humanizeBadge(value: string) {
  const key = String(value ?? "").trim();
  if (!key) return "";
  if (BADGE_LABELS[key]) return BADGE_LABELS[key];

  return key
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

/* ------------------------------- helpers ------------------------------- */
function isExternalUrl(u: string) {
  return /^https?:\/\//i.test(u) || u.startsWith("//");
}
function normalizeUrl(u: string) {
  if (!u) return "";
  if (u.startsWith("//")) return `https:${u}`;
  return u;
}

/** ✅ keep your original formatMoney, only move "€" to the right in THIS FILE */
function formatMoneyRight(cents: number) {
  const s = formatMoney(cents);

  let m = s.match(/^-€\s*(.+)$/);
  if (m) return `-${m[1]}€`;

  m = s.match(/^€\s*(.+)$/);
  if (m) return `${m[1]}€`;

  return s;
}

/**
 * imageUrls pode vir como:
 * - string URL
 * - array de URLs
 * - JSON string '["...","..."]'
 */
function getCoverUrl(imageUrls: unknown) {
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
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const first = String(parsed[0] ?? "").trim();
          return normalizeUrl(first) || "/placeholder.png";
        }
      }

      return normalizeUrl(s) || "/placeholder.png";
    }

    return "/placeholder.png";
  } catch {
    return "/placeholder.png";
  }
}

function prettifyKey(k: string) {
  const map: Record<string, string> = {
    size: "Size",
    badges: "Badges",
    customization: "Customization",
    custname: "CustName",
    custnumber: "CustNumber",
  };
  const lower = String(k).toLowerCase();
  if (map[lower]) return map[lower];
  return (
    map[k] ??
    String(k).replace(/[_-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase())
  );
}

function asDisplayValue(v: unknown) {
  if (v == null) return "";
  if (Array.isArray(v)) return v.map(String).join(", ");
  return String(v);
}

function parseMaybeJsonObject(x: unknown): Record<string, any> | null {
  if (!x) return null;
  if (typeof x === "object") return x as any;
  if (typeof x === "string") {
    try {
      const p = JSON.parse(x);
      if (p && typeof p === "object") return p as any;
    } catch {
      return null;
    }
  }
  return null;
}

function extractNameNumberFromOptions(opts: Record<string, any> | null) {
  if (!opts) return { name: null as string | null, number: null as string | null };

  const c =
    opts.customization && typeof opts.customization === "object"
      ? opts.customization
      : null;

  const name =
    (c?.name ??
      c?.playerName ??
      c?.player_name ??
      opts.name ??
      opts.playerName ??
      opts.player_name) ?? null;

  const number =
    (c?.number ??
      c?.playerNumber ??
      c?.player_number ??
      opts.number ??
      opts.playerNumber ??
      opts.player_number) ?? null;

  const nameStr = name != null && String(name).trim() ? String(name).trim() : null;
  const numStr = number != null && String(number).trim() ? String(number).trim() : null;

  return { name: nameStr, number: numStr };
}

/* ---------- Badges parsing: supports array / json array string / comma string ---------- */
function parseBadgesRaw(v: unknown): string[] {
  if (!v) return [];

  if (Array.isArray(v)) {
    return v.map((x) => String(x ?? "").trim()).filter(Boolean);
  }

  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return [];

    if (s.startsWith("[") && s.endsWith("]")) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) {
          return parsed.map((x) => String(x ?? "").trim()).filter(Boolean);
        }
      } catch {}
    }

    return s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }

  return [];
}

function getBadgePillsFromOpts(opts: Record<string, any> | null): string[] {
  if (!opts) return [];
  const raw = opts.badges ?? opts.Badges ?? opts.BADGES ?? opts.badge ?? opts.Badge ?? null;

  const keysOrLabels = parseBadgesRaw(raw);
  const pills = keysOrLabels
    .map((x) => humanizeBadge(x))
    .map((x) => String(x).trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const uniq: string[] = [];
  for (const p of pills) {
    if (seen.has(p)) continue;
    seen.add(p);
    uniq.push(p);
  }
  return uniq;
}

/**
 * ✅ options rows (texto)
 * - remove "badges" (vamos renderizar como pills)
 * - remove "customization"
 * - remove name/number "soltos"
 * - ✅ remove size/custName/custNumber (porque já mostramos no bloco meta)
 */
function optionsToRows(opts: Record<string, any> | null) {
  if (!opts) return [];

  const blockKeys = new Set<string>([
    "name",
    "number",
    "playername",
    "playernumber",
    "player_name",
    "player_number",
    "customization",
    "badges",
    "size",
    "custname",
    "custnumber",
    "customername",
    "customernumber",
  ]);

  return Object.entries(opts)
    .filter(([k, v]) => {
      const key = String(k).toLowerCase();
      if (blockKeys.has(key)) return false;
      return v != null && String(v).trim() !== "";
    })
    .map(([k, v]) => [prettifyKey(k), asDisplayValue(v)] as const)
    .filter(([, v]) => String(v).trim() !== "");
}

/* -------------------------- promo labels / banner -------------------------- */

function promoTitleFromName(p: ReturnType<typeof applyPromotions>["promoName"]) {
  if (p === "BUY_1_GET_1") return "Buy 1 Get 1";
  if (p === "BUY_2_GET_3") return "Buy 2 Get 3";
  if (p === "BUY_3_GET_5") return "Buy 3 Get 5";
  return null;
}

function promoBannerMessage(totalQty: number) {
  // Ajustado para bater com as promos reais
  if (totalQty <= 1) {
    return {
      title: "Promotion Preview",
      message: "Add 1 more item to unlock: Buy 1 Get 1",
      showPill: false,
    };
  }
  if (totalQty === 2) {
    return {
      title: "Promotion Preview",
      message: "Add 1 more item to unlock: Buy 2 Get 3 (get 1 free item).",
      showPill: true,
    };
  }
  if (totalQty === 3) {
    return { title: "Promotion Preview", message: null as string | null, showPill: true };
  }
  if (totalQty === 4) {
    return {
      title: "Promotion Preview",
      message: "Add 1 more item to unlock: Buy 3 Get 5 (get 2 free items).",
      showPill: true,
    };
  }
  return { title: "Promotion Preview", message: null as string | null, showPill: true };
}

/* ------------------------------- types ------------------------------- */
type CartWithItems = Prisma.CartGetPayload<{
  include: {
    items: {
      include: {
        product: {
          select: {
            id: true;
            name: true;
            team: true;
            imageUrls: true;
            slug: true;
            basePrice: true;
          };
        };
      };
      orderBy: { createdAt: "asc" };
    };
  };
}>;

export default async function CartPage() {
  const cookieStore = await cookies();
  const sid = cookieStore.get("sid")?.value ?? null;

  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id ?? null;

  const cart = (await prisma.cart.findFirst({
    where: {
      OR: [userId ? { userId } : undefined, sid ? { sessionId: sid } : undefined].filter(Boolean) as any,
    },
    include: {
      items: {
        include: {
          product: {
            select: { id: true, name: true, team: true, imageUrls: true, slug: true, basePrice: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  })) as CartWithItems | null;

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container-fw py-16">
        <h1 className="text-3xl font-extrabold mb-6">Your Cart</h1>
        <div className="rounded-2xl border p-10 bg-white/70 text-gray-600">Your cart is empty.</div>
        <div className="mt-6">
          <Link
            href="/products"
            className="inline-flex items-center rounded-xl bg-blue-600 px-5 py-2.5 text-white hover:bg-blue-700"
          >
            Browse products
          </Link>
        </div>
      </div>
    );
  }

  const displayItems = cart.items.map((it) => {
    const displayUnit: number = (it as CartItem).unitPrice ?? 0;
    const displayTotal: number = displayUnit * it.qty;

    const opts = parseMaybeJsonObject((it as any).optionsJson);
    const pers = parseMaybeJsonObject((it as any).personalization);

    const pName = pers?.name ? String(pers.name).trim() : null;
    const pNumber = pers?.number ? String(pers.number).trim() : null;

    const fallback = extractNameNumberFromOptions(opts);
    const name = pName || fallback.name;
    const number = pNumber || fallback.number;

    return { ...it, displayUnit, displayTotal, opts, pers, name, number };
  });

  const subtotalCents: number = displayItems.reduce((acc: number, it: any) => acc + it.displayTotal, 0);
  const totalQty = displayItems.reduce((acc: number, it: any) => acc + (it.qty ?? 0), 0);

  // ✅ SINGLE SOURCE OF TRUTH: same logic as Stripe (server)
  const promo = applyPromotions(
    displayItems.map((it: any) => ({
      id: String(it.id),
      name: String(it.product?.name ?? it.name ?? "Item"),
      unitAmountCents: Math.max(0, Number(it.displayUnit ?? 0)),
      qty: Math.max(0, Number(it.qty ?? 0)),
      image: (it.product?.imageUrls?.[0] ?? null) as any,
    }))
  );

  const freeQtyByItemId = new Map<string, number>();
  for (const l of promo.lines) {
    if (l.freeQty > 0) freeQtyByItemId.set(String(l.id), l.freeQty);
  }

  const payableSubtotalCents = promo.lines.reduce(
    (acc, l) => acc + l.payQty * l.unitAmountCents,
    0
  );

  const discountCents = Math.max(0, subtotalCents - payableSubtotalCents);
  const shippingCents = promo.shippingCents;
  const totalPayableCents = payableSubtotalCents + shippingCents;

  const promoTitle = promoTitleFromName(promo.promoName);
  const banner = promoBannerMessage(totalQty);

  return (
    <div className="container-fw py-12">
      <h1 className="text-3xl font-extrabold mb-8">Your Cart</h1>

      {/* Promo summary */}
      <div className="mb-6 rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-900">{banner.title}</div>
            <div className="text-sm text-gray-600">
              The free items are always the cheapest ones. Max{" "}
              <span className="font-semibold text-gray-900">{MAX_FREE_ITEMS_PER_ORDER}</span> free items per order.
            </div>
          </div>

          {banner.showPill ? (
            <div className="inline-flex items-center gap-2 rounded-full border bg-gray-50 px-4 py-2 text-sm">
              <span className="font-semibold text-gray-900">{promoTitle ?? "No promotion"}</span>
              <span className="text-gray-500">
                • Free items:{" "}
                <span className="font-semibold text-gray-900">
                  {promo.freeItemsApplied}/{MAX_FREE_ITEMS_PER_ORDER}
                </span>{" "}
                • Shipping:{" "}
                {shippingCents === 0 ? (
                  <span className="font-semibold text-gray-900">FREE</span>
                ) : (
                  <span className="font-semibold text-gray-900">5€</span>
                )}
              </span>
            </div>
          ) : (
            <div className="text-sm text-gray-700 font-medium">{banner.message ?? " "}</div>
          )}
        </div>
      </div>

      <div className="grid gap-5">
        {displayItems.map((it: any) => {
          const cover = getCoverUrl(it.product.imageUrls);
          const external = isExternalUrl(cover);

          const badgePills = getBadgePillsFromOpts(it.opts);
          const optionRows = optionsToRows(it.opts);

          const custNameRaw =
            it.opts?.custName ?? it.opts?.CustName ?? it.opts?.custname ?? it.opts?.customerName ?? null;
          const custNumberRaw =
            it.opts?.custNumber ?? it.opts?.CustNumber ?? it.opts?.custnumber ?? it.opts?.customerNumber ?? null;

          const custName =
            custNameRaw != null && String(custNameRaw).trim() ? String(custNameRaw).trim() : null;
          const custNumber =
            custNumberRaw != null && String(custNumberRaw).trim() ? String(custNumberRaw).trim() : null;

          const sizeRaw = it.opts?.size ?? it.opts?.Size ?? null;
          const size = sizeRaw != null && String(sizeRaw).trim() ? String(sizeRaw).trim() : null;

          const teamRaw = it.product.team ? String(it.product.team) : "";
          const nameRaw = it.product.name ? String(it.product.name) : "";
          const showTeam = !!teamRaw.trim() && teamRaw.trim().toLowerCase() !== nameRaw.trim().toLowerCase();

          const freeQty = freeQtyByItemId.get(String(it.id)) ?? 0;
          const payableQty = Math.max(0, (it.qty ?? 0) - freeQty);

          const lineBefore = it.displayTotal;
          const lineAfter = (it.displayUnit ?? 0) * payableQty;

          const hasMetaBlock = !!(custName || custNumber || size || badgePills.length > 0 || freeQty > 0);

          return (
            <div
              key={String(it.id)}
              className="rounded-2xl border bg-white p-4 sm:p-5 shadow-sm hover:shadow-md transition"
            >
              <div className="flex gap-4 sm:gap-5">
                <div className="relative h-28 w-24 sm:h-32 sm:w-28 overflow-hidden rounded-xl border bg-white">
                  <Image
                    src={cover}
                    alt={it.product.name}
                    fill
                    className="object-contain"
                    sizes="(max-width: 640px) 96px, 112px"
                    unoptimized={external}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-semibold leading-snug break-words">{it.product.name}</h3>

                      {showTeam && <div className="mt-0.5 text-sm text-gray-600">{it.product.team}</div>}

                      {/* ✅ ORDER: Name, Number, Size, (Badges) */}
                      {hasMetaBlock && (
                        <div className="mt-2 space-y-2">
                          {custName && (
                            <div className="text-xs text-gray-700">
                              <span className="font-semibold text-gray-900">Name:</span>{" "}
                              <span className="break-words">{custName}</span>
                            </div>
                          )}

                          {custNumber && (
                            <div className="text-xs text-gray-700">
                              <span className="font-semibold text-gray-900">Number:</span>{" "}
                              <span className="break-words">{custNumber}</span>
                            </div>
                          )}

                          {size && (
                            <div className="text-xs text-gray-700">
                              <span className="font-semibold text-gray-900">Size:</span>{" "}
                              <span className="break-words">{size}</span>
                            </div>
                          )}

                          {badgePills.length > 0 && (
                            <div className="text-xs text-gray-700">
                              <div className="font-semibold text-gray-900 mb-1">Badges:</div>

                              {/* ✅ MOBILE: pills take full width so text uses surrounding space */}
                              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-2">
                                {badgePills.map((b) => (
                                  <span
                                    key={b}
                                    className="
                                      inline-flex
                                      w-full sm:w-auto
                                      justify-start
                                      rounded-xl sm:rounded-full
                                      border bg-white
                                      px-3 py-1.5 sm:px-2.5 sm:py-1
                                      text-[11px] sm:text-xs
                                      text-gray-800
                                      shadow-[0_1px_0_rgba(0,0,0,0.03)]
                                    "
                                    style={{
                                      whiteSpace: "normal",
                                      lineHeight: "1.25",
                                      textAlign: "left",
                                    }}
                                  >
                                    <span className="break-words">{b}</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {freeQty > 0 && (
                            <div className="inline-flex flex-wrap items-center gap-2">
                              <span className="rounded-full border bg-green-50 px-3 py-1 text-xs text-green-800">
                                <span className="font-semibold">FREE</span>{" "}
                                <span className="text-green-700">x{freeQty}</span>
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* other options */}
                      {optionRows.length > 0 && (
                        <div className="mt-2 flex flex-col gap-1 text-xs text-gray-600">
                          {optionRows.map(([k, v]) => (
                            <div key={k} className="flex flex-wrap gap-x-2 gap-y-1">
                              <span className="font-semibold text-gray-700">{k}:</span>
                              <span className="break-words">{v}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-sm text-gray-500">Unit: {formatMoneyRight(it.displayUnit)}</div>

                      <div className="mt-0.5 text-base font-semibold">{formatMoneyRight(lineAfter)}</div>

                      {freeQty > 0 && lineAfter !== lineBefore && (
                        <div className="mt-0.5 text-xs text-gray-500">
                          Before: <span className="line-through">{formatMoneyRight(lineBefore)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="text-sm text-gray-600">
                      Qty: <span className="font-medium">{it.qty}</span>
                      {freeQty > 0 && (
                        <>
                          {" "}
                          • Pay for: <span className="font-medium">{payableQty}</span>
                        </>
                      )}
                    </div>

                    <form action={removeItem}>
                      <input type="hidden" name="itemId" value={String(it.id)} />
                      <button
                        type="submit"
                        className="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm hover:bg-red-50 hover:text-red-700 transition"
                        aria-label={`Remove ${it.product.name} from cart`}
                      >
                        Remove
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Totals */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 sm:items-start">
        <div className="rounded-2xl border bg-white p-5">
          <div className="text-sm font-semibold text-gray-900">Order Summary</div>

          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-semibold">{formatMoneyRight(subtotalCents)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-600">
                Discount {promoTitle ? <span className="text-gray-500">({promoTitle})</span> : null}
              </span>
              <span className={`font-semibold ${discountCents > 0 ? "text-green-700" : ""}`}>
                -{formatMoneyRight(discountCents)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-600">Shipping</span>
              {shippingCents === 0 ? (
                <span className="font-semibold text-green-700">FREE</span>
              ) : (
                <span className="font-semibold">{formatMoneyRight(shippingCents)}</span>
              )}
            </div>

            <div className="pt-3 border-t flex items-center justify-between">
              <span className="text-base font-extrabold">Total</span>
              <span className="text-base font-extrabold">{formatMoneyRight(totalPayableCents)}</span>
            </div>

            {promoTitle ? (
              <div className="pt-3 text-xs text-gray-500">
                Free items applied:{" "}
                <span className="font-semibold text-gray-800">
                  {promo.freeItemsApplied}/{MAX_FREE_ITEMS_PER_ORDER}
                </span>{" "}
                (always the cheapest ones).
              </div>
            ) : (
              <div className="pt-3 text-xs text-gray-500">
                Add more items to unlock:{" "}
                <span className="font-semibold text-gray-800">Buy 1 Get 1</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex sm:justify-end">
          <Link
            href="/checkout/address"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-black px-6 py-3 text-white font-semibold hover:bg-gray-900"
            aria-label="Proceed to address step"
          >
            Go to Checkout
          </Link>
        </div>
      </div>
    </div>
  );
}
