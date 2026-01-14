"use client";

import { useMemo, useState } from "react";
import { sendNewsletterEmailAction } from "../actions";

type StyleMode = "simple" | "pretty";

type EditorBlock =
  | { id: string; type: "text"; value: string }
  | { id: string; type: "image"; url: string; alt?: string; href?: string }
  | { id: string; type: "button"; label: string; href: string };

function uid() {
  return Math.random().toString(16).slice(2);
}

export default function NewsletterComposer() {
  const [subject, setSubject] = useState("");
  const [style, setStyle] = useState<StyleMode>("pretty");
  const [blocks, setBlocks] = useState<EditorBlock[]>([
    { id: uid(), type: "text", value: "Hi mate,\n\nNew drops are live 👇" },
    { id: uid(), type: "button", label: "Shop now", href: "https://example.com" },
  ]);

  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [result, setResult] = useState<any>(null);

  const contentJson = useMemo(() => JSON.stringify(blocks.map(stripId)), [blocks]);

  const previewHtml = useMemo(() => {
    const safeSubject = escapeHtml(subject || "Subject preview...");
    const body = blocksToPreview(blocks);

    if (style === "simple") {
      return `
        <div style="font-family:Arial,sans-serif;line-height:1.5">
          <h2 style="margin:0 0 10px 0">${safeSubject}</h2>
          ${body}
          <hr style="margin:24px 0;border:none;border-top:1px solid #eee"/>
          <p style="font-size:12px;color:#666">Unsubscribe link will be included.</p>
        </div>
      `;
    }

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
      setStatus(res.ok ? "ok" : "err");
    } catch (e: any) {
      setStatus("err");
      setResult({ ok: false, error: e?.message || "Failed." });
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
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStyle("simple")}
                className={`px-3 py-2 rounded-xl border text-sm ${
                  style === "simple" ? "bg-black text-white border-black" : "hover:bg-gray-50"
                }`}
              >
                Simple
              </button>
              <button
                type="button"
                onClick={() => setStyle("pretty")}
                className={`px-3 py-2 rounded-xl border text-sm ${
                  style === "pretty" ? "bg-black text-white border-black" : "hover:bg-gray-50"
                }`}
              >
                Pretty
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border p-3 bg-white space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold">Editor</div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={addText} className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50">
                + Text
              </button>
              <button type="button" onClick={addImage} className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50">
                + Image
              </button>
              <button type="button" onClick={addButton} className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50">
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
                    <button type="button" onClick={() => move(b.id, -1)} className="px-2 py-1 rounded-lg border text-sm hover:bg-white">
                      ↑
                    </button>
                    <button type="button" onClick={() => move(b.id, 1)} className="px-2 py-1 rounded-lg border text-sm hover:bg-white">
                      ↓
                    </button>
                    <button type="button" onClick={() => removeBlock(b.id)} className="px-2 py-1 rounded-lg border text-sm hover:bg-white">
                      ✕
                    </button>
                  </div>
                </div>

                {b.type === "text" ? (
                  <textarea
                    value={b.value}
                    onChange={(e) =>
                      setBlocks((arr) => arr.map((x) => (x.id === b.id ? { ...x, value: e.target.value } : x)))
                    }
                    className="w-full min-h-[120px] rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="Write text..."
                  />
                ) : b.type === "image" ? (
                  <div className="grid gap-2">
                    <input
                      value={b.url}
                      onChange={(e) =>
                        setBlocks((arr) => arr.map((x) => (x.id === b.id ? { ...x, url: e.target.value } : x)))
                      }
                      className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="Image URL (https://...)"
                    />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        value={b.alt || ""}
                        onChange={(e) =>
                          setBlocks((arr) => arr.map((x) => (x.id === b.id ? { ...x, alt: e.target.value } : x)))
                        }
                        className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        placeholder="Alt text (optional)"
                      />
                      <input
                        value={b.href || ""}
                        onChange={(e) =>
                          setBlocks((arr) => arr.map((x) => (x.id === b.id ? { ...x, href: e.target.value } : x)))
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
                        setBlocks((arr) => arr.map((x) => (x.id === b.id ? { ...x, label: e.target.value } : x)))
                      }
                      className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="Button label"
                    />
                    <input
                      value={b.href}
                      onChange={(e) =>
                        setBlocks((arr) => arr.map((x) => (x.id === b.id ? { ...x, href: e.target.value } : x)))
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

            {result?.ok === true ? (
              <div className="text-sm text-green-700">
                Sent: {result.sent}/{result.total} (Failed: {result.failed})
              </div>
            ) : null}

            {result?.ok === false ? (
              <div className="text-sm text-red-600">{result.error}</div>
            ) : null}
          </div>

          {result?.ok === false && Array.isArray(result.details) && result.details.length ? (
            <div className="text-xs text-red-600 space-y-1">
              {result.details.map((d: string, i: number) => (
                <div key={i}>• {d}</div>
              ))}
            </div>
          ) : null}

          <div className="text-xs text-gray-500">
            Tip: use blocks. Images must be public URLs (hosted).
          </div>

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

function stripId(b: EditorBlock): any {
  const { id, ...rest } = b as any;
  return rest;
}

function escapeHtml(s: string) {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function blocksToPreview(blocks: EditorBlock[]) {
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
