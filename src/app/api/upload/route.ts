// src/app/api/upload/route.ts
import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import { randomBytes } from "crypto";
import path from "path";

export const runtime = "nodejs"; // garante FS local

const MAX_BYTES = 8 * 1024 * 1024; // 8MB

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only images are allowed" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Max file size is 8MB" }, { status: 400 });
    }

    // Lê o conteúdo para buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Caminho final: /public/uploads/xxxx.ext
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
    const name = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
    const filePath = path.join(uploadsDir, name);

    await writeFile(filePath, buffer);

    // URL público (servido pelo Next a partir de /public)
    const url = `/uploads/${name}`;

    return NextResponse.json({ ok: true, url }, { status: 201 });
  } catch (e: any) {
    console.error("upload.error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Upload failed" },
      { status: 500 }
    );
  }
}
