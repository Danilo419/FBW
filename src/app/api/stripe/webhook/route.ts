// src/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { finalizePaidOrder } from "@/lib/checkout";
import { pusherServer } from "@/lib/pusher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

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

const upper = (s?: string | null) => (s ? s.toUpperCase() : s ?? null);

/* ------------------------- status updaters ------------------------- */

async function markPaid(
  orderId: string,
  opts: {
    paymentIntentId?: string | null;
    sessionId?: string | null;
    currency?: string | null;
    totalCents?: number | null;
    shipping?: ShippingJson;
  }
): Promise<{ transitioned: boolean }> {
  const existing = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true, shippingJson: true, shippingCountry: true },
  });

  const wasAlreadyFinal =
    existing?.status === "paid" || existing?.status === "shipped" || existing?.status === "delivered";

  const mergedShipping = mergeShipping(existing?.shippingJson as ShippingJson, opts.shipping ?? null);
  const country =
    (mergedShipping?.address?.country || existing?.shippingCountry || null)?.toString() || null;

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "paid",
      paymentStatus: "paid",
      paidAt: new Date(),
      stripePaymentIntentId: opts.paymentIntentId ?? null,
      stripeSessionId: opts.sessionId ?? undefined,
      currency: upper(opts.currency) ?? undefined,
      totalCents: typeof opts.totalCents === "number" ? opts.totalCents : undefined,
      ...(mergedShipping ? { shippingJson: mergedShipping as any } : {}),
      ...(country ? { shippingCountry: country } : {}),
    },
  });

  if (!wasAlreadyFinal) {
    await finalizePaidOrder(orderId);
  }
  return { transitioned: !wasAlreadyFinal };
}

async function markPending(
  orderId: string,
  opts: { paymentIntentId?: string | null; sessionId?: string | null; shipping?: ShippingJson }
) {
  const existing = await prisma.order.findUnique({
    where: { id: orderId },
    select: { shippingJson: true, shippingCountry: true },
  });

  const mergedShipping = mergeShipping(existing?.shippingJson as ShippingJson, opts.shipping ?? null);
  const country =
    (mergedShipping?.address?.country || existing?.shippingCountry || null)?.toString() || null;

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "pending",
      paymentStatus: "pending",
      stripePaymentIntentId: opts.paymentIntentId ?? null,
      stripeSessionId: opts.sessionId ?? undefined,
      ...(mergedShipping ? { shippingJson: mergedShipping as any } : {}),
      ...(country ? { shippingCountry: country } : {}),
    },
  });
}

async function markFailed(orderId: string) {
  await prisma.order.update({
    where: { id: orderId },
    data: { status: "failed", paymentStatus: "failed" },
  });
}

async function markCanceled(orderId: string) {
  await prisma.order.update({
    where: { id: orderId },
    data: { status: "canceled", paymentStatus: "canceled" },
  });
}

/* ------------------------------ route ----------------------------- */

export const POST = async (req: NextRequest) => {
  const stripe = getStripe();

  const sig = req.headers.get("stripe-signature") as string | null;
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    return NextResponse.json(
      { error: "Missing STRIPE_WEBHOOK_SECRET or signature" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  // Stripe precisa do body raw para verificar a assinatura
  let raw: string;
  try {
    raw = await req.text();
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err: any) {
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // encontrar orderId
        let orderId =
          (session.metadata?.orderId as string | undefined) ??
          (session.payment_intent &&
          typeof session.payment_intent !== "string" &&
          (session.payment_intent.metadata?.orderId as string | undefined)
            ? (session.payment_intent.metadata.orderId as string)
            : undefined);

        // fallbacks: procurar pela sessionId ou pelo paymentIntentId
        const piId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id ?? null;

        if (!orderId) {
          const bySession = await prisma.order.findFirst({
            where: { stripeSessionId: session.id },
            select: { id: true },
          });
          orderId = bySession?.id;
        }
        if (!orderId && piId) {
          const byPI = await prisma.order.findFirst({
            where: { stripePaymentIntentId: piId },
            select: { id: true },
          });
          orderId = byPI?.id;
        }

        if (!orderId) break;

        const fromMeta = shippingFromMetadata(session.metadata ?? null);
        const fromSession = shippingFromSession(session);
        const shipping = mergeShipping(fromMeta, fromSession);

        const totalCents =
          typeof session.amount_total === "number" ? session.amount_total : undefined;
        const currency = session.currency ?? undefined;

        if (session.payment_status === "paid") {
          const { transitioned } = await markPaid(orderId, {
            paymentIntentId: piId,
            sessionId: session.id,
            currency,
            totalCents,
            shipping,
          });
          if (transitioned) {
            try {
              await pusherServer.trigger("stats", "metric:update", { metric: "orders", value: 1 });
              await pusherServer.trigger("stats", "metric:update", {
                metric: "countriesMaybeChanged",
                value: 1,
              });
            } catch {}
          }
        } else {
          await markPending(orderId, { paymentIntentId: piId, sessionId: session.id, shipping });
        }
        break;
      }

      case "checkout.session.async_payment_succeeded": {
        // pagamentos assíncronos (iDEAL, Bancontact, etc.)
        const session = event.data.object as Stripe.Checkout.Session;
        const piId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id ?? null;

        let orderId =
          (session.metadata?.orderId as string | undefined) ??
          (await prisma.order
            .findFirst({
              where: {
                OR: [
                  { stripeSessionId: session.id },
                  ...(piId ? [{ stripePaymentIntentId: piId }] : []),
                ],
              },
              select: { id: true },
            })
            .then((r) => r?.id));

        if (!orderId) break;

        const shipping = mergeShipping(
          shippingFromMetadata(session.metadata ?? null),
          shippingFromSession(session)
        );

        const { transitioned } = await markPaid(orderId, {
          paymentIntentId: piId,
          sessionId: session.id,
          currency: session.currency ?? undefined,
          totalCents:
            typeof session.amount_total === "number" ? session.amount_total : undefined,
          shipping,
        });
        if (transitioned) {
          try {
            await pusherServer.trigger("stats", "metric:update", { metric: "orders", value: 1 });
            await pusherServer.trigger("stats", "metric:update", {
              metric: "countriesMaybeChanged",
              value: 1,
            });
          } catch {}
        }
        break;
      }

      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        let orderId = pi.metadata?.orderId as string | undefined;

        if (!orderId) {
          const byPI = await prisma.order.findFirst({
            where: { stripePaymentIntentId: pi.id },
            select: { id: true },
          });
          orderId = byPI?.id;
        }
        if (!orderId) break;

        const shipping = shippingFromPaymentIntent(pi);
        const totalCents =
          typeof pi.amount_received === "number" ? pi.amount_received : undefined;

        const { transitioned } = await markPaid(orderId, {
          paymentIntentId: pi.id,
          sessionId: null,
          currency: pi.currency ?? undefined,
          totalCents,
          shipping,
        });
        if (transitioned) {
          try {
            await pusherServer.trigger("stats", "metric:update", { metric: "orders", value: 1 });
            await pusherServer.trigger("stats", "metric:update", {
              metric: "countriesMaybeChanged",
              value: 1,
            });
          } catch {}
        }
        break;
      }

      case "payment_intent.processing": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const orderId =
          (pi.metadata?.orderId as string | undefined) ||
          (await prisma.order
            .findFirst({ where: { stripePaymentIntentId: pi.id }, select: { id: true } })
            .then((r) => r?.id));
        if (orderId) {
          await markPending(orderId, { paymentIntentId: pi.id, sessionId: null, shipping: shippingFromPaymentIntent(pi) });
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const orderId =
          (pi.metadata?.orderId as string | undefined) ||
          (await prisma.order
            .findFirst({ where: { stripePaymentIntentId: pi.id }, select: { id: true } })
            .then((r) => r?.id));
        if (orderId) await markFailed(orderId);
        break;
      }

      case "payment_intent.canceled": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const orderId =
          (pi.metadata?.orderId as string | undefined) ||
          (await prisma.order
            .findFirst({ where: { stripePaymentIntentId: pi.id }, select: { id: true } })
            .then((r) => r?.id));
        if (orderId) await markCanceled(orderId);
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        let orderId =
          (session.metadata?.orderId as string | undefined) ||
          (await prisma.order
            .findFirst({
              where: {
                OR: [
                  { stripeSessionId: session.id },
                  ...(typeof session.payment_intent === "string"
                    ? [{ stripePaymentIntentId: session.payment_intent }]
                    : []),
                ],
              },
            })
            .then((r) => r?.id));
        if (orderId) await markCanceled(orderId);
        break;
      }

      // Fallback legacy
      case "charge.succeeded": {
        const charge = event.data.object as Stripe.Charge;
        let orderId = charge.metadata?.orderId as string | undefined;

        if (!orderId && charge.payment_intent) {
          const piId =
            typeof charge.payment_intent === "string"
              ? charge.payment_intent
              : (charge.payment_intent as any)?.id;
          const byPI = await prisma.order.findFirst({
            where: { stripePaymentIntentId: piId },
            select: { id: true },
          });
          orderId = byPI?.id;
        }

        if (orderId && charge.paid) {
          const piId =
            typeof charge.payment_intent === "string"
              ? charge.payment_intent
              : (charge.payment_intent as Stripe.PaymentIntent | null)?.id ?? null;
          const cents =
            typeof charge.amount_captured === "number"
              ? charge.amount_captured
              : typeof charge.amount === "number"
              ? charge.amount
              : undefined;

          const { transitioned } = await markPaid(orderId, {
            paymentIntentId: piId,
            sessionId: null,
            currency: charge.currency,
            totalCents: cents,
            shipping: null,
          });
          if (transitioned) {
            try {
              await pusherServer.trigger("stats", "metric:update", { metric: "orders", value: 1 });
              await pusherServer.trigger("stats", "metric:update", {
                metric: "countriesMaybeChanged",
                value: 1,
              });
            } catch {}
          }
        }
        break;
      }

      default:
        // ignorar outros eventos
        break;
    }

    // devolver 2xx para o Stripe não re-tentar desnecessariamente
    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("stripe webhook error", e);
    // 200 mesmo em erro interno para o Stripe não fazer retry infinito; logs ajudam a investigar.
    return new NextResponse("ok", { status: 200 });
  }
};
