// src/app/admin/(panel)/newsletter/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

export type StyleMode =
  | "simple"
  | "pretty"
  | "minimal"
  | "dark"
  | "sale"
  | "drop"
  | "productGrid"
  | "brandBold"
  | "soccer";

type EditorBlock =
  | { type: "text"; value: string }
  | { type: "image"; url: string; alt?: string; href?: string }
  | { type: "button"; label: string; href: string };

type SubscriberRow = { email: string; unsubToken: string };

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

function escapeHtml(s: string) {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function blocksToHtml(blocks: EditorBlock[], accent = "#111") {
  const parts: string[] = [];

  for (const b of blocks) {
    if (b.type === "text") {
      const safe = escapeHtml(b.value || "").replace(/\n/g, "<br/>");
      parts.push(
        `<div style="margin:0 0 12px 0;font-size:14px;line-height:1.75;color:#111">${safe}</div>`
      );
    }

    if (b.type === "image") {
      const url = (b.url || "").trim();
      if (!url) continue;
      const alt = escapeHtml(b.alt || "");
      const img = `<img src="${url}" alt="${alt}" style="max-width:100%;border-radius:14px;display:block;margin:12px 0" />`;
      parts.push(
        b.href
          ? `<a href="${b.href}" target="_blank" rel="noopener noreferrer">${img}</a>`
          : img
      );
    }

    if (b.type === "button") {
      const label = escapeHtml(b.label || "Open");
      const href = (b.href || "").trim();
      if (!href) continue;
      parts.push(`
        <div style="margin:14px 0 18px 0">
          <a href="${href}" target="_blank" rel="noopener noreferrer"
             style="display:inline-block;background:${accent};color:#fff;text-decoration:none;
                    padding:11px 16px;border-radius:14px;font-weight:800;font-size:13px">
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
    lines.push("");
  }
  return lines.join("\n").trim();
}

function baseFooter(unsubscribeUrl: string, theme: "light" | "dark" = "light") {
  const text = theme === "dark" ? "#A7A7A7" : "#666";
  const border = theme === "dark" ? "#2A2A2A" : "#eee";
  const link = theme === "dark" ? "#D7D7D7" : "#666";
  return `
    <hr style="margin:22px 0;border:none;border-top:1px solid ${border}"/>
    <div style="font-size:12px;color:${text};line-height:1.6">
      You are receiving this email because you subscribed on FootballWorld.
      <br/>
      <a href="${unsubscribeUrl}" style="color:${link};text-decoration:underline">Unsubscribe</a>
    </div>
  `;
}

function buildHtmlEmail(opts: {
  subject: string;
  blocks: EditorBlock[];
  style: StyleMode;
  unsubscribeUrl: string;
}) {
  const { subject, blocks, style, unsubscribeUrl } = opts;
  const safeSubject = escapeHtml(subject);

  // -------------------- Styles --------------------
  if (style === "simple") {
    const body = blocksToHtml(blocks, "#111");
    return `
      <div style="font-family:Arial,sans-serif;line-height:1.5">
        <h2 style="margin:0 0 10px 0">${safeSubject}</h2>
        ${body}
        ${baseFooter(unsubscribeUrl, "light")}
      </div>
    `;
  }

  if (style === "minimal") {
    const body = blocksToHtml(blocks, "#111");
    return `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#fff;padding:24px">
        <div style="max-width:640px;margin:0 auto">
          <div style="font-weight:900;font-size:16px;letter-spacing:0.2px">FootballWorld</div>
          <div style="height:10px"></div>
          <div style="border:1px solid #eee;border-radius:14px;padding:18px">
            <h1 style="margin:0 0 10px 0;font-size:18px;line-height:1.2">${safeSubject}</h1>
            ${body}
            ${baseFooter(unsubscribeUrl, "light")}
          </div>
        </div>
      </div>
    `;
  }

  if (style === "dark") {
    const body = blocksToHtml(blocks, "#22C55E");
    return `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#0B0B0D;padding:24px">
        <div style="max-width:680px;margin:0 auto;background:#121217;border:1px solid #2A2A2A;border-radius:18px;overflow:hidden">
          <div style="padding:18px 20px;border-bottom:1px solid #2A2A2A;display:flex;align-items:center;gap:10px">
            <div style="font-weight:900;font-size:16px;color:#fff">FootballWorld</div>
            <div style="margin-left:auto;font-size:12px;color:#A7A7A7">Newsletter</div>
          </div>
          <div style="padding:20px;color:#EDEDED">
            <h1 style="margin:0 0 12px 0;font-size:20px;line-height:1.2;color:#fff">${safeSubject}</h1>
            <div style="color:#EDEDED">${body.replace(/color:#111/g, "color:#EDEDED")}</div>
            ${baseFooter(unsubscribeUrl, "dark")}
          </div>
        </div>
      </div>
    `;
  }

  if (style === "sale") {
    const accent = "#EF4444";
    const body = blocksToHtml(blocks, accent);
    return `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#fff7f7;padding:24px">
        <div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #fde2e2;border-radius:18px;overflow:hidden">
          <div style="padding:16px 20px;background:${accent};color:#fff">
            <div style="font-weight:900;font-size:16px;letter-spacing:0.2px">FootballWorld</div>
            <div style="font-size:12px;opacity:0.9">Limited-time offers</div>
          </div>
          <div style="padding:20px">
            <div style="display:inline-block;background:#111;color:#fff;font-size:11px;font-weight:800;padding:6px 10px;border-radius:999px">SALE</div>
            <h1 style="margin:10px 0 12px 0;font-size:20px;line-height:1.2">${safeSubject}</h1>
            ${body}
            <div style="margin-top:14px;padding:12px;border:1px dashed #f3b4b4;border-radius:14px;background:#fffafa">
              <div style="font-size:12px;color:#7a1f1f">
                Tip: Add a button block with “Shop now” + your category link.
              </div>
            </div>
            ${baseFooter(unsubscribeUrl, "light")}
          </div>
        </div>
      </div>
    `;
  }

  if (style === "drop") {
    const accent = "#2563EB";
    const body = blocksToHtml(blocks, accent);
    return `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f6faff;padding:24px">
        <div style="max-width:720px;margin:0 auto;background:#fff;border:1px solid #e6efff;border-radius:18px;overflow:hidden">
          <div style="padding:18px 20px;border-bottom:1px solid #e6efff;display:flex;align-items:center;gap:10px">
            <div style="font-weight:900;font-size:16px;color:#111">FootballWorld</div>
            <div style="margin-left:auto;font-size:12px;color:#5b6b88">New drop</div>
          </div>
          <div style="padding:20px">
            <div style="display:flex;gap:10px;align-items:center;margin-bottom:10px">
              <div style="width:10px;height:10px;border-radius:999px;background:${accent}"></div>
              <div style="font-size:12px;color:#5b6b88;font-weight:700">Just released</div>
            </div>
            <h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.2">${safeSubject}</h1>
            ${body}
            ${baseFooter(unsubscribeUrl, "light")}
          </div>
        </div>
      </div>
    `;
  }

  if (style === "productGrid") {
    const accent = "#111";
    const body = blocksToHtml(blocks, accent);
    return `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f6f7fb;padding:24px">
        <div style="max-width:740px;margin:0 auto;background:#fff;border:1px solid #eee;border-radius:18px;overflow:hidden">
          <div style="padding:18px 22px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;gap:12px">
            <div style="font-weight:900;font-size:16px">FootballWorld</div>
            <div style="margin-left:auto;font-size:12px;color:#666">Featured</div>
          </div>
          <div style="padding:22px">
            <h1 style="margin:0 0 12px 0;font-size:20px;line-height:1.2">${safeSubject}</h1>
            <div style="font-size:14px;color:#111;line-height:1.7">${body}</div>
            <div style="margin-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:12px">
              <div style="border:1px solid #eee;border-radius:14px;padding:12px;background:#fafafa">
                <div style="font-size:12px;color:#666;font-weight:700">Idea</div>
                <div style="font-size:12px;color:#666;line-height:1.6">
                  Use: image + button blocks to simulate product cards.
                </div>
              </div>
              <div style="border:1px solid #eee;border-radius:14px;padding:12px;background:#fafafa">
                <div style="font-size:12px;color:#666;font-weight:700">Tip</div>
                <div style="font-size:12px;color:#666;line-height:1.6">
                  Add two image blocks + two buttons to create a “grid” feel.
                </div>
              </div>
            </div>
            ${baseFooter(unsubscribeUrl, "light")}
          </div>
        </div>
      </div>
    `;
  }

  if (style === "brandBold") {
    const accent = "#111827";
    const body = blocksToHtml(blocks, accent);
    return `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#ffffff;padding:24px">
        <div style="max-width:720px;margin:0 auto">
          <div style="border-radius:18px;overflow:hidden;border:1px solid #e5e7eb">
            <div style="background:linear-gradient(135deg,#111827,#000);padding:20px">
              <div style="color:#fff;font-weight:900;font-size:18px">FootballWorld</div>
              <div style="color:#cbd5e1;font-size:12px;margin-top:2px">Premium newsletter</div>
            </div>
            <div style="padding:22px">
              <h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.2">${safeSubject}</h1>
              ${body}
              ${baseFooter(unsubscribeUrl, "light")}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  if (style === "soccer") {
    const accent = "#16A34A";
    const body = blocksToHtml(blocks, accent);
    return `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f4fbf6;padding:24px">
        <div style="max-width:720px;margin:0 auto;background:#fff;border:1px solid #dff3e6;border-radius:18px;overflow:hidden">
          <div style="padding:18px 20px;border-bottom:1px solid #eef7f1;display:flex;align-items:center;gap:10px">
            <div style="width:12px;height:12px;border-radius:999px;background:${accent}"></div>
            <div style="font-weight:900;font-size:16px;color:#111">FootballWorld</div>
            <div style="margin-left:auto;font-size:12px;color:#5f6f66">Matchday vibes</div>
          </div>
          <div style="padding:20px">
            <h1 style="margin:0 0 10px 0;font-size:20px;line-height:1.2">${safeSubject}</h1>
            <div style="margin:0 0 14px 0;padding:12px;border:1px solid #e7f5ec;border-radius:14px;background:#f7fffa">
              <div style="font-size:12px;color:#2f4b3a;font-weight:800">Kick-off</div>
              <div style="font-size:12px;color:#2f4b3a;line-height:1.6">
                New kits, clean designs, fast drops.
              </div>
            </div>
            ${body}
            ${baseFooter(unsubscribeUrl, "light")}
          </div>
        </div>
      </div>
    `;
  }

  // default = pretty (teu atual)
  const body = blocksToHtml(blocks, "#111");
  return `
  <div style="background:#f6f7fb;padding:24px">
    <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #eee;border-radius:16px;overflow:hidden">
      <div style="padding:18px 22px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;gap:12px">
        <div style="font-weight:800;font-size:18px">FootballWorld</div>
        <div style="margin-left:auto;font-size:12px;color:#666">Newsletter</div>
      </div>

      <div style="padding:22px">
        <h1 style="margin:0 0 12px 0;font-size:20px;line-height:1.2">${safeSubject}</h1>
        <div style="font-size:14px;color:#111;line-height:1.7">${body}</div>

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

export async function getNewsletterStatsAction() {
  const [activeSubscribers, campaignsTotal, logsAgg] = await Promise.all([
    prisma.newsletterSubscriber.count({ where: { unsubscribedAt: null } }),
    prisma.newsletterCampaign.count(),
    prisma.newsletterSendLog.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
  ]);

  const sent =
    logsAgg.find((x: { status: string; _count: { status: number } }) => x.status === "SENT")
      ?._count.status ?? 0;
  const failed =
    logsAgg.find((x: { status: string; _count: { status: number } }) => x.status === "FAILED")
      ?._count.status ?? 0;

  return { ok: true as const, activeSubscribers, campaignsTotal, sent, failed };
}

export async function sendNewsletterEmailAction(formData: FormData) {
  const subject = String(formData.get("subject") || "").trim();
  const style = (String(formData.get("style") || "pretty") as StyleMode) || "pretty";
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

  const campaign = await prisma.newsletterCampaign.create({
    data: {
      subject,
      style,
      contentJson,
      html: "",
      text: "",
      status: "SENDING",
      totalRecipients: subs.length,
      sentCount: 0,
      failedCount: 0,
    },
    select: { id: true },
  });

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

  const results = await Promise.allSettled(
    subs.map(async (s) => {
      const unsubscribeUrl = `${siteUrl()}/api/newsletter/unsubscribe?token=${encodeURIComponent(
        s.unsubToken
      )}`;

      const html = buildHtmlEmail({ subject, blocks, style, unsubscribeUrl });
      const text = buildTextEmail(blocks, unsubscribeUrl);

      const out = await resend.emails.send({ from, to: s.email, subject, html, text });

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
    .map((r: PromiseRejectedResult) => String((r.reason as any)?.message || r.reason))
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
