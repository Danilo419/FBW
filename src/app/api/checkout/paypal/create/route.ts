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
    country?: string; // ISO-3166 alpha-2 ou nome
  };
};

function getBaseUrl(req: NextRequest): string {
  // Preferir cabeçalhos do proxy (Vercel/edge)
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  if (host) return `${proto}://${host}`.replace(/\/+$/, "");

  // Fallback para env (opcional)
  const env = (process.env.NEXT_PUBLIC_APP_URL || "").trim();
  if (env) return env.replace(/\/+$/, "");

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
    const jar = await cookies(); // Next 15: cookies() é async
    const sid = jar.get("sid")?.value ?? null;

    const cart = await prisma.cart.findFirst({
      where: { sessionId: sid ?? undefined },
      include: {
        items: {
          include: {
            product: {
              // 👇 usar imageUrls no select
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
        total: subtotalCents, // retrocompat
        shippingJson: (shippingFromCookie as any) ?? null,

        // Preencher campos canónicos (opcional)
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
            // 👇 primeira imagem do array
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

    // URLs de retorno/cancelamento
    const return_url = `${APP}/checkout/paypal/return?order=${order.id}`;
    const cancel_url = `${APP}/cart`;
    const valueStr = (subtotalCents / 100).toFixed(2);

    // Pedido ao PayPal (OrdersCreateRequest)
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
          custom_id: order.id, // referência tua
          // (opcional) detalhar itens
          items: order.items.map((it: typeof order.items[number]) => ({
            name: it.name.slice(0, 127),
            quantity: it.qty.toString(),
            unit_amount: {
              currency_code: currency,
              value: (it.unitPrice / 100).toFixed(2),
            },
            category: "PHYSICAL_GOODS",
            // PayPal não exige imagem aqui; se precisares, podes guardar noutra estrutura
          })),
          // (opcional) enviar shipping já aqui se quiseres forçar:
          shipping: shippingFromCookie?.address?.line1
            ? {
                name: shippingFromCookie?.name
                  ? { full_name: shippingFromCookie.name }
                  : undefined,
                address: {
                  address_line_1: shippingFromCookie?.address?.line1 ?? "",
                  address_line_2: shippingFromCookie?.address?.line2 ?? undefined,
                  admin_area_2: shippingFromCookie?.address?.city ?? undefined,
                  admin_area_1: shippingFromCookie?.address?.state ?? undefined,
                  postal_code: shippingFromCookie?.address?.postal_code ?? undefined,
                  country_code: (shippingFromCookie?.address?.country ?? "")
                    .slice(0, 2)
                    .toUpperCase(),
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
