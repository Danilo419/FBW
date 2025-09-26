// src/app/api/checkout/stripe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { getServerBaseUrl } from "@/lib/origin";

export const runtime = "nodejs";

type Method =
  | "card"
  | "link"
  | "multibanco"
  | "klarna"
  | "revolut_pay"
  | "satispay"
  | "amazon_pay"
  | "automatic";

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

function toAbsoluteImage(url: string | null | undefined, APP: string): string | null {
  if (!url) return null;
  const t = url.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith("/")) return `${APP}${t}`;
  return null;
}

function shippingToMetadata(s?: Shipping | null) {
  const clip = (v?: string) => (v ?? "").toString().slice(0, 500);
  return s
    ? {
        ship_name: clip(s.name),
        ship_phone: clip(s.phone),
        ship_email: clip(s.email),
        ship_line1: clip(s.address?.line1),
        ship_line2: clip(s.address?.line2),
        ship_city: clip(s.address?.city),
        ship_state: clip(s.address?.state),
        ship_postal: clip(s.address?.postal_code),
        ship_country: clip(s.address?.country),
      }
    : {};
}

export async function POST(req: NextRequest) {
  try {
    let stripe;
    try {
      stripe = getStripe();
    } catch (e: any) {
      return NextResponse.json(
        { error: e?.message ?? "Stripe not configured (missing STRIPE_SECRET_KEY)" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const method = (body?.method ?? "automatic") as Method;

    // 🔑 domínio dinâmico (preview/prod/local)
    const APP = await getServerBaseUrl();

    // sessão
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

    const currency = "eur";
    const subtotal = cart.items.reduce((acc, it) => {
      const line = (it as any).totalPrice ?? it.qty * it.unitPrice;
      return acc + line;
    }, 0);

    // shipping cookie (base64 JSON)
    let shippingFromCookie: Shipping | null = null;
    const rawShip = jar.get("ship")?.value;
    if (rawShip) {
      try {
        shippingFromCookie = JSON.parse(Buffer.from(rawShip, "base64").toString("utf8"));
      } catch {}
    }

    // Fluxo Link (Elements)
    if (method === "link") {
      const createdForLink = await prisma.order.create({
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
            create: cart.items.map((it: (typeof cart.items)[number]) => ({
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

      const url = `${APP}/checkout/link?order=${createdForLink.id}`;
      return NextResponse.json({ url, sessionId: null });
    }

    // Cria ordem local
    const createdOrder = await prisma.order.create({
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
          create: cart.items.map((it: (typeof cart.items)[number]) => ({
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

    const success_url = `${APP}/checkout/success?order=${createdOrder.id}&provider=stripe`;
    const cancel_url = `${APP}/cart`;

    const line_items = createdOrder.items.map((it) => {
      const img = toAbsoluteImage(it.image, APP);
      const product_data: any = { name: it.name };
      if (img) product_data.images = [img];
      return {
        quantity: it.qty,
        price_data: { currency, unit_amount: it.unitPrice, product_data },
      };
    });

    const metadata = { orderId: createdOrder.id, ...shippingToMetadata(shippingFromCookie) };

    const params: any = {
      mode: "payment",
      success_url,
      cancel_url,
      line_items,
      metadata,
    };

    if (shippingFromCookie?.email) {
      params.customer_email = String(shippingFromCookie.email).slice(0, 200);
    }

    switch (method) {
      case "card":
        params.payment_method_types = ["card"];
        break;
      case "multibanco":
        params.payment_method_types = ["multibanco"];
        break;
      case "klarna":
        params.payment_method_types = ["klarna"];
        break;
      case "revolut_pay":
        params.payment_method_types = ["revolut_pay"];
        break;
      case "satispay":
        params.payment_method_types = ["satispay"];
        break;
      case "amazon_pay":
        params.payment_method_types = ["amazon_pay"];
        break;
      case "automatic":
      default:
        break;
    }

    const session = await stripe.checkout.sessions.create(params);

    await prisma.order.update({
      where: { id: createdOrder.id },
      data: { stripeSessionId: session.id },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a hosted checkout URL.", sessionId: session.id },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: String(session.url), sessionId: session.id });
  } catch (err: any) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json({ error: err?.message ?? "Stripe error" }, { status: 400 });
  }
}
