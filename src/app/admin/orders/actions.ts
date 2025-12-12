// src/app/admin/orders/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { sendOrderShippedEmail } from "@/lib/email";

/* ---------------------------- helpers ---------------------------- */

type AnyObj = Record<string, any>;

function toUpperTrim(s: unknown) {
  const v = typeof s === "string" ? s : "";
  const out = v.trim();
  return out.length ? out.toUpperCase() : "";
}

function trimStr(s: unknown) {
  const v = typeof s === "string" ? s : "";
  const out = v.trim();
  return out.length ? out : "";
}

function centsToEur(cents: number) {
  return cents / 100;
}

function pickEmailFromShippingJson(shippingJson: any): string | null {
  if (!shippingJson || typeof shippingJson !== "object") return null;

  // Your webhook uses several possible keys. We'll try a few.
  const candidates = [
    shippingJson.email,
    shippingJson.ship_email,
    shippingJson.customer_email,
    shippingJson.receipt_email,
  ];

  for (const c of candidates) {
    const v = typeof c === "string" ? c.trim() : "";
    if (v) return v;
  }
  return null;
}

function pickNameFromShippingJson(shippingJson: any): string | null {
  if (!shippingJson || typeof shippingJson !== "object") return null;

  const candidates = [
    shippingJson.name,
    shippingJson.ship_name,
    shippingJson.fullName,
    shippingJson.shippingFullName,
  ];

  for (const c of candidates) {
    const v = typeof c === "string" ? c.trim() : "";
    if (v) return v;
  }
  return null;
}

function addressToStringFromShippingJson(shippingJson: any): string | null {
  if (!shippingJson || typeof shippingJson !== "object") return null;

  const addr = shippingJson.address || shippingJson.ship_address || null;
  if (!addr || typeof addr !== "object") return null;

  const parts = [
    addr.line1,
    addr.line2,
    addr.postal_code,
    addr.city,
    addr.state,
    addr.country,
  ]
    .map((x: any) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean);

  return parts.length ? parts.join(", ") : null;
}

/* ------------------------------ action ----------------------------- */

export async function updateOrderTrackingAction(formData: FormData) {
  const orderId = formData.get("orderId")?.toString() || "";
  if (!orderId) throw new Error("Missing orderId");

  const trackingCode = toUpperTrim(formData.get("trackingCode"));
  const trackingUrl = trimStr(formData.get("trackingUrl"));
  const shippingStatusRaw = trimStr(formData.get("shippingStatus"));

  // We can't use shippingStatus enum/column because TS says it doesn't exist.
  // We'll map "shippingStatus" into your existing Order.status string.
  // Allowed statuses already present in your app: pending/paid/failed/canceled/refunded/shipped/delivered
  const nextStatus =
    shippingStatusRaw === "DELIVERED"
      ? "delivered"
      : shippingStatusRaw === "SHIPPED"
      ? "shipped"
      : shippingStatusRaw === "PROCESSING"
      ? "paid" // keep as paid (processing is shipping workflow; your schema stores payment separately)
      : shippingStatusRaw === "PENDING"
      ? "paid" // still paid but not shipped
      : null;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) throw new Error("Order not found");

  const previousStatus = order.status;

  // Merge tracking into shippingJson (which DOES exist in your schema)
  const currentShippingJson =
    (order.shippingJson as unknown as AnyObj | null) ?? null;

  const mergedShippingJson: AnyObj = {
    ...(currentShippingJson ?? {}),
    trackingCode: trackingCode || (currentShippingJson?.trackingCode ?? null),
    trackingUrl: trackingUrl || (currentShippingJson?.trackingUrl ?? null),
  };

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: {
      // keep your existing status as the "source of truth" for shipping workflow
      ...(nextStatus ? { status: nextStatus } : {}),
      shippingJson: mergedShippingJson as any,
    },
    include: { items: true },
  });

  // Decide if we should send the shipped email:
  // send only if it just became "shipped" AND we have a tracking code
  const becameShipped = previousStatus !== "shipped" && updatedOrder.status === "shipped";
  const effectiveShippingJson =
    (updatedOrder.shippingJson as unknown as AnyObj | null) ?? null;

  const effectiveTrackingCode =
    (typeof effectiveShippingJson?.trackingCode === "string"
      ? effectiveShippingJson.trackingCode.trim()
      : "") || null;

  const effectiveTrackingUrl =
    (typeof effectiveShippingJson?.trackingUrl === "string"
      ? effectiveShippingJson.trackingUrl.trim()
      : "") || null;

  const to = pickEmailFromShippingJson(effectiveShippingJson);
  const customerName = pickNameFromShippingJson(effectiveShippingJson);
  const shippingAddress = addressToStringFromShippingJson(effectiveShippingJson);

  // Totals: in your schema you already store cents in subtotal/shipping/tax
  const totalEur =
    typeof updatedOrder.total === "number"
      ? updatedOrder.total
      : typeof updatedOrder.totalCents === "number"
      ? centsToEur(updatedOrder.totalCents)
      : centsToEur((updatedOrder.subtotal ?? 0) + (updatedOrder.shipping ?? 0) + (updatedOrder.tax ?? 0));

  const shippingPriceEur = centsToEur(updatedOrder.shipping ?? 0);

  if (becameShipped && to && effectiveTrackingCode) {
    try {
      await sendOrderShippedEmail({
        to,
        orderId: updatedOrder.id,
        items: updatedOrder.items.map((i) => ({
          name: i.name,
          qty: i.qty,
          // email.ts expects EUR
          price: centsToEur(i.unitPrice),
        })),
        total: totalEur,
        shippingPrice: shippingPriceEur,
        customerName: customerName ?? undefined,
        shippingAddress: shippingAddress ?? undefined,
        trackingCode: effectiveTrackingCode,
        trackingUrl: effectiveTrackingUrl ?? undefined,
      });
    } catch (err) {
      // Never block admin updates because of email issues
      console.error("sendOrderShippedEmail failed:", err);
    }
  }

  revalidatePath(`/admin/orders/${orderId}`);
}
