// src/app/api/upload/route.ts
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { randomUUID } from "crypto";

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

function sanitizeName(name: string) {
  return name.replace(/[^\w.\-]+/g, "_");
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json({ error: "Only images are allowed" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Max file size is 8MB" }, { status: 400 });
    }

    const baseName = `${randomUUID()}_${sanitizeName(file.name)}`;
    const key = `products/${baseName}`;

    // ⬇️ Envia o próprio File para o Blob (corrige o erro de tipo)
    const { url } = await put(key, file, {
      access: "public",
      contentType: file.type || "application/octet-stream",
      addRandomSuffix: false,
    });

    return NextResponse.json({ ok: true, url }, { status: 201 });
  } catch (e: any) {
    console.error("upload.error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Upload failed" },
      { status: 500 }
    );
  }
}
