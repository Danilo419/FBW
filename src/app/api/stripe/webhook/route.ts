// src/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { finalizePaidOrder } from "@/lib/checkout";
import { pusherServer } from "@/lib/pusher";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { normalizeDiscountCode } from "@/lib/discount-codes";
import { deductPtStockForPaidOrder } from "@/lib/deductPtStockForPaidOrder";
import { redeemDiscountCodeTx } from "@/lib/redeem-discount-code";

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
      line1?: string | null;
      line2?: string | null;
      city?: string | null;
      state?: string | null;
      postal_code?: string | null;
      country?: string | null;
    }
  | null;

type DiscountMeta = {
  code: string | null;
  percentOff: number | null;
  discountAmountCents: number | null;
  productSubtotalCents: number | null;
  finalProductSubtotalCents: number | null;
  stripePromotionCodeId: string | null;
  stripeCouponId: string | null;
  stripeNativeDiscountUsed: boolean;
};

const nz = (v: unknown) => {
  const s = (v ?? "").toString().trim();
  return s.length ? s : null;
};

const intOrNull = (v: unknown) => {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : null;
};

const isFinal = (s?: string | null) =>
  (s ?? "").toLowerCase() === "paid" ||
  (s ?? "").toLowerCase() === "shipped" ||
  (s ?? "").toLowerCase() === "delivered";

type AnyObj = Record<string, any>;

function safeObj(v: any): AnyObj {
  if (!v) return {};
  if (typeof v === "object") return v as AnyObj;
  if (typeof v === "string") {
    try {
      const j = JSON.parse(v);
      return j && typeof j === "object" ? (j as AnyObj) : {};
    } catch {
      return {};
    }
  }
  return {};
}

function isEmptyShipping(s?: ShippingJson | null) {
  if (!s) return true;
  const a = (s as any).address ?? {};
  return !(
    (s as any).name ||
    (s as any).phone ||
    (s as any).email ||
    (s as any).line1 ||
    (s as any).line2 ||
    (s as any).city ||
    (s as any).state ||
    (s as any).postal_code ||
    (s as any).country ||
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
    line1: nz(meta.ship_line1),
    line2: nz(meta.ship_line2),
    city: nz(meta.ship_city),
    state: nz(meta.ship_state),
    postal_code: nz(meta.ship_postal),
    country: nz(meta.ship_country),
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
    line1: nz(addr?.line1),
    line2: nz(addr?.line2),
    city: nz(addr?.city),
    state: nz(addr?.state),
    postal_code: nz(addr?.postal_code),
    country: nz(addr?.country),
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
    line1: nz(s?.address?.line1),
    line2: nz(s?.address?.line2),
    city: nz(s?.address?.city),
    state: nz(s?.address?.state),
    postal_code: nz(s?.address?.postal_code),
    country: nz(s?.address?.country),
  };

  return isEmptyShipping(out) ? null : out;
}

function discountFromMetadata(meta?: Record<string, any> | null): DiscountMeta {
  if (!meta) {
    return {
      code: null,
      percentOff: null,
      discountAmountCents: null,
      productSubtotalCents: null,
      finalProductSubtotalCents: null,
      stripePromotionCodeId: null,
      stripeCouponId: null,
      stripeNativeDiscountUsed: false,
    };
  }

  const code = normalizeDiscountCode(nz(meta.discountCode) ?? "");
  const percentOff = intOrNull(meta.discountPercent);
  const discountAmountCents = intOrNull(meta.discountAmountCents);
  const productSubtotalCents = intOrNull(meta.productSubtotalCents);
  const finalProductSubtotalCents = intOrNull(meta.finalProductSubtotalCents);
  const stripePromotionCodeId = nz(meta.stripePromotionCodeId);
  const stripeCouponId = nz(meta.stripeCouponId);
  const stripeNativeDiscountUsed =
    String(meta.stripeNativeDiscountUsed ?? "")
      .trim()
      .toLowerCase() === "true";

  return {
    code: code || null,
    percentOff,
    discountAmountCents,
    productSubtotalCents,
    finalProductSubtotalCents,
    stripePromotionCodeId,
    stripeCouponId,
    stripeNativeDiscountUsed,
  };
}

function pickNonEmpty<T>(a: T, b: T) {
  if (a == null) return b;
  if (typeof a === "string" && a.trim() === "") return b;
  return a;
}

function normalizeShipping(s: any): AnyObj {
  const S = safeObj(s);
  const addr = safeObj(S.address);

  const line1 = pickNonEmpty(nz(S.line1), nz(addr.line1));
  const line2 = pickNonEmpty(nz(S.line2), nz(addr.line2));
  const city = pickNonEmpty(nz(S.city), nz(addr.city));
  const state = pickNonEmpty(nz(S.state), nz(addr.state));
  const postal_code = pickNonEmpty(nz(S.postal_code), nz(addr.postal_code));
  const country = pickNonEmpty(nz(S.country), nz(addr.country));

  return {
    name: nz(S.name),
    phone: nz(S.phone),
    email: nz(S.email),
    line1,
    line2,
    city,
    state,
    postal_code,
    country,
    address: {
      line1,
      line2,
      city,
      state,
      postal_code,
      country,
    },
  };
}

function mergeShipping(base: ShippingJson, add: ShippingJson): ShippingJson {
  if (!base && !add) return null;

  if (!base) {
    const I = normalizeShipping(add);
    const out: ShippingJson = {
      name: I.name,
      phone: I.phone,
      email: I.email,
      address: I.address,
      line1: I.line1,
      line2: I.line2,
      city: I.city,
      state: I.state,
      postal_code: I.postal_code,
      country: I.country,
    };
    return isEmptyShipping(out) ? null : out;
  }

  if (!add) {
    const B = normalizeShipping(base);
    const out: ShippingJson = {
      name: B.name,
      phone: B.phone,
      email: B.email,
      address: B.address,
      line1: B.line1,
      line2: B.line2,
      city: B.city,
      state: B.state,
      postal_code: B.postal_code,
      country: B.country,
    };
    return isEmptyShipping(out) ? null : out;
  }

  const B = normalizeShipping(base);
  const A = normalizeShipping(add);

  const merged: AnyObj = {
    name: pickNonEmpty(B.name, A.name),
    phone: pickNonEmpty(B.phone, A.phone),
    email: pickNonEmpty(B.email, A.email),
    line1: pickNonEmpty(B.line1, A.line1),
    line2: pickNonEmpty(B.line2, A.line2),
    city: pickNonEmpty(B.city, A.city),
    state: pickNonEmpty(B.state, A.state),
    postal_code: pickNonEmpty(B.postal_code, A.postal_code),
    country: pickNonEmpty(B.country, A.country),
  };

  merged.address = {
    line1: merged.line1 ?? null,
    line2: merged.line2 ?? null,
    city: merged.city ?? null,
    state: merged.state ?? null,
    postal_code: merged.postal_code ?? null,
    country: merged.country ?? null,
  };

  const out: ShippingJson = {
    name: merged.name ?? null,
    phone: merged.phone ?? null,
    email: merged.email ?? null,
    address: merged.address,
    line1: merged.line1 ?? null,
    line2: merged.line2 ?? null,
    city: merged.city ?? null,
    state: merged.state ?? null,
    postal_code: merged.postal_code ?? null,
    country: merged.country ?? null,
  };

  return isEmptyShipping(out) ? null : out;
}

function canonFromShipping(s?: ShippingJson | null) {
  const root = safeObj(s);
  const addr = safeObj(root.address);
  const up = (c?: string | null) => (c ? c.toUpperCase() : c ?? null);

  return {
    shippingFullName: nz(root.name),
    shippingEmail: nz(root.email),
    shippingPhone: nz(root.phone),
    shippingAddress1: nz(root.line1) ?? nz(addr.line1),
    shippingAddress2: nz(root.line2) ?? nz(addr.line2),
    shippingCity: nz(root.city) ?? nz(addr.city),
    shippingRegion: nz(root.state) ?? nz(addr.state),
    shippingPostalCode: nz(root.postal_code) ?? nz(addr.postal_code),
    shippingCountry: up(nz(root.country) ?? nz(addr.country)),
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
  if (!s) return null;

  const partsRoot = [
    (s as any).line1,
    (s as any).line2,
    (s as any).postal_code,
    (s as any).city,
    (s as any).state,
    (s as any).country,
  ].filter(Boolean) as string[];

  if (partsRoot.length) return partsRoot.join(", ");

  if (!s.address) return null;
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

  const subtotal =
    typeof order?.finalProductSubtotalCents === "number"
      ? order.finalProductSubtotalCents
      : typeof order?.subtotal === "number"
        ? order.subtotal
        : 0;

  const shipping =
    typeof order?.shippingCents === "number"
      ? order.shippingCents
      : typeof order?.shipping === "number"
        ? order.shipping
        : 0;

  const tax = typeof order?.tax === "number" ? order.tax : 0;
  const discountAmountCents =
    typeof order?.discountAmountCents === "number"
      ? order.discountAmountCents
      : 0;

  const sum =
    typeof order?.finalProductSubtotalCents === "number"
      ? subtotal + shipping + tax
      : subtotal - discountAmountCents + shipping + tax;

  if (sum > 0) return sum / 100;

  if (typeof optsTotalCents === "number") return optsTotalCents / 100;

  return 0;
}

function shippingPriceFromOrder(order: any): number {
  if (typeof order?.shippingCents === "number") return order.shippingCents / 100;
  return typeof order?.shipping === "number" ? order.shipping / 100 : 0;
}

function orderEmail(
  order: any,
  mergedShipping?: ShippingJson | null
): string | null {
  return (
    nz(order?.shippingEmail) ||
    nz(order?.shippingJson?.email) ||
    nz((order?.shippingJson as any)?.ship_email) ||
    nz(mergedShipping?.email) ||
    null
  );
}

function orderCustomerName(
  order: any,
  mergedShipping?: ShippingJson | null
): string | null {
  return (
    nz(order?.shippingFullName) ||
    nz(order?.shippingJson?.name) ||
    nz((order?.shippingJson as any)?.ship_name) ||
    nz(mergedShipping?.name) ||
    null
  );
}

function orderShippingAddress(
  order: any,
  mergedShipping?: ShippingJson | null
): string | null {
  const parts = [
    nz(order?.shippingAddress1),
    nz(order?.shippingAddress2),
    nz(order?.shippingPostalCode),
    nz(order?.shippingCity),
    nz(order?.shippingRegion),
    nz(order?.shippingCountry),
  ].filter(Boolean) as string[];

  if (parts.length) return parts.join(", ");

  return shippingAddressToString(
    ((order?.shippingJson as any) as ShippingJson) ?? mergedShipping ?? null
  );
}

/* -------------------- paid side effects -------------------- */

async function ensurePaidOrderSideEffects(
  orderId: string,
  opts?: {
    transitioned?: boolean;
    mergedShipping?: ShippingJson | null;
    totalCents?: number | null;
  }
) {
  try {
    await deductPtStockForPaidOrder(orderId);
  } catch (err) {
    console.error("[stripe/webhook] deductPtStockForPaidOrder failed:", err);
  }

  if (!opts?.transitioned) return;

  try {
    await finalizePaidOrder(orderId);
  } catch (err) {
    console.error("[stripe/webhook] finalizePaidOrder failed:", err);
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order || order.confirmationEmailSentAt) return;

    const to = orderEmail(order, opts.mergedShipping ?? null);
    if (!to) return;

    const items = (order.items ?? []).map((i: any) => ({
      name: i?.name ?? "Item",
      qty: typeof i?.qty === "number" ? i.qty : 1,
      price: typeof i?.unitPrice === "number" ? i.unitPrice / 100 : 0,
    }));

    const emailResult = await sendOrderConfirmationEmail({
      to,
      orderId: order.id,
      items,
      total: totalFromOrder(order, opts.totalCents ?? null),
      shippingPrice: shippingPriceFromOrder(order),
      customerName: orderCustomerName(order, opts.mergedShipping ?? null),
      shippingAddress: orderShippingAddress(order, opts.mergedShipping ?? null),
    });

    await prisma.order.update({
      where: { id: orderId },
      data: {
        confirmationEmailSentAt: new Date(),
        confirmationEmailProviderId:
          typeof (emailResult as any)?.id === "string"
            ? (emailResult as any).id
            : typeof (emailResult as any)?.messageId === "string"
              ? (emailResult as any).messageId
              : null,
      },
    });
  } catch (err) {
    console.error("[stripe/webhook] order confirmation email failed:", err);
  }
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
    discount?: DiscountMeta | null;
  }
): Promise<{ transitioned: boolean }> {
  const existing = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      shippingJson: true,
      shippingCountry: true,
      userId: true,
      discountCodeText: true,
      discountPercent: true,
      discountAmountCents: true,
      productSubtotalCents: true,
      finalProductSubtotalCents: true,
      total: true,
      totalCents: true,
      shipping: true,
      shippingCents: true,
      tax: true,
      confirmationEmailSentAt: true,
      stripePromotionCodeIdUsed: true,
      stripeCouponIdUsed: true,
    },
  });

  if (!existing) {
    throw new Error(`Order not found: ${orderId}`);
  }

  const wasAlreadyFinal = isFinal(existing.status);

  const mergedShipping = mergeShipping(
    (existing.shippingJson as ShippingJson) ?? null,
    opts.shipping ?? null
  );

  const canon = canonFromShipping(mergedShipping);
  const country =
    canon.shippingCountry ||
    (mergedShipping?.country ||
      mergedShipping?.address?.country ||
      existing.shippingCountry ||
      null)?.toString() ||
    null;

  const normalizedCode = normalizeDiscountCode(
    opts.discount?.code ?? existing.discountCodeText ?? ""
  );
  const hasResolvedDiscountCode = !!normalizedCode;
  const hasIncomingDiscountMeta =
    !!opts.discount &&
    (opts.discount.percentOff != null ||
      opts.discount.discountAmountCents != null ||
      opts.discount.productSubtotalCents != null ||
      opts.discount.finalProductSubtotalCents != null ||
      !!opts.discount.stripePromotionCodeId ||
      !!opts.discount.stripeCouponId ||
      !!opts.discount.code);

  const updateData: Record<string, any> = {
    ...(opts.userId && !existing.userId ? { userId: opts.userId } : {}),
    status: "paid",
    paymentStatus: "paid",
    paidAt: new Date(),
    stripePaymentIntentId: opts.paymentIntentId ?? null,
    ...(opts.sessionId ? { stripeSessionId: opts.sessionId } : {}),
    ...(opts.currency ? { currency: upper(opts.currency) } : {}),
    ...(typeof opts.totalCents === "number"
      ? { totalCents: opts.totalCents }
      : {}),
    ...(mergedShipping ? { shippingJson: mergedShipping as any } : {}),
    ...(country ? { shippingCountry: country } : {}),
    ...canon,
  };

  if (hasResolvedDiscountCode) {
    updateData.discountCodeText = normalizedCode;
  }

  if (hasIncomingDiscountMeta) {
    updateData.discountPercent =
      opts.discount?.percentOff ?? existing.discountPercent ?? undefined;
    updateData.discountAmountCents =
      opts.discount?.discountAmountCents ??
      existing.discountAmountCents ??
      undefined;
    updateData.productSubtotalCents =
      opts.discount?.productSubtotalCents ??
      existing.productSubtotalCents ??
      undefined;

    updateData.subtotal =
      opts.discount?.productSubtotalCents ??
      existing.productSubtotalCents ??
      undefined;

    if (typeof opts.discount?.finalProductSubtotalCents === "number") {
      updateData.finalProductSubtotalCents =
        opts.discount.finalProductSubtotalCents;
    } else if (typeof existing.finalProductSubtotalCents === "number") {
      updateData.finalProductSubtotalCents = existing.finalProductSubtotalCents;
    }

    if (opts.discount?.stripePromotionCodeId) {
      updateData.stripePromotionCodeIdUsed =
        opts.discount.stripePromotionCodeId;
    }

    if (opts.discount?.stripeCouponId) {
      updateData.stripeCouponIdUsed = opts.discount.stripeCouponId;
    }
  }

  let transitioned = false;

  if (!wasAlreadyFinal) {
    transitioned = await prisma.$transaction(async (tx) => {
      const claim = await tx.order.updateMany({
        where: {
          id: orderId,
          NOT: { status: { in: ["paid", "shipped", "delivered"] } },
        },
        data: updateData as any,
      });

      if (claim.count !== 1) {
        return false;
      }

      if (hasResolvedDiscountCode) {
        await redeemDiscountCodeTx(tx, normalizedCode, orderId);
      }

      return true;
    });

    if (!transitioned) {
      await prisma.order.update({
        where: { id: orderId },
        data: updateData as any,
      });
    }
  } else {
    await prisma.order.update({
      where: { id: orderId },
      data: updateData as any,
    });
  }

  await ensurePaidOrderSideEffects(orderId, {
    transitioned,
    mergedShipping,
    totalCents:
      typeof opts.totalCents === "number" ? opts.totalCents : existing.totalCents,
  });

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

  if (!existing) {
    throw new Error(`Order not found: ${orderId}`);
  }

  const mergedShipping = mergeShipping(
    (existing.shippingJson as ShippingJson) ?? null,
    opts.shipping ?? null
  );

  const canon = canonFromShipping(mergedShipping);
  const country =
    canon.shippingCountry ||
    (mergedShipping?.country ||
      mergedShipping?.address?.country ||
      existing.shippingCountry ||
      null)?.toString() ||
    null;

  await prisma.order.update({
    where: { id: orderId },
    data: {
      ...(opts.userId && !existing.userId ? { userId: opts.userId } : {}),
      status: "pending",
      paymentStatus: "pending",
      stripePaymentIntentId: opts.paymentIntentId ?? null,
      ...(opts.sessionId ? { stripeSessionId: opts.sessionId } : {}),
      ...(mergedShipping ? { shippingJson: mergedShipping as any } : {}),
      ...(country ? { shippingCountry: country } : {}),
      ...canon,
    } as any,
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
          typeof session.amount_total === "number"
            ? session.amount_total
            : undefined;

        const currency = session.currency ?? undefined;
        const discount = discountFromMetadata(session.metadata ?? null);

        if (session.payment_status === "paid") {
          const { transitioned } = await markPaid(orderId, {
            paymentIntentId: piId,
            sessionId: session.id,
            currency,
            totalCents,
            shipping,
            userId,
            discount,
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

        const discount = discountFromMetadata(session.metadata ?? null);

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
          discount,
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
            typeof pi.amount_received === "number"
              ? pi.amount_received
              : undefined,
          shipping: shippingFromPaymentIntent(pi),
          userId,
          discount: discountFromMetadata(pi.metadata ?? null),
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
              : (charge.payment_intent as Stripe.PaymentIntent | null)?.id ??
                null;

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
            discount: discountFromMetadata(charge.metadata ?? null),
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