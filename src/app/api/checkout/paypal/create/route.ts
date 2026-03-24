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
    country?: string; // ISO-3166 alpha-2 ou nome
  };
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
              select: { name: true, imageUrls: true, slug: true },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const currency = "EUR";

    const subtotalCents = cart.items.reduce((acc, it) => {
      const line = (it as any).totalPrice ?? it.qty * it.unitPrice;
      return acc + Number(line || 0);
    }, 0);

    const shippingFromCookie = decodeShippingCookie(jar.get("ship")?.value);

    const shippingCents = 0;
    const taxCents = 0;
    const discountCents = 0;

    const order = await prisma.order.create({
      data: {
        sessionId: cart.sessionId ?? null,
        status: "pending",
        currency: currency.toLowerCase(),
        subtotal: subtotalCents,
        shipping: shippingCents,
        tax: taxCents,
        total: subtotalCents,
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
          create: cart.items.map((it: typeof cart.items[number]) => ({
            productId: it.productId,
            name: it.product.name,
            image:
              (it.product as { imageUrls?: string[] })?.imageUrls?.[0] ?? null,
            qty: it.qty,
            unitPrice: it.unitPrice,
            totalPrice: (it as any).totalPrice ?? it.qty * it.unitPrice,
            snapshotJson: (it as any).optionsJson ?? {},
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

    const totalCents =
      itemsTotalCents + shippingCents + taxCents - discountCents;

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