// src/app/admin/(panel)/newsletter/ui/NewsletterComposer.tsx
"use client";

import { useMemo, useState } from "react";
import { sendNewsletterEmailAction } from "../actions";

type StyleMode =
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
  | { id: string; type: "text"; value: string }
  | { id: string; type: "image"; url: string; alt?: string; href?: string }
  | { id: string; type: "button"; label: string; href: string };

type WireBlock =
  | { type: "text"; value: string }
  | { type: "image"; url: string; alt?: string; href?: string }
  | { type: "button"; label: string; href: string };

function uid() {
  return Math.random().toString(16).slice(2);
}

const STYLE_OPTIONS: Array<{ value: StyleMode; label: string; hint: string }> = [
  { value: "pretty", label: "Pretty", hint: "Balanced card layout (default)" },
  { value: "simple", label: "Simple", hint: "Basic text email" },
  { value: "minimal", label: "Minimal", hint: "Clean + light, very readable" },
  { value: "dark", label: "Dark", hint: "Dark theme (accent green)" },
  { value: "sale", label: "Sale", hint: "Promo / discount vibe (red)" },
  { value: "drop", label: "New Drop", hint: "Release / launch vibe (blue)" },
  { value: "productGrid", label: "Product Grid", hint: "Featured layout for product blocks" },
  { value: "brandBold", label: "Brand Bold", hint: "Premium bold header" },
  { value: "soccer", label: "Soccer", hint: "Football-y, subtle green accents" },
];

export default function NewsletterComposer() {
  const [subject, setSubject] = useState("");
  const [style, setStyle] = useState<StyleMode>("pretty");
  const [blocks, setBlocks] = useState<EditorBlock[]>([
    { id: uid(), type: "text", value: "Hi mate,\n\nNew drops are live 👇" },
    { id: uid(), type: "button", label: "Shop now", href: "https://example.com" },
  ]);

  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [result, setResult] = useState<unknown>(null);

  const contentJson = useMemo(() => {
    const wire: WireBlock[] = blocks.map(stripId);
    return JSON.stringify(wire);
  }, [blocks]);

  const styleHint = useMemo(
    () => STYLE_OPTIONS.find((x) => x.value === style)?.hint || "",
    [style]
  );

  const previewHtml = useMemo(() => {
    const safeSubject = escapeHtml(subject || "Subject preview...");
    const body = blocksToPreview(blocks);

    switch (style) {
      case "simple":
        return `
          <div style="font-family:Arial,sans-serif;line-height:1.5">
            <h2 style="margin:0 0 10px 0">${safeSubject}</h2>
            ${body}
            <hr style="margin:24px 0;border:none;border-top:1px solid #eee"/>
            <p style="font-size:12px;color:#666">Unsubscribe link will be included.</p>
          </div>
        `;

      case "minimal":
        return `
          <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#fff;padding:18px">
            <div style="max-width:680px;margin:0 auto">
              <div style="font-weight:900;font-size:16px;letter-spacing:0.2px">FootballWorld</div>
              <div style="height:10px"></div>
              <div style="border:1px solid #eee;border-radius:14px;padding:16px">
                <h1 style="margin:0 0 10px 0;font-size:18px;line-height:1.2">${safeSubject}</h1>
                ${body}
                <div style="margin-top:14px;font-size:12px;color:#666">Unsubscribe link will be included.</div>
              </div>
            </div>
          </div>
        `;

      case "dark":
        return `
          <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#0B0B0D;padding:18px">
            <div style="max-width:720px;margin:0 auto;background:#121217;border:1px solid #2A2A2A;border-radius:18px;overflow:hidden">
              <div style="padding:14px 16px;border-bottom:1px solid #2A2A2A;display:flex;align-items:center;gap:10px">
                <div style="font-weight:900;font-size:16px;color:#fff">FootballWorld</div>
                <div style="margin-left:auto;font-size:12px;color:#A7A7A7">Preview</div>
              </div>
              <div style="padding:16px;color:#EDEDED">
                <h1 style="margin:0 0 10px 0;font-size:18px;color:#fff">${safeSubject}</h1>
                <div style="color:#EDEDED">${body.replace(/color:#111/g, "color:#EDEDED")}</div>
                <div style="margin-top:14px;font-size:12px;color:#A7A7A7">Unsubscribe link will be included.</div>
              </div>
            </div>
          </div>
        `;

      case "sale":
        return `
          <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#fff7f7;padding:18px">
            <div style="max-width:740px;margin:0 auto;background:#fff;border:1px solid #fde2e2;border-radius:18px;overflow:hidden">
              <div style="padding:14px 16px;background:#EF4444;color:#fff">
                <div style="font-weight:900;font-size:16px;letter-spacing:0.2px">FootballWorld</div>
                <div style="font-size:12px;opacity:0.9">Limited-time offers</div>
              </div>
              <div style="padding:16px">
                <div style="display:inline-block;background:#111;color:#fff;font-size:11px;font-weight:800;padding:6px 10px;border-radius:999px">SALE</div>
                <h1 style="margin:10px 0 10px 0;font-size:18px;line-height:1.2">${safeSubject}</h1>
                ${body}
                <div style="margin-top:14px;font-size:12px;color:#666">Unsubscribe link will be included.</div>
              </div>
            </div>
          </div>
        `;

      case "drop":
        return `
          <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f6faff;padding:18px">
            <div style="max-width:740px;margin:0 auto;background:#fff;border:1px solid #e6efff;border-radius:18px;overflow:hidden">
              <div style="padding:14px 16px;border-bottom:1px solid #e6efff;display:flex;align-items:center;gap:10px">
                <div style="font-weight:900;font-size:16px;color:#111">FootballWorld</div>
                <div style="margin-left:auto;font-size:12px;color:#5b6b88">New drop</div>
              </div>
              <div style="padding:16px">
                <div style="display:flex;gap:10px;align-items:center;margin-bottom:10px">
                  <div style="width:10px;height:10px;border-radius:999px;background:#2563EB"></div>
                  <div style="font-size:12px;color:#5b6b88;font-weight:700">Just released</div>
                </div>
                <h1 style="margin:0 0 10px 0;font-size:18px;line-height:1.2">${safeSubject}</h1>
                ${body}
                <div style="margin-top:14px;font-size:12px;color:#666">Unsubscribe link will be included.</div>
              </div>
            </div>
          </div>
        `;

      case "productGrid":
        return `
          <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f6f7fb;padding:18px">
            <div style="max-width:780px;margin:0 auto;background:#fff;border:1px solid #eee;border-radius:18px;overflow:hidden">
              <div style="padding:14px 16px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;gap:12px">
                <div style="font-weight:900;font-size:16px">FootballWorld</div>
                <div style="margin-left:auto;font-size:12px;color:#666">Featured</div>
              </div>
              <div style="padding:16px">
                <h1 style="margin:0 0 10px 0;font-size:18px;line-height:1.2">${safeSubject}</h1>
                ${body}
                <div style="margin-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:10px">
                  <div style="border:1px solid #eee;border-radius:14px;padding:10px;background:#fafafa">
                    <div style="font-size:12px;color:#666;font-weight:700">Tip</div>
                    <div style="font-size:12px;color:#666;line-height:1.6">
                      Use image + button blocks to simulate product cards.
                    </div>
                  </div>
                  <div style="border:1px solid #eee;border-radius:14px;padding:10px;background:#fafafa">
                    <div style="font-size:12px;color:#666;font-weight:700">Tip</div>
                    <div style="font-size:12px;color:#666;line-height:1.6">
                      Add multiple image/button pairs to create a grid feel.
                    </div>
                  </div>
                </div>
                <div style="margin-top:14px;font-size:12px;color:#666">Unsubscribe link will be included.</div>
              </div>
            </div>
          </div>
        `;

      case "brandBold":
        return `
          <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#ffffff;padding:18px">
            <div style="max-width:760px;margin:0 auto">
              <div style="border-radius:18px;overflow:hidden;border:1px solid #e5e7eb">
                <div style="background:linear-gradient(135deg,#111827,#000);padding:16px">
                  <div style="color:#fff;font-weight:900;font-size:16px">FootballWorld</div>
                  <div style="color:#cbd5e1;font-size:12px;margin-top:2px">Premium newsletter</div>
                </div>
                <div style="padding:16px">
                  <h1 style="margin:0 0 10px 0;font-size:18px;line-height:1.2">${safeSubject}</h1>
                  ${body}
                  <div style="margin-top:14px;font-size:12px;color:#666">Unsubscribe link will be included.</div>
                </div>
              </div>
            </div>
          </div>
        `;

      case "soccer":
        return `
          <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f4fbf6;padding:18px">
            <div style="max-width:760px;margin:0 auto;background:#fff;border:1px solid #dff3e6;border-radius:18px;overflow:hidden">
              <div style="padding:14px 16px;border-bottom:1px solid #eef7f1;display:flex;align-items:center;gap:10px">
                <div style="width:12px;height:12px;border-radius:999px;background:#16A34A"></div>
                <div style="font-weight:900;font-size:16px;color:#111">FootballWorld</div>
                <div style="margin-left:auto;font-size:12px;color:#5f6f66">Matchday vibes</div>
              </div>
              <div style="padding:16px">
                <h1 style="margin:0 0 10px 0;font-size:18px;line-height:1.2">${safeSubject}</h1>
                <div style="margin:0 0 12px 0;padding:12px;border:1px solid #e7f5ec;border-radius:14px;background:#f7fffa">
                  <div style="font-size:12px;color:#2f4b3a;font-weight:800">Kick-off</div>
                  <div style="font-size:12px;color:#2f4b3a;line-height:1.6">
                    New kits, clean designs, fast drops.
                  </div>
                </div>
                ${body}
                <div style="margin-top:14px;font-size:12px;color:#666">Unsubscribe link will be included.</div>
              </div>
            </div>
          </div>
        `;

      case "pretty":
      default:
        return `
          <div style="background:#f6f7fb;padding:18px">
            <div style="background:#fff;border:1px solid #eee;border-radius:16px;overflow:hidden">
              <div style="padding:14px 16px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;gap:12px">
                <div style="font-weight:800;font-size:16px">FootballWorld</div>
                <div style="margin-left:auto;font-size:12px;color:#666">Preview</div>
              </div>
              <div style="padding:16px">
                <h1 style="margin:0 0 10px 0;font-size:18px">${safeSubject}</h1>
                ${body}
              </div>
            </div>
          </div>
        `;
    }
  }, [subject, style, blocks]);

  async function onSend() {
    try {
      setStatus("sending");
      setResult(null);

      const fd = new FormData();
      fd.set("subject", subject);
      fd.set("style", style);
      fd.set("contentJson", contentJson);

      const res = await sendNewsletterEmailAction(fd);
      setResult(res);
      setStatus((res as any)?.ok ? "ok" : "err");
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message || "Failed.";
      setStatus("err");
      setResult({ ok: false, error: msg });
    } finally {
      setTimeout(() => setStatus("idle"), 4000);
    }
  }

  function addText() {
    setBlocks((b) => [...b, { id: uid(), type: "text", value: "" }]);
  }
  function addImage() {
    setBlocks((b) => [...b, { id: uid(), type: "image", url: "", alt: "", href: "" }]);
  }
  function addButton() {
    setBlocks((b) => [...b, { id: uid(), type: "button", label: "Open", href: "" }]);
  }
  function removeBlock(id: string) {
    setBlocks((b) => b.filter((x) => x.id !== id));
  }
  function move(id: string, dir: -1 | 1) {
    setBlocks((b) => {
      const i = b.findIndex((x) => x.id === id);
      if (i < 0) return b;
      const j = i + dir;
      if (j < 0 || j >= b.length) return b;
      const copy = [...b];
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
      return copy;
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      {/* Left: editor */}
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <div className="text-sm font-semibold mb-1">Subject</div>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Subject..."
            />
          </div>

          <div>
            <div className="text-sm font-semibold mb-1">Style</div>

            <select
              value={style}
              onChange={(e) => setStyle(e.target.value as StyleMode)}
              className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              aria-label="Email style"
            >
              {STYLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <div className="mt-1 text-xs text-gray-500">{styleHint}</div>
          </div>
        </div>

        <div className="rounded-2xl border p-3 bg-white space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold">Editor</div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={addText}
                className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50"
              >
                + Text
              </button>
              <button
                type="button"
                onClick={addImage}
                className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50"
              >
                + Image
              </button>
              <button
                type="button"
                onClick={addButton}
                className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50"
              >
                + Button
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {blocks.map((b, idx) => (
              <div key={b.id} className="rounded-2xl border p-3 bg-gray-50">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="text-sm font-semibold">
                    {b.type.toUpperCase()} <span className="text-gray-400">•</span> #{idx + 1}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => move(b.id, -1)}
                      className="px-2 py-1 rounded-lg border text-sm hover:bg-white"
                      aria-label="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(b.id, 1)}
                      className="px-2 py-1 rounded-lg border text-sm hover:bg-white"
                      aria-label="Move down"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeBlock(b.id)}
                      className="px-2 py-1 rounded-lg border text-sm hover:bg-white"
                      aria-label="Remove block"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {b.type === "text" ? (
                  <textarea
                    value={b.value}
                    onChange={(e) =>
                      setBlocks((arr) =>
                        arr.map((x) => (x.id === b.id ? { ...x, value: e.target.value } : x))
                      )
                    }
                    className="w-full min-h-[120px] rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="Write text..."
                  />
                ) : b.type === "image" ? (
                  <div className="grid gap-2">
                    <input
                      value={b.url}
                      onChange={(e) =>
                        setBlocks((arr) =>
                          arr.map((x) => (x.id === b.id ? { ...x, url: e.target.value } : x))
                        )
                      }
                      className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="Image URL (https://...)"
                    />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        value={b.alt || ""}
                        onChange={(e) =>
                          setBlocks((arr) =>
                            arr.map((x) => (x.id === b.id ? { ...x, alt: e.target.value } : x))
                          )
                        }
                        className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        placeholder="Alt text (optional)"
                      />
                      <input
                        value={b.href || ""}
                        onChange={(e) =>
                          setBlocks((arr) =>
                            arr.map((x) => (x.id === b.id ? { ...x, href: e.target.value } : x))
                          )
                        }
                        className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        placeholder="Link URL (optional)"
                      />
                    </div>
                    {b.url ? (
                      <div className="rounded-xl border bg-white p-2">
                        <img src={b.url} alt={b.alt || ""} className="max-h-48 w-auto rounded-lg" />
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      value={b.label}
                      onChange={(e) =>
                        setBlocks((arr) =>
                          arr.map((x) => (x.id === b.id ? { ...x, label: e.target.value } : x))
                        )
                      }
                      className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="Button label"
                    />
                    <input
                      value={b.href}
                      onChange={(e) =>
                        setBlocks((arr) =>
                          arr.map((x) => (x.id === b.id ? { ...x, href: e.target.value } : x))
                        )
                      }
                      className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="https://..."
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onSend}
              disabled={status === "sending"}
              className="rounded-xl border px-4 py-2 font-medium hover:bg-gray-50 disabled:opacity-60"
            >
              {status === "sending" ? "Sending…" : "Send to all subscribers"}
            </button>

            {(result as any)?.ok === true ? (
              <div className="text-sm text-green-700">
                Sent: {(result as any).sent}/{(result as any).total} (Failed: {(result as any).failed})
              </div>
            ) : null}

            {(result as any)?.ok === false ? (
              <div className="text-sm text-red-600">{(result as any).error}</div>
            ) : null}
          </div>

          {(result as any)?.ok === false &&
          Array.isArray((result as any).details) &&
          (result as any).details.length ? (
            <div className="text-xs text-red-600 space-y-1">
              {(result as any).details.map((d: string, i: number) => (
                <div key={i}>• {d}</div>
              ))}
            </div>
          ) : null}

          <div className="text-xs text-gray-500">Tip: use blocks. Images must be public URLs (hosted).</div>

          {/* hidden payload */}
          <input type="hidden" value={contentJson} readOnly />
        </div>
      </div>

      {/* Right: preview */}
      <div className="rounded-2xl border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b">
          <div className="font-semibold">Preview</div>
          <div className="text-xs text-gray-500">Style: {style}</div>
        </div>
        <div className="p-3 bg-gray-50">
          <div className="rounded-xl border bg-white overflow-hidden">
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function stripId(b: EditorBlock): WireBlock {
  // remove client-only id before sending to server
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, ...rest } = b;
  return rest as WireBlock;
}

function escapeHtml(s: string) {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function blocksToPreview(blocks: EditorBlock[]) {
  const parts: string[] = [];

  for (const b of blocks) {
    if (b.type === "text") {
      const safe = escapeHtml(b.value || "").replace(/\n/g, "<br/>");
      parts.push(
        `<div style="margin:0 0 12px 0;font-size:14px;line-height:1.7;color:#111">${safe}</div>`
      );
    }
    if (b.type === "image") {
      const url = (b.url || "").trim();
      if (!url) continue;
      const alt = escapeHtml(b.alt || "");
      const img = `<img src="${url}" alt="${alt}" style="max-width:100%;border-radius:12px;display:block;margin:10px 0" />`;
      parts.push(
        b.href ? `<a href="${b.href}" target="_blank" rel="noopener noreferrer">${img}</a>` : img
      );
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
