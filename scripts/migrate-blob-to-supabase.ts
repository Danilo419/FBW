/* scripts/migrate-blob-to-supabase.ts
 *
 * Script para:
 *  - Ler todos os produtos da BD
 *  - Encontrar URLs antigos do Vercel Blob (vercel-storage.com)
 *  - Fazer download da imagem
 *  - Fazer upload para o Supabase Storage
 *  - Atualizar o produto com o novo URL
 *
 * COMANDOS:
 *  npx tsx scripts/migrate-blob-to-supabase.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'products';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Faltam SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Cache para não fazer upload duas vezes da mesma imagem.
 * oldUrl -> newUrl
 */
const urlCache = new Map<string, string>();

/**
 * Pequena ajuda para obter extensão do ficheiro a partir do URL
 */
function getExtensionFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('.');
    if (parts.length > 1) {
      return parts[parts.length - 1].toLowerCase().split('?')[0];
    }
  } catch {
    // ignore
  }
  return 'jpg';
}

function guessContentType(ext: string): string {
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Faz download de uma imagem a partir do URL antigo
 */
async function downloadImage(oldUrl: string): Promise<Buffer | null> {
  try {
    const res = await fetch(oldUrl);
    if (!res.ok) {
      console.error(`⚠️ Falha ao fazer download de ${oldUrl}: ${res.status} ${res.statusText}`);
      return null;
    }
    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  } catch (err) {
    console.error(`⚠️ Erro ao fazer fetch de ${oldUrl}:`, err);
    return null;
  }
}

/**
 * Faz upload de um buffer para o Supabase Storage e devolve o URL público
 */
async function uploadToSupabase(buffer: Buffer, path: string, contentType: string): Promise<string | null> {
  const { error } = await supabase.storage
    .from(SUPABASE_STORAGE_BUCKET)
    .upload(path, buffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    console.error(`⚠️ Erro ao fazer upload para Supabase (${path}):`, error.message);
    return null;
  }

  const { data } = supabase.storage.from(SUPABASE_STORAGE_BUCKET).getPublicUrl(path);
  if (!data || !data.publicUrl) {
    console.error('⚠️ Não foi possível obter publicUrl do Supabase para', path);
    return null;
  }
  return data.publicUrl;
}

/**
 * Migra um único URL (se for do Blob da Vercel) e devolve o novo URL.
 * Se não for URL do Blob, devolve o original.
 */
async function migrateSingleUrl(productId: string, oldUrl: string): Promise<string> {
  // Se não for URL do Blob, devolve tal como está
  if (!oldUrl.includes('vercel-storage.com')) {
    return oldUrl;
  }

  // Se já foi migrado antes, usa o cache
  if (urlCache.has(oldUrl)) {
    return urlCache.get(oldUrl)!;
  }

  console.log(`➡️  Migrando imagem do produto ${productId}: ${oldUrl}`);

  const buffer = await downloadImage(oldUrl);
  if (!buffer) {
    console.error(`⚠️  Falha ao descarregar imagem do produto ${productId}, mantendo URL antigo.`);
    return oldUrl;
  }

  const ext = getExtensionFromUrl(oldUrl);
  const contentType = guessContentType(ext);

  // Nome do ficheiro no Supabase: products/<productId>/<timestamp>-random.ext
  const timestamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const path = `${productId}/${timestamp}-${rand}.${ext}`;

  const newUrl = await uploadToSupabase(buffer, path, contentType);
  if (!newUrl) {
    console.error(`⚠️  Falha ao enviar para Supabase para produto ${productId}, mantendo URL antigo.`);
    return oldUrl;
  }

  console.log(`✅  Produto ${productId}: imagem migrada para ${newUrl}`);
  urlCache.set(oldUrl, newUrl);
  return newUrl;
}

async function main() {
  console.log('🚀 Iniciando migração de imagens do Vercel Blob para Supabase Storage...');
  console.log(`Bucket: ${SUPABASE_STORAGE_BUCKET}`);
  console.log('--------------------------------------------------------');

  // ⚠️ AJUSTAR AQUI se a tua tabela se chama diferente
  const products = await prisma.product.findMany();

  console.log(`Encontrados ${products.length} produtos.`);

  let updatedCount = 0;

  for (const p of products) {
    // ⚠️ AJUSTAR ESTES CAMPOS CONSOANTE O TEU MODELO
    const anyProd: any = p as any;

    let changed = false;

    // 1) mainImageUrl (caso exista)
    if (typeof anyProd.mainImageUrl === 'string' && anyProd.mainImageUrl.includes('vercel-storage.com')) {
      const newUrl = await migrateSingleUrl(String(anyProd.id), anyProd.mainImageUrl);
      if (newUrl !== anyProd.mainImageUrl) {
        anyProd.mainImageUrl = newUrl;
        changed = true;
      }
    }

    // 2) imageUrls: string[]
    if (Array.isArray(anyProd.imageUrls) && anyProd.imageUrls.length > 0) {
      const newImageUrls: string[] = [];
      let changedArray = false;

      for (const u of anyProd.imageUrls) {
        if (typeof u === 'string' && u.includes('vercel-storage.com')) {
          const newUrl = await migrateSingleUrl(String(anyProd.id), u);
          newImageUrls.push(newUrl);
          if (newUrl !== u) changedArray = true;
        } else {
          newImageUrls.push(u);
        }
      }

      if (changedArray) {
        anyProd.imageUrls = newImageUrls;
        changed = true;
      }
    }

    if (changed) {
      await prisma.product.update({
        where: { id: p.id },
        data: {
          // ⚠️ SÓ ENVIA OS CAMPOS QUE REALMENTE EXISTEM NO TEU MODELO
          ...(typeof anyProd.mainImageUrl === 'string' && { mainImageUrl: anyProd.mainImageUrl }),
          ...(Array.isArray(anyProd.imageUrls) && { imageUrls: anyProd.imageUrls }),
        },
      });

      updatedCount++;
      console.log(`💾 Produto ${p.id} atualizado na BD.`);
    }
  }

  console.log('--------------------------------------------------------');
  console.log(`🎉 Migração concluída. Produtos atualizados: ${updatedCount}/${products.length}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('❌ Erro geral na migração:', err);
  prisma.$disconnect().finally(() => process.exit(1));
});
