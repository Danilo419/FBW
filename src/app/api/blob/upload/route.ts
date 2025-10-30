// src/app/api/blob/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  handleUpload,
  type HandleUploadBody,
} from "@vercel/blob/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Tipagem usada no callback de upload completo
 */
type UploadCompletedArgs = {
  blob: { url: string };
  tokenPayload?: unknown;
};

export async function POST(req: NextRequest) {
  try {
    // ================== 1. Garante corpo tipado ==================
    let body: HandleUploadBody;
    try {
      body = (await req.json()) as HandleUploadBody;
    } catch {
      body = {} as HandleUploadBody;
    }

    // ================== 2. Executa upload ==================
    const result = await handleUpload({
      request: req,
      body,
      onBeforeGenerateToken: async () => ({
        pathname: "footballworld/products",
        access: "public", // URLs públicas
        maximumSizeInBytes: 8 * 1024 * 1024, // 8 MB
        allowedContentTypes: [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/avif",
          "image/gif",
        ],
        // allowedOrigins: ["http://localhost:3000", "https://teu-dominio.com"], // opcional
      }),
      onUploadCompleted: async ({ blob }: UploadCompletedArgs) => {
        console.log("✅ Blob uploaded:", blob.url);
      },
    });

    // ================== 3. Retorna resposta apropriada ==================
    if (result.type === "blob.generate-client-token") {
      return NextResponse.json({ clientToken: result.clientToken });
    }
    if (result.type === "blob.upload-completed") {
      return NextResponse.json({ ok: true });
    }

    // Caso não corresponda a nenhum tipo conhecido
    return NextResponse.json({ error: "Unexpected state" }, { status: 500 });
  } catch (err: any) {
    console.error("❌ blob.upload.error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to upload" },
      { status: 500 }
    );
  }
}
