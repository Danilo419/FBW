// src/app/api/checkout/paypal/capture/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeDiscountCode } from "@/lib/discount-codes";
import { redeemDiscountCodeTx } from "@/lib/redeem-discount-code";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type CaptureBody = { paypalOrderId?: string; orderId?: string };

// Tipagem mínima/segura para o retorno do SDK do PayPal (OrdersCapture)
type PayPalCaptureResult = {
  result?: {
    id?: string;
    status?: string; // "COMPLETED" esperado
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
          status?: string; // "COMPLETED"
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

const isFinal = (s?: string | null) =>
  (s ?? "").toLowerCase() === "paid" ||
  (s ?? "").toLowerCase() === "shipped" ||
  (s ?? "").toLowerCase() === "delivered";

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

function prefer<A>(
  primary: A | null | undefined,
  fallback: A | null | undefined
): A | null {
  return primary != null &&
    !(typeof primary === "string" && (primary as any).trim?.() === "")
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
      postal_code: prefer(
        base.address?.postal_code ?? null,
        add.address?.postal_code ?? null
      ),
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

/** Converte ShippingJson em colunas canónicas da Order. */
function canonFromShipping(s?: ShippingJson) {
  const a = s?.address ?? null;
  const up = (c?: string | null) => (c ? c.toUpperCase() : c ?? null);

  return {
    shippingFullName: nz(s?.name),
    shippingEmail: nz(s?.email),
    shippingPhone: nz(s?.phone),
    shippingAddress1: nz(a?.line1),
    shippingAddress2: nz(a?.line2),
    shippingCity: nz(a?.city),
    shippingRegion: nz(a?.state),
    shippingPostalCode: nz(a?.postal_code),
    shippingCountry: up(nz(a?.country)),
  };
}

async function isDiscountAlreadyRedeemed(code: string) {
  const discount = await prisma.discountCode.findUnique({
    where: { code },
    select: {
      active: true,
      usedAt: true,
      usesCount: true,
      maxUses: true,
      usedByOrderId: true,
    },
  });

  if (!discount) return false;

  return Boolean(
    discount.usedAt ||
      discount.usedByOrderId ||
      discount.usesCount >= 1 ||
      discount.usesCount >= discount.maxUses ||
      !discount.active
  );
}

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
    select: {
      status: true,
      shippingJson: true,
      shippingCountry: true,
      discountCodeText: true,
    },
  });

  if (!existing) {
    throw new Error(`Order not found: ${orderId}`);
  }

  const alreadyFinal = isFinal(existing.status);

  const mergedShipping = mergeShipping(
    existing.shippingJson as ShippingJson,
    opts.newShipping ?? null
  );
  const canon = canonFromShipping(mergedShipping);
  const country =
    canon.shippingCountry || upper(existing.shippingCountry || null) || null;

  const normalizedDiscountCode = normalizeDiscountCode(
    existing.discountCodeText ?? ""
  );
  const hasDiscountCode = !!normalizedDiscountCode;

  if (alreadyFinal) {
    let repairedDiscount = false;

    if (hasDiscountCode) {
      const alreadyRedeemed = await isDiscountAlreadyRedeemed(
        normalizedDiscountCode
      );

      if (!alreadyRedeemed) {
        try {
          await prisma.$transaction(async (tx) => {
            await redeemDiscountCodeTx(tx, normalizedDiscountCode, orderId);
          });
          repairedDiscount = true;
        } catch (err) {
          console.error("[paypal/capture] discount repair failed:", err);
        }
      }
    }

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
        shippingJson: (mergedShipping as any) ?? undefined,
        ...(country ? { shippingCountry: country } : {}),
        ...canon,
      },
    });

    return { transitioned: false, repairedDiscount };
  }

  let transitioned = false;

  transitioned = await prisma.$transaction(async (tx) => {
    const claim = await tx.order.updateMany({
      where: {
        id: orderId,
        NOT: { status: { in: ["paid", "shipped", "delivered"] } },
      },
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
        shippingJson: (mergedShipping as any) ?? undefined,
        ...(country ? { shippingCountry: country } : {}),
        ...canon,
      },
    });

    if (claim.count !== 1) {
      return false;
    }

    if (hasDiscountCode) {
      await redeemDiscountCodeTx(tx, normalizedDiscountCode, orderId);
    }

    return true;
  });

  if (!transitioned) {
    let repairedDiscount = false;

    if (hasDiscountCode) {
      const currentOrder = await prisma.order.findUnique({
        where: { id: orderId },
        select: { status: true },
      });

      if (currentOrder && isFinal(currentOrder.status)) {
        const alreadyRedeemed = await isDiscountAlreadyRedeemed(
          normalizedDiscountCode
        );

        if (!alreadyRedeemed) {
          try {
            await prisma.$transaction(async (tx) => {
              await redeemDiscountCodeTx(tx, normalizedDiscountCode, orderId);
            });
            repairedDiscount = true;
          } catch (err) {
            console.error(
              "[paypal/capture] post-race discount repair failed:",
              err
            );
          }
        }
      }
    }

    return { transitioned: false, repairedDiscount };
  }

  try {
    const { finalizePaidOrder } = await import("@/lib/checkout");
    await finalizePaidOrder(orderId);
  } catch {}

  try {
    const { deductPtStockForPaidOrder } = await import(
      "@/lib/deductPtStockForPaidOrder"
    );
    await deductPtStockForPaidOrder(orderId);
  } catch {}

  return { transitioned: true, repairedDiscount: false };
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
    // Aceita dados no body e/ou via query (?token=paypalOrderId&order=localId)
    const body = (await req.json().catch(() => ({}))) as CaptureBody;
    const url = new URL(req.url);
    const paypalOrderId =
      body.paypalOrderId || url.searchParams.get("token") || undefined;
    const orderId = body.orderId || url.searchParams.get("order") || undefined;

    if (!paypalOrderId || !orderId) {
      return NextResponse.json(
        { error: "Missing required fields: paypalOrderId and orderId." },
        { status: 400 }
      );
    }

    // Verifica envs (aceita PAYPAL_CLIENT_SECRET ou PAYPAL_SECRET)
    if (
      !process.env.PAYPAL_CLIENT_ID ||
      !(process.env.PAYPAL_CLIENT_SECRET || process.env.PAYPAL_SECRET)
    ) {
      return NextResponse.json(
        { error: "PayPal is not configured on this environment." },
        { status: 501 }
      );
    }

    // Importes dinâmicos para evitar problemas de build em ambientes sem PayPal
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
    const totalCents =
      capture?.amount?.value != null
        ? Math.round(parseFloat(capture.amount.value) * 100)
        : null;

    if (status === "COMPLETED") {
      const newShipping = shippingFromPayPal(res);
      const { transitioned } = await markPaid(orderId, {
        captureId,
        paypalOrderId,
        currency,
        totalCents,
        newShipping,
      });

      try {
        if (transitioned) {
          const { pusherServer } = await import("@/lib/pusher");
          await pusherServer.trigger("stats", "metric:update", {
            metric: "orders",
            value: 1,
          });
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

    await markFailed(orderId);
    return NextResponse.json({ ok: false, status }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "PayPal capture error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}