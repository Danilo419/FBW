// src/app/api/blob/upload/route.ts
import { NextResponse } from "next/server";
import { handleUpload } from "@vercel/blob/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const result = await handleUpload({
      request,
      body,
      // Define regras antes de gerar o token/URL assinado
      onBeforeGenerateToken: async () => ({
        maximumSizeInBytes: 8 * 1024 * 1024, // 8MB
        allowedContentTypes: [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/avif",
          "image/gif",
        ],
        // opcional: restringir origens (frontends) autorizadas
        // allowedOrigins: ["http://localhost:3000", "https://teu-dominio.com"],
      }),
      // Callback depois do upload concluir (opcional: logging/auditoria)
      onUploadCompleted: async ({ blob }) => {
        console.log("Blob uploaded:", blob.url);
      },
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("blob.upload.error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
