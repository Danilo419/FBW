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

function getBaseUrl(req: Request) {
  const envBase = (process.env.NEXT_PUBLIC_SITE_URL || "").trim().replace(/\/$/, "");
  if (envBase) return envBase;

  // fallback: use request origin (works in dev + production)
  const origin = req.headers.get("origin")?.trim().replace(/\/$/, "");
  return origin || "http://localhost:3000";
}

export async function POST(req: Request) {
  // Always return generic ok to avoid leaking whether the email exists
  const genericOk = NextResponse.json({ ok: true });

  let email = "";
  try {
    const json = await req.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) return genericOk;
    email = parsed.data.email.trim();
  } catch {
    return genericOk;
  }

  const ip = getClientIp(req);
  const emailNormalized = email.toLowerCase();

  // ✅ Rate-limit by IP
  const ipRes = await rlForgotPasswordByIp.limit(ip);
  if (!ipRes.success) return genericOk;

  // ✅ Rate-limit by email
  const emailRes = await rlForgotPasswordByEmail.limit(emailNormalized);
  if (!emailRes.success) return genericOk;

  // ✅ Find user (case-insensitive)
  const user = await prisma.user.findFirst({
    where: {
      email: {
        equals: emailNormalized,
        mode: "insensitive",
      },
    },
    select: { id: true, email: true },
  });

  if (!user?.email) return genericOk;

  // ✅ Invalidate old tokens for this email
  // (Se isto der erro TypeScript, é porque não fizeste `prisma generate`)
  await prisma.passwordResetToken.deleteMany({
    where: { email: user.email },
  });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

  await prisma.passwordResetToken.create({
    data: { email: user.email, token, expiresAt },
  });

  const base = getBaseUrl(req);
  const resetUrl = `${base}/reset-password?token=${token}`;

  try {
    const resp = await resend.emails.send({
      from: EMAIL_FROM,
      to: user.email,
      replyTo: EMAIL_REPLY_TO,
      subject: "Reset your FootballWorld password",
      html: resetPasswordEmailHtml({
        resetUrl,
        ipHint: ip !== "unknown" ? ip : undefined,
      }),
      text: resetPasswordEmailText(resetUrl),
    });

    // log útil para debug (aparece na Vercel logs)
    console.log("[forgot-password] Resend response:", resp);
  } catch (e) {
    console.error("[forgot-password] Resend send failed:", e);
    // não revelar ao utilizador
    return genericOk;
  }

  return genericOk;
}
