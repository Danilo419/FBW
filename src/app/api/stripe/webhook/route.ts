// src/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { finalizePaidOrder } from "@/lib/checkout";
import { pusherServer } from "@/lib/pusher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ---------------------------- helpers ---------------------------- */

type ShippingJson =
  | {
      name?: string | null;
      phone?: string | null;
      email?: string | null;
      address?:
        | {
            line1?: string | null;
            line2?: string | null;
            city?: string | null;
            state?: string | null;
            postal_code?: string | null;
            country?: string | null;
          }
        | null;
    }
  | null;

const nz = (v: unknown) => {
  const s = (v ?? "").toString().trim();
  return s.length ? s : null;
};

function isEmptyShipping(s?: ShippingJson | null) {
  if (!s) return true;
  const a = s.address ?? {};
  return !(
    s.name ||
    s.phone ||
    s.email ||
    a.line1 ||
    a.line2 ||
    a.city ||
    a.state ||
    a.postal_code ||
    a.country
  );
}

function shippingFromMetadata(meta?: Record<string, any> | null): ShippingJson {
  if (!meta) return null;
  const address =
    meta.ship_line1 ||
    meta.ship_line2 ||
    meta.ship_city ||
    meta.ship_state ||
    meta.ship_postal ||
    meta.ship_country
      ? {
          line1: nz(meta.ship_line1),
          line2: nz(meta.ship_line2),
          city: nz(meta.ship_city),
          state: nz(meta.ship_state),
          postal_code: nz(meta.ship_postal),
          country: nz(meta.ship_country),
        }
      : null;

  const out: ShippingJson = {
    name: nz(meta.ship_name),
    phone: nz(meta.ship_phone),
    email: nz(meta.ship_email),
    address,
  };
  return isEmptyShipping(out) ? null : out;
}

function shippingFromSession(session: Stripe.Checkout.Session): ShippingJson {
  const cd = session.customer_details as Stripe.Checkout.Session.CustomerDetails | null;
  if (!cd) return null;

  const addr = cd.address;
  const address =
    addr && (addr.line1 || addr.line2 || addr.city || addr.state || addr.postal_code || addr.country)
      ? {
          line1: nz(addr.line1),
          line2: nz(addr.line2),
          city: nz(addr.city),
          state: nz(addr.state),
          postal_code: nz(addr.postal_code),
          country: nz(addr.country),
        }
      : null;

  const out: ShippingJson = {
    name: nz(cd.name),
    phone: nz(cd.phone),
    email: nz(cd.email) ?? nz((session as any).customer_email),
    address,
  };
  return isEmptyShipping(out) ? null : out;
}

function shippingFromPaymentIntent(pi: Stripe.PaymentIntent): ShippingJson {
  const s = pi.shipping || null;
  const address =
    s?.address && (s.address.line1 || s.address.line2 || s.address.city || s.address.state || s.address.postal_code || s.address.country)
      ? {
          line1: nz(s.address.line1),
          line2: nz(s.address.line2),
          city: nz(s.address.city),
          state: nz(s.address.state),
          postal_code: nz(s.address.postal_code),
          country: nz(s.address.country),
        }
      : null;

  const out: ShippingJson = {
    name: nz(s?.name),
    phone: nz(s?.phone),
    email: nz(pi.receipt_email),
    address,
  };
  return isEmptyShipping(out) ? null : out;
}

function prefer<A>(primary: A | null | undefined, fallback: A | null | undefined): A | null {
  return primary != null && !(typeof primary === "string" && primary.trim() === "")
    ? (primary as A)
    : (fallback ?? null);
}

/** Merge missing fields of base with add (base takes precedence). */
function mergeShipping(base: ShippingJson, add: ShippingJson): ShippingJson {
  if (!base && !add) return null;
  if (!base) return add ?? null;
  if (!add) return base ?? null;

  return {
    name: prefer(base.name, add.name),
    phone: prefer(base.phone, add.phone),
    email: prefer(base.email, add.email),
    address: {
      line1: prefer(base.address?.line1 ?? null, add.address?.line1 ?? null),
      line2: prefer(base.address?.line2 ?? null, add.address?.line2 ?? null),
      city: prefer(base.address?.city ?? null, add.address?.city ?? null),
      state: prefer(base.address?.state ?? null, add.address?.state ?? null),
      postal_code: prefer(base.address?.postal_code ?? null, add.address?.postal_code ?? null),
      country: prefer(base.address?.country ?? null, add.address?.country ?? null),
    },
  };
}

/* ------------------------- status updaters ------------------------- */

/**
 * Marca a ordem como paga e devolve se houve transição real para "paid"
 * (para evitares triggers duplicados quando chegam 2 eventos do Stripe).
 */
async function markPaid(
  orderId: string,
  paymentIntentId?: string | null,
  newShipping?: ShippingJson
): Promise<{ transitioned: boolean; country?: string | null }> {
  // fetch existente para decidir merge e transição
  const existing = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true, shippingJson: true, shippingCountry: true },
  });

  const wasAlreadyFinal =
    existing?.status === "paid" || existing?.status === "shipped" || existing?.status === "delivered";

  const mergedShipping = mergeShipping(existing?.shippingJson as ShippingJson, newShipping ?? null);
  const country = (mergedShipping?.address?.country || existing?.shippingCountry || null)?.toString() || null;

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "paid",
      stripePaymentIntentId: paymentIntentId ?? null,
      ...(mergedShipping ? { shippingJson: mergedShipping as any } : {}),
      ...(country ? { shippingCountry: country } : {}),
    },
  });

  await finalizePaidOrder(orderId);

  return { transitioned: !wasAlreadyFinal, country };
}

async function markPending(orderId: string, paymentIntentId?: string | null, newShipping?: ShippingJson) {
  const existing = await prisma.order.findUnique({
    where: { id: orderId },
    select: { shippingJson: true, shippingCountry: true },
  });

  const mergedShipping = mergeShipping(existing?.shippingJson as ShippingJson, newShipping ?? null);
  const country = (mergedShipping?.address?.country || existing?.shippingCountry || null)?.toString() || null;

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "pending",
      stripePaymentIntentId: paymentIntentId ?? null,
      ...(mergedShipping ? { shippingJson: mergedShipping as any } : {}),
      ...(country ? { shippingCountry: country } : {}),
    },
  });
}

async function markFailed(orderId: string) {
  await prisma.order.update({
    where: { id: orderId },
    data: { status: "failed" },
  });
}

async function markCanceled(orderId: string) {
  await prisma.order.update({
    where: { id: orderId },
    data: { status: "canceled" },
  });
}

/* ------------------------------ route ----------------------------- */

export const POST = async (req: NextRequest) => {
  const sig = req.headers.get("stripe-signature") as string;
  const secret = process.env.STRIPE_WEBHOOK_SECRET!;
  let event: Stripe.Event;

  // Stripe requires the raw payload for signature verification
  let raw: string;
  try {
    raw = await req.text(); // keep body raw, do not JSON.parse here
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err: any) {
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      // orderId via session.metadata or PI.metadata (fallback)
      const orderId =
        (session.metadata?.orderId as string | undefined) ??
        (session.payment_intent &&
        typeof session.payment_intent !== "string" &&
        (session.payment_intent.metadata?.orderId as string | undefined)
          ? (session.payment_intent.metadata.orderId as string)
          : undefined);

      if (!orderId) break;

      // shipping dos vários sítios
      const fromMeta = shippingFromMetadata(session.metadata ?? null);
      const fromSession = shippingFromSession(session);
      const shipping = mergeShipping(fromMeta, fromSession);

      const piId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? null;

      if (session.payment_status === "paid") {
        const { transitioned } = await markPaid(orderId, piId, shipping);
        if (transitioned) {
          // tempo real: incrementar "orders"
          await pusherServer.trigger("stats", "metric:update", { metric: "orders", value: 1 });
          // opcional: sinalizar que países podem ter mudado
          await pusherServer.trigger("stats", "metric:update", {
            metric: "countriesMaybeChanged",
            value: 1,
          });
        }
      } else {
        // e.g., métodos async (boleto, etc.)
        await markPending(orderId, piId, shipping);
      }
      break;
    }

    case "payment_intent.succeeded": {
      const pi = event.data.object as Stripe.PaymentIntent;
      const orderId = pi.metadata?.orderId as string | undefined;
      if (orderId) {
        const shipping = shippingFromPaymentIntent(pi);
        const { transitioned } = await markPaid(orderId, pi.id, shipping);
        if (transitioned) {
          await pusherServer.trigger("stats", "metric:update", { metric: "orders", value: 1 });
          await pusherServer.trigger("stats", "metric:update", {
            metric: "countriesMaybeChanged",
            value: 1,
          });
        }
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const pi = event.data.object as Stripe.PaymentIntent;
      const orderId = pi.metadata?.orderId as string | undefined;
      if (orderId) await markFailed(orderId);
      break;
    }

    case "payment_intent.canceled": {
      const pi = event.data.object as Stripe.PaymentIntent;
      const orderId = pi.metadata?.orderId as string | undefined;
      if (orderId) await markCanceled(orderId);
      break;
    }

    // Legacy fallback if needed
    case "charge.succeeded": {
      const charge = event.data.object as Stripe.Charge;
      const orderId = charge.metadata?.orderId as string | undefined;
      if (orderId && charge.paid) {
        const piId =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : (charge.payment_intent as Stripe.PaymentIntent | null)?.id ?? null;
        const { transitioned } = await markPaid(orderId, piId);
        if (transitioned) {
          await pusherServer.trigger("stats", "metric:update", { metric: "orders", value: 1 });
          await pusherServer.trigger("stats", "metric:update", {
            metric: "countriesMaybeChanged",
            value: 1,
          });
        }
      }
      break;
    }

    default:
      // no-op for other events
      break;
  }

  return NextResponse.json({ received: true });
};
