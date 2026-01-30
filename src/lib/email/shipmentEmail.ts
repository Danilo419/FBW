// src/lib/email/shipmentEmail.ts

type ShipmentEmailParams = {
  brandName: string;
  orderShort: string;
  trackingCode: string;
  track17Url: string;
  shipmentImageUrl: string | null;
  supportEmail: string;
  siteUrl: string;
};

function escapeHtml(s: string) {
  return (s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function shipmentEmailHtml(p: ShipmentEmailParams) {
  const brand = escapeHtml(p.brandName);
  const orderShort = escapeHtml(p.orderShort);
  const tracking = escapeHtml(p.trackingCode);
  const track17 = escapeHtml(p.track17Url);
  const support = escapeHtml(p.supportEmail);
  const siteUrl = escapeHtml(p.siteUrl);

  const imgBlock = p.shipmentImageUrl
    ? `
      <tr>
        <td style="padding:0 24px 24px 24px;">
          <div style="font-size:12px;color:#6b7280;margin-bottom:10px;">Shipment image</div>
          <a href="${escapeHtml(p.shipmentImageUrl)}" target="_blank" style="text-decoration:none;">
            <img src="${escapeHtml(p.shipmentImageUrl)}" alt="Shipment image" style="width:100%;max-width:560px;border-radius:16px;border:1px solid #e5e7eb;display:block;" />
          </a>
        </td>
      </tr>
    `
    : "";

  return `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>Order shipped</title>
    </head>
    <body style="margin:0;background:#f6f7fb;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;">
      <div style="padding:28px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;margin:0 auto;">
          <tr>
            <td style="padding:0 8px;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#0b0b0f;border-radius:22px;overflow:hidden;box-shadow:0 18px 50px rgba(0,0,0,.12);">
                <tr>
                  <td style="padding:26px 24px;color:#fff;">
                    <div style="font-size:13px;opacity:.85;letter-spacing:.18em;text-transform:uppercase;">${brand}</div>
                    <div style="margin-top:8px;font-size:24px;line-height:1.2;font-weight:800;">Your order is on the way</div>
                    <div style="margin-top:10px;font-size:14px;opacity:.9;">
                      Good news — your order <strong>${orderShort}</strong> has just been shipped and should arrive soon.
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="background:#ffffff;padding:22px 24px;">
                    <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.14em;">Tracking</div>
                    <div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
                      <span style="display:inline-block;padding:10px 12px;border:1px solid #e5e7eb;border-radius:14px;background:#f9fafb;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono',monospace;font-size:14px;">
                        ${tracking}
                      </span>

                      <a href="${track17}" target="_blank"
                        style="display:inline-block;padding:10px 14px;border-radius:14px;background:#0b0b0f;color:#fff;text-decoration:none;font-weight:700;font-size:14px;">
                        Track on 17TRACK
                      </a>
                    </div>

                    <div style="margin-top:12px;font-size:13px;color:#374151;line-height:1.55;">
                      You can track the current status by opening <a href="${track17}" target="_blank" style="color:#111827;font-weight:700;">17track.net</a>
                      and pasting your tracking code.
                    </div>
                  </td>
                </tr>

                ${imgBlock}

                <tr>
                  <td style="background:#ffffff;padding:0 24px 24px 24px;">
                    <div style="border-top:1px solid #e5e7eb;padding-top:18px;font-size:12px;color:#6b7280;line-height:1.6;">
                      Need help? Contact us at <a href="mailto:${support}" style="color:#111827;font-weight:700;text-decoration:none;">${support}</a>.
                      <br />
                      <span style="opacity:.85;">${brand} • <a href="${siteUrl}" style="color:#111827;text-decoration:none;">${siteUrl}</a></span>
                    </div>
                  </td>
                </tr>

              </table>
              <div style="max-width:640px;margin:14px auto 0 auto;color:#9ca3af;font-size:11px;text-align:center;">
                If you didn’t place this order, please ignore this email.
              </div>
            </td>
          </tr>
        </table>
      </div>
    </body>
  </html>
  `;
}
