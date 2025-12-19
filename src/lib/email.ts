// src/lib/email.ts
import "server-only";

/* =========================================================
   Config
========================================================= */

const RESEND_API_KEY = (process.env.RESEND_API_KEY || "").trim();
const EMAIL_FROM = process.env.EMAIL_FROM || "FootballWorld <onboarding@resend.dev>";
const STORE_NAME = process.env.STORE_NAME || "FootballWorld";

function isEmailEnabled() {
  // Resend keys look like "re_..."
  return RESEND_API_KEY.startsWith("re_") && RESEND_API_KEY.length > 10;
}

/**
 * Build-safe: we only load & construct Resend at runtime, inside a function.
 * This avoids crashes during Next build "Collecting page data".
 */
async function getResendClient() {
  if (!isEmailEnabled()) return null;

  const mod = await import("resend");
  const Resend = mod.Resend;

  try {
    return new Resend(RESEND_API_KEY);
  } catch (e) {
    console.error("Resend init failed:", e);
    return null;
  }
}

/* =========================================================
   Types
========================================================= */

export type EmailLineItem = {
  name: string;
  qty: number;
  price: number; // EUR
};

export type OrderConfirmationEmailData = {
  to: string;
  orderId: string;
  items: EmailLineItem[];
  total: number; // EUR
  shippingPrice?: number; // EUR
  customerName?: string | null;
  shippingAddress?: string | null;
};

export type ShippedEmailData = {
  to: string;
  orderId: string;
  items: EmailLineItem[];
  total: number; // EUR
  shippingPrice?: number; // EUR
  customerName?: string | null;
  shippingAddress?: string | null;
  trackingCode: string;
  trackingUrl?: string;
};

/**
 * ✅ NEW: generic fulfillment/tracking update (admin "Save" -> email customer)
 * - send when shippingStatus or tracking changes
 * - works even without trackingUrl
 */
export type FulfillmentUpdateEmailData = {
  to: string;
  orderId: string;
  shippingStatus: string; // PROCESSING | SHIPPED | DELIVERED | ...
  trackingCode?: string | null;
  trackingUrl?: string | null;
  customerName?: string | null;
};

/* =========================================================
   Helpers
========================================================= */

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function moneyEur(n: number) {
  const safe = Number.isFinite(n) ? n : 0;
  return safe.toLocaleString("en-GB", { style: "currency", currency: "EUR" });
}

function safeName(name?: string | null) {
  const v = (name || "").trim();
  return v.length ? v : "there";
}

function renderItemsTable(items: EmailLineItem[]) {
  const rows = items
    .map((it) => {
      const name = escapeHtml(it.name);
      const qty = Number.isFinite(it.qty) ? it.qty : 1;
      const price = moneyEur(it.price);
      return `
        <tr>
          <td style="padding:10px 0; border-bottom:1px solid #eee;">
            <div style="font-weight:600;">${name}</div>
            <div style="color:#666; font-size:12px;">Qty: ${qty}</div>
          </td>
          <td style="padding:10px 0; border-bottom:1px solid #eee; text-align:right; white-space:nowrap;">
            ${price}
          </td>
        </tr>
      `;
    })
    .join("");

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${rows}
    </table>
  `;
}

function wrapEmailHtml(title: string, bodyHtml: string) {
  return `
  <div style="background:#f6f7fb; padding:24px;">
    <div style="max-width:640px; margin:0 auto; background:#ffffff; border:1px solid #e9e9ef; border-radius:16px; overflow:hidden;">
      <div style="padding:18px 20px; background:#0b0f19; color:#fff;">
        <div style="font-weight:800; letter-spacing:0.3px;">${escapeHtml(STORE_NAME)}</div>
        <div style="opacity:0.9; font-size:12px; margin-top:4px;">${escapeHtml(title)}</div>
      </div>
      <div style="padding:20px;">
        ${bodyHtml}
        <div style="margin-top:18px; color:#666; font-size:12px;">
          If you didn’t place this order, please ignore this email.
        </div>
      </div>
    </div>
    <div style="max-width:640px; margin:10px auto 0; color:#888; font-size:12px; text-align:center;">
      © ${new Date().getFullYear()} ${escapeHtml(STORE_NAME)}
    </div>
  </div>
  `;
}

function prettyStatus(status: string) {
  const s = (status || "").trim().toUpperCase();
  if (!s) return "Updated";
  if (s === "PROCESSING") return "Processing";
  if (s === "SHIPPED") return "Shipped";
  if (s === "DELIVERED") return "Delivered";
  return status;
}

/* =========================================================
   Public API
========================================================= */

export async function sendOrderConfirmationEmail(data: OrderConfirmationEmailData) {
  const resend = await getResendClient();
  if (!resend) return { ok: false, skipped: true as const };

  const title = "Order confirmed";
  const greeting = `Hi ${escapeHtml(safeName(data.customerName))},`;

  const itemsHtml = renderItemsTable(data.items);

  const shippingLine =
    typeof data.shippingPrice === "number"
      ? `<div style="display:flex; justify-content:space-between; margin-top:8px;">
           <div style="color:#666;">Shipping</div>
           <div style="font-weight:600;">${moneyEur(data.shippingPrice)}</div>
         </div>`
      : "";

  const addressHtml =
    data.shippingAddress && data.shippingAddress.trim().length
      ? `<div style="margin-top:14px; padding:12px; border:1px solid #eee; border-radius:12px;">
           <div style="font-weight:700; margin-bottom:6px;">Shipping address</div>
           <div style="color:#444; line-height:1.5;">${escapeHtml(data.shippingAddress)}</div>
         </div>`
      : "";

  const body = `
    <div style="font-size:14px; color:#111; line-height:1.6;">
      <div style="font-size:16px; font-weight:700;">${greeting}</div>
      <div style="margin-top:8px;">
        Thanks for your purchase! Your order <strong>#${escapeHtml(data.orderId)}</strong> has been confirmed.
      </div>

      <div style="margin-top:16px; font-weight:800;">Items</div>
      <div style="margin-top:6px;">${itemsHtml}</div>

      <div style="margin-top:12px; padding-top:12px; border-top:1px dashed #eee;">
        ${shippingLine}
        <div style="display:flex; justify-content:space-between; margin-top:8px;">
          <div style="font-weight:800;">Total</div>
          <div style="font-weight:900;">${moneyEur(data.total)}</div>
        </div>
      </div>

      ${addressHtml}
    </div>
  `;

  const html = wrapEmailHtml(title, body);

  await resend.emails.send({
    from: EMAIL_FROM,
    to: data.to,
    subject: `${STORE_NAME} — Order confirmed (#${data.orderId})`,
    html,
  });

  return { ok: true as const };
}

export async function sendOrderShippedEmail(data: ShippedEmailData) {
  const resend = await getResendClient();
  if (!resend) return { ok: false, skipped: true as const };

  const title = "Your order has shipped";
  const greeting = `Hi ${escapeHtml(safeName(data.customerName))},`;

  const itemsHtml = renderItemsTable(data.items);

  const trackButton = data.trackingUrl
    ? `
      <div style="margin-top:14px;">
        <a href="${escapeHtml(data.trackingUrl)}"
           style="display:inline-block; background:#2998ff; color:#fff; text-decoration:none; padding:10px 14px; border-radius:12px; font-weight:800;">
          Track your order
        </a>
      </div>
    `
    : "";

  const body = `
    <div style="font-size:14px; color:#111; line-height:1.6;">
      <div style="font-size:16px; font-weight:700;">${greeting}</div>
      <div style="margin-top:8px;">
        Good news — your order <strong>#${escapeHtml(data.orderId)}</strong> has shipped.
      </div>

      <div style="margin-top:14px; padding:12px; border:1px solid #eee; border-radius:12px;">
        <div style="font-weight:800;">Tracking code</div>
        <div style="margin-top:4px; font-family:ui-monospace, SFMono-Regular, Menlo, monospace; font-size:14px;">
          ${escapeHtml(data.trackingCode)}
        </div>
        ${trackButton}
      </div>

      <div style="margin-top:16px; font-weight:800;">Items</div>
      <div style="margin-top:6px;">${itemsHtml}</div>

      <div style="margin-top:12px; padding-top:12px; border-top:1px dashed #eee;">
        <div style="display:flex; justify-content:space-between;">
          <div style="font-weight:800;">Total</div>
          <div style="font-weight:900;">${moneyEur(data.total)}</div>
        </div>
      </div>
    </div>
  `;

  const html = wrapEmailHtml(title, body);

  await resend.emails.send({
    from: EMAIL_FROM,
    to: data.to,
    subject: `${STORE_NAME} — Shipped (#${data.orderId})`,
    html,
  });

  return { ok: true as const };
}

/**
 * ✅ NEW: send a fulfillment/tracking update email (admin panel)
 * Use this after you save "Shipping Status" / "Tracking Code" / "Tracking URL".
 */
export async function sendFulfillmentUpdateEmail(data: FulfillmentUpdateEmailData) {
  const resend = await getResendClient();
  if (!resend) return { ok: false, skipped: true as const };

  const statusLabel = prettyStatus(data.shippingStatus);
  const title = `Order update: ${statusLabel}`;
  const greeting = `Hi ${escapeHtml(safeName(data.customerName))},`;

  const codeBlock = data.trackingCode
    ? `
      <div style="margin-top:12px; padding:12px; border:1px solid #eee; border-radius:12px;">
        <div style="font-weight:800;">Tracking code</div>
        <div style="margin-top:6px; font-family:ui-monospace, SFMono-Regular, Menlo, monospace; font-size:14px;">
          ${escapeHtml(data.trackingCode)}
        </div>
      </div>
    `
    : `
      <div style="margin-top:12px; padding:12px; border:1px solid #eee; border-radius:12px; color:#666;">
        <div style="font-weight:800; color:#111;">Tracking code</div>
        <div style="margin-top:6px;">Not available yet.</div>
      </div>
    `;

  const trackButton = data.trackingUrl
    ? `
      <div style="margin-top:12px;">
        <a href="${escapeHtml(data.trackingUrl)}"
           style="display:inline-block; background:#2998ff; color:#fff; text-decoration:none; padding:10px 14px; border-radius:12px; font-weight:800;">
          Track your order
        </a>
      </div>
    `
    : "";

  const body = `
    <div style="font-size:14px; color:#111; line-height:1.6;">
      <div style="font-size:16px; font-weight:700;">${greeting}</div>

      <div style="margin-top:8px;">
        Your order <strong>#${escapeHtml(data.orderId)}</strong> has been updated.
      </div>

      <div style="margin-top:14px; padding:12px; border:1px solid #eee; border-radius:12px;">
        <div style="font-weight:800;">Current status</div>
        <div style="margin-top:6px; font-weight:900;">${escapeHtml(statusLabel)}</div>
      </div>

      ${codeBlock}
      ${trackButton}

      <div style="margin-top:16px; color:#666; font-size:12px;">
        This email was sent automatically after a fulfillment update in our system.
      </div>
    </div>
  `;

  const html = wrapEmailHtml(title, body);

  await resend.emails.send({
    from: EMAIL_FROM,
    to: data.to,
    subject: `${STORE_NAME} — Order update (#${data.orderId}): ${statusLabel}`,
    html,
  });

  return { ok: true as const };
}
