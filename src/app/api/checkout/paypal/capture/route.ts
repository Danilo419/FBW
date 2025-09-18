// src/app/api/checkout/paypal/capture/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CaptureBody = { paypalOrderId?: string; orderId?: string };

// Tipagem mínima/segura para o retorno do SDK do PayPal (OrdersCapture)
type PayPalCaptureResult = {
  result?: {
    id?: string;
    status?: string;
    payer?: {
      email_address?: string;
      name?: { given_name?: string; surname?: string };
      phone?: { phone_number?: { national_number?: string } };
    };
    purchase_units?: Array<{
      shipping?: {
        name?: { full_name?: string };
        address?: {
          address_line_1?: string;
          address_line_2?: string;
          admin_area_2?: string; // city
          admin_area_1?: string; // state / region
          postal_code?: string;
          country_code?: string;
        };
      };
      payments?: {
        captures?: Array<{
          id?: string;
          status?: string;
          amount?: { value?: string; currency_code?: string };
        }>;
      };
    }>;
  };
};

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

function shippingFromPayPal(res: PayPalCaptureResult): ShippingJson {
  const pu = res?.result?.purchase_units?.[0];
  const payer = res?.result?.payer;
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

  return isEmptyShipping(out) ? null : out;
}

const upper = (s?: string | null) => (s ? s.toUpperCase() : s ?? null);

/* -------------------------- mutations --------------------------- */

async function markPaid(
  orderId: string,
  opts: {
    captureId?: string | null;
    paypalOrderId?: string | null;
    currency?: string | null;
    totalCents?: number | null;
    newShipping?: ShippingJson;
  }
) {
  const existing = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true, shippingJson: true, shippingCountry: true },
  });

  const alreadyFinal =
    existing?.status === "paid" || existing?.status === "shipped" || existing?.status === "delivered";

  const mergedShipping = mergeShipping(existing?.shippingJson as ShippingJson, opts.newShipping ?? null);
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
  }

  return { transitioned: !alreadyFinal };
}

async function markFailed(orderId: string) {
  await prisma.order.update({
    where: { id: orderId },
    data: { status: "failed", paymentStatus: "failed" },
  });
}

/* ------------------------------ route ----------------------------- */

export async function POST(req: NextRequest) {
  try {
    const { paypalOrderId, orderId } = (await req.json().catch(() => ({}))) as CaptureBody;

    if (!paypalOrderId || !orderId) {
      return NextResponse.json(
        { error: "Missing required fields: paypalOrderId and orderId." },
        { status: 400 }
      );
    }

    if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
      return NextResponse.json(
        { error: "PayPal is not configured on this environment." },
        { status: 501 }
      );
    }

    // Importes dinâmicos para evitar problemas de build
    const { paypalClient, paypal } = await import("@/lib/paypal");

    const capReq = new (paypal as any).orders.OrdersCaptureRequest(paypalOrderId);
    capReq.requestBody({});

    const rawRes: unknown = await (paypalClient as any).execute(capReq);
    const res = rawRes as PayPalCaptureResult;

    const status = res?.result?.status ?? "UNKNOWN";
    const unit = res?.result?.purchase_units?.[0];
    const capture = unit?.payments?.captures?.[0];

    const captureId = capture?.id ?? null;
    const currency = capture?.amount?.currency_code ?? null;
    // amount.value é string — converter para cents com arredondamento seguro
    const totalCents =
      capture?.amount?.value != null ? Math.round(parseFloat(capture.amount.value) * 100) : null;

    if (status === "COMPLETED") {
      const newShipping = shippingFromPayPal(res);
      const { transitioned } = await markPaid(orderId, {
        captureId,
        paypalOrderId,
        currency,
        totalCents,
        newShipping,
      });

      // (Opcional) emitir eventos em tempo real se tiveres Pusher
      try {
        if (transitioned) {
          const { pusherServer } = await import("@/lib/pusher");
          await pusherServer.trigger("stats", "metric:update", { metric: "orders", value: 1 });
          await pusherServer.trigger("stats", "metric:update", {
            metric: "countriesMaybeChanged",
            value: 1,
          });
        }
      } catch {}

      return NextResponse.json({
        ok: true,
        status: "COMPLETED",
        captureId,
      });
    }

    // Outros estados (raros após o capture): tratar como falha
    await markFailed(orderId);
    return NextResponse.json({ ok: false, status }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "PayPal capture error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
