"use server";

import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

type StyleMode = "simple" | "pretty";

type EditorBlock =
  | { type: "text"; value: string }
  | { type: "image"; url: string; alt?: string; href?: string }
  | { type: "button"; label: string; href: string };

type SubscriberRow = { email: string; unsubToken: string };

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function blocksToHtml(blocks: EditorBlock[]) {
  const parts: string[] = [];

  for (const b of blocks) {
    if (b.type === "text") {
      const safe = escapeHtml(b.value || "").replace(/\n/g, "<br/>");
      parts.push(`<div style="margin:0 0 12px 0;font-size:14px;line-height:1.7;color:#111">${safe}</div>`);
    }

    if (b.type === "image") {
      const url = (b.url || "").trim();
      if (!url) continue;
      const alt = escapeHtml(b.alt || "");
      const img = `<img src="${url}" alt="${alt}" style="max-width:100%;border-radius:12px;display:block;margin:10px 0" />`;
      parts.push(b.href ? `<a href="${b.href}" target="_blank" rel="noopener noreferrer">${img}</a>` : img);
    }

    if (b.type === "button") {
      const label = escapeHtml(b.label || "Open");
      const href = (b.href || "").trim();
      if (!href) continue;
      parts.push(`
        <div style="margin:14px 0 18px 0">
          <a href="${href}" target="_blank" rel="noopener noreferrer"
             style="display:inline-block;background:#111;color:#fff;text-decoration:none;
                    padding:10px 14px;border-radius:12px;font-weight:700;font-size:13px">
            ${label}
          </a>
        </div>
      `);
    }
  }

  return parts.join("\n");
}

function blocksToText(blocks: EditorBlock[]) {
  const lines: string[] = [];
  for (const b of blocks) {
    if (b.type === "text") lines.push(b.value || "");
    if (b.type === "image") lines.push(b.url ? `[Image] ${b.url}` : "");
    if (b.type === "button") lines.push(b.href ? `${b.label || "Open"}: ${b.href}` : "");
    lines.push(""); // spacing
  }
  return lines.join("\n").trim();
}

function buildHtmlEmail(opts: {
  subject: string;
  blocks: EditorBlock[];
  style: StyleMode;
  unsubscribeUrl: string;
}) {
  const { subject, blocks, style, unsubscribeUrl } = opts;
  const safeSubject = escapeHtml(subject);
  const body = blocksToHtml(blocks);

  if (style === "simple") {
    return `
      <div style="font-family:Arial,sans-serif;line-height:1.5">
        <h2 style="margin:0 0 10px 0">${safeSubject}</h2>
        ${body}
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
        <h1 style="margin:0 0 12px 0;font-size:20px;line-height:1.2">${safeSubject}</h1>
        ${body}

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

function buildTextEmail(blocks: EditorBlock[], unsubscribeUrl: string) {
  return `${blocksToText(blocks)}\n\n---\nUnsubscribe: ${unsubscribeUrl}`;
}

/** 📊 estatísticas rápidas (para cards no topo) */
export async function getNewsletterStatsAction() {
  const [activeSubscribers, campaignsTotal, logsAgg] = await Promise.all([
    prisma.newsletterSubscriber.count({ where: { unsubscribedAt: null } }),
    prisma.newsletterCampaign.count(),
    prisma.newsletterSendLog.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
  ]);

  const sent = logsAgg.find((x) => x.status === "SENT")?._count.status ?? 0;
  const failed = logsAgg.find((x) => x.status === "FAILED")?._count.status ?? 0;

  return {
    ok: true as const,
    activeSubscribers,
    campaignsTotal,
    sent,
    failed,
  };
}

/** 🧾 enviar newsletter + guardar campanha + logs por email */
export async function sendNewsletterEmailAction(formData: FormData) {
  const subject = String(formData.get("subject") || "").trim();
  const style = (String(formData.get("style") || "simple") as StyleMode) || "simple";
  const contentJson = String(formData.get("contentJson") || "").trim();

  if (!subject || !contentJson) {
    return { ok: false as const, error: "Missing subject or content." };
  }

  let blocks: EditorBlock[] = [];
  try {
    blocks = JSON.parse(contentJson) as EditorBlock[];
    if (!Array.isArray(blocks) || blocks.length === 0) throw new Error("empty");
  } catch {
    return { ok: false as const, error: "Invalid editor content JSON." };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NEWSLETTER_FROM;

  if (!apiKey || !from) {
    return { ok: false as const, error: "Missing RESEND_API_KEY or NEWSLETTER_FROM in env." };
  }

  const resend = new Resend(apiKey);

  const subs = (await prisma.newsletterSubscriber.findMany({
    where: { unsubscribedAt: null },
    orderBy: { createdAt: "desc" },
    select: { email: true, unsubToken: true },
  })) as SubscriberRow[];

  if (!subs.length) return { ok: false as const, error: "No subscribers yet." };

  // Cria campanha (histórico)
  const campaign = await prisma.newsletterCampaign.create({
    data: {
      subject,
      style,
      contentJson,
      html: "", // vamos atualizar já a seguir
      text: "",
      status: "SENDING",
      totalRecipients: subs.length,
      sentCount: 0,
      failedCount: 0,
    },
    select: { id: true },
  });

  // Vamos gerar html/text “base” (sem unsubscribe) para guardar no histórico
  const htmlBase = buildHtmlEmail({
    subject,
    blocks,
    style,
    unsubscribeUrl: `${siteUrl()}/api/newsletter/unsubscribe?token=__TOKEN__`,
  });

  const textBase = buildTextEmail(blocks, `${siteUrl()}/api/newsletter/unsubscribe?token=__TOKEN__`);

  await prisma.newsletterCampaign.update({
    where: { id: campaign.id },
    data: { html: htmlBase, text: textBase },
  });

  // Envio + logs
  const results = await Promise.allSettled(
    subs.map(async (s) => {
      const unsubscribeUrl = `${siteUrl()}/api/newsletter/unsubscribe?token=${encodeURIComponent(
        s.unsubToken
      )}`;

      const html = buildHtmlEmail({ subject, blocks, style, unsubscribeUrl });
      const text = buildTextEmail(blocks, unsubscribeUrl);

      const out = await resend.emails.send({
        from,
        to: s.email,
        subject,
        html,
        text,
      });

      const anyOut = out as unknown as {
        data?: { id?: string } | null;
        id?: string;
        error?: { message?: string; name?: string } | string | null;
      };

      if (anyOut?.error) {
        const msg =
          typeof anyOut.error === "string"
            ? anyOut.error
            : anyOut.error?.message || anyOut.error?.name || "Resend error";
        throw new Error(msg);
      }

      const id = anyOut?.data?.id || anyOut?.id;
      if (!id) throw new Error("Resend did not return an email id.");

      return { providerId: id, email: s.email };
    })
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.length - sent;

  // Guardar logs (1 por email)
  const logsData = results.map((r, idx) => {
    const email = subs[idx].email;
    if (r.status === "fulfilled") {
      return {
        campaignId: campaign.id,
        email,
        status: "SENT",
        providerId: (r.value as any)?.providerId || null,
        error: null,
      };
    }
    return {
      campaignId: campaign.id,
      email,
      status: "FAILED",
      providerId: null,
      error: String((r.reason as any)?.message || r.reason),
    };
  });

  await prisma.newsletterSendLog.createMany({ data: logsData });

  await prisma.newsletterCampaign.update({
    where: { id: campaign.id },
    data: {
      sentCount: sent,
      failedCount: failed,
      status: failed > 0 ? "FAILED" : "SENT",
      sentAt: new Date(),
    },
  });

  const details = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r) => String((r.reason as any)?.message || r.reason))
    .slice(0, 5);

  if (failed > 0) {
    return {
      ok: false as const,
      error: `Some emails failed (${failed}/${results.length}).`,
      details,
      campaignId: campaign.id,
      sent,
      failed,
      total: results.length,
    };
  }

  return { ok: true as const, campaignId: campaign.id, sent, failed, total: results.length };
}
