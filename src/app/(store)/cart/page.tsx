// src/app/(store)/cart/page.tsx
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import type { Prisma, CartItem } from "@prisma/client";
import { removeItem } from "./actions"; // server action

export const dynamic = "force-dynamic";

// ---- Helper types (garantem que 'items' existe) ----
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

/* ------------------------------- helpers ------------------------------- */
function isExternalUrl(u: string) {
  return /^https?:\/\//i.test(u);
}

function normalizeUrl(u: string) {
  if (!u) return "";
  // handle protocol-relative urls: //example.com/img.png
  if (u.startsWith("//")) return `https:${u}`;
  return u;
}

/**
 * imageUrls pode vir como:
 * - string URL ("https://...")
 * - array de URLs
 * - JSON string '["...","..."]'
 */
function getCoverUrl(imageUrls: unknown) {
  try {
    if (!imageUrls) return "/placeholder.png";

    // Already an array
    if (Array.isArray(imageUrls)) {
      const first = String(imageUrls[0] ?? "").trim();
      return normalizeUrl(first) || "/placeholder.png";
    }

    // If it's a string
    if (typeof imageUrls === "string") {
      const s = imageUrls.trim();
      if (!s) return "/placeholder.png";

      // JSON string array
      if (s.startsWith("[") && s.endsWith("]")) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const first = String(parsed[0] ?? "").trim();
          return normalizeUrl(first) || "/placeholder.png";
        }
      }

      // Single URL string
      return normalizeUrl(s) || "/placeholder.png";
    }

    // Fallback
    return "/placeholder.png";
  } catch {
    return "/placeholder.png";
  }
}

function getOpts(it: any) {
  const raw = it?.optionsJson;

  // already object
  if (raw && typeof raw === "object") return raw;

  // JSON string
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // ignore
    }
  }

  return null;
}

/** tenta encontrar name/number em vários formatos comuns */
function extractCustomization(opts: Record<string, any> | null) {
  if (!opts) return { name: null as string | null, number: null as string | null };

  // casos comuns:
  // opts.customization = { name, number }
  const c = opts.customization && typeof opts.customization === "object" ? opts.customization : null;

  const name =
    (c?.name ?? c?.playerName ?? c?.player_name ?? opts.name ?? opts.playerName ?? opts.player_name) ?? null;

  const number =
    (c?.number ?? c?.playerNumber ?? c?.player_number ?? opts.number ?? opts.playerNumber ?? opts.player_number) ??
    null;

  const nameStr = name != null && String(name).trim() ? String(name).trim() : null;
  const numStr = number != null && String(number).trim() ? String(number).trim() : null;

  return { name: nameStr, number: numStr };
}

function prettifyKey(k: string) {
  // deixa isto bonito no UI
  const map: Record<string, string> = {
    size: "Size",
    badges: "Badges",
    customization: "Customization",
    league: "League",
    season: "Season",
  };
  return map[k] ?? k.replace(/[_-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

/** remove keys que vamos mostrar separadamente (name/number) */
function filteredOptionEntries(opts: Record<string, any> | null) {
  if (!opts) return [];

  const { name, number } = extractCustomization(opts);

  return Object.entries(opts)
    .filter(([k]) => {
      const key = k.toLowerCase();
      if (key === "name" || key === "number") return false;
      if (key === "playername" || key === "playernumber") return false;
      if (key === "player_name" || key === "player_number") return false;
      return true;
    })
    .map(([k, v]) => {
      // se for customization object, vamos “resumir”
      if (k === "customization" && v && typeof v === "object") {
        const parts: string[] = [];
        if (name) parts.push(`Name: ${name}`);
        if (number) parts.push(`Number: ${number}`);
        return [prettifyKey(k), parts.join(" · ") || "—"] as const;
      }

      // arrays -> "a, b, c"
      if (Array.isArray(v)) return [prettifyKey(k), v.map(String).join(", ")] as const;

      return [prettifyKey(k), String(v)] as const;
    });
}

export default async function CartPage() {
  const cookieStore = await cookies();
  const sid = cookieStore.get("sid")?.value ?? null;

  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id ?? null;

  // Find cart by userId (if logged in) OR by sessionId (anonymous)
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

  // Construímos itens para mostrar: usa sempre unitPrice gravado no cart
  const displayItems = cart.items.map((it) => {
    const displayUnit: number = (it as CartItem).unitPrice ?? 0;
    const displayTotal: number = displayUnit * it.qty;

    const opts = getOpts(it);

    return {
      ...it,
      displayUnit,
      displayTotal,
      opts,
    };
  });

  const grandTotal: number = displayItems.reduce(
    (acc: number, it) => acc + it.displayTotal,
    0
  );

  return (
    <div className="container-fw py-12">
      <h1 className="text-3xl font-extrabold mb-8">Your Cart</h1>

      <div className="grid gap-5">
        {displayItems.map((it) => {
          const cover = getCoverUrl(it.product.imageUrls);
          const external = isExternalUrl(cover);

          const opts = (it as any).opts as Record<string, any> | null;
          const { name, number } = extractCustomization(opts);
          const optionEntries = filteredOptionEntries(opts);

          return (
            <div
              key={String(it.id)}
              className="group rounded-2xl border bg-white p-4 sm:p-5 shadow-sm hover:shadow-md transition"
            >
              <div className="flex gap-4 sm:gap-5">
                <div className="relative h-28 w-24 sm:h-32 sm:w-28 overflow-hidden rounded-xl border bg-white">
                  <Image
                    src={cover}
                    alt={it.product.name}
                    fill
                    className="object-contain"
                    sizes="(max-width: 640px) 96px, 112px"
                    unoptimized={external} // garante imagem externa sem precisar configurar domains
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-semibold leading-snug break-words">
                        {it.product.name}
                      </h3>

                      {it.product.team && (
                        <div className="mt-0.5 text-sm text-gray-600">
                          {it.product.team}
                        </div>
                      )}

                      {(name || number) && (
                        <div className="mt-2 inline-flex flex-wrap items-center gap-2">
                          {name && (
                            <span className="rounded-full border bg-gray-50 px-3 py-1 text-xs text-gray-700">
                              <span className="text-gray-500">Name:</span>{" "}
                              <span className="font-semibold">{name}</span>
                            </span>
                          )}
                          {number && (
                            <span className="rounded-full border bg-gray-50 px-3 py-1 text-xs text-gray-700">
                              <span className="text-gray-500">Number:</span>{" "}
                              <span className="font-semibold">{number}</span>
                            </span>
                          )}
                        </div>
                      )}

                      {optionEntries.length > 0 && (
                        <div className="mt-2 flex flex-col gap-1 text-xs text-gray-600">
                          {optionEntries.map(([k, v]) => (
                            <div key={k} className="flex flex-wrap gap-x-2 gap-y-1">
                              <span className="font-semibold text-gray-700">{k}:</span>
                              <span className="text-gray-600 break-words">{v}</span>
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
                        {formatMoney(it.displayTotal)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="text-sm text-gray-600">
                      Qty: <span className="font-medium">{it.qty}</span>
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

      <div className="mt-8 flex items-center justify-end gap-4">
        <div className="rounded-2xl border bg-white px-5 py-3 text-lg font-bold">
          Total:&nbsp;{formatMoney(grandTotal)}
        </div>
        <Link
          href="/checkout/address"
          className="inline-flex items-center rounded-xl bg-black px-5 py-3 text-white font-semibold hover:bg-gray-900"
          aria-label="Proceed to address step"
        >
          Go to Checkout
        </Link>
      </div>
    </div>
  );
}
