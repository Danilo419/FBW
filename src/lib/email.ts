// src/lib/email.ts
import "server-only";

/* =========================================================
   Config
========================================================= */

const RESEND_API_KEY = (process.env.RESEND_API_KEY || "").trim();
const EMAIL_FROM = process.env.EMAIL_FROM || "FootballWorld <onboarding@resend.dev>";
const STORE_NAME = process.env.STORE_NAME || "FootballWorld";

/**
 * Optional (recommended for premium look):
 * - put your logo on a public URL (e.g. https://.../logo.png)
 * - set EMAIL_LOGO_URL in env
 */
const EMAIL_LOGO_URL = (process.env.EMAIL_LOGO_URL || "").trim();
/** Optional: link in header / button (defaults to your domain if you use NEXT_PUBLIC_SITE_URL) */
const EMAIL_SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "").trim();

/* =========================================================
   Resend enablement
========================================================= */

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
  price: number; // EUR (per line / per item, as you already use)
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
  return (s || "")
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

function safeUrl(u?: string | null) {
  const v = (u || "").trim();
  if (!v) return "";
  // Basic allow-list: only http(s). Prevents weird mail client behavior.
  if (!/^https?:\/\//i.test(v)) return "";
  return v;
}

function pill(text: string) {
  return `
    <span style="
      display:inline-block;
      padding:6px 10px;
      border-radius:999px;
      background:rgba(255,255,255,0.10);
      border:1px solid rgba(255,255,255,0.18);
      color:#ffffff;
      font-size:12px;
      font-weight:800;
      letter-spacing:0.2px;
    ">
      ${escapeHtml(text)}
    </span>
  `;
}

function sectionCard(innerHtml: string) {
  return `
    <div style="
      background:#ffffff;
      border:1px solid rgba(15, 23, 42, 0.08);
      border-radius:16px;
      padding:16px;
      box-shadow:0 10px 30px rgba(2, 6, 23, 0.06);
    ">
      ${innerHtml}
    </div>
  `;
}

/**
 * Premium items list:
 * - clean rows
 * - subtle separators
 * - qty chip
 */
function renderItemsPremium(items: EmailLineItem[]) {
  const rows = items
    .map((it) => {
      const name = escapeHtml(it.name);
      const qty = Number.isFinite(it.qty) ? it.qty : 1;
      const price = moneyEur(it.price);

      return `
        <tr>
          <td style="padding:14px 0; border-bottom:1px solid rgba(15,23,42,0.08);">
            <div style="font-weight:800; color:#0b1220; font-size:14px; line-height:1.25;">
              ${name}
            </div>
            <div style="margin-top:6px;">
              <span style="
                display:inline-block;
                padding:4px 8px;
                border-radius:999px;
                background:rgba(15,23,42,0.06);
                color:#334155;
                font-size:12px;
                font-weight:700;
              ">
                Qty ${qty}
              </span>
            </div>
          </td>
          <td style="padding:14px 0; border-bottom:1px solid rgba(15,23,42,0.08); text-align:right; white-space:nowrap;">
            <div style="font-weight:900; color:#0b1220; font-size:14px;">
              ${price}
            </div>
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

/**
 * Premium totals block (table-based for max email client compatibility)
 */
function renderTotalsBlock(opts: { shipping?: number; total: number }) {
  const shippingLine =
    typeof opts.shipping === "number"
      ? `
        <tr>
          <td style="padding:8px 0; color:#475569; font-size:13px; font-weight:700;">
            Shipping
          </td>
          <td style="padding:8px 0; text-align:right; color:#0b1220; font-size:13px; font-weight:800; white-space:nowrap;">
            ${moneyEur(opts.shipping)}
          </td>
        </tr>
      `
      : "";

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${shippingLine}
      <tr>
        <td style="padding:10px 0 0; color:#0b1220; font-size:14px; font-weight:900;">
          Total
        </td>
        <td style="padding:10px 0 0; text-align:right; color:#0b1220; font-size:16px; font-weight:1000; white-space:nowrap;">
          ${moneyEur(opts.total)}
        </td>
      </tr>
    </table>
  `;
}

function renderAddressBlock(address?: string | null) {
  if (!address || !address.trim()) return "";
  return sectionCard(`
    <div style="font-weight:900; color:#0b1220; font-size:13px; letter-spacing:0.2px;">Shipping address</div>
    <div style="margin-top:8px; color:#334155; font-size:13px; line-height:1.6;">
      ${escapeHtml(address)}
    </div>
  `);
}

function primaryButton(label: string, href?: string | null) {
  const url = safeUrl(href);
  if (!url) return "";

  // Use table for button (best email compatibility)
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;">
      <tr>
        <td align="center" bgcolor="#111827" style="border-radius:14px;">
          <a href="${escapeHtml(url)}"
             style="
               display:inline-block;
               padding:12px 16px;
               font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial;
               font-weight:900;
               font-size:13px;
               color:#ffffff;
               text-decoration:none;
               border-radius:14px;
               letter-spacing:0.2px;
             ">
            ${escapeHtml(label)} →
          </a>
        </td>
      </tr>
    </table>
  `;
}

function wrapEmailHtml(opts: {
  title: string;
  eyebrow?: string;
  bodyHtml: string;
  accent?: "emerald" | "blue" | "amber";
}) {
  const accent =
    opts.accent === "emerald"
      ? { glow: "rgba(16,185,129,0.25)", line: "#10b981" }
      : opts.accent === "amber"
      ? { glow: "rgba(245,158,11,0.25)", line: "#f59e0b" }
      : { glow: "rgba(59,130,246,0.22)", line: "#3b82f6" };

  const logo = safeUrl(EMAIL_LOGO_URL)
    ? `
      <img src="${escapeHtml(EMAIL_LOGO_URL)}"
           width="28"
           height="28"
           alt="${escapeHtml(STORE_NAME)}"
           style="display:block; border-radius:8px;"/>
    `
    : `
      <div style="
        width:28px; height:28px;
        border-radius:8px;
        background:rgba(255,255,255,0.14);
        border:1px solid rgba(255,255,255,0.18);
      "></div>
    `;

  const siteUrl = safeUrl(EMAIL_SITE_URL);

  const brandLine = siteUrl
    ? `<a href="${escapeHtml(siteUrl)}" style="color:#ffffff; text-decoration:none;">${escapeHtml(
        STORE_NAME
      )}</a>`
    : escapeHtml(STORE_NAME);

  return `
  <div style="background:#0b1220; padding:28px 12px;">
    <div style="max-width:680px; margin:0 auto;">
      <!-- Top glow -->
      <div style="
        height:6px;
        border-radius:999px;
        background:${accent.line};
        box-shadow:0 12px 40px ${accent.glow};
        margin:0 0 14px;
      "></div>

      <!-- Header -->
      <div style="
        background: radial-gradient(1200px 300px at 20% -20%, rgba(255,255,255,0.18), transparent 60%),
                    radial-gradient(900px 260px at 80% 0%, rgba(255,255,255,0.10), transparent 55%),
                    linear-gradient(180deg, #0f172a 0%, #0b1220 100%);
        border:1px solid rgba(255,255,255,0.10);
        border-radius:22px;
        overflow:hidden;
        box-shadow: 0 30px 80px rgba(0,0,0,0.35);
      ">
        <div style="padding:18px 20px; border-bottom:1px solid rgba(255,255,255,0.10);">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            <tr>
              <td style="vertical-align:middle;">
                <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="vertical-align:middle;">
                      ${logo}
                    </td>
                    <td style="vertical-align:middle; padding-left:10px;">
                      <div style="font-weight:1000; color:#ffffff; font-size:14px; letter-spacing:0.3px;">
                        ${brandLine}
                      </div>
                      <div style="margin-top:4px; color:rgba(255,255,255,0.70); font-size:12px;">
                        ${escapeHtml(opts.eyebrow || "Premium order updates")}
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
              <td style="text-align:right; vertical-align:middle;">
                ${pill(opts.title)}
              </td>
            </tr>
          </table>
        </div>

        <!-- Body -->
        <div style="background:#f8fafc; padding:22px 20px;">
          ${opts.bodyHtml}

          <div style="margin-top:18px; color:#64748b; font-size:12px; line-height:1.5;">
            If you didn’t place this order, you can safely ignore this email.
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div style="max-width:680px; margin:14px auto 0; text-align:center; color:rgba(255,255,255,0.70); font-size:12px;">
        © ${new Date().getFullYear()} ${escapeHtml(STORE_NAME)} · All rights reserved
      </div>
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

  const greeting = `Hi ${escapeHtml(safeName(data.customerName))},`;

  const itemsHtml = renderItemsPremium(data.items);

  const summaryCard = sectionCard(`
    <div style="display:block;">
      <div style="font-size:12px; font-weight:900; letter-spacing:0.3px; color:#475569; text-transform:uppercase;">
        Order confirmed
      </div>

      <div style="margin-top:10px; font-size:18px; font-weight:1000; color:#0b1220; line-height:1.25;">
        Thanks for your purchase
      </div>

      <div style="margin-top:8px; font-size:13px; color:#334155; line-height:1.6;">
        Your order <strong style="color:#0b1220;">#${escapeHtml(data.orderId)}</strong> is confirmed.
        We’ll email you when it ships.
      </div>

      <div style="margin-top:14px; padding:12px; border-radius:14px; background:rgba(15,23,42,0.04); border:1px solid rgba(15,23,42,0.06);">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          <tr>
            <td style="color:#0b1220; font-weight:900; font-size:13px;">Customer</td>
            <td style="text-align:right; color:#334155; font-weight:800; font-size:13px;">
              ${greeting.replace(/^Hi\s*/i, "").replace(/,$/, "")}
            </td>
          </tr>
          <tr>
            <td style="padding-top:10px; color:#0b1220; font-weight:900; font-size:13px;">Email</td>
            <td style="padding-top:10px; text-align:right; color:#334155; font-weight:800; font-size:13px; white-space:nowrap;">
              ${escapeHtml(data.to)}
            </td>
          </tr>
        </table>
      </div>

      ${primaryButton("Visit store", EMAIL_SITE_URL)}
    </div>
  `);

  const itemsCard = sectionCard(`
    <div style="font-weight:1000; color:#0b1220; font-size:13px; letter-spacing:0.2px;">
      Items
    </div>
    <div style="margin-top:10px;">
      ${itemsHtml}
    </div>

    <div style="margin-top:14px; padding-top:14px; border-top:1px dashed rgba(15,23,42,0.16);">
      ${renderTotalsBlock({ shipping: data.shippingPrice, total: data.total })}
    </div>
  `);

  const addressCard = renderAddressBlock(data.shippingAddress);

  const body = `
    <div style="font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial; color:#0b1220;">
      <div style="font-size:14px; color:#334155; line-height:1.7;">
        ${summaryCard}
      </div>

      <div style="margin-top:14px;">
        ${itemsCard}
      </div>

      ${addressCard ? `<div style="margin-top:14px;">${addressCard}</div>` : ""}
    </div>
  `;

  const html = wrapEmailHtml({
    title: "Order confirmed",
    eyebrow: "A premium confirmation from your store",
    bodyHtml: body,
    accent: "emerald",
  });

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

  const greeting = `Hi ${escapeHtml(safeName(data.customerName))},`;
  const itemsHtml = renderItemsPremium(data.items);

  const trackUrl = safeUrl(data.trackingUrl);

  const hero = sectionCard(`
    <div style="font-size:12px; font-weight:900; letter-spacing:0.3px; color:#475569; text-transform:uppercase;">
      Shipped
    </div>
    <div style="margin-top:10px; font-size:18px; font-weight:1000; color:#0b1220; line-height:1.25;">
      Your order is on the way
    </div>
    <div style="margin-top:8px; font-size:13px; color:#334155; line-height:1.6;">
      ${greeting} Your order <strong style="color:#0b1220;">#${escapeHtml(data.orderId)}</strong> has shipped.
    </div>

    <div style="margin-top:14px; padding:12px; border-radius:14px; background:rgba(15,23,42,0.04); border:1px solid rgba(15,23,42,0.06);">
      <div style="font-weight:900; color:#0b1220; font-size:13px;">Tracking code</div>
      <div style="margin-top:8px; font-family:ui-monospace, SFMono-Regular, Menlo, monospace; font-size:14px; font-weight:900; color:#0b1220;">
        ${escapeHtml(data.trackingCode)}
      </div>
      ${trackUrl ? primaryButton("Track your order", trackUrl) : ""}
    </div>
  `);

  const itemsCard = sectionCard(`
    <div style="font-weight:1000; color:#0b1220; font-size:13px; letter-spacing:0.2px;">
      Items
    </div>
    <div style="margin-top:10px;">
      ${itemsHtml}
    </div>

    <div style="margin-top:14px; padding-top:14px; border-top:1px dashed rgba(15,23,42,0.16);">
      ${renderTotalsBlock({ total: data.total })}
    </div>
  `);

  const body = `
    <div style="font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial; color:#0b1220;">
      ${hero}
      <div style="margin-top:14px;">${itemsCard}</div>
    </div>
  `;

  const html = wrapEmailHtml({
    title: "Shipped",
    eyebrow: "We’ve packed your order with care",
    bodyHtml: body,
    accent: "blue",
  });

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
  const greeting = `Hi ${escapeHtml(safeName(data.customerName))},`;

  const trackUrl = safeUrl(data.trackingUrl);

  const hero = sectionCard(`
    <div style="font-size:12px; font-weight:900; letter-spacing:0.3px; color:#475569; text-transform:uppercase;">
      Order update
    </div>

    <div style="margin-top:10px; font-size:18px; font-weight:1000; color:#0b1220; line-height:1.25;">
      ${escapeHtml(statusLabel)}
    </div>

    <div style="margin-top:8px; font-size:13px; color:#334155; line-height:1.6;">
      ${greeting} Your order <strong style="color:#0b1220;">#${escapeHtml(data.orderId)}</strong> has been updated.
    </div>

    <div style="margin-top:14px; padding:12px; border-radius:14px; background:rgba(15,23,42,0.04); border:1px solid rgba(15,23,42,0.06);">
      <div style="font-weight:900; color:#0b1220; font-size:13px;">Current status</div>
      <div style="margin-top:8px; font-weight:1000; color:#0b1220; font-size:14px;">
        ${escapeHtml(statusLabel)}
      </div>
    </div>

    ${
      data.trackingCode
        ? `
      <div style="margin-top:12px; padding:12px; border-radius:14px; background:rgba(15,23,42,0.04); border:1px solid rgba(15,23,42,0.06);">
        <div style="font-weight:900; color:#0b1220; font-size:13px;">Tracking code</div>
        <div style="margin-top:8px; font-family:ui-monospace, SFMono-Regular, Menlo, monospace; font-size:14px; font-weight:900; color:#0b1220;">
          ${escapeHtml(data.trackingCode)}
        </div>
        ${trackUrl ? primaryButton("Track your order", trackUrl) : ""}
      </div>
    `
        : `
      <div style="margin-top:12px; padding:12px; border-radius:14px; background:rgba(15,23,42,0.04); border:1px solid rgba(15,23,42,0.06); color:#475569;">
        <div style="font-weight:900; color:#0b1220; font-size:13px;">Tracking</div>
        <div style="margin-top:8px; font-size:13px;">Not available yet.</div>
      </div>
    `
    }

    <div style="margin-top:14px; color:#64748b; font-size:12px; line-height:1.5;">
      This email was sent automatically after a fulfillment update in our system.
    </div>
  `);

  const body = `
    <div style="font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial; color:#0b1220;">
      ${hero}
    </div>
  `;

  const html = wrapEmailHtml({
    title: `Update: ${statusLabel}`,
    eyebrow: "A premium status update",
    bodyHtml: body,
    accent: "amber",
  });

  await resend.emails.send({
    from: EMAIL_FROM,
    to: data.to,
    subject: `${STORE_NAME} — Order update (#${data.orderId}): ${statusLabel}`,
    html,
  });

  return { ok: true as const };
}
