// src/app/admin/orders/[id]/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { put } from "@vercel/blob";
import { sendFulfillmentUpdateEmail } from "@/lib/email";

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

function safeParseJSON(input: any): AnyObj {
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

function pickStr(o: any, keys: string[]) {
  if (!o || typeof o !== "object") return null;
  for (const k of keys) {
    const v = (o as any)?.[k];
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

function extractCustomerName(order: any) {
  const direct =
    (typeof order?.shippingFullName === "string" && order.shippingFullName.trim()) ||
    (typeof order?.name === "string" && order.name.trim()) ||
    (typeof order?.user?.name === "string" && order.user.name.trim()) ||
    "";

  if (direct) return direct;

  const j = safeParseJSON(order?.shippingJson);
  return (
    pickStr(j, ["fullName", "name", "recipient", "ship_name"]) ||
    pickStr(j?.shipping, ["fullName", "name"]) ||
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
  // ✅ DOMÍNIO OFICIAL E CORRETO
  return "FootballWorld <orders@myfootballworldstore.com>";
}

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "myfootballworldstore.com";
}

function escapeHtml(s: string) {
  return (s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* -------------------- premium shipment email -------------------- */

function shipmentEmailHtml(params: {
  orderShort: string;
  customerName?: string | null;
  trackingCode: string;
  track17Url: string;
  shipmentImageUrl?: string | null;
}) {
  const orderShort = escapeHtml(params.orderShort);
  const tracking = escapeHtml(params.trackingCode);
  const track17 = escapeHtml(params.track17Url);
  const name = params.customerName ? escapeHtml(params.customerName) : "";

  const greeting = name ? `Hi ${name},` : "Hi,";

  const imgBlock = params.shipmentImageUrl
    ? `
      <tr>
        <td style="padding:0 24px 24px 24px;">
          <div style="font-size:12px;color:#6b7280;margin-bottom:10px;">Shipment image</div>
          <img src="${escapeHtml(params.shipmentImageUrl)}"
               style="width:100%;max-width:560px;border-radius:16px;border:1px solid #e5e7eb;display:block;" />
        </td>
      </tr>`
    : "";

  return `
<!doctype html>
<html>
<body style="margin:0;background:#f6f7fb;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial">
<div style="padding:32px">
<table style="max-width:640px;margin:auto;background:#0b0b0f;border-radius:22px;color:#fff">
<tr>
<td style="padding:28px">
<h1 style="margin:0;font-size:26px">Your order is on the way 🚚</h1>
<p style="opacity:.9">${greeting} Your order <strong>${orderShort}</strong> has been shipped.</p>
</td>
</tr>

<tr>
<td style="background:#fff;color:#000;padding:24px">
<p style="font-size:12px;color:#6b7280">TRACKING CODE</p>
<div style="font-family:monospace;font-size:16px;margin-bottom:12px">${tracking}</div>
<a href="${track17}" style="display:inline-block;background:#000;color:#fff;
padding:10px 16px;border-radius:14px;text-decoration:none;font-weight:700">
Track on 17TRACK
</a>
<p style="margin-top:12px;font-size:13px;color:#374151">
Go to 17track.net and paste your tracking code to see the delivery status.
</p>
</td>
</tr>

${imgBlock}

<tr>
<td style="background:#fff;padding:24px;border-top:1px solid #e5e7eb">
<p style="font-size:12px;color:#6b7280">
Need help? Contact <a href="mailto:support@myfootballworldstore.com">support@myfootballworldstore.com</a><br/>
FootballWorld · <a href="${siteUrl()}">${siteUrl()}</a>
</p>
</td>
</tr>
</table>
</div>
</body>
</html>`;
}

/* ------------------------------- LEGACY ACTION ------------------------------- */

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
 * ✅ USADO NA UI NOVA
 * - trackingCode obrigatório
 * - shipmentImage opcional
 * - envia email premium
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

  const to =
    extractCustomerEmail({ ...order, shippingJson: prevJson }) ||
    (() => {
      throw new Error("Customer email not found");
    })();

  const customerName =
    extractCustomerName({ ...order, shippingJson: prevJson }) || null;

  /* -------- upload image -------- */
  let shipmentImageUrl: string | null = null;

  if (file && file.size > 0) {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) throw new Error("Missing BLOB_READ_WRITE_TOKEN");

    const ext = file.type.includes("png")
      ? "png"
      : file.type.includes("webp")
      ? "webp"
      : "jpg";

    const uploaded = await put(
      `shipments/${orderId}/${Date.now()}.${ext}`,
      file,
      { access: "public", token }
    );

    shipmentImageUrl = uploaded.url;
  }

  /* -------- persist -------- */
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
  const resend = new Resend(process.env.RESEND_API_KEY);

  const orderShort = `#${orderId.slice(0, 7)}`;
  const track17Url = `https://www.17track.net/en?nums=${encodeURIComponent(trackingCode)}`;

  await resend.emails.send({
    from: emailFrom(),
    to,
    subject: `Your order ${orderShort} has been shipped 🚚`,
    html: shipmentEmailHtml({
      orderShort,
      customerName,
      trackingCode,
      track17Url,
      shipmentImageUrl,
    }),
  });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath(`/admin`);
  revalidatePath(`/orders/${orderId}`);
}
