// src/components/admin/SupplierCopyCard.tsx
"use client";

import React from "react";
import { Copy, CheckCircle2, Image as ImageIcon } from "lucide-react";

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

function norm(s?: string | null) {
  const x = String(s ?? "").trim();
  return x.length ? x : null;
}

function pickFirst(options: Record<string, string> | undefined, keys: string[]) {
  if (!options) return null;
  for (const k of keys) {
    const v = options[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return null;
}

function toLowerClean(s: string) {
  return s.trim().toLowerCase();
}

function deriveVersion(item: Item) {
  // ✅ Pedido: se tiver "Player Version" no nome, deve ser "player"
  const nameLc = toLowerClean(item.name);
  if (nameLc.includes("player version")) return "player";

  const opt = item.options ?? {};

  const maybe =
    pickFirst(opt, ["version", "kitVersion", "edition", "type", "variant"]) ??
    pickFirst(opt, ["jerseyType", "shirtType", "model"]) ??
    null;

  if (maybe) {
    const lc = toLowerClean(maybe);
    if (lc.includes("fan")) return "fan";
    if (lc.includes("player")) return "player";
    return maybe;
  }

  if (nameLc.includes("player")) return "player";
  if (nameLc.includes("fan")) return "fan";

  return "fan";
}

function buildSupplierText(item: Item) {
  const persName = norm(item.personalization?.name);
  const persNumber = norm(item.personalization?.number);
  const badges = norm(item.options?.badges);
  const size = norm(item.size);
  const version = deriveVersion(item);

  const lines: string[] = [];
  if (persName) lines.push(`Name : ${persName}`);
  if (persNumber) lines.push(`Number : ${persNumber}`);
  if (badges) lines.push(`Badges : ${badges}`);

  lines.push(version); // fan / player
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

export default function SupplierCopyCard({ item }: { item: Item }) {
  const [copied, setCopied] = React.useState(false);
  const [copyError, setCopyError] = React.useState<string | null>(null);

  const imageUrl = item.image || "/placeholder.png";

  // ✅ Usa proxy se for remoto (resolve CORS)
  const proxiedUrl = isRemoteUrl(imageUrl)
    ? `/api/admin/image-proxy?url=${encodeURIComponent(imageUrl)}`
    : imageUrl;

  const text = React.useMemo(() => buildSupplierText(item), [item]);

  const doCopy = async () => {
    setCopyError(null);

    // precisa de HTTPS ou localhost (secure context)
    if (!navigator.clipboard) {
      setCopyError("Clipboard API not available in this browser/context.");
      return;
    }

    try {
      const blob = await fetchAsBlob(proxiedUrl);

      const imgType = blob.type || "image/png";
      const imgItem = new ClipboardItem({ [imgType]: blob });

      const textBlob = new Blob([text], { type: "text/plain" });
      const textItem = new ClipboardItem({ "text/plain": textBlob });

      await navigator.clipboard.write([imgItem, textItem]);

      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch (e: any) {
      // fallback: texto only
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
        setCopyError("Couldn’t copy image — copied text only.");
      } catch (err: any) {
        setCopyError(String(err?.message || err || "Copy failed"));
      }
    }
  };

  return (
    <div className="rounded-2xl border p-3 bg-white">
      <div className="flex gap-3">
        <div className="h-24 w-24 overflow-hidden rounded-xl bg-gray-50 border shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt={item.name} className="h-full w-full object-contain" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold leading-tight truncate">{item.name}</div>
              <div className="text-xs text-gray-500">
                Qty: {item.qty} • Size: {item.size || "—"}
              </div>
            </div>

            <button
              type="button"
              onClick={doCopy}
              className="shrink-0 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
              title="Copy text + image"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy text + image
                </>
              )}
            </button>
          </div>

          {/* “Bolha” estilo WhatsApp */}
          <div className="mt-3 rounded-2xl border bg-emerald-50 p-3">
            <pre className="whitespace-pre-wrap break-words text-sm leading-5 text-emerald-950 font-medium">
{text}
            </pre>

            <div className="mt-2 flex items-center gap-2 text-[11px] text-emerald-900/70">
              <ImageIcon className="h-3.5 w-3.5" />
              Image:{" "}
              <a
                href={imageUrl}
                target="_blank"
                className="underline break-all"
                rel="noreferrer"
              >
                open
              </a>
            </div>

            {copyError ? (
              <div className="mt-2 text-[12px] text-amber-700">{copyError}</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
