// src/app/api/auth/forgot-password/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { resend, EMAIL_FROM, EMAIL_REPLY_TO } from "@/lib/resend";
import {
  resetPasswordEmailHtml,
  resetPasswordEmailText,
} from "@/lib/emails/resetPasswordEmail";
import { rlForgotPasswordByIp, rlForgotPasswordByEmail } from "@/lib/rateLimit";

const BodySchema = z.object({
  email: z.string().email(),
});

function getClientIp(req: Request) {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

export async function POST(req: Request) {
  // Always return generic ok to avoid leaking whether the email exists
  const genericOk = NextResponse.json({ ok: true });

  let email = "";
  try {
    const json = await req.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) return genericOk;
    email = parsed.data.email.toLowerCase().trim();
  } catch {
    return genericOk;
  }

  const ip = getClientIp(req);

  // ✅ Rate-limit by IP
  const ipKey = ip === "unknown" ? "unknown" : ip;
  const ipRes = await rlForgotPasswordByIp.limit(ipKey);
  if (!ipRes.success) {
    return NextResponse.json(
      { ok: true },
      {
        status: 200,
        headers: { "X-RateLimit-Remaining": String(ipRes.remaining) },
      }
    );
  }

  // ✅ Rate-limit by email
  const emailRes = await rlForgotPasswordByEmail.limit(email);
  if (!emailRes.success) {
    return NextResponse.json(
      { ok: true },
      {
        status: 200,
        headers: { "X-RateLimit-Remaining": String(emailRes.remaining) },
      }
    );
  }

  // Check user exists
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return genericOk;

  /**
   * ✅ IMPORTANT:
   * If your Prisma Client hasn't been regenerated yet,
   * TypeScript won't know prisma.passwordResetToken exists.
   * This cast makes it compile immediately.
   *
   * After you run `npx prisma generate`, you can remove this `as any`
   * and go back to `prisma.passwordResetToken`.
   */
  const passwordResetToken = (prisma as any).passwordResetToken as
    | {
        deleteMany: (args: any) => Promise<any>;
        create: (args: any) => Promise<any>;
      }
    | undefined;

  // If the model doesn't exist in the generated client (or schema), fail silently (still generic ok)
  if (!passwordResetToken) return genericOk;

  // Invalidate old tokens for this email (recommended)
  await passwordResetToken.deleteMany({ where: { email } });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

  await passwordResetToken.create({
    data: { email, token, expiresAt },
  });

  const base = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const resetUrl = `${base}/reset-password?token=${token}`;

  // ✅ Send email via Resend
  await resend.emails.send({
    from: EMAIL_FROM,
    to: email,
    replyTo: EMAIL_REPLY_TO,
    subject: "Reset your FootballWorld password",
    html: resetPasswordEmailHtml({
      resetUrl,
      ipHint: ip !== "unknown" ? ip : undefined,
    }),
    text: resetPasswordEmailText(resetUrl),
  });

  return genericOk;
}
