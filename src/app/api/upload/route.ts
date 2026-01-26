// src/app/api/upload/route.ts
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);

function safeExtFromType(type: string) {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
    "image/gif": "gif",
  };
  return map[type] ?? "bin";
}

function sanitizeBaseName(name: string) {
  const base = name.replace(/\.[^/.]+$/, "");
  return (
    base
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60) || "image"
  );
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json({ error: "Only images are allowed" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Max file size is 8MB" }, { status: 400 });
    }

    // ✅ Criar um pathname único
    const ext = safeExtFromType(file.type);
    const base = sanitizeBaseName(file.name);
    const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const pathname = `footballworld/products/${base}-${stamp}.${ext}`;

    // ✅ Upload para o Vercel Blob
    const arrayBuffer = await file.arrayBuffer();

    const blob = await put(pathname, arrayBuffer, {
      access: "public",
      contentType: file.type,
    });

    // ⚠️ PutBlobResult pode não ter "size"/"contentType" no type.
    // Usa os valores do próprio File.
    return NextResponse.json(
      {
        ok: true,
        url: blob.url,
        pathname: blob.pathname, // útil para gestão futura (ex: delete)
        contentType: file.type,
        size: file.size,
      },
      { status: 201 }
    );
  } catch (e: any) {
    console.error("upload.error:", e);
    return NextResponse.json({ error: e?.message ?? "Upload failed" }, { status: 500 });
  }
}
