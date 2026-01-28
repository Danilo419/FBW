// src/app/api/auth/forgot-password/route.ts
export const runtime = "nodejs";

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
  const envBase = (process.env.NEXT_PUBLIC_SITE_URL || "")
    .trim()
    .replace(/\/$/, "");
  if (envBase) return envBase;

  const origin = req.headers.get("origin")?.trim().replace(/\/$/, "");
  return origin || "http://localhost:3000";
}

export async function POST(req: Request) {
  // ✅ Sempre 200 para evitar leak de user existence
  const genericOk = NextResponse.json({ ok: true });

  try {
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

    // Rate-limit
    const ipRes = await rlForgotPasswordByIp.limit(ip);
    if (!ipRes.success) return genericOk;

    const emailRes = await rlForgotPasswordByEmail.limit(emailNormalized);
    if (!emailRes.success) return genericOk;

    // User
    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: emailNormalized,
          mode: "insensitive",
        },
      },
      select: { email: true },
    });

    if (!user?.email) return genericOk;

    // Tokens
    await prisma.passwordResetToken.deleteMany({
      where: { email: user.email },
    });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

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

      console.log("[forgot-password] Resend response:", resp);
    } catch (e) {
      console.error("[forgot-password] Resend send failed:", e);
      return genericOk;
    }

    return genericOk;
  } catch (e) {
    console.error("[forgot-password] Handler crashed:", e);
    // ✅ nunca devolver 500 ao cliente
    return genericOk;
  }
}
