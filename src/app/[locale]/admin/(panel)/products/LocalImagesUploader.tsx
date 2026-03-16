// src/app/admin/(panel)/products/LocalImagesUploader.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { upload } from "@vercel/blob/client";

const ALLOWED = new Set(["image/jpeg","image/png","image/webp","image/avif","image/gif"]);
const MAX_BYTES = 8 * 1024 * 1024;

export default function LocalImagesUploader({
  name = "imagesText",
  initial = [],
  label = "Images",
}: { name?: string; initial?: string[]; label?: string }) {
  const [imageUrls, setImageUrls] = useState<string[]>([...initial]);
  const [uploading, setUploading] = useState(false);

  function uniqueName(file: File) {
    const safe = file.name.replace(/\s+/g, "_");
    const id = (typeof crypto !== "undefined" && "randomUUID" in crypto)
      ? crypto.randomUUID()
      : String(Date.now());
    return `${id}_${safe}`;
  }

  async function onFiles(files: FileList | null, input?: HTMLInputElement) {
    if (!files?.length) return;
    setUploading(true);
    const errors: string[] = [];

    for (const f of Array.from(files)) {
      if (!ALLOWED.has(f.type)) { errors.push(`${f.name}: unsupported type`); continue; }
      if (f.size > MAX_BYTES) { errors.push(`${f.name}: > 8MB`); continue; }

      try {
        const { url } = await upload(uniqueName(f), f, {
          access: "public",
          handleUploadUrl: "/api/blob/upload",
        });
        setImageUrls(prev => prev.includes(url) ? prev : [...prev, url]);
      } catch (e: any) {
        errors.push(`${f.name}: ${e?.message ?? "upload failed"}`);
      }
    }

    if (input) input.value = "";
    setUploading(false);
    if (errors.length) alert("Some files failed:\n" + errors.join("\n"));
  }

  function move(from: number, to: number) {
    setImageUrls(prev => {
      const arr = [...prev];
      if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr;
      const [it] = arr.splice(from, 1);
      arr.splice(to, 0, it);
      return arr;
    });
  }
  function removeAt(i: number) { setImageUrls(prev => prev.filter((_, idx) => idx !== i)); }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => onFiles(e.target.files, e.target)}
          className="block rounded-xl border px-3 py-1.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-black file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-gray-900"
        />
      </div>

      {/* Campo que o teu server action lê (uma linha por URL) */}
      <textarea name={name} className="hidden" readOnly value={imageUrls.join("\n")} />

      {imageUrls.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {imageUrls.map((u, i) => (
            <div key={u} className="group relative rounded-xl border bg-white overflow-hidden">
              <Image src={u} alt={`image ${i+1}`} unoptimized width={400} height={400}
                     className="aspect-[3/4] w-full object-contain bg-white" />
              <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 p-1.5 opacity-0 group-hover:opacity-100 transition">
                <div className="flex gap-1">
                  <button type="button" onClick={() => move(i, Math.max(0, i-1))}
                    className="rounded-md bg-white/90 px-2 text-xs border hover:bg-white">←</button>
                  <button type="button" onClick={() => move(i, Math.min(imageUrls.length-1, i+1))}
                    className="rounded-md bg-white/90 px-2 text-xs border hover:bg-white">→</button>
                </div>
                <button type="button" onClick={() => removeAt(i)}
                  className="rounded-md bg-white/90 px-2 text-xs border hover:bg-white text-red-600">Remove</button>
              </div>
              <div className="absolute left-1.5 top-1.5 rounded-md bg-black/70 text-white text-[11px] px-1.5 py-0.5">{i+1}</div>
            </div>
          ))}
        </div>
      )}
      {uploading && <p className="text-xs text-blue-600">Uploading images…</p>}
      <p className="text-xs text-gray-500">First image is the main thumbnail.</p>
    </div>
  );
}
