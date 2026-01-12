// src/components/admin/SupplierCopyCard.tsx
"use client";

import React from "react";
import {
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

// Firefox geralmente não suporta image clipboard via ClipboardItem
function isFirefox() {
  if (typeof navigator === "undefined") return false;
  return /firefox/i.test(navigator.userAgent);
}

function supportsImageClipboard() {
  // heurística simples e segura
  return (
    typeof window !== "undefined" &&
    !!(navigator as any)?.clipboard?.write &&
    typeof (window as any).ClipboardItem !== "undefined" &&
    !isFirefox()
  );
}

export default function SupplierCopyCard({ item }: { item: Item }) {
  const [copied, setCopied] = React.useState(false);
  const [copyError, setCopyError] = React.useState<string | null>(null);
  const [downloading, setDownloading] = React.useState(false);

  const imageUrl = item.image || "/placeholder.png";

  // ✅ Usa proxy se for remoto (resolve CORS)
  const proxiedUrl = isRemoteUrl(imageUrl)
    ? `/api/admin/image-proxy?url=${encodeURIComponent(imageUrl)}`
    : imageUrl;

  const text = React.useMemo(() => buildSupplierText(item), [item]);

  const doCopy = async () => {
    setCopyError(null);

    if (!(navigator as any).clipboard) {
      setCopyError("Clipboard API not available in this browser/context.");
      return;
    }

    // Sempre copia o texto (isso é o que tu MAIS precisas)
    try {
      await (navigator as any).clipboard.writeText(text);
    } catch (e: any) {
      setCopyError(String(e?.message || e || "Couldn’t copy text."));
      return;
    }

    // Depois tenta copiar a imagem SE suportado
    if (!supportsImageClipboard()) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);

      setCopyError(
        "Your browser can’t copy images to clipboard (common on Firefox). Text copied ✅ Use Download/Open for the image."
      );
      return;
    }

    try {
      const blob = await fetchAsBlob(proxiedUrl);
      const imgType = blob.type || "image/png";
      const imgItem = new (window as any).ClipboardItem({ [imgType]: blob });

      // Copia imagem (texto já foi copiado)
      await (navigator as any).clipboard.write([imgItem]);

      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
      setCopyError("Text copied ✅ but couldn’t copy image. Use Download/Open.");
    }
  };

  const doDownload = async () => {
    setCopyError(null);
    setDownloading(true);
    try {
      const blob = await fetchAsBlob(proxiedUrl);
      const ext = (blob.type && blob.type.includes("/"))
        ? blob.type.split("/")[1].replace("jpeg", "jpg")
        : "png";

      const fileNameBase =
        item.slug?.trim() ||
        item.name.trim().slice(0, 40).replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") ||
        "product";

      const fileName = `${fileNameBase}-${item.id.slice(-6)}.${ext}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setCopyError(String(e?.message || e || "Download failed"));
    } finally {
      setDownloading(false);
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

            <div className="shrink-0 flex items-center gap-2">
              <button
                type="button"
                onClick={doCopy}
                className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
                title="Copy (text always, image if supported)"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy text {supportsImageClipboard() ? "+ image" : ""}
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={doDownload}
                disabled={downloading}
                className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
                title="Download image"
              >
                <Download className="h-4 w-4" />
                {downloading ? "Downloading..." : "Download"}
              </button>
            </div>
          </div>

          {/* “Bolha” estilo WhatsApp */}
          <div className="mt-3 rounded-2xl border bg-emerald-50 p-3">
            <pre className="whitespace-pre-wrap break-words text-sm leading-5 text-emerald-950 font-medium">
{text}
            </pre>

            <div className="mt-2 flex items-center gap-2 text-[11px] text-emerald-900/70">
              <ImageIcon className="h-3.5 w-3.5" />
              Image:
              <a
                href={imageUrl}
                target="_blank"
                className="underline break-all inline-flex items-center gap-1"
                rel="noreferrer"
              >
                open <ExternalLink className="h-3 w-3" />
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
