// src/app/[locale]/(store)/cart/page.tsx
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { getTranslations } from "next-intl/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import type { Prisma, CartItem } from "@prisma/client";
import { getShippingForCart } from "@/lib/shipping";
import RemoveCartItemButton from "@/components/cart/RemoveCartItemButton";

export const dynamic = "force-dynamic";

const FREE_SHIPPING_THRESHOLD = 70;
const DEFAULT_SHIPPING_COST = 5;

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
  "intercontinental-cup-champions":
    "FIFA Intercontinental Cup – Champions Badge",
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

function formatMoneyRight(cents: number) {
  const s = formatMoney(cents);

  let m = s.match(/^-€\s*(.+)$/);
  if (m) return `-${m[1]}€`;

  m = s.match(/^€\s*(.+)$/);
  if (m) return `${m[1]}€`;

  return s;
}

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
    String(k)
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (m) => m.toUpperCase())
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
  if (!opts) {
    return { name: null as string | null, number: null as string | null };
  }

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
      opts.player_name) ??
    null;

  const number =
    (c?.number ??
      c?.playerNumber ??
      c?.player_number ??
      opts.number ??
      opts.playerNumber ??
      opts.player_number) ??
    null;

  const nameStr =
    name != null && String(name).trim() ? String(name).trim() : null;
  const numStr =
    number != null && String(number).trim() ? String(number).trim() : null;

  return { name: nameStr, number: numStr };
}

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

  const raw =
    opts.badges ??
    opts.Badges ??
    opts.BADGES ??
    opts.badge ??
    opts.Badge ??
    null;

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

/* -------------------------- shipping helpers (type-safe) -------------------------- */
type CartChannel = "GLOBAL" | "PT_STOCK_CTT" | "MIXED";

function cartChannelFromShipping(info: any): CartChannel {
  if (!info) return "GLOBAL";
  if (typeof info.cartChannel === "string") return info.cartChannel as CartChannel;
  if (typeof info.channel === "string") return info.channel as CartChannel;
  if (typeof info.shippingChannel === "string") {
    return info.shippingChannel as CartChannel;
  }
  if (info.isMixed === true || info.mixed === true) return "MIXED";
  return "GLOBAL";
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
            channel: true;
          };
        };
      };
      orderBy: { createdAt: "asc" };
    };
  };
}>;

export default async function CartPage() {
  const t = await getTranslations();

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
              channel: true,
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
        <h1 className="mb-6 text-3xl font-extrabold">{t("cartPage.title")}</h1>
        <div className="rounded-2xl border bg-white/70 p-10 text-gray-600">
          {t("cartPage.empty")}
        </div>
        <div className="mt-6">
          <Link
            href="/clubs"
            className="inline-flex items-center rounded-xl bg-blue-600 px-5 py-2.5 text-white hover:bg-blue-700"
          >
            {t("cartPage.browseProducts")}
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

  const totalQty = displayItems.reduce(
    (acc: number, it: any) => acc + (it.qty ?? 0),
    0
  );

  const shippingInfo = getShippingForCart(
    displayItems.map((it: any) => ({
      qty: Math.max(0, Number(it.qty ?? 0)),
      channel: (it.product?.channel ?? "GLOBAL") as any,
    }))
  );

  const cartChannel = cartChannelFromShipping(shippingInfo);
  const isMixedCart = cartChannel === "MIXED";
  const isPtStockCart = cartChannel === "PT_STOCK_CTT";

  const globalShippingCents =
    subtotalCents === 0
      ? 0
      : subtotalCents >= FREE_SHIPPING_THRESHOLD * 100
        ? 0
        : DEFAULT_SHIPPING_COST * 100;

  const amountUntilFreeShippingCents = Math.max(
    0,
    FREE_SHIPPING_THRESHOLD * 100 - subtotalCents
  );

  const shippingCentsPt =
    typeof (shippingInfo as any)?.shippingCents === "number"
      ? Number((shippingInfo as any).shippingCents)
      : 0;

  const shippingCents = isPtStockCart ? shippingCentsPt : globalShippingCents;
  const discountCents = 0;
  const totalPayableCents = subtotalCents + shippingCents;

  const shippingBannerTitle = isPtStockCart
    ? t("cartPage.ptStock.title")
    : t("cartPage.labels.shipping");

  const shippingBannerMessage = isPtStockCart
    ? t.rich("cartPage.ptStock.info", {
        one: () => (
          <span className="font-semibold text-gray-900">1 item = 6€</span>
        ),
        two: () => (
          <span className="font-semibold text-gray-900">2 items = 3€</span>
        ),
        three: () => (
          <span className="font-semibold text-gray-900">3+ = FREE</span>
        ),
        delivery: () => (
          <span className="font-semibold text-gray-900">2–3 business days</span>
        ),
      })
    : subtotalCents >= FREE_SHIPPING_THRESHOLD * 100
      ? t("cartPage.free")
      : `${formatMoneyRight(amountUntilFreeShippingCents)} until free shipping`;

  return (
    <div className="container-fw py-12">
      <h1 className="mb-8 text-3xl font-extrabold">{t("cartPage.title")}</h1>

      {isMixedCart && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
          <div className="text-sm font-semibold text-red-900">
            {t("cartPage.mixedCart.title")}
          </div>
          <div className="mt-1 text-sm text-red-800">
            {t.rich("cartPage.mixedCart.message", {
              pt: (chunks) => <b>{chunks}</b>,
              normal: (chunks) => <b>{chunks}</b>,
            })}
          </div>
          <div className="mt-3 text-sm">
            <Link
              href="/pt-stock"
              className="font-semibold text-red-900 underline"
            >
              {t("cartPage.mixedCart.link")}
            </Link>
          </div>
        </div>
      )}

      <div className="mb-6 rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-900">
              {shippingBannerTitle}
            </div>

            <div className="text-sm text-gray-600">
              {shippingBannerMessage}
            </div>
          </div>

          {isPtStockCart ? (
            <div className="w-full sm:w-auto">
              <div className="rounded-2xl border bg-gray-50 px-4 py-3 sm:rounded-full sm:py-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <span className="text-sm font-semibold leading-tight text-gray-900">
                    {t("cartPage.ptStock.shippingTitle")}
                  </span>

                  <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:gap-3">
                    <div className="inline-flex items-center justify-between gap-2">
                      <span className="text-gray-500">
                        {t("cartPage.labels.items")}
                      </span>
                      <span className="tabular-nums font-semibold text-gray-900">
                        {totalQty}
                      </span>
                    </div>

                    <div className="hidden text-gray-300 sm:block">•</div>

                    <div className="inline-flex items-center justify-between gap-2">
                      <span className="text-gray-500">
                        {t("cartPage.labels.shipping")}
                      </span>
                      {shippingCents === 0 ? (
                        <span className="font-semibold text-gray-900">
                          {t("cartPage.free")}
                        </span>
                      ) : (
                        <span className="font-semibold text-gray-900">
                          {formatMoneyRight(shippingCents)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full sm:w-auto">
              <div className="rounded-2xl border bg-gray-50 px-4 py-3 sm:rounded-full sm:py-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <span className="text-sm font-semibold leading-tight text-gray-900">
                    Free shipping from 70€
                  </span>

                  <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:gap-3">
                    <div className="inline-flex items-center justify-between gap-2">
                      <span className="text-gray-500">
                        {t("cartPage.labels.subtotal")}
                      </span>
                      <span className="tabular-nums font-semibold text-gray-900">
                        {formatMoneyRight(subtotalCents)}
                      </span>
                    </div>

                    <div className="hidden text-gray-300 sm:block">•</div>

                    <div className="inline-flex items-center justify-between gap-2">
                      <span className="text-gray-500">
                        {t("cartPage.labels.shipping")}
                      </span>
                      {shippingCents === 0 ? (
                        <span className="font-semibold text-gray-900">
                          {t("cartPage.free")}
                        </span>
                      ) : (
                        <span className="font-semibold text-gray-900">
                          {formatMoneyRight(shippingCents)}
                        </span>
                      )}
                    </div>

                    {amountUntilFreeShippingCents > 0 && (
                      <>
                        <div className="hidden text-gray-300 sm:block">•</div>
                        <div className="inline-flex items-center justify-between gap-2">
                          <span className="text-gray-500">Missing</span>
                          <span className="font-semibold text-gray-900">
                            {formatMoneyRight(amountUntilFreeShippingCents)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
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
            it.opts?.custName ??
            it.opts?.CustName ??
            it.opts?.custname ??
            it.opts?.customerName ??
            null;

          const custNumberRaw =
            it.opts?.custNumber ??
            it.opts?.CustNumber ??
            it.opts?.custnumber ??
            it.opts?.customerNumber ??
            null;

          const custName =
            custNameRaw != null && String(custNameRaw).trim()
              ? String(custNameRaw).trim()
              : null;

          const custNumber =
            custNumberRaw != null && String(custNumberRaw).trim()
              ? String(custNumberRaw).trim()
              : null;

          const sizeRaw = it.opts?.size ?? it.opts?.Size ?? null;
          const size =
            sizeRaw != null && String(sizeRaw).trim()
              ? String(sizeRaw).trim()
              : null;

          const teamRaw = it.product.team ? String(it.product.team) : "";
          const nameRaw = it.product.name ? String(it.product.name) : "";
          const showTeam =
            !!teamRaw.trim() &&
            teamRaw.trim().toLowerCase() !== nameRaw.trim().toLowerCase();

          const lineBefore = it.displayTotal;
          const lineAfter = it.displayTotal;

          const hasMetaBlock = !!(
            custName ||
            custNumber ||
            size ||
            badgePills.length > 0
          );

          return (
            <div
              key={String(it.id)}
              className="rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5"
            >
              <div className="flex gap-4 sm:gap-5">
                <div className="relative h-28 w-24 overflow-hidden rounded-xl border bg-white sm:h-32 sm:w-28">
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
                      <h3 className="break-words font-semibold leading-snug">
                        {it.product.name}
                      </h3>

                      {showTeam && (
                        <div className="mt-0.5 text-sm text-gray-600">
                          {it.product.team}
                        </div>
                      )}

                      {String(it.product?.channel ?? "GLOBAL") ===
                        "PT_STOCK_CTT" && (
                        <div className="mt-1 inline-flex items-center rounded-full border bg-emerald-50 px-3 py-1 text-[11px] text-emerald-800">
                          {t("cartPage.cttBadge")}
                        </div>
                      )}

                      {hasMetaBlock && (
                        <div className="mt-2 space-y-2">
                          {custName && (
                            <div className="text-xs text-gray-700">
                              <span className="font-semibold text-gray-900">
                                {t("cartPage.labels.name")}:
                              </span>{" "}
                              <span className="break-words">{custName}</span>
                            </div>
                          )}

                          {custNumber && (
                            <div className="text-xs text-gray-700">
                              <span className="font-semibold text-gray-900">
                                {t("cartPage.labels.number")}:
                              </span>{" "}
                              <span className="break-words">{custNumber}</span>
                            </div>
                          )}

                          {size && (
                            <div className="text-xs text-gray-700">
                              <span className="font-semibold text-gray-900">
                                {t("cartPage.labels.size")}:
                              </span>{" "}
                              <span className="break-words">{size}</span>
                            </div>
                          )}

                          {badgePills.length > 0 && (
                            <div className="text-xs text-gray-700">
                              <div className="mb-1 font-semibold text-gray-900">
                                {t("cartPage.labels.badges")}:
                              </div>

                              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-2">
                                {badgePills.map((b) => (
                                  <span
                                    key={b}
                                    className="inline-flex w-full justify-start rounded-xl border bg-white px-3 py-1.5 text-[11px] text-gray-800 shadow-[0_1px_0_rgba(0,0,0,0.03)] sm:w-auto sm:rounded-full sm:px-2.5 sm:py-1 sm:text-xs"
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
                        </div>
                      )}

                      {optionRows.length > 0 && (
                        <div className="mt-2 flex flex-col gap-1 text-xs text-gray-600">
                          {optionRows.map(([k, v]) => (
                            <div
                              key={k}
                              className="flex flex-wrap gap-x-2 gap-y-1"
                            >
                              <span className="font-semibold text-gray-700">
                                {k}:
                              </span>
                              <span className="break-words">{v}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-sm text-gray-500">
                        {t("cartPage.labels.unit")}:{" "}
                        {formatMoneyRight(it.displayUnit)}
                      </div>

                      <div className="mt-0.5 text-base font-semibold">
                        {formatMoneyRight(lineAfter)}
                      </div>

                      {lineAfter !== lineBefore && (
                        <div className="mt-0.5 text-xs text-gray-500">
                          {t("cartPage.labels.before")}:{" "}
                          <span className="line-through">
                            {formatMoneyRight(lineBefore)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="text-sm text-gray-600">
                      {t("cartPage.labels.qty")}:{" "}
                      <span className="font-medium">{it.qty}</span>
                    </div>

                    <RemoveCartItemButton
                      itemId={String(it.id)}
                      productName={it.product.name}
                      label={t("cartPage.remove")}
                      ariaLabel={`${t("cartPage.remove")} ${it.product.name} ${t("cartPage.fromCart")}`}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 sm:items-start">
        <div className="rounded-2xl border bg-white p-5">
          <div className="text-sm font-semibold text-gray-900">
            {t("cartPage.orderSummary")}
          </div>

          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">
                {t("cartPage.labels.subtotal")}
              </span>
              <span className="font-semibold">
                {formatMoneyRight(subtotalCents)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-600">
                {t("cartPage.labels.discount")}
              </span>
              <span className="font-semibold">-{formatMoneyRight(discountCents)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-600">
                {t("cartPage.labels.shipping")}
              </span>
              {shippingCents === 0 ? (
                <span className="font-semibold text-green-700">
                  {t("cartPage.free")}
                </span>
              ) : (
                <span className="font-semibold">
                  {formatMoneyRight(shippingCents)}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-base font-extrabold">
                {t("cartPage.labels.total")}
              </span>
              <span className="text-base font-extrabold">
                {formatMoneyRight(totalPayableCents)}
              </span>
            </div>

            {isPtStockCart ? (
              <div className="pt-3 text-xs text-gray-500">
                {t.rich("cartPage.summary.cttRules", {
                  one: () => (
                    <span className="font-semibold text-gray-800">
                      1 item = 6€
                    </span>
                  ),
                  two: () => (
                    <span className="font-semibold text-gray-800">
                      2 items = 3€
                    </span>
                  ),
                  three: () => (
                    <span className="font-semibold text-gray-800">
                      3+ = FREE
                    </span>
                  ),
                })}
              </div>
            ) : amountUntilFreeShippingCents > 0 ? (
              <div className="pt-3 text-xs text-gray-500">
                Add{" "}
                <span className="font-semibold text-gray-800">
                  {formatMoneyRight(amountUntilFreeShippingCents)}
                </span>{" "}
                more to unlock free shipping.
              </div>
            ) : (
              <div className="pt-3 text-xs text-green-700">
                Free shipping unlocked.
              </div>
            )}
          </div>
        </div>

        <div className="flex sm:justify-end">
          <Link
            href={{ pathname: "/checkout/address" }}
            className={`inline-flex w-full items-center justify-center rounded-xl px-6 py-3 font-semibold text-white sm:w-auto ${
              isMixedCart
                ? "pointer-events-none cursor-not-allowed bg-gray-400"
                : "bg-black hover:bg-gray-900"
            }`}
            aria-label={t("cartPage.checkout")}
            aria-disabled={isMixedCart}
          >
            {t("cartPage.checkout")}
          </Link>
        </div>
      </div>
    </div>
  );
}
