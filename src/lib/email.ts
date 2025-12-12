// src/lib/email.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

const FROM =
  process.env.EMAIL_FROM ||
  "FootballWorld <no-reply@footballworld.com>";

/* ============================================================
   TYPES
============================================================ */

type OrderItemEmail = {
  name: string;
  qty: number;
  price: number; // EUR
};

type OrderEmailBase = {
  to: string;
  orderId: string;
  items: OrderItemEmail[];
  total: number; // EUR
  shippingPrice: number; // EUR
  customerName?: string | null;
  shippingAddress?: string | null;
};

/* ============================================================
   ORDER CONFIRMATION EMAIL
============================================================ */

export async function sendOrderConfirmationEmail(
  data: OrderEmailBase
) {
  const {
    to,
    orderId,
    items,
    total,
    shippingPrice,
    customerName,
    shippingAddress,
  } = data;

  const itemsHtml = items
    .map(
      (item) => `
        <tr>
          <td style="padding:6px 8px;">${item.name}</td>
          <td style="padding:6px 8px; text-align:center;">${item.qty}</td>
          <td style="padding:6px 8px; text-align:right;">€${item.price.toFixed(
            2
          )}</td>
        </tr>
      `
    )
    .join("");

  const html = `
    <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;color:#111;">
      <h1 style="font-size:20px;">Thank you for your purchase 🎉</h1>

      <p>Hello${customerName ? " " + customerName : ""},</p>

      <p>Your order has been successfully placed and is now being processed.</p>

      <p><strong>Order number:</strong> ${orderId}</p>

      <h2 style="font-size:16px;margin-top:16px;">Order summary</h2>

      <table style="border-collapse:collapse;width:100%;max-width:480px;">
        <thead>
          <tr>
            <th style="text-align:left;padding:6px 8px;">Product</th>
            <th style="text-align:center;padding:6px 8px;">Qty</th>
            <th style="text-align:right;padding:6px 8px;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <p style="margin-top:12px;">
        <strong>Shipping:</strong> €${shippingPrice.toFixed(2)}<br/>
        <strong>Total paid:</strong> €${total.toFixed(2)}
      </p>

      ${
        shippingAddress
          ? `<p><strong>Shipping address:</strong><br/>${shippingAddress.replace(
              /\n/g,
              "<br/>"
            )}</p>`
          : ""
      }

      <p style="margin-top:16px;">
        You will receive another email once your order has been shipped.
      </p>

      <p style="margin-top:24px;font-size:12px;color:#555;">
        FootballWorld<br/>
        If you have any questions, just reply to this email.
      </p>
    </div>
  `;

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Your order #${orderId} has been confirmed ✅`,
    html,
  });
}

/* ============================================================
   ORDER SHIPPED EMAIL (TRACKING)
============================================================ */

type ShippedEmailData = OrderEmailBase & {
  trackingCode: string;
  trackingUrl?: string | null;
};

export async function sendOrderShippedEmail(
  data: ShippedEmailData
) {
  const {
    to,
    orderId,
    items,
    total,
    shippingPrice,
    customerName,
    shippingAddress,
    trackingCode,
    trackingUrl,
  } = data;

  const itemsHtml = items
    .map(
      (item) => `
        <tr>
          <td style="padding:6px 8px;">${item.name}</td>
          <td style="padding:6px 8px; text-align:center;">${item.qty}</td>
        </tr>
      `
    )
    .join("");

  const html = `
    <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;color:#111;">
      <h1 style="font-size:20px;">Your order has been shipped 🚚</h1>

      <p>Hello${customerName ? " " + customerName : ""},</p>

      <p>Your order <strong>#${orderId}</strong> is on its way.</p>

      <h2 style="font-size:16px;margin-top:16px;">Tracking information</h2>

      <p>
        <strong>Tracking code:</strong> ${trackingCode}<br/>
        ${
          trackingUrl
            ? `Track your order here: <a href="${trackingUrl}" target="_blank">${trackingUrl}</a>`
            : ""
        }
      </p>

      <h2 style="font-size:16px;margin-top:16px;">Order summary</h2>

      <table style="border-collapse:collapse;width:100%;max-width:480px;">
        <thead>
          <tr>
            <th style="text-align:left;padding:6px 8px;">Product</th>
            <th style="text-align:center;padding:6px 8px;">Qty</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <p style="margin-top:12px;">
        <strong>Shipping:</strong> €${shippingPrice.toFixed(2)}<br/>
        <strong>Total paid:</strong> €${total.toFixed(2)}
      </p>

      ${
        shippingAddress
          ? `<p><strong>Shipping address:</strong><br/>${shippingAddress.replace(
              /\n/g,
              "<br/>"
            )}</p>`
          : ""
      }

      <p style="margin-top:24px;font-size:12px;color:#555;">
        FootballWorld<br/>
        If you have any questions, just reply to this email.
      </p>
    </div>
  `;

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Your order #${orderId} has been shipped 🚚`,
    html,
  });
}
