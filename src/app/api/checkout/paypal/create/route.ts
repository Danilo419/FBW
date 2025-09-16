// src/app/api/checkout/paypal/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { paypal, paypalClient } from "@/lib/paypal";

export const runtime = "nodejs";

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
    country?: string; // ISO-3166 alpha-2
  };
};

/* -------------------------- helpers -------------------------- */

function buildAppBase(): string {
  // Nunca assumimos que a env existe; evitamos .startsWith em undefined
  const raw = (process.env.NEXT_PUBLIC_APP_URL || "").trim();
  if (!raw) {
    // fallback seguro só para evitar crash em build; define a env na Vercel!
    return "http://localhost:3000";
  }
  // Se vier sem protocolo, assume https
  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withProto.replace(/\/+$/, "");
}

function toAbsoluteImage(url?: string | null): string | undefined {
  if (!url) return undefined;
  const t = String(url).trim();
  if (!t) return undefined;
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith("/")) return `${buildAppBase()}${t}`;
  return undefined;
}

/* --------------------------- route --------------------------- */

export async function POST(req: NextRequest) {
  try {
    const jar = await cookies();
    const sid = jar.get("sid")?.value ?? null;

    const cart = await prisma.cart.findFirst({
      where: { sessionId: sid ?? undefined },
      include: {
        items: { include: { product: { select: { name: true, images: true } } } },
      },
    });

    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // Shipping guardado como base64(JSON) no cookie "ship"
    let shippingFromCookie: Shipping | null = null;
    const rawShip = jar.get("ship")?.value;
    if (rawShip) {
      try {
        shippingFromCookie = JSON.parse(Buffer.from(rawShip, "base64").toString("utf8"));
      } catch {
        shippingFromCookie = null;
      }
    }

    const currency = "eur";
    const subtotal = cart.items.reduce((acc, it) => {
      const line = (it as any).totalPrice ?? it.qty * it.unitPrice;
      return acc + line;
    }, 0);

    // Criar Order local primeiro
    const order = await prisma.order.create({
      data: {
        sessionId: cart.sessionId ?? null,
        status: "pending",
        currency,
        subtotal,
        shipping: 0,
        tax: 0,
        total: subtotal,
        shippingJson: (shippingFromCookie as any) ?? null,
        items: {
          create: cart.items.map((it) => ({
            productId: it.productId,
            name: it.product.name,
            image: it.product.images?.[0] ?? null,
            qty: it.qty,
            unitPrice: it.unitPrice,
            totalPrice: (it as any).totalPrice ?? it.qty * it.unitPrice,
            snapshotJson: (it as any).optionsJson ?? {},
          })),
        },
      },
      include: { items: true },
    });

    const APP = buildAppBase();
    const return_url = `${APP}/checkout/paypal/return?order=${order.id}`;
    const cancel_url = `${APP}/cart`;

    // Criar PayPal Order (intent CAPTURE)
    const createReq = new paypal.orders.OrdersCreateRequest();
    createReq.headers["prefer"] = "return=representation";

    const pu = {
      amount: {
        currency_code: "EUR",
        value: (subtotal / 100).toFixed(2),
        // breakdown é opcional; omitimos para simplificar
      },
      items: order.items.map((it) => {
        const image_url = toAbsoluteImage(it.image);
        return {
          name: it.name,
          quantity: String(it.qty),
          unit_amount: { currency_code: "EUR", value: (it.unitPrice / 100).toFixed(2) },
          ...(image_url ? { image_url } : {}),
        };
      }),
      // shipping opcional
      ...(shippingFromCookie?.address
        ? {
            shipping: {
              address: {
                address_line_1: shippingFromCookie.address.line1 ?? "",
                address_line_2: shippingFromCookie.address.line2 ?? "",
                admin_area_2: shippingFromCookie.address.city ?? "",
                admin_area_1: shippingFromCookie.address.state ?? "",
                postal_code: shippingFromCookie.address.postal_code ?? "",
                country_code: (shippingFromCookie.address.country ?? "").toUpperCase().slice(0, 2),
              },
            },
          }
        : {}),
    };

    createReq.requestBody({
      intent: "CAPTURE",
      purchase_units: [pu as any],
      application_context: {
        brand_name: "FootballWorld",
        user_action: "PAY_NOW",
        return_url,
        cancel_url,
      },
    });

    const ppRes = await paypalClient.execute(createReq);
    const ppId = (ppRes.result as any)?.id as string | undefined;
    const approveUrl = (ppRes.result as any)?.links?.find((l: any) => l.rel === "approve")?.href as
      | string
      | undefined;

    await prisma.order.update({
      where: { id: order.id },
      data: { paypalOrderId: ppId ?? null },
    });

    if (!approveUrl) {
      return NextResponse.json(
        { error: "PayPal did not return an approval link", paypalOrderId: ppId },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: approveUrl, paypalOrderId: ppId, orderId: order.id });
  } catch (err: any) {
    console.error("paypal/create error:", err);
    return NextResponse.json({ error: err?.message ?? "PayPal error" }, { status: 400 });
  }
}
