// src/app/api/contact/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const SUBJECT_MAX = 120;
const MESSAGE_MAX = 1200;

function safeString(v: unknown) {
  if (typeof v === "string") return v.trim();
  return "";
}

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

function escapeHtml(s: string) {
  return (s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function siteUrl() {
  // usa o teu domínio real como fallback
  return process.env.NEXT_PUBLIC_SITE_URL || "https://myfootballworldstore.com";
}

export async function POST(req: NextRequest) {
  try {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      return NextResponse.json({ ok: false, error: "Missing RESEND_API_KEY" }, { status: 500 });
    }

    const SUPPORT_TO = process.env.SUPPORT_EMAIL_TO || "myfootballworldstore@gmail.com";

    /**
     * ✅ IMPORTANTE (Resend):
     * - O "from" TEM de ser um sender verificado no Resend.
     * - Correto para o teu domínio: myfootballworldstore.com
     * - Exemplo típico: "FootballWorld <support@myfootballworldstore.com>"
     *
     * Se ainda não verificaste o domínio/sender no Resend, este "from" pode falhar.
     * (Mas isto é o "correto" em produção.)
     */
    const FROM =
      process.env.EMAIL_FROM || "FootballWorld <support@myfootballworldstore.com>";

    const body = await req.json().catch(() => ({}));

    const name = safeString(body?.name).slice(0, 80);
    const email = safeString(body?.email).toLowerCase().slice(0, 120);
    const subject = safeString(body?.subject).slice(0, SUBJECT_MAX);
    const order = safeString(body?.order).slice(0, 60);
    const message = safeString(body?.message).slice(0, MESSAGE_MAX);

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }

    if (!isEmail(email)) {
      return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 400 });
    }

    // “ticket” simples para referência
    const ticketId =
      "FW-" +
      Date.now().toString(36).toUpperCase() +
      "-" +
      Math.random().toString(16).slice(2, 6).toUpperCase();

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeSubject = escapeHtml(subject);
    const safeOrder = escapeHtml(order);
    const safeMessage = escapeHtml(message).replaceAll("\n", "<br/>");

    const supportSubject = `Support: ${subject}${order ? ` (${order})` : ""} — ${ticketId}`;

    const supportHtml = `
      <div style="font-family:Inter,system-ui,Segoe UI,Roboto,Arial,sans-serif;line-height:1.4;color:#0f172a">
        <h2 style="margin:0 0 10px">New support message</h2>
        <p style="margin:0 0 14px;color:#334155">
          <b>Ticket:</b> ${ticketId}<br/>
          <b>Name:</b> ${safeName}<br/>
          <b>Email:</b> ${safeEmail}<br/>
          ${order ? `<b>Order:</b> ${safeOrder}<br/>` : ""}
          <b>Subject:</b> ${safeSubject}
        </p>

        <div style="border:1px solid #e2e8f0;border-radius:12px;padding:14px;background:#ffffff">
          <div style="font-size:12px;color:#64748b;margin-bottom:8px">Message</div>
          <div style="font-size:14px;color:#0f172a">${safeMessage}</div>
        </div>

        <p style="margin:14px 0 0;color:#64748b;font-size:12px">
          Sent from: ${escapeHtml(siteUrl())}/contact
        </p>
      </div>
    `;

    const supportText = [
      `New support message`,
      ``,
      `Ticket: ${ticketId}`,
      `Name: ${name}`,
      `Email: ${email}`,
      order ? `Order: ${order}` : "",
      `Subject: ${subject}`,
      ``,
      `Message:`,
      message,
      ``,
      `Sent from: ${siteUrl()}/contact`,
    ]
      .filter(Boolean)
      .join("\n");

    const resend = new Resend(RESEND_API_KEY);

    // 1) Email para o SUPORTE (reply-to = cliente)
    const supportSend = await resend.emails.send({
      from: FROM,
      to: [SUPPORT_TO],
      subject: supportSubject,
      html: supportHtml,
      text: supportText,
      replyTo: email,
    });

    // 2) Confirmação para o CLIENTE (cópia) + reply-to para o suporte
    const customerHtml = `
      <div style="font-family:Inter,system-ui,Segoe UI,Roboto,Arial,sans-serif;line-height:1.4;color:#0f172a">
        <h2 style="margin:0 0 10px">We received your message ✅</h2>
        <p style="margin:0 0 14px;color:#334155">
          Hi ${safeName},<br/>
          Thanks for reaching out. Our support team typically replies within <b>24–48h</b> (business days).
        </p>

        <div style="border:1px solid #e2e8f0;border-radius:12px;padding:14px;background:#ffffff">
          <div style="font-size:12px;color:#64748b;margin-bottom:8px">Your message (${ticketId})</div>
          <div style="font-size:14px;color:#0f172a">
            <b>Subject:</b> ${safeSubject}<br/>
            ${order ? `<b>Order:</b> ${safeOrder}<br/>` : ""}
            <br/><br/>
            ${safeMessage}
          </div>
        </div>

        <p style="margin:14px 0 0;color:#64748b;font-size:12px">
          If you need to add photos or details, just reply to this email.
        </p>
      </div>
    `;

    const customerText = [
      `We received your message ✅`,
      ``,
      `Ticket: ${ticketId}`,
      `Subject: ${subject}`,
      order ? `Order: ${order}` : "",
      ``,
      `Your message:`,
      message,
      ``,
      `You can reply to this email to add more details.`,
    ]
      .filter(Boolean)
      .join("\n");

    const customerSend = await resend.emails.send({
      from: FROM,
      to: [email],
      subject: `We received your message — ${ticketId}`,
      html: customerHtml,
      text: customerText,
      replyTo: SUPPORT_TO,
    });

    return NextResponse.json(
      {
        ok: true,
        ticketId,
        supportMessageId: supportSend?.data?.id ?? null,
        customerMessageId: customerSend?.data?.id ?? null,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[api/contact] error:", err);
    return NextResponse.json({ ok: false, error: "Failed to send" }, { status: 500 });
  }
}
