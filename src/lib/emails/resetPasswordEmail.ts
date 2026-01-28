// src/lib/emails/resetPasswordEmail.ts
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

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>Reset your password</title>
</head>

<body style="margin:0;padding:0;background-color:#0a0d14;">
  <!-- Preheader (hidden) -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">
    Reset your FootballWorld password. Link expires in 1 hour.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0d14;margin:0;padding:0;">
    <tr>
      <td align="center" style="padding:28px 16px;">
        <!-- Outer container -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:680px;">
          <tr>
            <td style="padding:0 0 14px 0;">
              <!-- Top brand row -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left" style="vertical-align:middle;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align:middle;">
                          <div
                            style="width:42px;height:42px;border-radius:14px;background:linear-gradient(135deg,#2b9bff,#7fcb49);display:inline-block;">
                          </div>
                        </td>
                        <td style="vertical-align:middle;padding-left:12px;">
                          <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-weight:900;font-size:18px;letter-spacing:.2px;color:#ffffff;">
                            FootballWorld
                          </div>
                          <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:12px;color:rgba(255,255,255,.70);">
                            Account Security
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:12px;color:rgba(255,255,255,.75);">
                      ${year}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0;">
              <!-- Card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                style="background:#0b0f19;border-radius:22px;overflow:hidden;border:1px solid rgba(255,255,255,.10);">
                <tr>
                  <td style="padding:22px 22px 16px 22px;">
                    <!-- Accent bar -->
                    <div style="height:4px;border-radius:999px;background:linear-gradient(90deg,#2b9bff,#7fcb49);"></div>

                    <div style="height:14px;"></div>

                    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-weight:950;font-size:24px;line-height:1.15;color:#ffffff;">
                      Reset your password
                    </div>

                    <div style="height:10px;"></div>

                    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:14px;line-height:1.75;color:rgba(255,255,255,.80);">
                      We received a request to reset your FootballWorld password. Click the button below to set a new password.
                      <span style="color:#ffffff;font-weight:800;">This link expires in 1 hour.</span>
                    </div>

                    <div style="height:18px;"></div>

                    <!-- Button row -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="left">
                          <a href="${safeUrl}"
                            style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;display:inline-block;
                                   background:linear-gradient(135deg,#2b9bff,#7fcb49);
                                   color:#071018;text-decoration:none;font-weight:950;font-size:14px;
                                   padding:12px 18px;border-radius:14px;border:1px solid rgba(255,255,255,.14);
                                   box-shadow:0 10px 24px rgba(43,155,255,.22);">
                            Reset password
                          </a>
                        </td>
                      </tr>
                    </table>

                    <div style="height:14px;"></div>

                    <!-- Fallback link -->
                    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:12px;line-height:1.6;color:rgba(255,255,255,.68);">
                      If the button doesn’t work, copy and paste this link:
                    </div>

                    <div style="height:10px;"></div>

                    <div
                      style="background:rgba(255,255,255,.05);
                             border:1px solid rgba(255,255,255,.10);
                             border-radius:14px;
                             padding:12px;">
                      <div
                        style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;
                               font-size:12px;line-height:1.65;color:rgba(255,255,255,.92);
                               word-break:break-all;">
                        ${safeUrl}
                      </div>
                    </div>

                    <div style="height:16px;"></div>

                    <!-- Security note -->
                    <div
                      style="background:rgba(255,255,255,.04);
                             border:1px solid rgba(255,255,255,.10);
                             border-radius:16px;
                             padding:14px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="vertical-align:top;width:24px;">
                            <div style="width:18px;height:18px;border-radius:6px;background:rgba(255,255,255,.10);display:inline-block;"></div>
                          </td>
                          <td style="padding-left:10px;">
                            <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:12px;line-height:1.6;color:rgba(255,255,255,.78);">
                              If you didn’t request this, you can ignore this email and your password will remain unchanged.
                            </div>
                            ${
                              safeIp
                                ? `<div style="margin-top:10px;">
                                     <span style="display:inline-block;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;
                                                  font-size:12px;color:rgba(255,255,255,.92);
                                                  background:rgba(255,255,255,.06);
                                                  border:1px solid rgba(255,255,255,.10);
                                                  padding:6px 10px;border-radius:999px;">
                                       Request IP: <span style="color:#ffffff;font-weight:800;">${safeIp}</span>
                                     </span>
                                   </div>`
                                : ""
                            }
                          </td>
                        </tr>
                      </table>
                    </div>

                    <div style="height:18px;"></div>

                    <!-- Footer -->
                    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:12px;line-height:1.6;color:rgba(255,255,255,.50);">
                      Need help? Reply to this email.
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding:14px 22px;background:rgba(255,255,255,.03);border-top:1px solid rgba(255,255,255,.08);">
                    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:12px;color:rgba(255,255,255,.55);">
                      © ${year} FootballWorld. All rights reserved.
                    </div>
                  </td>
                </tr>
              </table>
              <!-- /Card -->
            </td>
          </tr>

          <tr>
            <td style="padding:14px 6px 0 6px;text-align:center;">
              <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:11px;line-height:1.6;color:rgba(255,255,255,.45);">
                You received this email because someone requested a password reset for your FootballWorld account.
              </div>
            </td>
          </tr>

        </table>
        <!-- /Outer container -->
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
