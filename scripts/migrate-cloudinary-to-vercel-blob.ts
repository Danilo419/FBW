/* scripts/migrate-cloudinary-to-vercel-blob.ts
 *
 * Cloudinary ➜ Vercel Blob + update Prisma DB
 *
 * O que faz:
 *  - Lê todos os produtos da BD (Prisma)
 *  - Encontra URLs do Cloudinary (res.cloudinary.com)
 *  - Faz download de cada imagem (HTTP GET)
 *  - Faz upload para Vercel Blob
 *  - Substitui URLs na BD (mainImageUrl + imageUrls)
 *  - Guarda mappings em ficheiros JSON
 *
 * COMANDO:
 *  npx tsx scripts/migrate-cloudinary-to-vercel-blob.ts
 *
 * ENV (recomendado usar .env.local vindo do `vercel env pull`):
 *  DATABASE_URL=...
 *
 *  # ✅ token novo (vem do Vercel CLI):
 *  BLOB_READ_WRITE_TOKEN="vercel_blob_rw_xxx"
 *
 *  # (fallback antigo, se usares):
 *  VERCEL_BLOB_RW_TOKEN="vercel_blob_rw_xxx"
 *
 *  DRY_RUN="true" | "false"        (default: true)
 *  VERCEL_BLOB_PREFIX="cloudinary" (default: cloudinary)
 *
 * NOTAS:
 *  - Este script suporta token no nome novo (BLOB_READ_WRITE_TOKEN) e antigo.
 *  - Inclui timeout + retries para não ficar “preso”.
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { put } from "@vercel/blob";
import crypto from "crypto";
import path from "path";

const prisma = new PrismaClient();

/* ========================= ENV ========================= */

const BLOB_TOKEN =
  process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_BLOB_RW_TOKEN;

const DRY_RUN = (process.env.DRY_RUN || "true").toLowerCase() === "true";
const VERCEL_BLOB_PREFIX = (process.env.VERCEL_BLOB_PREFIX || "cloudinary")
  .replace(/^\/+|\/+$/g, "");

/* ========================= VALIDATION ========================= */

if (!BLOB_TOKEN) {
  console.error(
    "❌ Falta token do Blob. Define BLOB_READ_WRITE_TOKEN (recomendado) ou VERCEL_BLOB_RW_TOKEN no .env/.env.local"
  );
  process.exit(1);
}

/* ========================= HELPERS ========================= */

function log(s: string) {
  console.log(s);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function sha1(buf: Buffer) {
  return crypto.createHash("sha1").update(buf).digest("hex");
}

function isCloudinaryUrl(u: any) {
  return (
    typeof u === "string" &&
    (u.includes("res.cloudinary.com") || u.includes("cloudinary.com"))
  );
}

function normalizeSlashes(p: string) {
  return p.replace(/\\/g, "/").replace(/^\/+/, "");
}

function guessExtFromContentType(ct?: string | null): string {
  const c = (ct || "").toLowerCase();
  if (c.includes("image/jpeg")) return "jpg";
  if (c.includes("image/png")) return "png";
  if (c.includes("image/webp")) return "webp";
  if (c.includes("image/gif")) return "gif";
  if (c.includes("image/avif")) return "avif";
  if (c.includes("image/svg+xml")) return "svg";
  return "jpg";
}

function guessContentTypeByExt(ext: string): string {
  const e = ext.toLowerCase().replace(".", "");
  switch (e) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "svg":
      return "image/svg+xml";
    case "avif":
      return "image/avif";
    default:
      return "application/octet-stream";
  }
}

/** cria um nome estável baseado no URL (dedupe) + extensão */
function blobPathForUrl(url: string, contentType?: string | null) {
  const ext = guessExtFromContentType(contentType) || "jpg";
  const h = crypto.createHash("sha1").update(url).digest("hex").slice(0, 16);
  return normalizeSlashes(
    path.posix.join(VERCEL_BLOB_PREFIX, `cloudinary-${h}.${ext}`)
  );
}

/* ========================= FETCH TIMEOUT ========================= */

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 20000
) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(t);
  }
}

/* ========================= DOWNLOAD (Cloudinary) ========================= */

async function downloadUrlToBuffer(
  url: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const res = await fetchWithTimeout(url, { method: "GET" }, 25000);
    if (!res.ok) {
      console.error(`⚠️ Download falhou ${res.status} ${res.statusText}: ${url}`);
      return null;
    }
    const ct = res.headers.get("content-type") || "application/octet-stream";
    const ab = await res.arrayBuffer();
    return { buffer: Buffer.from(ab), contentType: ct };
  } catch (e: any) {
    console.error(`⚠️ Erro no download: ${url}`, e?.message || e);
    return null;
  }
}

/* ========================= UPLOAD (Vercel Blob) ========================= */

type UploadResult = { blobUrl: string; blobPath: string; sha1: string };

async function uploadToVercelBlob(
  oldUrl: string,
  buffer: Buffer,
  contentType: string
): Promise<UploadResult | null> {
  const blobPath = blobPathForUrl(oldUrl, contentType);

  if (DRY_RUN) {
    return {
      blobUrl: `DRY_RUN://blob/${blobPath}`,
      blobPath,
      sha1: sha1(buffer),
    };
  }

  const res = await put(blobPath, buffer, {
    access: "public",
    contentType: contentType || guessContentTypeByExt(path.extname(blobPath)),
    token: BLOB_TOKEN,
  });

  return { blobUrl: res.url, blobPath, sha1: sha1(buffer) };
}

/* ========================= MIGRATION ========================= */

const urlCache = new Map<string, string>(); // old cloudinary url -> new blob url

async function migrateOneUrl(oldUrl: string, maxRetries = 3): Promise<string> {
  if (!isCloudinaryUrl(oldUrl)) return oldUrl;
  if (urlCache.has(oldUrl)) return urlCache.get(oldUrl)!;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const dl = await downloadUrlToBuffer(oldUrl);
      if (!dl) throw new Error("download_failed");

      const up = await uploadToVercelBlob(oldUrl, dl.buffer, dl.contentType);
      if (!up) throw new Error("upload_failed");

      urlCache.set(oldUrl, up.blobUrl);
      return up.blobUrl;
    } catch (e: any) {
      console.error(
        `⚠️ ${attempt}/${maxRetries} falhou: ${oldUrl} ->`,
        e?.message || e
      );
      if (attempt < maxRetries) await sleep(700 * attempt);
    }
  }

  // se falhar tudo, mantém o URL antigo
  return oldUrl;
}

async function main() {
  log("🚀 Iniciando migração: Cloudinary ➜ Vercel Blob");
  log(`Blob prefix: ${VERCEL_BLOB_PREFIX}/`);
  log(`DRY_RUN: ${DRY_RUN ? "true" : "false"}`);
  log("--------------------------------------------------------");

  const products = await prisma.product.findMany();
  log(`Encontrados ${products.length} produtos.`);

  // mappings para backup
  const oldToNew = new Map<string, string>();
  const failed: string[] = [];

  let productsUpdated = 0;
  let urlsSeen = 0;
  let urlsMigrated = 0;

  const MAX_RETRIES_PER_URL = 3;

  for (let idx = 0; idx < products.length; idx++) {
    const p: any = products[idx] as any;

    let changed = false;

    // mainImageUrl
    if (typeof p.mainImageUrl === "string" && isCloudinaryUrl(p.mainImageUrl)) {
      urlsSeen++;
      const old = p.mainImageUrl;
      const newUrl = await migrateOneUrl(old, MAX_RETRIES_PER_URL);

      if (newUrl !== old) {
        oldToNew.set(old, newUrl);
        p.mainImageUrl = newUrl;
        changed = true;
        urlsMigrated++;
      } else {
        failed.push(old);
      }
    }

    // imageUrls[]
    if (Array.isArray(p.imageUrls) && p.imageUrls.length) {
      const newArr: string[] = [];
      let arrChanged = false;

      for (const u of p.imageUrls) {
        if (typeof u === "string" && isCloudinaryUrl(u)) {
          urlsSeen++;
          const newUrl = await migrateOneUrl(u, MAX_RETRIES_PER_URL);
          newArr.push(newUrl);

          if (newUrl !== u) {
            oldToNew.set(u, newUrl);
            arrChanged = true;
            urlsMigrated++;
          } else {
            failed.push(u);
          }
        } else {
          newArr.push(u);
        }
      }

      if (arrChanged) {
        p.imageUrls = newArr;
        changed = true;
      }
    }

    if (changed) {
      productsUpdated++;
      log(`💾 [${idx + 1}/${products.length}] Produto ${p.id} marcado para update.`);

      if (!DRY_RUN) {
        await prisma.product.update({
          where: { id: p.id },
          data: {
            ...(typeof p.mainImageUrl === "string" && {
              mainImageUrl: p.mainImageUrl,
            }),
            ...(Array.isArray(p.imageUrls) && { imageUrls: p.imageUrls }),
          },
        });
      }
    } else {
      if ((idx + 1) % 50 === 0) {
        log(`… progresso: ${idx + 1}/${products.length}`);
      }
    }
  }

  // guardar mappings
  const fs = await import("fs/promises");
  await fs.writeFile(
    "scripts/migrate_cloudinary_to_blob__oldurl_to_newurl.json",
    JSON.stringify(Object.fromEntries(oldToNew.entries()), null, 2),
    "utf8"
  );
  await fs.writeFile(
    "scripts/migrate_cloudinary_to_blob__failed_urls.json",
    JSON.stringify(Array.from(new Set(failed)), null, 2),
    "utf8"
  );

  log("--------------------------------------------------------");
  log("📄 mappings guardados em:");
  log(" - scripts/migrate_cloudinary_to_blob__oldurl_to_newurl.json");
  log(" - scripts/migrate_cloudinary_to_blob__failed_urls.json");
  log("--------------------------------------------------------");
  log("🎉 Concluído.");
  log(` - URLs Cloudinary encontradas: ${urlsSeen}`);
  log(` - URLs migradas (para Blob): ${urlsMigrated}`);
  log(` - Produtos atualizados: ${productsUpdated}/${products.length}`);
  log(` - Cache (dedupe) size: ${urlCache.size}`);
  log("--------------------------------------------------------");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("❌ Erro geral na migração:", err?.message || err);
  prisma.$disconnect().finally(() => process.exit(1));
});
