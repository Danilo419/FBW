"use server";

import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

type StyleMode = "simple" | "pretty";

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

function buildHtmlEmail(opts: {
  subject: string;
  message: string;
  style: StyleMode;
  unsubscribeUrl: string;
}) {
  const { subject, message, style, unsubscribeUrl } = opts;
  const safeMessage = message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>");

  if (style === "simple") {
    return `
      <div style="font-family:Arial,sans-serif;line-height:1.5">
        <h2>${subject}</h2>
        <div>${safeMessage}</div>
        <hr style="margin:24px 0;border:none;border-top:1px solid #eee"/>
        <p style="font-size:12px;color:#666">
          To unsubscribe, click <a href="${unsubscribeUrl}">here</a>.
        </p>
      </div>
    `;
  }

  // pretty
  return `
  <div style="background:#f6f7fb;padding:24px">
    <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #eee;border-radius:16px;overflow:hidden">
      <div style="padding:18px 22px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;gap:12px">
        <div style="font-weight:800;font-size:18px">FootballWorld</div>
        <div style="margin-left:auto;font-size:12px;color:#666">Newsletter</div>
      </div>

      <div style="padding:22px">
        <h1 style="margin:0 0 12px 0;font-size:20px;line-height:1.2">${subject}</h1>
        <div style="font-size:14px;color:#111;line-height:1.7">${safeMessage}</div>

        <div style="margin-top:18px;padding:14px;border:1px solid #eee;border-radius:12px;background:#fafafa">
          <div style="font-size:12px;color:#555">
            New drops, discounts & featured products.
          </div>
        </div>
      </div>

      <div style="padding:16px 22px;border-top:1px solid #f0f0f0;font-size:12px;color:#666">
        <div style="margin-bottom:8px">You are receiving this email because you subscribed on FootballWorld.</div>
        <a href="${unsubscribeUrl}" style="color:#666;text-decoration:underline">Unsubscribe</a>
      </div>
    </div>
  </div>
  `;
}

function buildTextEmail(message: string, unsubscribeUrl: string) {
  return `${message}\n\n---\nUnsubscribe: ${unsubscribeUrl}`;
}

export async function sendNewsletterEmailAction(formData: FormData) {
  const subject = String(formData.get("subject") || "").trim();
  const message = String(formData.get("message") || "").trim();
  const style = (String(formData.get("style") || "simple") as StyleMode) || "simple";

  if (!subject || !message) {
    return { ok: false, error: "Missing subject or message." };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NEWSLETTER_FROM;

  if (!apiKey || !from) {
    return { ok: false, error: "Missing RESEND_API_KEY or NEWSLETTER_FROM in env." };
  }

  const resend = new Resend(apiKey);

  const subs = await prisma.newsletterSubscriber.findMany({
    where: { unsubscribedAt: null },
    orderBy: { createdAt: "desc" },
    select: { email: true, unsubToken: true },
  });

  if (!subs.length) {
    return { ok: false, error: "No subscribers yet." };
  }

  // Envio (simples e direto). Se quiseres, depois otimizamos para batch/rate-limit.
  const results = await Promise.allSettled(
    subs.map((s) => {
      const unsubscribeUrl = `${siteUrl()}/api/newsletter/unsubscribe?token=${encodeURIComponent(s.unsubToken)}`;

      const html = buildHtmlEmail({ subject, message, style, unsubscribeUrl });
      const text = buildTextEmail(message, unsubscribeUrl);

      return resend.emails.send({
        from,
        to: s.email,
        subject,
        html,
        text,
      });
    })
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.length - sent;

  return { ok: true, sent, failed, total: results.length };
}
