// src/lib/emails/resetPasswordEmail.ts
type ResetPasswordEmailParams = {
  resetUrl: string;
  ipHint?: string;
};

export function resetPasswordEmailHtml({ resetUrl, ipHint }: ResetPasswordEmailParams) {
  const year = new Date().getFullYear();

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Reset your password</title>
</head>
<body style="margin:0;padding:0;background:#f6f8fb;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0b0f19;">
  <div style="max-width:640px;margin:0 auto;padding:28px 16px;">
    <div style="background:#0b0f19;border-radius:18px;padding:22px 20px;box-shadow:0 12px 32px rgba(11,15,25,.18);">
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#2998ff,#7fcc45);"></div>
        <div>
          <div style="font-weight:900;font-size:18px;letter-spacing:.3px;color:#fff;">FootballWorld</div>
          <div style="font-size:12px;color:rgba(255,255,255,.72);">Account Security</div>
        </div>
      </div>

      <div style="height:1px;background:rgba(255,255,255,.10);margin:18px 0;"></div>

      <h1 style="margin:0 0 10px;font-size:22px;line-height:1.2;color:#fff;">Reset your password</h1>
      <p style="margin:0 0 16px;color:rgba(255,255,255,.78);font-size:14px;line-height:1.6;">
        We received a request to reset your FootballWorld password.
        Click the button below to set a new password. This link expires in <b>1 hour</b>.
      </p>

      <div style="margin:18px 0 12px;">
        <a href="${resetUrl}"
           style="display:inline-block;background:linear-gradient(135deg,#2998ff,#7fcc45);
                  color:#0b0f19;text-decoration:none;font-weight:900;
                  padding:12px 16px;border-radius:14px;font-size:14px;">
          Reset password
        </a>
      </div>

      <p style="margin:0 0 14px;color:rgba(255,255,255,.65);font-size:12px;line-height:1.6;">
        If the button doesn’t work, copy and paste this link:
        <br />
        <span style="color:rgba(255,255,255,.9);word-break:break-all;">${resetUrl}</span>
      </p>

      <div style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);
                  border-radius:14px;padding:12px;margin-top:12px;">
        <p style="margin:0;color:rgba(255,255,255,.75);font-size:12px;line-height:1.6;">
          If you didn’t request this, you can ignore this email and your password will remain unchanged.
          ${ipHint ? `<br/>Request IP: <b style="color:#fff;">${ipHint}</b>` : ""}
        </p>
      </div>

      <p style="margin:16px 0 0;color:rgba(255,255,255,.45);font-size:12px;">
        © ${year} FootballWorld. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>`;
}

export function resetPasswordEmailText(resetUrl: string) {
  return `FootballWorld — Reset your password

We received a request to reset your password.
Open this link to set a new password (expires in 1 hour):

${resetUrl}

If you didn't request this, ignore this email.`;
}
