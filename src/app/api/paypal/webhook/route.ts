// src/app/api/paypal/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* -------------------------------- types ------------------------------- */

type PayPalWebhookEvent = {
  id?: string;
  event_type?: string;
  summary?: string;
  resource_type?: string;
  resource?: any;
  create_time?: string;
  links?: Array<{ href: string; rel: string; method: string }>;
};

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

type OrderPick = { id: string; shippingJson: any; shippingCountry: string | null };

/* ------------------------------- helpers ------------------------------ */

const nz = (v: unknown) => {
  const s = (v ?? "").toString().trim();
  return s.length ? s : null;
};

function prefer<A>(primary: A | null | undefined, fallback: A | null | undefined): A | null {
  return primary != null && !(typeof primary === "string" && primary.trim() === "")
    ? (primary as A)
    : (fallback ?? null);
}

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

function shippingFromOrderGet(orderGetResult: any): ShippingJson {
  const pu = orderGetResult?.result?.purchase_units?.[0];
  const payer = orderGetResult?.result?.payer;
  const ship = pu?.shipping;

  const address =
    ship?.address &&
    (ship.address.address_line_1 ||
      ship.address.address_line_2 ||
      ship.address.admin_area_2 ||
      ship.address.admin_area_1 ||
      ship.address.postal_code ||
      ship.address.country_code)
      ? {
          line1: nz(ship.address.address_line_1),
          line2: nz(ship.address.address_line_2),
          city: nz(ship.address.admin_area_2),
          state: nz(ship.address.admin_area_1),
          postal_code: nz(ship.address.postal_code),
          country: nz(ship.address.country_code),
        }
      : null;

  const fullName =
    nz(ship?.name?.full_name) ||
    nz([payer?.name?.given_name, payer?.name?.surname].filter(Boolean).join(" "));

  const out: ShippingJson = {
    name: fullName,
    phone: nz(payer?.phone?.phone_number?.national_number),
    email: nz(payer?.email_address),
    address,
  };

  if (!out.name && !out.phone && !out.email && !out.address) return null;
  return out;
}

const upper = (s?: string | null) => (s ? s.toUpperCase() : s ?? null);

async function getOrderByPayPalIds(
  paypalOrderId: string | null,
  captureId: string | null
): Promise<OrderPick | null> {
  if (paypalOrderId) {
    const o = await prisma.order.findFirst({
      where: { paypalOrderId },
      select: { id: true, shippingJson: true, shippingCountry: true },
    });
    if (o) return o as OrderPick;
  }
  if (captureId) {
    const o = await prisma.order.findFirst({
      where: { paypalCaptureId: captureId },
      select: { id: true, shippingJson: true, shippingCountry: true },
    });
    if (o) return o as OrderPick;
  }
  return null;
}

/* ------------------------------ mutations ----------------------------- */

async function markPaid(
  orderId: string,
  opts: {
    captureId?: string | null;
    paypalOrderId?: string | null;
    currency?: string | null;
    totalCents?: number | null;
    shipping?: ShippingJson;
  }
) {
  const existing = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true, shippingJson: true, shippingCountry: true },
  });

  const alreadyFinal =
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
      paypalCaptured: true,
      paypalOrderId: opts.paypalOrderId ?? undefined,
      paypalCaptureId: opts.captureId ?? undefined,
      currency: upper(opts.currency) ?? undefined,
      totalCents:
        typeof opts.totalCents === "number" && Number.isFinite(opts.totalCents)
          ? Math.round(opts.totalCents)
          : undefined,
      ...(mergedShipping ? { shippingJson: mergedShipping as any } : {}),
      ...(country ? { shippingCountry: country } : {}),
    },
  });

  if (!alreadyFinal) {
    const { finalizePaidOrder } = await import("@/lib/checkout");
    await finalizePaidOrder(orderId);
    try {
      const { pusherServer } = await import("@/lib/pusher");
      await pusherServer.trigger("stats", "metric:update", { metric: "orders", value: 1 });
      await pusherServer.trigger("stats", "metric:update", {
        metric: "countriesMaybeChanged",
        value: 1,
      });
    } catch {}
  }
}

async function markPending(orderId: string) {
  await prisma.order.update({
    where: { id: orderId },
    data: { status: "pending", paymentStatus: "pending" },
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

/* -------------------------------- route ------------------------------- */

export async function POST(req: NextRequest) {
  try {
    const bodyText = await req.text();
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;

    if (!webhookId) {
      return new NextResponse("Missing PAYPAL_WEBHOOK_ID", { status: 500 });
    }

    // Headers obrigatórios do VerifyWebhookSignature
    const transmissionId = req.headers.get("paypal-transmission-id");
    const timestamp = req.headers.get("paypal-transmission-time");
    const signature = req.headers.get("paypal-transmission-sig");
    const certUrl = req.headers.get("paypal-cert-url");
    const authAlgo = req.headers.get("paypal-auth-algo");

    if (!transmissionId || !timestamp || !signature || !certUrl || !authAlgo) {
      return new NextResponse("Missing PayPal verification headers", { status: 400 });
    }

    const { paypalClient, paypal } = await import("@/lib/paypal");

    // Verificar assinatura (usar body raw!)
    const verifyReq = new (paypal as any).notifications.VerifyWebhookSignatureRequest();
    verifyReq.requestBody({
      auth_algo: authAlgo,
      cert_url: certUrl,
      transmission_id: transmissionId,
      transmission_sig: signature,
      transmission_time: timestamp,
      webhook_id: webhookId,
      webhook_event: JSON.parse(bodyText),
    });

    const verifyRes = await (paypalClient as any).execute(verifyReq);
    const verificationStatus = (verifyRes?.result as any)?.verification_status;
    if (verificationStatus !== "SUCCESS") {
      return new NextResponse("Invalid signature", { status: 400 });
    }

    const event = JSON.parse(bodyText) as PayPalWebhookEvent;
    const type = (event.event_type ?? "").replace(/^PAYMENTS\./, "PAYMENT."); // normalizar

    switch (type) {
      case "PAYMENT.CAPTURE.COMPLETED": {
        const capture = event.resource || {};
        const captureId: string | null = capture.id ?? null;
        const currency: string | null = capture?.amount?.currency_code ?? null;
        const totalCents: number | null =
          capture?.amount?.value != null ? Math.round(parseFloat(capture.amount.value) * 100) : null;

        // obter PayPal order id
        const paypalOrderId: string | null =
          capture?.supplementary_data?.related_ids?.order_id ??
          capture?.links?.find((l: any) => l?.rel === "up")?.href?.split("/").pop() ??
          null;

        const order = await getOrderByPayPalIds(paypalOrderId, captureId);
        if (!order) {
          console.warn("[PayPal Webhook] capture.completed sem order mapeada", {
            captureId,
            paypalOrderId,
          });
          return NextResponse.json({ received: true });
        }

        // enriquecer shipping (se possível)
        let shipping: ShippingJson = null;
        if (paypalOrderId) {
          try {
            const getReq = new (paypal as any).orders.OrdersGetRequest(paypalOrderId);
            const orderGet = await (paypalClient as any).execute(getReq);
            shipping = shippingFromOrderGet(orderGet);
          } catch {}
        }

        await markPaid(order.id, {
          captureId,
          paypalOrderId,
          currency,
          totalCents,
          shipping,
        });

        return NextResponse.json({ received: true });
      }

      case "PAYMENT.CAPTURE.PENDING": {
        const capture = event.resource || {};
        const paypalOrderId: string | null =
          capture?.supplementary_data?.related_ids?.order_id ?? null;

        const order = await getOrderByPayPalIds(paypalOrderId, null);
        if (order) await markPending(order.id);
        return NextResponse.json({ received: true });
      }

      case "PAYMENT.CAPTURE.DENIED": {
        const capture = event.resource || {};
        const paypalOrderId: string | null =
          capture?.supplementary_data?.related_ids?.order_id ?? null;

        const order = await getOrderByPayPalIds(paypalOrderId, null);
        if (order) await markFailed(order.id);
        return NextResponse.json({ received: true });
      }

      case "PAYMENT.CAPTURE.REFUNDED":
      case "PAYMENT.CAPTURE.REVERSED": {
        // Se tiveres estado "refunded", podes atualizar aqui.
        return NextResponse.json({ received: true });
      }

      case "CHECKOUT.ORDER.APPROVED": {
        // Aprovado mas ainda não capturado (o teu endpoint /capture trata).
        return NextResponse.json({ received: true });
      }

      default:
        return NextResponse.json({ received: true });
    }
  } catch (e) {
    console.error("PayPal webhook error", e);
    return new NextResponse("ok", { status: 200 }); // evitar retries infinitos
  }
}
