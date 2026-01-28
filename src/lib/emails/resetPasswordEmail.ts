type ResetPasswordEmailParams = {
  resetUrl: string;
  ipHint?: string;
};

function escapeHtml(s: string) {
  return (s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function resetPasswordEmailHtml({ resetUrl, ipHint }: ResetPasswordEmailParams) {
  const year = new Date().getFullYear();
  const safeUrl = escapeHtml(resetUrl);
  const safeIp = ipHint ? escapeHtml(ipHint) : "";

  /**
   * ✅ IMPORTANT:
   * - c_fit → keeps original aspect ratio
   * - ONLY width is set (no height!)
   */
  const LOGO_URL =
    "https://res.cloudinary.com/dqw7ccro3/image/upload/w_140,c_fit,f_auto,q_auto/logo_r0vd15.png";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>Reset your password</title>
</head>

<body style="margin:0;padding:0;background-color:#0a0d14;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">
    Reset your FootballWorld password. Link expires in 1 hour.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0d14;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:760px;">

          <!-- HEADER -->
          <tr>
            <td style="padding:18px 0 22px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>

                  <!-- LOGO COLUMN (WIDE + NO DISTORTION) -->
                  <td
                    width="180"
                    valign="middle"
                    style="width:180px;min-width:180px;padding-right:16px;"
                  >
                    <img
                      src="${LOGO_URL}"
                      alt="FootballWorld"
                      width="140"
                      style="display:block;max-width:100%;height:auto;"
                    />
                  </td>

                  <!-- BRAND TEXT -->
                  <td valign="middle">
                    <div
                      style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
                             font-weight:900;font-size:22px;color:#ffffff;line-height:1.1;">
                      FootballWorld
                    </div>
                    <div
                      style="margin-top:4px;
                             font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
                             font-size:13px;color:rgba(255,255,255,.70);">
                      Account Security
                    </div>
                  </td>

                  <!-- YEAR -->
                  <td
                    align="right"
                    valign="middle"
                    style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
                           font-size:13px;color:rgba(255,255,255,.65);white-space:nowrap;"
                  >
                    ${year}
                  </td>

                </tr>
              </table>
            </td>
          </tr>

          <!-- CARD -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                style="background:#0b0f19;border-radius:22px;
                       border:1px solid rgba(255,255,255,.10);overflow:hidden;">

                <tr>
                  <td style="padding:26px;">
                    <div style="height:4px;border-radius:999px;
                                background:linear-gradient(90deg,#2b9bff,#7fcb49);"></div>

                    <h1 style="margin:18px 0 10px;
                               font-size:24px;line-height:1.25;color:#fff;
                               font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
                      Reset your password
                    </h1>

                    <p style="margin:0 0 18px;
                              font-size:14px;line-height:1.7;
                              color:rgba(255,255,255,.80);
                              font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
                      We received a request to reset your FootballWorld password.
                      Click the button below to set a new password.
                      <strong style="color:#fff;">This link expires in 1 hour.</strong>
                    </p>

                    <a href="${safeUrl}"
                      style="display:inline-block;
                             background:linear-gradient(135deg,#2b9bff,#7fcb49);
                             color:#071018;text-decoration:none;
                             font-weight:900;font-size:14px;
                             padding:12px 18px;border-radius:14px;
                             box-shadow:0 10px 24px rgba(43,155,255,.25);
                             font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
                      Reset password
                    </a>

                    <p style="margin:18px 0 8px;
                              font-size:12px;color:rgba(255,255,255,.65);
                              font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
                      If the button doesn’t work, copy and paste this link:
                    </p>

                    <div style="background:rgba(255,255,255,.05);
                                border:1px solid rgba(255,255,255,.10);
                                border-radius:14px;padding:12px;
                                font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;
                                font-size:12px;color:#fff;word-break:break-all;">
                      ${safeUrl}
                    </div>

                    <div style="margin-top:16px;
                                background:rgba(255,255,255,.04);
                                border:1px solid rgba(255,255,255,.10);
                                border-radius:16px;padding:14px;
                                font-size:12px;line-height:1.6;
                                color:rgba(255,255,255,.75);
                                font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
                      If you didn’t request this, you can ignore this email and your password will remain unchanged.
                      ${safeIp ? `<br/><br/>Request IP: <strong style="color:#fff;">${safeIp}</strong>` : ""}
                    </div>

                    <p style="margin-top:18px;
                              font-size:12px;color:rgba(255,255,255,.50);
                              font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
                      Need help? Reply to this email.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:14px 26px;
                             border-top:1px solid rgba(255,255,255,.08);
                             background:rgba(255,255,255,.03);
                             font-size:12px;color:rgba(255,255,255,.55);
                             font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
                    © ${year} FootballWorld. All rights reserved.
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <tr>
            <td style="padding-top:16px;text-align:center;
                       font-size:11px;color:rgba(255,255,255,.45);
                       font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
              You received this email because someone requested a password reset for your FootballWorld account.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function resetPasswordEmailText(resetUrl: string) {
  return `FootballWorld — Reset your password

We received a request to reset your FootballWorld password.
Open this link to set a new password (expires in 1 hour):

${resetUrl}

If you didn’t request this, ignore this email and your password will remain unchanged.`;
}
