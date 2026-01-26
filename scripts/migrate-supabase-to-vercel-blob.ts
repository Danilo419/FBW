/* scripts/migrate-supabase-to-vercel-blob.ts
 *
 * Script para:
 *  - Listar TODOS os ficheiros de um bucket do Supabase Storage (recursivo)
 *  - Fazer download de cada ficheiro via Supabase
 *  - Fazer upload para o Vercel Blob
 *  - Guardar mapping path->blobUrl e urlAntigo->urlNovo
 *  - Atualizar produtos na BD (Prisma) substituindo URLs do Supabase pelas URLs do Blob
 *
 * COMANDO:
 *  npx tsx scripts/migrate-supabase-to-vercel-blob.ts
 *
 * Requer:
 *  npm i undici
 */

import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { put } from "@vercel/blob";
import crypto from "crypto";
import path from "path";

// ✅ undici (forçar IPv4 + fetch)
import { Agent, fetch as undiciFetch, setGlobalDispatcher } from "undici";

/* ========================= FORCE IPV4 (COMMON WINDOWS FIX) ========================= */
setGlobalDispatcher(
  new Agent({
    connect: {
      family: 4,
    },
  })
);

// Força fetch do undici (mesmo que o Node já tenha fetch)
(globalThis as any).fetch = undiciFetch as any;

const prisma = new PrismaClient();

/* ========================= ENV ========================= */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "products";

const VERCEL_BLOB_RW_TOKEN = process.env.VERCEL_BLOB_RW_TOKEN;

const DRY_RUN = (process.env.DRY_RUN || "false").toLowerCase() === "true";
const VERCEL_BLOB_PREFIX = (process.env.VERCEL_BLOB_PREFIX || "supabase").replace(/^\/+|\/+$/g, "");

/* ========================= VALIDATION ========================= */

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Faltam SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env");
  process.exit(1);
}
if (!SUPABASE_URL.startsWith("http")) {
  console.error('❌ SUPABASE_URL inválida. Deve começar com "https://"...');
  process.exit(1);
}

if (!VERCEL_BLOB_RW_TOKEN) {
  console.error("❌ Falta VERCEL_BLOB_RW_TOKEN no .env");
  process.exit(1);
}

/* ========================= SUPABASE CLIENT (FORCE FETCH) ========================= */
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  global: {
    fetch: undiciFetch as any,
  },
});

/* ========================= HELPERS ========================= */

function safeLog(s: string) {
  console.log(s);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function sha1(buf: Buffer) {
  return crypto.createHash("sha1").update(buf).digest("hex");
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
    case "mp4":
      return "video/mp4";
    case "webm":
      return "video/webm";
    case "pdf":
      return "application/pdf";
    default:
      return "application/octet-stream";
  }
}

function normalizeSlashes(p: string) {
  return p.replace(/\\/g, "/").replace(/^\/+/, "");
}

/** Constrói URL público padrão do Supabase (para match direto) */
function supabasePublicUrlForPath(filePath: string) {
  const p = normalizeSlashes(filePath);
  return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_STORAGE_BUCKET}/${p}`;
}

/**
 * Tenta extrair o "path dentro do bucket" a partir de:
 * - URL pública: /storage/v1/object/public/<bucket>/<path>
 * - URL signed:  /storage/v1/object/sign/<bucket>/<path>?...
 */
function extractSupabasePathFromUrl(url: string): string | null {
  if (!url || typeof url !== "string") return null;

  let u: URL | null = null;
  try {
    u = new URL(url);
  } catch {
    return null;
  }

  if (!u.pathname.includes("/storage/v1/object/")) return null;

  const publicPrefix = `/storage/v1/object/public/${SUPABASE_STORAGE_BUCKET}/`;
  if (u.pathname.startsWith(publicPrefix)) {
    return decodeURIComponent(u.pathname.slice(publicPrefix.length));
  }

  const signPrefix = `/storage/v1/object/sign/${SUPABASE_STORAGE_BUCKET}/`;
  if (u.pathname.startsWith(signPrefix)) {
    return decodeURIComponent(u.pathname.slice(signPrefix.length));
  }

  return null;
}

async function blobToBuffer(b: Blob): Promise<Buffer> {
  const ab = await b.arrayBuffer();
  return Buffer.from(ab);
}

/* ========================= PREFLIGHT (ONLY STORAGE) ========================= */

async function preflight() {
  safeLog("🔎 Preflight: a testar conectividade com Supabase (Storage)...");

  // ✅ Só testamos endpoints que interessam para este script
  const urlsToTest = [
    `${SUPABASE_URL!}/storage/v1/bucket`, // pode dar 400/401, mas prova conectividade
    `${SUPABASE_URL!}/storage/v1/object/list/${SUPABASE_STORAGE_BUCKET}`, // pode dar 404/401, mas prova rota
  ];

  for (const u of urlsToTest) {
    try {
      const res = await undiciFetch(u, { method: "GET" });
      safeLog(`✅ OK: ${u} -> ${res.status}`);
    } catch (err: any) {
      console.error(`❌ FALHOU: ${u}`);
      console.error("   Erro:", err?.message || err);
      if (err?.cause) console.error("   Cause:", err.cause);
      throw err;
    }
  }

  safeLog("✅ Preflight OK (Storage).\n");
}

/* ========================= STORAGE LIST (RECURSIVE) ========================= */

async function listAllFilesRecursive(prefix = ""): Promise<string[]> {
  const files: string[] = [];
  const foldersToVisit: string[] = [prefix];

  while (foldersToVisit.length) {
    const currentPrefix = foldersToVisit.pop() || "";
    let offset = 0;

    for (;;) {
      const { data, error } = await supabase.storage
        .from(SUPABASE_STORAGE_BUCKET)
        .list(currentPrefix, {
          limit: 1000,
          offset,
          sortBy: { column: "name", order: "asc" },
        });

      if (error) {
        console.error(`❌ Erro a listar prefix "${currentPrefix}":`, error.message);
        break;
      }

      if (!data || data.length === 0) break;

      for (const item of data as any[]) {
        const name: string = item?.name;
        if (!name) continue;

        const isFolder = !item?.metadata && !item?.id;
        if (isFolder) {
          const nextPrefix = normalizeSlashes(path.posix.join(currentPrefix, name));
          foldersToVisit.push(nextPrefix);
        } else {
          const filePath = normalizeSlashes(path.posix.join(currentPrefix, name));
          files.push(filePath);
        }
      }

      if (data.length < 1000) break;
      offset += data.length;
    }
  }

  return files;
}

/* ========================= DOWNLOAD FROM SUPABASE ========================= */

async function downloadFromSupabase(filePath: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  const { data, error } = await supabase.storage.from(SUPABASE_STORAGE_BUCKET).download(filePath);

  if (error || !data) {
    console.error(`⚠️ Falha ao fazer download do Supabase (${filePath}):`, error?.message);
    return null;
  }

  const contentType = (data as any).type || guessContentTypeByExt(path.extname(filePath));
  const buffer = await blobToBuffer(data as unknown as Blob);

  return { buffer, contentType };
}

/* ========================= UPLOAD TO VERCEL BLOB ========================= */

type UploadResult = {
  blobUrl: string;
  blobPath: string;
  sha1: string;
};

async function uploadToVercelBlob(filePath: string, buffer: Buffer, contentType: string): Promise<UploadResult | null> {
  const cleanPath = normalizeSlashes(filePath);
  const blobPath = normalizeSlashes(path.posix.join(VERCEL_BLOB_PREFIX, cleanPath));

  if (DRY_RUN) {
    return {
      blobUrl: `DRY_RUN://blob/${blobPath}`,
      blobPath,
      sha1: sha1(buffer),
    };
  }

  const res = await put(blobPath, buffer, {
    access: "public",
    contentType,
    token: VERCEL_BLOB_RW_TOKEN,
  });

  return {
    blobUrl: res.url,
    blobPath,
    sha1: sha1(buffer),
  };
}

/* ========================= DB UPDATE (PRODUCT) ========================= */

function replaceSupabaseUrlWithBlob(url: string, pathToBlobUrl: Map<string, string>): string {
  const p = extractSupabasePathFromUrl(url);
  if (!p) return url;

  const normalized = normalizeSlashes(p);
  const blobUrl = pathToBlobUrl.get(normalized);
  return blobUrl || url;
}

async function main() {
  safeLog("🚀 Iniciando migração: Supabase Storage ➜ Vercel Blob");
  safeLog(`Supabase bucket: ${SUPABASE_STORAGE_BUCKET}`);
  safeLog(`Blob prefix: ${VERCEL_BLOB_PREFIX}/`);
  safeLog(`DRY_RUN: ${DRY_RUN ? "true" : "false"}`);
  safeLog("--------------------------------------------------------");

  await preflight();

  safeLog("📦 A listar todos os ficheiros do bucket (recursivo)...");
  const allFiles = await listAllFilesRecursive("");

  safeLog(`✅ Encontrados ${allFiles.length} ficheiros no bucket.`);

  const pathToBlobUrl = new Map<string, string>();
  const oldUrlToNewUrl = new Map<string, string>();
  const failedFiles: string[] = [];

  const MAX_RETRIES = 3;

  for (let i = 0; i < allFiles.length; i++) {
    const filePath = allFiles[i];
    if (pathToBlobUrl.has(filePath)) continue;

    safeLog(`➡️  [${i + 1}/${allFiles.length}] ${filePath}`);

    let ok = false;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const dl = await downloadFromSupabase(filePath);
        if (!dl) throw new Error("download_failed");

        const up = await uploadToVercelBlob(filePath, dl.buffer, dl.contentType);
        if (!up) throw new Error("upload_failed");

        pathToBlobUrl.set(filePath, up.blobUrl);

        const oldPublic = supabasePublicUrlForPath(filePath);
        oldUrlToNewUrl.set(oldPublic, up.blobUrl);

        safeLog(`✅  Uploaded: ${up.blobUrl}`);
        ok = true;
        break;
      } catch (e: any) {
        console.error(`⚠️  Tentativa ${attempt}/${MAX_RETRIES} falhou em ${filePath}:`, e?.message || e);
        if (attempt < MAX_RETRIES) await sleep(500 * attempt);
      }
    }

    if (!ok) {
      failedFiles.push(filePath);
      safeLog(`❌  Falhou: ${filePath}`);
    }
  }

  const mappingPathToBlob = Object.fromEntries(pathToBlobUrl.entries());
  const mappingOldToNew = Object.fromEntries(oldUrlToNewUrl.entries());

  const fs = await import("fs/promises");
  await fs.writeFile("scripts/migrate_supabase_to_blob__path_to_blob.json", JSON.stringify(mappingPathToBlob, null, 2), "utf8");
  await fs.writeFile("scripts/migrate_supabase_to_blob__oldurl_to_newurl.json", JSON.stringify(mappingOldToNew, null, 2), "utf8");
  await fs.writeFile("scripts/migrate_supabase_to_blob__failed_files.json", JSON.stringify(failedFiles, null, 2), "utf8");

  safeLog("--------------------------------------------------------");
  safeLog("🗄️  A atualizar BD (Products) substituindo URLs do Supabase por URLs do Blob...");

  const products = await prisma.product.findMany();
  safeLog(`Encontrados ${products.length} produtos.`);

  let updatedCount = 0;

  for (const p of products) {
    const anyProd: any = p as any;
    let changed = false;

    if (typeof anyProd.mainImageUrl === "string" && anyProd.mainImageUrl.includes("/storage/v1/object/")) {
      const newUrl = replaceSupabaseUrlWithBlob(anyProd.mainImageUrl, pathToBlobUrl);
      if (newUrl !== anyProd.mainImageUrl) {
        anyProd.mainImageUrl = newUrl;
        changed = true;
      }
    }

    if (Array.isArray(anyProd.imageUrls) && anyProd.imageUrls.length > 0) {
      const newArr: string[] = [];
      let arrayChanged = false;

      for (const u of anyProd.imageUrls) {
        if (typeof u === "string" && u.includes("/storage/v1/object/")) {
          const newUrl = replaceSupabaseUrlWithBlob(u, pathToBlobUrl);
          newArr.push(newUrl);
          if (newUrl !== u) arrayChanged = true;
        } else {
          newArr.push(u);
        }
      }

      if (arrayChanged) {
        anyProd.imageUrls = newArr;
        changed = true;
      }
    }

    if (changed) {
      // DRY_RUN=true => não escreve na BD
      if (!DRY_RUN) {
        await prisma.product.update({
          where: { id: p.id },
          data: {
            ...(typeof anyProd.mainImageUrl === "string" && { mainImageUrl: anyProd.mainImageUrl }),
            ...(Array.isArray(anyProd.imageUrls) && { imageUrls: anyProd.imageUrls }),
          },
        });
      }
      updatedCount++;
      safeLog(`💾 Produto ${p.id} atualizado.`);
    }
  }

  safeLog("--------------------------------------------------------");
  safeLog("🎉 Concluído.");
  safeLog(` - Ficheiros no bucket: ${allFiles.length}`);
  safeLog(` - Ficheiros migrados: ${pathToBlobUrl.size}`);
  safeLog(` - Ficheiros falhados: ${failedFiles.length}`);
  safeLog(` - Produtos atualizados: ${updatedCount}/${products.length}`);
  safeLog("--------------------------------------------------------");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("❌ Erro geral na migração:", err?.message || err);
  if ((err as any)?.cause) console.error("Cause:", (err as any).cause);
  prisma.$disconnect().finally(() => process.exit(1));
});
