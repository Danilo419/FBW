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

  snapshotJson?: unknown;
  personalizationJson?: unknown;

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
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return null;
}

function lc(s: string) {
  return s.trim().toLowerCase();
}

/* ========================= extraction ========================= */

function extractOptionsObj(snap: AnyObj): AnyObj {
  const a = safeParseJSON((snap as any)?.optionsJson);
  if (Object.keys(a).length) return a;

  const b = safeParseJSON((snap as any)?.options);
  if (Object.keys(b).length) return b;

  const c = safeParseJSON((snap as any)?.selected);
  if (Object.keys(c).length) return c;

  const d = safeParseJSON((snap as any)?.customization);
  if (Object.keys(d).length) return d;

  const e = safeParseJSON((snap as any)?.customize);
  if (Object.keys(e).length) return e;

  return {};
}

function extractPersonalization(item: Item, snap: AnyObj, optionsObj: AnyObj) {
  const snapPers =
    snap?.personalization && typeof snap.personalization === "object"
      ? (snap.personalization as AnyObj)
      : {};

  const itPersJ = safeParseJSON(item.personalizationJson);
  const snapPersJ = safeParseJSON((snap as any)?.personalizationJson);

  const NAME_KEYS = [
    "name",
    "playerName",
    "customName",
    "shirtName",
    "custName",
    "customerName",
    "nameOnShirt",
    "name_on_shirt",
  ];

  const NUMBER_KEYS = [
    "number",
    "playerNumber",
    "customNumber",
    "shirtNumber",
    "custNumber",
    "customerNumber",
    "numberOnShirt",
    "number_on_shirt",
  ];

  const name =
    norm(
      pickStr(snapPers, NAME_KEYS) ??
        pickStr(snapPersJ, NAME_KEYS) ??
        pickStr(itPersJ, NAME_KEYS) ??
        pickStr(optionsObj, NAME_KEYS) ??
        pickStr(snap, NAME_KEYS) ??
        item.personalization?.name
    ) ?? null;

  const numberRaw =
    norm(
      pickStr(snapPers, NUMBER_KEYS) ??
        pickStr(snapPersJ, NUMBER_KEYS) ??
        pickStr(itPersJ, NUMBER_KEYS) ??
        pickStr(optionsObj, NUMBER_KEYS) ??
        pickStr(snap, NUMBER_KEYS) ??
        item.personalization?.number
    ) ?? null;

  const number =
    numberRaw != null
      ? String(numberRaw).trim().match(/\d+/)?.[0] ?? String(numberRaw).trim()
      : null;

  if (!name && !number) return null;
  return { name, number };
}

function extractFromSnapshot(item: Item) {
  const snap = safeParseJSON(item.snapshotJson);
  const optionsObj = extractOptionsObj(snap);

  const size =
    norm(
      pickStr(optionsObj, ["size", "sizeLabel", "variant", "skuSize"]) ??
        pickStr(snap, ["size", "sizeLabel", "variant", "skuSize"]) ??
        item.size
    ) ?? null;

  const badges =
    pickStr(optionsObj, ["badges", "competition_badge"]) ??
    pickStr(snap, ["badges", "competition_badge"]) ??
    pickStr(item.options, ["badges"]) ??
    null;

  const personalization = extractPersonalization(item, snap, optionsObj);

  return { size, badges, personalization };
}

/* ========================= supplier text ========================= */

function deriveVersion(item: Item) {
  if (lc(item.name).includes("player version")) return "player";
  if (lc(item.name).includes("player")) return "player";
  if (lc(item.name).includes("fan")) return "fan";
  return "fan";
}

/** ✅ ORDEM FINAL PEDIDA */
function buildSupplierText(item: Item) {
  const extracted = extractFromSnapshot(item);
  const lines: string[] = [];

  // 1️⃣ versão
  lines.push(deriveVersion(item));

  // 2️⃣ tamanho
  lines.push(`size : ${extracted.size ?? "—"}`);

  // 3️⃣ nome
  if (extracted.personalization?.name) {
    lines.push(`Name : ${extracted.personalization.name}`);
  }

  // 4️⃣ número
  if (extracted.personalization?.number) {
    lines.push(`Number : ${extracted.personalization.number}`);
  }

  // 5️⃣ badges
  if (extracted.badges) {
    lines.push(`Badges : ${extracted.badges}`);
  }

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

            {error && <div className="mt-2 text-[12px] text-amber-700">{error}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
