// src/app/api/checkout/paypal/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { paypalClient, paypal } from "@/lib/paypal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* -------------------------- helpers -------------------------- */

type Shipping = {
  name?: string;
  phone?: string;
  email?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
};

type CartChannel = "GLOBAL" | "PT_STOCK_CTT" | "MIXED";

type CartItemRow = {
  productId: string;
  qty: number;
  unitPrice: number;
  product: {
    id?: string;
    name: string;
    imageUrls?: string[] | null;
    slug?: string | null;
    channel?: string | null;
    team?: string | null;
  };
  optionsJson?: any;
  personalization?: any;
  totalPrice?: number | null;
};

function getBaseUrl(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";

  if (host) return `${proto}://${host}`.replace(/\/+$/, "");

  const env =
    (process.env.NEXT_PUBLIC_SITE_URL || "").trim() ||
    (process.env.NEXT_PUBLIC_APP_URL || "").trim() ||
    (process.env.SITE_URL || "").trim();

  if (env) return env.replace(/\/+$/, "");

  throw new Error(
    "Base URL not resolvable. Set NEXT_PUBLIC_SITE_URL/NEXT_PUBLIC_APP_URL or ensure Host headers are present."
  );
}

function decodeShippingCookie(raw?: string | null): Shipping | null {
  if (!raw) return null;

  try {
    return JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
  } catch {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}

function centsToMoney(cents: number) {
  return (Math.round(cents) / 100).toFixed(2);
}

function normalizeLocale(value: unknown): "pt" | "en" {
  const locale = String(value ?? "").trim().toLowerCase();
  return locale === "en" ? "en" : "pt";
}

function safeCountryCode(v?: string | null) {
  const s = String(v ?? "").trim().toUpperCase();
  if (!s) return undefined;

  const map: Record<string, string> = {
    PT: "PT",
    PORTUGAL: "PT",

    ES: "ES",
    SPAIN: "ES",
    ESPANHA: "ES",

    FR: "FR",
    FRANCE: "FR",
    FRANCA: "FR",
    "FRANÇA": "FR",

    DE: "DE",
    GERMANY: "DE",
    ALEMANHA: "DE",

    IT: "IT",
    ITALY: "IT",
    ITALIA: "IT",
    "ITÁLIA": "IT",

    GB: "GB",
    UK: "GB",
    "UNITED KINGDOM": "GB",
    ENGLAND: "GB",
    "REINO UNIDO": "GB",
    REINO_UNIDO: "GB",

    NL: "NL",
    NETHERLANDS: "NL",
    HOLANDA: "NL",

    BE: "BE",
    BELGIUM: "BE",
    BELGICA: "BE",
    "BÉLGICA": "BE",

    CH: "CH",
    SWITZERLAND: "CH",
    SUICA: "CH",
    "SUÍÇA": "CH",
  };

  return map[s] || (/^[A-Z]{2}$/.test(s) ? s : undefined);
}

function safeStr(v: any): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function safeObj(v: any): Record<string, any> {
  if (!v) return {};
  if (typeof v === "object") return v as Record<string, any>;

  if (typeof v === "string") {
    try {
      const j = JSON.parse(v);
      return typeof j === "object" && j ? (j as Record<string, any>) : {};
    } catch {
      return {};
    }
  }

  return {};
}

function normalizeSize(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim().toUpperCase();
  return s || null;
}

function extractSelectedSize(optionsJson: any): string | null {
  const root = safeObj(optionsJson);

  const directCandidates = [
    root.size,
    root.selectedSize,
    root.variantSize,
    root.chosenSize,
    root.Size,
  ];

  for (const candidate of directCandidates) {
    const size = normalizeSize(candidate);
    if (size) return size;
  }

  const options = safeObj(root.options);
  for (const candidate of [
    options.size,
    options.selectedSize,
    options.variantSize,
    options.chosenSize,
    options.Size,
  ]) {
    const size = normalizeSize(candidate);
    if (size) return size;
  }

  const selectedOptions = safeObj(root.selectedOptions);
  for (const candidate of [
    selectedOptions.size,
    selectedOptions.selectedSize,
    selectedOptions.variantSize,
    selectedOptions.chosenSize,
    selectedOptions.Size,
  ]) {
    const size = normalizeSize(candidate);
    if (size) return size;
  }

  for (const [key, value] of Object.entries(root)) {
    if (typeof value !== "string") continue;
    const k = key.trim().toLowerCase();
    if (k === "size" || k.includes("size")) {
      const size = normalizeSize(value);
      if (size) return size;
    }
  }

  return null;
}

function detectCartChannel(items: CartItemRow[]): CartChannel {
  const channels = new Set<string>();

  for (const it of items) {
    channels.add(String(it.product?.channel ?? "GLOBAL"));
  }

  if (channels.size > 1) return "MIXED";

  const only = Array.from(channels)[0];
  return only === "PT_STOCK_CTT" ? "PT_STOCK_CTT" : "GLOBAL";
}

function buildSnapshotJson(
  optionsJson: any,
  personalization: any,
  extras?: Record<string, any>
) {
  const baseSnapshot = safeObj(optionsJson);
  const selectedSize = extractSelectedSize(baseSnapshot);

  const snapshot: Record<string, any> = {
    ...baseSnapshot,
    personalization: personalization ?? null,
  };

  if (selectedSize) {
    snapshot.size = selectedSize;

    if (!safeStr(snapshot.selectedSize)) {
      snapshot.selectedSize = selectedSize;
    }

    const options = safeObj(snapshot.options);
    if (!safeStr(options.size)) {
      snapshot.options = {
        ...options,
        size: selectedSize,
      };
    }

    const selectedOptions = safeObj(snapshot.selectedOptions);
    if (!safeStr(selectedOptions.size)) {
      snapshot.selectedOptions = {
        ...selectedOptions,
        size: selectedSize,
      };
    }
  }

  if (extras && typeof extras === "object") {
    Object.assign(snapshot, extras);
  }

  return snapshot;
}

async function validatePtStockOrThrow(items: CartItemRow[]) {
  const aggregated = new Map<
    string,
    { productId: string; size: string; qty: number; productName: string }
  >();

  for (const it of items) {
    const qty = Math.max(0, Number(it.qty ?? 0));
    if (qty <= 0) continue;

    const channel = String(it.product?.channel ?? "GLOBAL");
    if (channel !== "PT_STOCK_CTT") continue;

    const size = extractSelectedSize(it.optionsJson);
    if (!size) {
      throw new Error(
        `O produto PT Stock "${it.product?.name ?? "Produto"}" não tem tamanho selecionado.`
      );
    }

    const key = `${it.productId}__${size}`;
    const existing = aggregated.get(key);

    if (existing) {
      existing.qty += qty;
    } else {
      aggregated.set(key, {
        productId: it.productId,
        size,
        qty,
        productName: String(it.product?.name ?? "Produto"),
      });
    }
  }

  if (aggregated.size === 0) return;

  for (const entry of aggregated.values()) {
    const row = await prisma.sizeStock.findUnique({
      where: {
        productId_size: {
          productId: entry.productId,
          size: entry.size,
        },
      },
      select: {
        ptStockQty: true,
        available: true,
      },
    });

    if (!row) {
      throw new Error(
        `Não existe stock configurado para "${entry.productName}" no tamanho ${entry.size}.`
      );
    }

    const availableQty = Math.max(0, Number(row.ptStockQty ?? 0));

    if (!row.available || availableQty < entry.qty) {
      throw new Error(
        `Stock insuficiente para "${entry.productName}" no tamanho ${entry.size}. Disponível: ${availableQty}.`
      );
    }
  }
}

/* --------------------------- route --------------------------- */

export async function POST(req: NextRequest) {
  try {
    const APP = getBaseUrl(req);
    const body = await req.json().catch(() => ({}));
    const locale = normalizeLocale(body?.locale);

    const jar = await cookies();
    const sid = jar.get("sid")?.value ?? null;

    if (!sid) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const cart = await prisma.cart.findFirst({
      where: { sessionId: sid },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                imageUrls: true,
                slug: true,
                channel: true,
                team: true,
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const cartItems: CartItemRow[] = cart.items.map((it: any) => ({
      productId: it.productId,
      qty: Math.max(0, Number(it.qty ?? 0)),
      unitPrice: Math.max(0, Number(it.unitPrice ?? 0)),
      product: it.product,
      optionsJson:
        it.optionsJson ??
        it.options ??
        it.snapshotJson ??
        it.optionsJSON ??
        (it as any).optionsJson ??
        {},
      personalization: it.personalization ?? null,
      totalPrice: (it as any).totalPrice ?? null,
    }));

    await validatePtStockOrThrow(cartItems);

    const cartChannel = detectCartChannel(cartItems);
    const currency = "EUR";

    const subtotalCents = cartItems.reduce((acc, it) => {
      const line = it.totalPrice ?? it.qty * it.unitPrice;
      return acc + Number(line || 0);
    }, 0);

    const shippingFromCookie = decodeShippingCookie(jar.get("ship")?.value);

    const shippingCents = 0;
    const taxCents = 0;
    const discountCents = 0;
    const finalProductSubtotalCents = Math.max(0, subtotalCents - discountCents);

    const order = await prisma.order.create({
      data: {
        sessionId: cart.sessionId ?? null,
        status: "pending",
        currency: currency.toLowerCase(),
        channel: cartChannel === "PT_STOCK_CTT" ? "PT_STOCK_CTT" : "GLOBAL",

        subtotal: subtotalCents,
        productSubtotalCents: subtotalCents,
        finalProductSubtotalCents,

        shipping: shippingCents,
        shippingCents,
        tax: taxCents,

        discountAmountCents: discountCents,

        total: (finalProductSubtotalCents + shippingCents + taxCents) / 100,
        totalCents: finalProductSubtotalCents + shippingCents + taxCents,

        shippingJson: (shippingFromCookie as any) ?? null,

        shippingFullName: shippingFromCookie?.name ?? null,
        shippingEmail: shippingFromCookie?.email ?? null,
        shippingPhone: shippingFromCookie?.phone ?? null,
        shippingAddress1: shippingFromCookie?.address?.line1 ?? null,
        shippingAddress2: shippingFromCookie?.address?.line2 ?? null,
        shippingCity: shippingFromCookie?.address?.city ?? null,
        shippingRegion: shippingFromCookie?.address?.state ?? null,
        shippingPostalCode: shippingFromCookie?.address?.postal_code ?? null,
        shippingCountry: shippingFromCookie?.address?.country ?? null,

        items: {
          create: cartItems.map((it) => ({
            productId: it.productId,
            name: it.product.name,
            image: it.product.imageUrls?.[0] ?? null,
            qty: it.qty,
            unitPrice: it.unitPrice,
            totalPrice: it.totalPrice ?? it.qty * it.unitPrice,
            snapshotJson: buildSnapshotJson(it.optionsJson, it.personalization, {
              productId: it.productId,
              productSlug: it.product.slug ?? null,
              productChannel: it.product.channel ?? "GLOBAL",
              team: it.product.team ?? null,
            }),
          })),
        },
      },
      include: { items: true },
    });

    const return_url = `${APP}/${locale}/checkout/paypal/return?order=${order.id}`;
    const cancel_url = `${APP}/${locale}/cart`;

    const itemsTotalCents = order.items.reduce((acc, it) => {
      const line = Number(it.unitPrice || 0) * Number(it.qty || 0);
      return acc + line;
    }, 0);

    const totalCents = itemsTotalCents + shippingCents + taxCents - discountCents;

    const countryCode =
      safeCountryCode(shippingFromCookie?.address?.country) ?? "PT";

    const ppReq = new paypal.orders.OrdersCreateRequest();
    ppReq.prefer("return=representation");
    ppReq.requestBody({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: "default",
          custom_id: order.id,

          amount: {
            currency_code: currency,
            value: centsToMoney(totalCents),
            breakdown: {
              item_total: {
                currency_code: currency,
                value: centsToMoney(itemsTotalCents),
              },
              shipping: {
                currency_code: currency,
                value: centsToMoney(shippingCents),
              },
              tax_total: {
                currency_code: currency,
                value: centsToMoney(taxCents),
              },
              discount: {
                currency_code: currency,
                value: centsToMoney(discountCents),
              },
            },
          },

          items: order.items.map((it: typeof order.items[number]) => ({
            name: it.name.slice(0, 127),
            quantity: String(it.qty),
            unit_amount: {
              currency_code: currency,
              value: centsToMoney(it.unitPrice),
            },
            category: "PHYSICAL_GOODS",
          })),

          shipping: shippingFromCookie?.address?.line1
            ? {
                name: shippingFromCookie?.name
                  ? { full_name: shippingFromCookie.name }
                  : undefined,
                address: {
                  address_line_1: shippingFromCookie.address.line1 ?? "",
                  address_line_2:
                    shippingFromCookie.address.line2 ?? undefined,
                  admin_area_2: shippingFromCookie.address.city ?? undefined,
                  admin_area_1: shippingFromCookie.address.state ?? undefined,
                  postal_code:
                    shippingFromCookie.address.postal_code ?? undefined,
                  country_code: countryCode,
                },
              }
            : undefined,
        },
      ],
      application_context: {
        brand_name: "FootballWorld",
        user_action: "PAY_NOW",
        return_url,
        cancel_url,
        shipping_preference: shippingFromCookie?.address?.line1
          ? "SET_PROVIDED_ADDRESS"
          : "GET_FROM_FILE",
      },
    });

    const ppRes = await paypalClient.execute(ppReq);

    type PpLink = { rel?: string; href?: string };
    const result = ppRes.result as { id?: string; links?: PpLink[] };

    const ppOrderId = result?.id;
    if (ppOrderId) {
      await prisma.order.update({
        where: { id: order.id },
        data: { paypalOrderId: ppOrderId },
      });
    }

    const approveUrl =
      result?.links?.find((l) => l.rel === "approve")?.href ?? null;

    if (!approveUrl) {
      return NextResponse.json(
        { error: "PayPal did not return an approval URL." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: approveUrl,
      approveUrl,
      orderId: order.id,
      paypalOrderId: ppOrderId,
    });
  } catch (err: any) {
    console.error("PayPal create error:", err);
    return NextResponse.json(
      { error: err?.message ?? "PayPal create error" },
      { status: 400 }
    );
  }
}