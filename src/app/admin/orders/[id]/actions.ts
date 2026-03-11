// src/app/admin/orders/[id]/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { put } from "@vercel/blob";

/**
 * IMPORTANT:
 * We now use the shared template file:
 *   src/lib/email/shipmentEmail.ts
 * This guarantees the logo/hero layout you are editing is the one actually sent.
 */
import { shipmentEmailHtml } from "@/lib/email/shipmentEmail";

/* ------------------------------- helpers ------------------------------- */

type AnyObj = Record<string, any>;

function safeString(v: unknown) {
  if (typeof v === "string") return v.trim();
  return "";
}

function toUpperTrim(v: unknown) {
  const s = safeString(v);
  return s ? s.toUpperCase() : "";
}

function safeParseJSON(input: unknown): AnyObj {
  if (!input) return {};
  if (typeof input === "string") {
    try {
      return JSON.parse(input);
    } catch {
      return {};
    }
  }
  if (typeof input === "object") return input as AnyObj;
  return {};
}

function pickStr(o: unknown, keys: string[]) {
  if (!o || typeof o !== "object") return null;
  for (const k of keys) {
    const v = (o as AnyObj)?.[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return null;
}

/* -------------------- customer helpers -------------------- */

function extractCustomerEmail(order: any) {
  const direct =
    (typeof order?.shippingEmail === "string" && order.shippingEmail.trim()) ||
    (typeof order?.email === "string" && order.email.trim()) ||
    (typeof order?.user?.email === "string" && order.user.email.trim()) ||
    "";

  if (direct) return direct;

  const j = safeParseJSON(order?.shippingJson);
  return (
    pickStr(j, ["email", "ship_email", "customer_email", "receipt_email", "customerEmail"]) ||
    pickStr(j?.shipping, ["email", "ship_email"]) ||
    null
  );
}

/* -------------------- status mapping -------------------- */

function mapShippingStatusToOrderStatus(shippingStatus: string) {
  const s = (shippingStatus || "").toUpperCase();
  if (s === "DELIVERED") return "delivered";
  if (s === "SHIPPED") return "shipped";
  if (s === "PROCESSING") return "paid";
  return "pending";
}

/* -------------------- email helpers -------------------- */

function emailFrom() {
  return "FootballWorld <orders@myfootballworldstore.com>";
}

function siteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || "https://myfootballworldstore.com";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return `https://${raw}`;
}

function supportEmail() {
  return "support@myfootballworldstore.com";
}

function brandName() {
  return "FootballWorld";
}

/* ------------------------------- LEGACY ACTION ------------------------------- */
/**
 * Mantido para compatibilidade (se ainda tens algum form antigo).
 * Se já não usas, podes apagar mais tarde.
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

  const nextShippingJson = {
    ...(prevJson ?? {}),
    status: shippingStatus,
    trackingCode,
    trackingUrl,
    updatedAt: new Date().toISOString(),
  };

  const nextOrderStatus = mapShippingStatusToOrderStatus(shippingStatus);

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: nextOrderStatus,
      shippingJson: nextShippingJson as any,
    },
  });

  revalidatePath(`/admin/orders/${orderId}`);
}

/* ------------------------------- NEW ACTION ------------------------------- */
/**
 * USADO NA UI NOVA
 * - trackingCode obrigatório
 * - shipmentImage opcional
 * - envia email premium (template em src/lib/email/shipmentEmail.ts)
 */
export async function sendShipmentEmailAction(formData: FormData) {
  const orderId = safeString(formData.get("orderId"));
  const trackingCode = toUpperTrim(formData.get("trackingCode"));
  const file = formData.get("shipmentImage") as File | null;

  if (!orderId) throw new Error("Missing orderId");
  if (!trackingCode) throw new Error("Tracking code is required");

  const order = await prisma.order.findUnique({
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

  if (!order) throw new Error("Order not found");

  const prevJson = safeParseJSON(order.shippingJson);

  const to = extractCustomerEmail({ ...order, shippingJson: prevJson });
  if (!to) throw new Error("Customer email not found");

  /* -------- upload image (optional) -------- */
  let shipmentImageUrl: string | null = null;

  if (file && typeof file === "object" && "size" in file && file.size > 0) {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) throw new Error("Missing BLOB_READ_WRITE_TOKEN");

    const mime = (file as File).type || "";
    const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";

    const uploaded = await put(`shipments/${orderId}/${Date.now()}.${ext}`, file, {
      access: "public",
      token,
    });

    shipmentImageUrl = uploaded.url;
  }

  /* -------- persist shippingJson + status -------- */
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: order.status === "delivered" ? "delivered" : "shipped",
      shippingJson: {
        ...(prevJson ?? {}),
        shippingStatus: "SHIPPED",
        trackingCode,
        shipmentImageUrl,
        shippedAt: new Date().toISOString(),
      } as any,
    },
  });

  /* -------- email -------- */
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) throw new Error("Missing RESEND_API_KEY");

  const resend = new Resend(resendApiKey);

  const orderShort = `#${orderId.slice(0, 7)}`;
  const track17Url = `https://www.17track.net/en?nums=${encodeURIComponent(trackingCode)}`;

  const html = shipmentEmailHtml({
    brandName: brandName(),
    orderShort,
    trackingCode,
    track17Url,
    shipmentImageUrl,
    supportEmail: supportEmail(),
    siteUrl: siteUrl(),
  });

  await resend.emails.send({
    from: emailFrom(),
    to,
    subject: `Your order ${orderShort} has been shipped 🚚`,
    html,
  });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin");
  revalidatePath(`/orders/${orderId}`);
}