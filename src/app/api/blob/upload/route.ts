// src/app/api/blob/upload/route.ts
import { NextResponse } from "next/server";
import { handleUpload } from "@vercel/blob/client";

// Node runtime
export const runtime = "nodejs";

/**
 * Recebe a chamada do cliente (upload helper) e devolve um URL assinado de upload.
 * Podes restringir tipos, controlar nomes, etc. nos callbacks.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async () => ({
        // restringe a tipos de imagem se quiseres:
        // allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
      }),
      onUploadCompleted: async () => {
        // opcional: logging/auditoria
      },
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("blob upload route error:", err);
    return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 });
  }
}
