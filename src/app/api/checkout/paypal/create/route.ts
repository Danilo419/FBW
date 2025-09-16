// src/app/api/checkout/paypal/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { paypalClient, paypal } from "@/lib/paypal";

export const runtime = "nodejs";

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
    country?: string; // ISO-3166 alpha-2
  };
};

function getBaseUrl(req: NextRequest): string {
  // Preferir cabeçalhos enviados pelo Vercel/Proxy
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host =
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    "";
  if (host) return `${proto}://${host}`.replace(/\/+$/, "");

  // Fallback para env, se existir
  const env = (process.env.NEXT_PUBLIC_APP_URL || "").trim();
  if (env) return env.replace(/\/+$/, "");

  // Último recurso: erro explícito
  throw new Error(
    "Base URL not resolvable. Set NEXT_PUBLIC_APP_URL or ensure Host headers are present."
  );
}

function decodeShippingCookie(raw?: string | null): Shipping | null {
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

/* --------------------------- route --------------------------- */

export async function POST(req: NextRequest) {
  try {
    const APP = getBaseUrl(req);

    // Identificar carrinho pela cookie de sessão
    const jar = await cookies();
    const sid = jar.get("sid")?.value ?? null;

    const cart = await prisma.cart.findFirst({
      where: { sessionId: sid ?? undefined },
      include: {
        items: {
          include: { product: { select: { name: true, images: true } } },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const currency = "EUR";
    const subtotalCents = cart.items.reduce((acc, it) => {
      const line = (it as any).totalPrice ?? it.qty * it.unitPrice;
      return acc + line;
    }, 0);

    // Morada do step /checkout/address guardada em cookie (base64 JSON)
    const shippingFromCookie = decodeShippingCookie(jar.get("ship")?.value);

    // Criar encomenda local (status pending) antes de ir ao PayPal
    const order = await prisma.order.create({
      data: {
        sessionId: cart.sessionId ?? null,
        status: "pending",
        currency: currency.toLowerCase(),
        subtotal: subtotalCents,
        shipping: 0,
        tax: 0,
        total: subtotalCents, // para retrocompat
        shippingJson: (shippingFromCookie as any) ?? null,
        items: {
          create: cart.items.map((it) => ({
            productId: it.productId,
            name: it.product.name,
            image: it.product.images?.[0] ?? null,
            qty: it.qty,
            unitPrice: it.unitPrice,
            totalPrice:
              (it as any).totalPrice ?? it.qty * it.unitPrice,
            snapshotJson: (it as any).optionsJson ?? {},
          })),
        },
      },
      include: { items: true },
    });

    // Preparar pedido ao PayPal (OrdersCreateRequest)
    const return_url = `${APP}/checkout/paypal/return?order=${order.id}`;
    const cancel_url = `${APP}/cart`;

    const valueStr = (subtotalCents / 100).toFixed(2);

    const ppReq = new paypal.orders.OrdersCreateRequest();
    ppReq.prefer("return=representation");
    ppReq.requestBody({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: currency,
            value: valueStr,
          },
          custom_id: order.id, // para encontrarmos no webhook/return
          // (opcional) itens detalhados
          items: order.items.map((it) => ({
            name: it.name.slice(0, 127),
            quantity: it.qty.toString(),
            unit_amount: {
              currency_code: currency,
              value: (it.unitPrice / 100).toFixed(2),
            },
            category: "PHYSICAL_GOODS",
          })),
        },
      ],
      application_context: {
        brand_name: "FootballWorld",
        user_action: "PAY_NOW",
        return_url,
        cancel_url,
      },
    });

    const ppRes = await paypalClient.execute(ppReq);
    const ppOrderId = (ppRes.result as any)?.id as string | undefined;

    // Guardar o paypalOrderId na nossa encomenda
    if (ppOrderId) {
      await prisma.order.update({
        where: { id: order.id },
        data: { paypalOrderId: ppOrderId },
      });
    }

    // Encontrar approval URL
    const approveUrl =
      (ppRes.result as any)?.links?.find(
        (l: any) => l?.rel === "approve"
      )?.href ?? null;

    if (!approveUrl) {
      return NextResponse.json(
        { error: "PayPal did not return an approval URL." },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: approveUrl, orderId: order.id });
  } catch (err: any) {
    console.error("PayPal create error:", err);
    return NextResponse.json(
      { error: err?.message ?? "PayPal create error" },
      { status: 400 }
    );
  }
}
