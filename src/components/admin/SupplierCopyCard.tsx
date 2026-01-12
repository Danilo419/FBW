// src/components/admin/SupplierCopyCard.tsx
"use client";

import React from "react";
import {
  ClipboardCopy,
  Copy,
  CheckCircle2,
  Image as ImageIcon,
  Download,
  ExternalLink,
} from "lucide-react";

type Item = {
  id: string;
  name: string;
  slug: string | null;
  image?: string | null;
  qty: number;
  unitPriceCents: number;
  totalPriceCents: number;
  size?: string | null;
  options?: Record<string, string>;
  personalization?: { name?: string | null; number?: string | null } | null;
};

/* ================= utils ================= */

function norm(v?: string | null) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

function pickFirst(obj: Record<string, string> | undefined, keys: string[]) {
  if (!obj) return null;
  for (const k of keys) {
    const v = obj[k];
    if (v && String(v).trim()) return String(v).trim();
  }
  return null;
}

function lc(s: string) {
  return s.trim().toLowerCase();
}

function deriveVersion(item: Item) {
  // Regra pedida
  if (lc(item.name).includes("player version")) return "player";

  const opt = item.options ?? {};
  const maybe =
    pickFirst(opt, ["version", "kitVersion", "edition", "type", "variant"]) ??
    pickFirst(opt, ["jerseyType", "shirtType", "model"]);

  if (maybe) {
    const m = lc(maybe);
    if (m.includes("player")) return "player";
    if (m.includes("fan")) return "fan";
    return maybe;
  }

  if (lc(item.name).includes("player")) return "player";
  if (lc(item.name).includes("fan")) return "fan";

  return "fan";
}

function buildSupplierText(item: Item) {
  const lines: string[] = [];

  const name = norm(item.personalization?.name);
  const number = norm(item.personalization?.number);
  const badges = norm(item.options?.badges);
  const size = norm(item.size);

  if (name) lines.push(`Name : ${name}`);
  if (number) lines.push(`Number : ${number}`);
  if (badges) lines.push(`Badges : ${badges}`);

  lines.push(deriveVersion(item));
  lines.push(`size : ${size ?? "—"}`);

  return lines.join("\n");
}

function isRemoteUrl(u: string) {
  return /^https?:\/\//i.test(u);
}

async function fetchAsBlob(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch image (${res.status})`);
  return await res.blob();
}

function supportsImageClipboard() {
  return (
    typeof window !== "undefined" &&
    !!(navigator as any)?.clipboard?.write &&
    typeof (window as any).ClipboardItem !== "undefined"
  );
}

/* ================= component ================= */

export default function SupplierCopyCard({ item }: { item: Item }) {
  const [copiedText, setCopiedText] = React.useState(false);
  const [copiedImage, setCopiedImage] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [downloading, setDownloading] = React.useState(false);

  const imageUrl = item.image || "/placeholder.png";
  const proxiedUrl = isRemoteUrl(imageUrl)
    ? `/api/admin/image-proxy?url=${encodeURIComponent(imageUrl)}`
    : imageUrl;

  const text = React.useMemo(() => buildSupplierText(item), [item]);

  async function copyText() {
    setError(null);
    try {
      await (navigator as any).clipboard.writeText(text);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 1200);
    } catch {
      setError("Failed to copy text.");
    }
  }

  async function copyImage() {
    setError(null);

    if (!supportsImageClipboard()) {
      setError("Image clipboard not supported in this browser.");
      return;
    }

    try {
      const blob = await fetchAsBlob(proxiedUrl);
      const type = blob.type || "image/png";
      const item = new (window as any).ClipboardItem({ [type]: blob });
      await (navigator as any).clipboard.write([item]);

      setCopiedImage(true);
      setTimeout(() => setCopiedImage(false), 1200);
    } catch {
      setError("Failed to copy image.");
    }
  }

  async function downloadImage() {
    setError(null);
    setDownloading(true);
    try {
      const blob = await fetchAsBlob(proxiedUrl);
      const ext =
        blob.type && blob.type.includes("/")
          ? blob.type.split("/")[1].replace("jpeg", "jpg")
          : "png";

      const base =
        item.slug ||
        item.name
          .slice(0, 40)
          .replace(/[^a-z0-9]+/gi, "-")
          .replace(/^-+|-+$/g, "") ||
        "product";

      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${base}-${item.id.slice(-6)}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch {
      setError("Failed to download image.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-white p-3">
      <div className="flex gap-3">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border bg-gray-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt={item.name} className="h-full w-full object-contain" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold truncate">{item.name}</div>
              <div className="text-xs text-gray-500">
                Qty: {item.qty} • Size: {item.size || "—"}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={copyText}
                className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
              >
                {copiedText ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Text copied
                  </>
                ) : (
                  <>
                    <ClipboardCopy className="h-4 w-4" /> Copy text
                  </>
                )}
              </button>

              <button
                onClick={copyImage}
                className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
              >
                {copiedImage ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Image copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" /> Copy image
                  </>
                )}
              </button>

              <button
                onClick={downloadImage}
                disabled={downloading}
                className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
              >
                <Download className="h-4 w-4" />
                {downloading ? "Downloading..." : "Download"}
              </button>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border bg-emerald-50 p-3">
            <pre className="whitespace-pre-wrap break-words text-sm font-medium text-emerald-950">
{text}
            </pre>

            <div className="mt-2 flex items-center gap-2 text-[11px] text-emerald-900/70">
              <ImageIcon className="h-3.5 w-3.5" />
              <a
                href={imageUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 underline break-all"
              >
                open image <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {error && (
              <div className="mt-2 text-[12px] text-amber-700">{error}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
