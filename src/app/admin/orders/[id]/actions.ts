// src/app/admin/orders/[id]/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { sendFulfillmentUpdateEmail } from "@/lib/email";
import { revalidatePath } from "next/cache";

/* ------------------------------- helpers ------------------------------- */

function safeString(v: unknown) {
  if (typeof v === "string") return v.trim();
  return "";
}

function safeParseJSON(input: any): Record<string, any> {
  if (!input) return {};
  if (typeof input === "string") {
    try {
      return JSON.parse(input);
    } catch {
      return {};
    }
  }
  if (typeof input === "object") return input as Record<string, any>;
  return {};
}

function pickStr(o: any, keys: string[]) {
  if (!o || typeof o !== "object") return null;
  for (const k of keys) {
    const v = (o as any)?.[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return null;
}

function extractCustomerEmail(order: any) {
  // tenta vários locais (compatível com o teu extractShipping)
  const direct =
    (typeof order?.shippingEmail === "string" && order.shippingEmail.trim()) ||
    (typeof order?.email === "string" && order.email.trim()) ||
    (typeof order?.user?.email === "string" && order.user.email.trim()) ||
    "";

  if (direct) return direct;

  const j = safeParseJSON(order?.shippingJson);
  const fromJson = pickStr(j, ["email", "ship_email", "customer_email"]);
  return fromJson || null;
}

function extractCustomerName(order: any) {
  const direct =
    (typeof order?.shippingFullName === "string" && order.shippingFullName.trim()) ||
    (typeof order?.name === "string" && order.name.trim()) ||
    (typeof order?.user?.name === "string" && order.user.name.trim()) ||
    "";

  if (direct) return direct;

  const j = safeParseJSON(order?.shippingJson);
  const fromJson = pickStr(j, ["fullName", "name", "recipient"]);
  return fromJson || null;
}

function mapShippingStatusToOrderStatus(shippingStatus: string) {
  const s = (shippingStatus || "").toUpperCase();
  if (s === "DELIVERED") return "delivered";
  if (s === "SHIPPED") return "shipped";
  if (s === "PROCESSING") return "paid"; // como tu já estavas a mapear no admin
  return "pending";
}

/* ------------------------------- action ------------------------------- */
/**
 * Called by /admin/orders/[id] form (Fulfillment / Tracking)
 * - Updates shippingJson { status, trackingCode, trackingUrl, updatedAt }
 * - Updates order.status (pending/paid/shipped/delivered)
 * - Sends email automatically to the customer when values changed
 */
export async function updateOrderTrackingAction(formData: FormData) {
  const orderId = safeString(formData.get("orderId"));
  if (!orderId) throw new Error("Missing orderId");

  const shippingStatus = safeString(formData.get("shippingStatus")) || "PROCESSING";
  const trackingCode = safeString(formData.get("trackingCode")) || null;
  const trackingUrl = safeString(formData.get("trackingUrl")) || null;

  const before = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      shippingEmail: true,
      shippingFullName: true,
      shippingJson: true,
      user: { select: { email: true, name: true } },
    },
  });

  if (!before) throw new Error("Order not found");

  const prevJson = safeParseJSON(before.shippingJson);
  const prevStatus = String(prevJson?.status || "");
  const prevCode = String(prevJson?.trackingCode || "");
  const prevUrl = String(prevJson?.trackingUrl || "");

  const changed =
    prevStatus.toUpperCase() !== shippingStatus.toUpperCase() ||
    prevCode !== String(trackingCode || "") ||
    prevUrl !== String(trackingUrl || "");

  const nextShippingJson = {
    ...(typeof prevJson === "object" && prevJson ? prevJson : {}),
    status: shippingStatus,
    trackingCode,
    trackingUrl,
    updatedAt: new Date().toISOString(),
  };

  const nextOrderStatus = mapShippingStatusToOrderStatus(shippingStatus);

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: nextOrderStatus,
      shippingJson: nextShippingJson as any,
    },
    select: {
      id: true,
      status: true,
      shippingEmail: true,
      shippingFullName: true,
      shippingJson: true,
      user: { select: { email: true, name: true } },
    },
  });

  // Revalidar páginas relevantes
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath(`/admin`);
  revalidatePath(`/orders/${orderId}`);

  // se não mudou nada, não envia email
  if (!changed) {
    return { ok: true as const, emailed: false as const, reason: "no_changes" as const };
  }

  const to = extractCustomerEmail(updated);
  if (!to) {
    return { ok: true as const, emailed: false as const, reason: "missing_customer_email" as const };
  }

  const customerName = extractCustomerName(updated);

  // Usar um ID curto para o email (não existe publicId no teu schema)
  const orderShort = String(updated.id).slice(0, 7);

  // ✅ email automático com status + tracking
  const res = await sendFulfillmentUpdateEmail({
    to,
    orderId: orderShort,
    shippingStatus,
    trackingCode,
    trackingUrl,
    customerName,
  });

  return { ok: true as const, emailed: res?.ok === true };
}
