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

  /**
   * ✅ Same logo approach as Reset Password email:
   * - c_fit keeps aspect ratio
   * - ONLY width is set (no forced height)
   */
  const LOGO_URL =
    "https://res.cloudinary.com/dqw7ccro3/image/upload/w_140,c_fit,f_auto,q_auto/logo_r0vd15.png";

  const imgBlock = p.shipmentImageUrl
    ? `
      <tr>
        <td style="padding:0 24px 24px 24px;">
          <div style="font-size:12px;color:#6b7280;margin-bottom:10px;">Shipment image</div>
          <a href="${escapeHtml(p.shipmentImageUrl)}" target="_blank" style="text-decoration:none;">
            <img
              src="${escapeHtml(p.shipmentImageUrl)}"
              alt="Shipment image"
              style="width:100%;max-width:560px;border-radius:16px;border:1px solid #e5e7eb;display:block;height:auto;"
            />
          </a>
        </td>
      </tr>
    `
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>Order shipped</title>
</head>

<body style="margin:0;padding:0;background-color:#f6f7fb;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">
    Your order has been shipped. Track it with your tracking code.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7fb;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:760px;">

          <!-- HEADER (LOGO + BRAND) -->
          <tr>
            <td style="padding:10px 0 18px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>

                  <!-- LOGO -->
                  <td
                    width="180"
                    valign="middle"
                    style="width:180px;min-width:180px;padding-right:16px;"
                  >
                    <img
                      src="${LOGO_URL}"
                      alt="${brand}"
                      width="140"
                      style="display:block;max-width:100%;height:auto;"
                    />
                  </td>

                  <!-- BRAND TEXT -->
                  <td valign="middle">
                    <div
                      style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
                             font-weight:900;font-size:22px;color:#0b0b0f;line-height:1.1;">
                      ${brand}
                    </div>
                    <div
                      style="margin-top:4px;
                             font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
                             font-size:13px;color:rgba(0,0,0,.55);">
                      Shipping Update
                    </div>
                  </td>

                  <!-- RIGHT (LINK) -->
                  <td
                    align="right"
                    valign="middle"
                    style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
                           font-size:13px;color:rgba(0,0,0,.55);white-space:nowrap;"
                  >
                    <a href="${siteUrl}" style="color:#0b0b0f;text-decoration:none;font-weight:800;">
                      View store
                    </a>
                  </td>

                </tr>
              </table>
            </td>
          </tr>

          <!-- CARD -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                style="background:#0b0b0f;border-radius:22px;overflow:hidden;
                       box-shadow:0 18px 50px rgba(0,0,0,.12);">

                <!-- TOP DARK HERO -->
                <tr>
                  <td style="padding:26px 24px;color:#fff;">
                    <div style="font-size:24px;line-height:1.2;font-weight:900;
                                font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
                      Your order is on the way 🚚
                    </div>
                    <div style="margin-top:10px;font-size:14px;line-height:1.7;opacity:.90;
                                font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
                      Hi, your order <strong>${orderShort}</strong> has been shipped and should arrive soon.
                    </div>
                  </td>
                </tr>

                <!-- WHITE CONTENT -->
                <tr>
                  <td style="background:#ffffff;padding:22px 24px;">
                    <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.14em;
                                font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
                      Tracking code
                    </div>

                    <div style="margin-top:10px;font-size:18px;font-weight:900;color:#0b0b0f;
                                font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono',monospace;">
                      ${tracking}
                    </div>

                    <div style="margin-top:14px;">
                      <a href="${track17}" target="_blank"
                        style="display:inline-block;padding:12px 18px;border-radius:999px;
                               background:#0b0b0f;color:#fff;text-decoration:none;
                               font-weight:900;font-size:14px;
                               font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
                        Track on 17TRACK
                      </a>
                    </div>

                    <div style="margin-top:14px;font-size:13px;color:#374151;line-height:1.65;
                                font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
                      Go to <a href="${track17}" target="_blank" style="color:#0b0b0f;font-weight:900;text-decoration:underline;">17track.net</a>
                      and paste your tracking code to see the delivery status.
                    </div>
                  </td>
                </tr>

                ${imgBlock}

                <!-- FOOTER -->
                <tr>
                  <td style="background:#ffffff;padding:0 24px 24px 24px;">
                    <div style="border-top:1px solid #e5e7eb;padding-top:18px;font-size:12px;color:#6b7280;line-height:1.6;
                                font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
                      Need help? Contact us at
                      <a href="mailto:${support}" style="color:#0b0b0f;font-weight:900;text-decoration:none;">${support}</a>.
                      <br />
                      <span style="opacity:.85;">${brand} • <a href="${siteUrl}" style="color:#0b0b0f;text-decoration:none;">${siteUrl}</a></span>
                    </div>
                  </td>
                </tr>

              </table>

              <div style="max-width:760px;margin:14px auto 0 auto;color:#9ca3af;font-size:11px;text-align:center;
                          font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
                If you didn’t place this order, please ignore this email.
              </div>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
