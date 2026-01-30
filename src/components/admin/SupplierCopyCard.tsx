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

/* ========================= types ========================= */

type AnyObj = Record<string, any>;

type Item = {
  id: string;
  name: string;
  slug: string | null;
  image?: string | null;
  qty: number;
  unitPriceCents?: number;
  totalPriceCents?: number;

  // ✅ dados reais
  snapshotJson?: unknown;
  personalizationJson?: unknown;

  // fallback (podem ou não existir)
  size?: string | null;
  options?: Record<string, string>;
  personalization?: { name?: string | null; number?: string | null } | null;
};

/* ========================= utils ========================= */

function safeParseJSON(input: unknown): AnyObj {
  if (!input) return {};
  if (typeof input === "object") return input as AnyObj;
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      if (parsed && typeof parsed === "object") return parsed as AnyObj;
    } catch {}
  }
  return {};
}

function norm(v?: string | null) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

function pickStr(o: unknown, keys: string[]): string | null {
  if (!o || typeof o !== "object") return null;
  const obj = o as AnyObj;
  for (const k of keys) {
    const v = obj[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return null;
}

function lc(s: string) {
  return s.trim().toLowerCase();
}

/* ========================= extraction ========================= */

function extractFromSnapshot(item: Item) {
  const snap = safeParseJSON(item.snapshotJson);

  // -------- size --------
  const size =
    norm(
      pickStr(snap, ["size", "sizeLabel", "variant", "skuSize"]) ??
      item.size
    ) ?? null;

  // -------- badges --------
  const badgesRaw =
    pickStr(snap, ["badges", "competition_badge"]) ??
    pickStr(item.options, ["badges"]) ??
    null;

  // -------- personalization --------
  const persSnap =
    typeof snap.personalization === "object" ? snap.personalization : {};

  const persJson = safeParseJSON(item.personalizationJson);

  const name =
    norm(
      pickStr(persSnap, ["name", "playerName", "customName", "shirtName"]) ??
      pickStr(persJson, ["name", "playerName", "customName", "shirtName"]) ??
      item.personalization?.name
    ) ?? null;

  const number =
    norm(
      pickStr(persSnap, ["number", "playerNumber", "customNumber", "shirtNumber"]) ??
      pickStr(persJson, ["number", "playerNumber", "customNumber", "shirtNumber"]) ??
      item.personalization?.number
    ) ?? null;

  return {
    size,
    badges: badgesRaw,
    personalization: name || number ? { name, number } : null,
  };
}

/* ========================= supplier text ========================= */

function deriveVersion(item: Item) {
  if (lc(item.name).includes("player version")) return "player";
  if (lc(item.name).includes("player")) return "player";
  if (lc(item.name).includes("fan")) return "fan";
  return "fan";
}

function buildSupplierText(item: Item) {
  const extracted = extractFromSnapshot(item);
  const lines: string[] = [];

  if (extracted.personalization?.name)
    lines.push(`Name : ${extracted.personalization.name}`);

  if (extracted.personalization?.number)
    lines.push(`Number : ${extracted.personalization.number}`);

  if (extracted.badges)
    lines.push(`Badges : ${extracted.badges}`);

  lines.push(deriveVersion(item));
  lines.push(`size : ${extracted.size ?? "—"}`);

  return lines.join("\n");
}

/* ========================= helpers ========================= */

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

/* ========================= component ========================= */

export default function SupplierCopyCard({ item }: { item: Item }) {
  const [copiedText, setCopiedText] = React.useState(false);
  const [copiedImage, setCopiedImage] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [downloading, setDownloading] = React.useState(false);

  const extracted = React.useMemo(() => extractFromSnapshot(item), [item]);

  const imageUrl = item.image || "/placeholder.png";
  const proxiedUrl = isRemoteUrl(imageUrl)
    ? `/api/admin/image-proxy?url=${encodeURIComponent(imageUrl)}`
    : imageUrl;

  const text = React.useMemo(() => buildSupplierText(item), [item]);

  async function copyText() {
    setError(null);
    try {
      await navigator.clipboard.writeText(text);
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
      const itemClip = new (window as any).ClipboardItem({ [type]: blob });
      await (navigator as any).clipboard.write([itemClip]);

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
                Qty: {item.qty} • Size: {extracted.size ?? "—"}
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
