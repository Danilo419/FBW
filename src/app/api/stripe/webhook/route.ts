// src/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { finalizePaidOrder } from "@/lib/checkout";
import { pusherServer } from "@/lib/pusher";
import { sendOrderConfirmationEmail } from "@/lib/email";

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
  const cd =
    session.customer_details as Stripe.Checkout.Session.CustomerDetails | null;
  if (!cd) return null;

  const addr = cd.address;
  const address =
    addr &&
    (addr.line1 ||
      addr.line2 ||
      addr.city ||
      addr.state ||
      addr.postal_code ||
      addr.country)
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
    s?.address &&
    (s.address.line1 ||
      s.address.line2 ||
      s.address.city ||
      s.address.state ||
      s.address.postal_code ||
      s.address.country)
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

function prefer<A>(
  primary: A | null | undefined,
  fallback: A | null | undefined
): A | null {
  return primary != null &&
    !(typeof primary === "string" && primary.trim() === "")
    ? (primary as A)
    : fallback ?? null;
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
      postal_code: prefer(
        base.address?.postal_code ?? null,
        add.address?.postal_code ?? null
      ),
      country: prefer(
        base.address?.country ?? null,
        add.address?.country ?? null
      ),
    },
  };
}

const upper = (s?: string | null) => (s ? s.toUpperCase() : s ?? null);

/* -------------------- userId helpers -------------------- */

function userIdFromCheckoutSession(
  session: Stripe.Checkout.Session
): string | null {
  const metaUser = nz((session.metadata as any)?.userId);
  if (metaUser) return metaUser;

  const ref = nz((session as any)?.client_reference_id);
  if (ref) return ref;

  return null;
}

function userIdFromPaymentIntent(pi: Stripe.PaymentIntent): string | null {
  return nz((pi.metadata as any)?.userId);
}

/* -------------------- email helpers -------------------- */

function shippingAddressToString(s?: ShippingJson | null): string | null {
  if (!s?.address) return null;
  const a = s.address;
  const parts = [
    a.line1,
    a.line2,
    a.postal_code,
    a.city,
    a.state,
    a.country,
  ].filter(Boolean) as string[];
  return parts.length ? parts.join(", ") : null;
}

function totalFromOrder(order: any, optsTotalCents?: number | null): number {
  if (typeof order?.totalCents === "number") return order.totalCents / 100;
  if (typeof order?.total === "number") return order.total;

  const subtotal = typeof order?.subtotal === "number" ? order.subtotal : 0;
  const shipping = typeof order?.shipping === "number" ? order.shipping : 0;
  const tax = typeof order?.tax === "number" ? order.tax : 0;

  const sum = subtotal + shipping + tax;
  if (sum > 0) return sum / 100;

  if (typeof optsTotalCents === "number") return optsTotalCents / 100;

  return 0;
}

function shippingPriceFromOrder(order: any): number {
  return typeof order?.shipping === "number" ? order.shipping / 100 : 0;
}

function orderEmail(order: any, mergedShipping?: ShippingJson | null): string | null {
  return (
    nz(order?.shippingEmail) ||
    nz(order?.shippingJson?.email) ||
    nz(mergedShipping?.email) ||
    null
  );
}

function orderCustomerName(order: any, mergedShipping?: ShippingJson | null): string | null {
  return (
    nz(order?.shippingFullName) ||
    nz(order?.shippingJson?.name) ||
    nz(mergedShipping?.name) ||
    null
  );
}

function orderShippingAddress(order: any, mergedShipping?: ShippingJson | null): string | null {
  const parts = [
    nz(order?.shippingAddress1),
    nz(order?.shippingAddress2),
    nz(order?.shippingPostalCode),
    nz(order?.shippingCity),
    nz(order?.shippingRegion),
    nz(order?.shippingCountry),
  ].filter(Boolean) as string[];

  if (parts.length) return parts.join(", ");

  return shippingAddressToString((order?.shippingJson as ShippingJson) ?? mergedShipping ?? null);
}

/* ------------------------- status updaters ------------------------- */

async function markPaid(
  orderId: string,
  opts: {
    paymentIntentId?: string | null;
    sessionId?: string | null;
    currency?: string | null;
    totalCents?: number | null;
    shipping?: ShippingJson;
    userId?: string | null;
  }
): Promise<{ transitioned: boolean }> {
  const existing = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      status: true,
      shippingJson: true,
      shippingCountry: true,
      userId: true,
    },
  });

  const wasAlreadyFinal =
    existing?.status === "paid" ||
    existing?.status === "shipped" ||
    existing?.status === "delivered";

  const mergedShipping = mergeShipping(
    existing?.shippingJson as ShippingJson,
    opts.shipping ?? null
  );

  const country =
    (mergedShipping?.address?.country || existing?.shippingCountry || null)
      ?.toString() || null;

  const updateData: any = {
    // Link order to user for "My Orders"
    ...(opts.userId && !existing?.userId ? { userId: opts.userId } : {}),

    status: "paid",
    paymentStatus: "paid",
    paidAt: new Date(),
    stripePaymentIntentId: opts.paymentIntentId ?? null,
    stripeSessionId: opts.sessionId ?? undefined,
    currency: upper(opts.currency) ?? undefined,
    totalCents: typeof opts.totalCents === "number" ? opts.totalCents : undefined,
    ...(mergedShipping ? { shippingJson: mergedShipping as any } : {}),
    ...(country ? { shippingCountry: country } : {}),
  };

  // ✅ Idempotência SEM mexer no schema:
  // Só 1 request "ganha" a transição de pending -> paid
  let transitioned = false;

  if (!wasAlreadyFinal) {
    const claim = await prisma.order.updateMany({
      where: {
        id: orderId,
        NOT: { status: { in: ["paid", "shipped", "delivered"] } },
      },
      data: updateData,
    });

    transitioned = claim.count === 1;

    // Se alguém já atualizou em paralelo, garantimos ao menos que dados Stripe ficam atualizados
    if (!transitioned) {
      await prisma.order.update({
        where: { id: orderId },
        data: updateData,
      });
    }
  } else {
    // Já estava final: só atualiza campos Stripe/shipping sem enviar email
    await prisma.order.update({
      where: { id: orderId },
      data: updateData,
    });
  }

  if (transitioned) {
    await finalizePaidOrder(orderId);

    // ✅ Enviar email 1x (porque transitioned==true só acontece uma vez)
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (order) {
        const to = orderEmail(order, mergedShipping);

        if (to) {
          const items = (order.items ?? []).map((i: any) => ({
            name: i?.name ?? "Item",
            qty: typeof i?.qty === "number" ? i.qty : 1,
            price: typeof i?.unitPrice === "number" ? i.unitPrice / 100 : 0,
          }));

          await sendOrderConfirmationEmail({
            to,
            orderId: order.id,
            items,
            total: totalFromOrder(order, opts.totalCents ?? null),
            shippingPrice: shippingPriceFromOrder(order),
            customerName: orderCustomerName(order, mergedShipping),
            shippingAddress: orderShippingAddress(order, mergedShipping),
          });
        }
      }
    } catch (err) {
      console.error("Order confirmation email failed:", err);
    }
  }

  return { transitioned };
}

async function markPending(
  orderId: string,
  opts: {
    paymentIntentId?: string | null;
    sessionId?: string | null;
    shipping?: ShippingJson;
    userId?: string | null;
  }
) {
  const existing = await prisma.order.findUnique({
    where: { id: orderId },
    select: { shippingJson: true, shippingCountry: true, userId: true },
  });

  const mergedShipping = mergeShipping(
    existing?.shippingJson as ShippingJson,
    opts.shipping ?? null
  );

  const country =
    (mergedShipping?.address?.country || existing?.shippingCountry || null)
      ?.toString() || null;

  await prisma.order.update({
    where: { id: orderId },
    data: {
      ...(opts.userId && !existing?.userId ? { userId: opts.userId } : {}),
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

        const userId = userIdFromCheckoutSession(session);

        let orderId =
          (session.metadata?.orderId as string | undefined) ??
          (session.payment_intent &&
          typeof session.payment_intent !== "string" &&
          (session.payment_intent.metadata?.orderId as string | undefined)
            ? (session.payment_intent.metadata.orderId as string)
            : undefined);

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

        const shipping = mergeShipping(
          shippingFromMetadata(session.metadata ?? null),
          shippingFromSession(session)
        );

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
            userId,
          });

          if (transitioned) {
            try {
              await pusherServer.trigger("stats", "metric:update", {
                metric: "orders",
                value: 1,
              });
              await pusherServer.trigger("stats", "metric:update", {
                metric: "countriesMaybeChanged",
                value: 1,
              });
            } catch {}
          }
        } else {
          await markPending(orderId, {
            paymentIntentId: piId,
            sessionId: session.id,
            shipping,
            userId,
          });
        }
        break;
      }

      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;

        const userId = userIdFromCheckoutSession(session);

        const piId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id ?? null;

        const orderId =
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
            typeof session.amount_total === "number"
              ? session.amount_total
              : undefined,
          shipping,
          userId,
        });

        if (transitioned) {
          try {
            await pusherServer.trigger("stats", "metric:update", {
              metric: "orders",
              value: 1,
            });
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

        const userId = userIdFromPaymentIntent(pi);

        let orderId = pi.metadata?.orderId as string | undefined;

        if (!orderId) {
          const byPI = await prisma.order.findFirst({
            where: { stripePaymentIntentId: pi.id },
            select: { id: true },
          });
          orderId = byPI?.id;
        }
        if (!orderId) break;

        const { transitioned } = await markPaid(orderId, {
          paymentIntentId: pi.id,
          sessionId: null,
          currency: pi.currency ?? undefined,
          totalCents:
            typeof pi.amount_received === "number" ? pi.amount_received : undefined,
          shipping: shippingFromPaymentIntent(pi),
          userId,
        });

        if (transitioned) {
          try {
            await pusherServer.trigger("stats", "metric:update", {
              metric: "orders",
              value: 1,
            });
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

        const userId = userIdFromPaymentIntent(pi);

        const orderId =
          (pi.metadata?.orderId as string | undefined) ||
          (await prisma.order
            .findFirst({
              where: { stripePaymentIntentId: pi.id },
              select: { id: true },
            })
            .then((r) => r?.id));

        if (orderId) {
          await markPending(orderId, {
            paymentIntentId: pi.id,
            sessionId: null,
            shipping: shippingFromPaymentIntent(pi),
            userId,
          });
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const orderId =
          (pi.metadata?.orderId as string | undefined) ||
          (await prisma.order
            .findFirst({
              where: { stripePaymentIntentId: pi.id },
              select: { id: true },
            })
            .then((r) => r?.id));
        if (orderId) await markFailed(orderId);
        break;
      }

      case "payment_intent.canceled": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const orderId =
          (pi.metadata?.orderId as string | undefined) ||
          (await prisma.order
            .findFirst({
              where: { stripePaymentIntentId: pi.id },
              select: { id: true },
            })
            .then((r) => r?.id));
        if (orderId) await markCanceled(orderId);
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId =
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
              select: { id: true },
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
            userId: null,
          });

          if (transitioned) {
            try {
              await pusherServer.trigger("stats", "metric:update", {
                metric: "orders",
                value: 1,
              });
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
        break;
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("stripe webhook error", e);
    return new NextResponse("ok", { status: 200 });
  }
};
