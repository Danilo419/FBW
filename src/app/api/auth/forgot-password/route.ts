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
  // ✅ Always return generic ok to avoid leaking whether the email exists
  const genericOk = NextResponse.json({ ok: true });

  try {
    // -------- parse body --------
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

    // -------- find user (case-insensitive) --------
    let user: { id: string; email: string | null } | null = null;
    try {
      user = await prisma.user.findFirst({
        where: {
          email: {
            equals: emailNormalized,
            mode: "insensitive",
          },
        },
        select: { id: true, email: true },
      });
    } catch (e) {
      console.error("[forgot-password] prisma user lookup failed:", e);
      return genericOk; // don't leak
    }

    if (!user?.email) return genericOk;

    // -------- create token --------
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    try {
      await prisma.passwordResetToken.deleteMany({
        where: { email: user.email },
      });

      await prisma.passwordResetToken.create({
        data: { email: user.email, token, expiresAt },
      });
    } catch (e) {
      console.error("[forgot-password] prisma token write failed:", e);
      return genericOk; // don't leak
    }

    // -------- send email --------
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

      // Keep a minimal log that doesn't leak user existence/content
      if (resp?.error) {
        console.error("[forgot-password] Resend error:", resp.error);
      }
    } catch (e) {
      console.error("[forgot-password] Resend send failed:", e);
      return genericOk; // don't leak
    }

    return genericOk;
  } catch (e) {
    console.error("[forgot-password] Handler crashed:", e);
    return genericOk; // never 500 to client
  }
}
