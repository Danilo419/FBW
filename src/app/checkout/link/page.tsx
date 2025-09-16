// src/app/api/checkout/stripe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

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
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  email?: string;
};

/** Ensure valid app base (no trailing slash). */
function buildAppBase(): string {
  const raw = (process.env.NEXT_PUBLIC_APP_URL || "").trim();
  if (!raw) throw new Error("Missing env NEXT_PUBLIC_APP_URL");
  if (!/^https?:\/\//i.test(raw)) {
    throw new Error(
      `NEXT_PUBLIC_APP_URL must start with http:// or https:// (got "${raw}")`,
    );
  }
  return raw.replace(/\/+$/, "");
}

/** Make product image URL absolute; ignore invalid. */
function toAbsoluteImage(url: string | null | undefined, APP: string): string | null {
  if (!url) return null;
  const t = url.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith("/")) return `${APP}${t}`;
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const method = (body?.method ?? "automatic") as Method;
    const shipping: Shipping | undefined = body?.shipping;

    const APP = buildAppBase();

    // Identify cart by session cookie
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

    const currency = "eur";
    const subtotal = cart.items.reduce((acc, it) => {
      const line = (it as any).totalPrice ?? it.qty * it.unitPrice;
      return acc + line;
    }, 0);

    // Create local order
    const order = await prisma.order.create({
      data: {
        sessionId: cart.sessionId ?? null,
        status: "pending",
        currency,
        subtotal,
        shipping: 0,
        tax: 0,
        total: subtotal,
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

    // If user chose Link, send to our Link-only page (Elements)
    if (method === "link") {
      const url = `${APP}/checkout/link?order=${order.id}`;
      return NextResponse.json({ url, sessionId: null });
    }

    const success_url = `${APP}/checkout/success?order=${order.id}&provider=stripe`;
    const cancel_url = `${APP}/cart`;

    // Map to Stripe line_items
    const line_items = order.items.map((it) => {
      const img = toAbsoluteImage(it.image, APP);
      const product_data: any = { name: it.name };
      if (img) product_data.images = [img];
      return {
        quantity: it.qty,
        price_data: { currency, unit_amount: it.unitPrice, product_data },
      };
    });

    // Base Checkout params — sem shipping_address_collection (para não limitar países)
    const params: any = {
      mode: "payment",
      success_url,
      cancel_url,
      metadata: {
        orderId: order.id,
        // guarda a morada (se enviada) para consulta posterior
        ...(shipping ? { shipping_json: JSON.stringify(shipping) } : {}),
      },
      line_items,
      // phone_number_collection: { enabled: true }, // opcional
    };

    // Force specific method for Checkout when chosen
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
        // Leave it to Stripe Checkout
        break;
    }

    const session = await stripe.checkout.sessions.create(params);

    await prisma.order.update({
      where: { id: order.id },
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
