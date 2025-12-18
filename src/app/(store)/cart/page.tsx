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

export const dynamic = "force-dynamic";

/* ========================= IMPORTANT RULE =========================
 * ✅ MAX 2 FREE ITEMS PER ORDER (HARD CAP)
 */
const MAX_FREE_ITEMS_PER_ORDER = 2;

/* ------------------------------- helpers ------------------------------- */
function isExternalUrl(u: string) {
  return /^https?:\/\//i.test(u) || u.startsWith("//");
}
function normalizeUrl(u: string) {
  if (!u) return "";
  if (u.startsWith("//")) return `https:${u}`;
  return u;
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

      // JSON array string
      if (s.startsWith("[") && s.endsWith("]")) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const first = String(parsed[0] ?? "").trim();
          return normalizeUrl(first) || "/placeholder.png";
        }
      }

      // single url
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
  };
  return map[k] ?? k.replace(/[_-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
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

function optionsToRows(opts: Record<string, any> | null) {
  if (!opts) return [];
  return Object.entries(opts)
    .filter(([k, v]) => {
      const key = k.toLowerCase();
      if (key === "name" || key === "number") return false;
      if (key === "playername" || key === "playernumber") return false;
      if (key === "player_name" || key === "player_number") return false;
      return v != null && String(v).trim() !== "";
    })
    .map(([k, v]) => {
      let vv = asDisplayValue(v);
      if (k === "badges") vv = vv.split(",").map((s) => s.trim()).filter(Boolean).join(", ");
      return [prettifyKey(k), vv] as const;
    });
}

/* -------------------------- promo (Buy X Get Y) -------------------------- */

type PromoKind = "B1G1" | "B2G3" | "B3G5" | null;

function pickPromo(totalQty: number): {
  kind: PromoKind;
  groupSize: number;
  freePerGroup: number;
  shippingCents: number | null;
  threshold: number; // minimum qty to be "in" that promo tier
} {
  // Melhor tier primeiro
  if (totalQty >= 5) return { kind: "B3G5", groupSize: 5, freePerGroup: 2, shippingCents: 0, threshold: 5 };
  if (totalQty >= 3) return { kind: "B2G3", groupSize: 3, freePerGroup: 1, shippingCents: 0, threshold: 3 };
  if (totalQty >= 2) return { kind: "B1G1", groupSize: 2, freePerGroup: 1, shippingCents: 500, threshold: 2 };
  return { kind: null, groupSize: 0, freePerGroup: 0, shippingCents: null, threshold: 0 };
}

function promoLabel(kind: PromoKind) {
  if (kind === "B1G1") return "Buy 1, Get 1";
  if (kind === "B2G3") return "Buy 2, Get 3";
  if (kind === "B3G5") return "Buy 3, Get 5";
  return null;
}

/** Mensagem do bloco de promoção (de acordo com o que pediste) */
function promoBannerMessage(totalQty: number) {
  // 0 ou 1 item: mostrar unlock do Buy 2 Get 3 (sem "(2+)")
  if (totalQty <= 1) {
    return {
      title: "Promotion Preview",
      message: `Add more items to unlock: Buy 2 Get 3`,
      showPill: false,
    };
  }

  // 2 itens: não mostrar buy1get1, mostrar mensagem "agora estás no buy2get3" e pedir para adicionar o grátis
  if (totalQty === 2) {
    return {
      title: "Promotion Preview",
      message:
        "You are now in the Buy 2 Get 3 promotion and are eligible to receive 1 free product — add it to the cart!",
      showPill: false,
    };
  }

  // 3 itens: já está no buy2get3 (qualifica para 1 grátis) — podemos mostrar pill normal
  if (totalQty === 3) {
    return {
      title: "Promotion Preview",
      message: null as string | null,
      showPill: true,
    };
  }

  // 4 itens: não mostrar buy2get3, mostrar mensagem "agora estás no buy3get5" e falta mais 1 para ganhar +1 grátis
  if (totalQty === 4) {
    return {
      title: "Promotion Preview",
      message:
        "You are now in the Buy 3 Get 5 promotion and are eligible to receive 1 more free product — add it to the cart!",
      showPill: false,
    };
  }

  // 5+ itens: pill normal (buy3get5)
  return {
    title: "Promotion Preview",
    message: null as string | null,
    showPill: true,
  };
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
      OR: [
        userId ? { userId } : undefined,
        sid ? { sessionId: sid } : undefined,
      ].filter(Boolean) as any,
    },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              team: true,
              imageUrls: true,
              slug: true,
              basePrice: true,
            },
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
        <div className="rounded-2xl border p-10 bg-white/70 text-gray-600">
          Your cart is empty.
        </div>
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

  const subtotalCents: number = displayItems.reduce(
    (acc: number, it: any) => acc + it.displayTotal,
    0
  );

  const totalQty = displayItems.reduce((acc: number, it: any) => acc + (it.qty ?? 0), 0);

  const promo = pickPromo(totalQty);

  const promoGroupsRaw = promo.kind ? Math.floor(totalQty / promo.groupSize) : 0;
  const freeCountRaw = promo.kind ? promoGroupsRaw * promo.freePerGroup : 0;

  // ✅ HARD CAP: máximo 2 grátis por encomenda
  const freeCount = Math.min(MAX_FREE_ITEMS_PER_ORDER, freeCountRaw);

  // Expand para unidades (para escolher as mais baratas como FREE)
  const unitPool: Array<{ itemId: string; unitCents: number }> = [];
  for (const it of displayItems as any[]) {
    const q = Math.max(0, Number(it.qty ?? 0));
    const unit = Math.max(0, Number(it.displayUnit ?? 0));
    for (let i = 0; i < q; i++) unitPool.push({ itemId: String(it.id), unitCents: unit });
  }

  unitPool.sort((a, b) => a.unitCents - b.unitCents);

  const freeQtyByItemId = new Map<string, number>();
  let discountCents = 0;

  for (let i = 0; i < Math.min(freeCount, unitPool.length); i++) {
    const u = unitPool[i];
    discountCents += u.unitCents;
    freeQtyByItemId.set(u.itemId, (freeQtyByItemId.get(u.itemId) ?? 0) + 1);
  }

  const promoActive = promo.kind && promoGroupsRaw > 0;
  const shippingCents: number | null = promoActive ? promo.shippingCents : null;

  const totalPayableCents = subtotalCents - discountCents + (shippingCents ?? 0);

  const promoTitle = promoActive ? promoLabel(promo.kind) : null;

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

          {/* Mensagem custom (1 item / 2 itens / 4 itens) OU pill normal */}
          {banner.showPill && promoTitle ? (
            <div className="inline-flex items-center gap-2 rounded-full border bg-gray-50 px-4 py-2 text-sm">
              <span className="font-semibold text-gray-900">{promoTitle}</span>
              <span className="text-gray-500">
                • Free items:{" "}
                <span className="font-semibold text-gray-900">
                  {freeCount}/{MAX_FREE_ITEMS_PER_ORDER}
                </span>
                {promo.kind === "B1G1" ? (
                  <>
                    {" "}
                    • Shipping: <span className="font-semibold text-gray-900">€5</span>
                  </>
                ) : (
                  <>
                    {" "}
                    • Shipping: <span className="font-semibold text-gray-900">FREE</span>
                  </>
                )}
              </span>
            </div>
          ) : (
            <div className="text-sm text-gray-700 font-medium">
              {banner.message ?? " "}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-5">
        {displayItems.map((it: any) => {
          const cover = getCoverUrl(it.product.imageUrls);
          const external = isExternalUrl(cover);

          const optionRows = optionsToRows(it.opts);

          const teamRaw = it.product.team ? String(it.product.team) : "";
          const nameRaw = it.product.name ? String(it.product.name) : "";
          const showTeam =
            !!teamRaw.trim() &&
            teamRaw.trim().toLowerCase() !== nameRaw.trim().toLowerCase();

          const freeQty = freeQtyByItemId.get(String(it.id)) ?? 0;
          const payableQty = Math.max(0, (it.qty ?? 0) - freeQty);

          const lineBefore = it.displayTotal;
          const lineAfter = (it.displayUnit ?? 0) * payableQty;

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
                      <h3 className="font-semibold leading-snug break-words">
                        {it.product.name}
                      </h3>

                      {showTeam && (
                        <div className="mt-0.5 text-sm text-gray-600">
                          {it.product.team}
                        </div>
                      )}

                      {(it.name || it.number || freeQty > 0) && (
                        <div className="mt-2 inline-flex flex-wrap items-center gap-2">
                          {it.name && (
                            <span className="rounded-full border bg-gray-50 px-3 py-1 text-xs text-gray-700">
                              <span className="text-gray-500">Name:</span>{" "}
                              <span className="font-semibold">{it.name}</span>
                            </span>
                          )}
                          {it.number && (
                            <span className="rounded-full border bg-gray-50 px-3 py-1 text-xs text-gray-700">
                              <span className="text-gray-500">Number:</span>{" "}
                              <span className="font-semibold">{it.number}</span>
                            </span>
                          )}
                          {freeQty > 0 && (
                            <span className="rounded-full border bg-green-50 px-3 py-1 text-xs text-green-800">
                              <span className="font-semibold">FREE</span>{" "}
                              <span className="text-green-700">x{freeQty}</span>
                            </span>
                          )}
                        </div>
                      )}

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
                      <div className="text-sm text-gray-500">
                        Unit: {formatMoney(it.displayUnit)}
                      </div>

                      <div className="mt-0.5 text-base font-semibold">
                        {formatMoney(lineAfter)}
                      </div>

                      {freeQty > 0 && lineAfter !== lineBefore && (
                        <div className="mt-0.5 text-xs text-gray-500">
                          Before:{" "}
                          <span className="line-through">{formatMoney(lineBefore)}</span>
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
              <span className="font-semibold">{formatMoney(subtotalCents)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-600">
                Discount {promoTitle ? <span className="text-gray-500">({promoTitle})</span> : null}
              </span>
              <span className={`font-semibold ${discountCents > 0 ? "text-green-700" : ""}`}>
                -{formatMoney(discountCents)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-600">Shipping</span>
              {shippingCents == null ? (
                <span className="font-semibold text-gray-500">Calculated at checkout</span>
              ) : shippingCents === 0 ? (
                <span className="font-semibold text-green-700">FREE</span>
              ) : (
                <span className="font-semibold">{formatMoney(shippingCents)}</span>
              )}
            </div>

            <div className="pt-3 border-t flex items-center justify-between">
              <span className="text-base font-extrabold">Total</span>
              <span className="text-base font-extrabold">{formatMoney(totalPayableCents)}</span>
            </div>

            {/* ✅ removido: "Promo groups in cart: X." */}
            {promoTitle ? (
              <div className="pt-3 text-xs text-gray-500">
                Free items applied:{" "}
                <span className="font-semibold text-gray-800">
                  {freeCount}/{MAX_FREE_ITEMS_PER_ORDER}
                </span>{" "}
                (always the cheapest ones).
              </div>
            ) : (
              <div className="pt-3 text-xs text-gray-500">
                Add more items to unlock: <span className="font-semibold text-gray-800">Buy 2 Get 3</span>
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
