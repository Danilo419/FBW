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

/** Avoid logging full emails */
function safeEmailHint(email: string) {
  const at = email.indexOf("@");
  if (at <= 1) return "***";
  return `${email.slice(0, 2)}***${email.slice(at)}`;
}

export async function POST(req: Request) {
  // ✅ Always return generic ok to avoid leaking whether the email exists
  const genericOk = NextResponse.json({ ok: true });

  // ✅ Debug marker logs (safe)
  console.log("[forgot-password] HIT", {
    ts: new Date().toISOString(),
    hasResendKey: !!process.env.RESEND_API_KEY,
    hasEmailFrom: !!process.env.EMAIL_FROM,
    hasReplyTo: !!process.env.EMAIL_REPLY_TO,
    host: req.headers.get("host") ?? null,
    origin: req.headers.get("origin") ?? null,
  });

  try {
    // -------- parse body --------
    let email = "";
    try {
      const json = await req.json();
      const parsed = BodySchema.safeParse(json);
      if (!parsed.success) {
        console.log("[forgot-password] invalid body");
        return genericOk;
      }
      email = parsed.data.email.trim();
    } catch {
      console.log("[forgot-password] invalid json");
      return genericOk;
    }

    const ip = getClientIp(req);
    const emailNormalized = email.toLowerCase();
    console.log("[forgot-password] request", {
      ip: ip !== "unknown" ? ip : null,
      emailHint: safeEmailHint(emailNormalized),
    });

    // -------- find user --------
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
      return genericOk;
    }

    if (!user?.email) {
      console.log("[forgot-password] user not found");
      return genericOk;
    }

    console.log("[forgot-password] user found", { id: user.id });

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
      return genericOk;
    }

    const base = getBaseUrl(req);
    const resetUrl = `${base}/reset-password?token=${token}`;

    console.log("[forgot-password] about to send", {
      toHint: safeEmailHint(user.email),
      from: EMAIL_FROM,
      replyTo: EMAIL_REPLY_TO,
      base,
    });

    // -------- send email --------
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
    return genericOk;
  }
}
