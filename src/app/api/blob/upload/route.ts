// src/app/api/blob/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  handleUpload,
  type HandleUploadBody, // <- tipagem do body exigida pela tua versão
} from "@vercel/blob/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type UploadCompletedArgs = {
  blob: { url: string };
  tokenPayload?: unknown;
};

export async function POST(req: NextRequest) {
  try {
    // A tua versão do handleUpload requer 'body' tipado como HandleUploadBody.
    // Tentamos ler JSON; se não vier (ex.: outra etapa), usamos {} tipado.
    let body: HandleUploadBody;
    try {
      body = (await req.json()) as HandleUploadBody;
    } catch {
      body = {} as HandleUploadBody;
    }

    const result = await handleUpload({
      request: req,
      body, // <-- agora com o tipo correto
      onBeforeGenerateToken: async () => ({
        pathname: "footballworld/products",
        access: "public",
        maximumSizeInBytes: 8 * 1024 * 1024, // 8 MB
        allowedContentTypes: [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/avif",
          "image/gif",
        ],
        // allowedOrigins: ["http://localhost:3000","https://teu-dominio.com"], // opcional
      }),
      onUploadCompleted: async ({ blob }: UploadCompletedArgs) => {
        console.log("✅ Blob uploaded:", blob.url);
      },
    });

    // A tua build expõe o union:
    // - { type: "blob.generate-client-token", clientToken: string }
    // - { type: "blob.upload-completed", response: "ok" }  // nota: 'ok' string, sem .json()
    if (result.type === "blob.generate-client-token") {
      return NextResponse.json({ clientToken: result.clientToken });
    }
    if (result.type === "blob.upload-completed") {
      // O URL público é devolvido ao cliente pelo upload() — aqui só confirmamos.
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unexpected state" }, { status: 500 });
  } catch (err: any) {
    console.error("❌ blob.upload.error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to upload" },
      { status: 500 }
    );
  }
}
