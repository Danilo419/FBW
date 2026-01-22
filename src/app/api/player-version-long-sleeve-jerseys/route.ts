// src/app/api/player-version-long-sleeve-jerseys/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   Helpers
============================================================ */

function normalizeStr(s?: string | null) {
  return (s ?? "").replace(/\s{2,}/g, " ").trim();
}

function isPlayerVersionLongSleeveName(name: string) {
  const n = name.toUpperCase();

  if (!n.includes("PLAYER VERSION")) return false;

  const isLongSleeve =
    n.includes("LONG SLEEVE") ||
    n.includes("LONG-SLEEVE") ||
    /\bL\/S\b/.test(n) ||
    /\bLS\b/.test(n);

  if (!isLongSleeve) return false;

  const EXCLUDE = [
    "RETRO",
    "SET",
    "SHORTS",
    "TRACKSUIT",
    "CROP TOP",
    "KIDS KIT",
    "BABY",
    "INFANT",
    "FULL KIT",
    "KIT SET",
    "JERSEY + SHORTS",
    "WITH SHORTS",
  ];

  for (const x of EXCLUDE) {
    if (n.includes(x)) return false;
  }

  return true;
}

function pickImageUrlFromProductRow(p: any): string | undefined {
  // tenta campos diretos comuns (se existirem no teu schema)
  const direct =
    p?.img ??
    p?.image ??
    p?.imageUrl ??
    p?.thumbnail ??
    p?.thumb ??
    p?.photo ??
    p?.photoUrl ??
    p?.cover ??
    p?.coverUrl;

  if (typeof direct === "string" && direct) return direct;

  // se for um campo JSON/string com array de imagens
  const imgs = p?.images ?? p?.gallery ?? p?.photos;
  if (Array.isArray(imgs) && imgs.length > 0) {
    const first = imgs[0];
    if (typeof first === "string" && first) return first;
    if (first && typeof first === "object") {
      return (
        first.url ||
        first.src ||
        first.path ||
        first.imageUrl ||
        first.secureUrl ||
        undefined
      );
    }
  }
  if (typeof imgs === "string" && imgs) return imgs;

  return undefined;
}

function pickUrlFromImageRow(imgRow: any): string | undefined {
  if (!imgRow) return undefined;
  const url =
    imgRow.url ??
    imgRow.src ??
    imgRow.path ??
    imgRow.imageUrl ??
    imgRow.secureUrl ??
    imgRow.publicUrl ??
    imgRow.link ??
    imgRow.href;

  return typeof url === "string" && url ? url : undefined;
}

function getAnyPrismaModel(name: string) {
  const client: any = prisma as any;
  const m = client?.[name];
  if (m && typeof m.findMany === "function") return m;
  return null;
}

/* ============================================================
   Busca imagens por productId tentando vários models/campos
============================================================ */

async function getFirstImagesByProductId(productIds: Array<string | number>) {
  const ids = productIds
    .map((x) => (typeof x === "number" ? x : String(x)))
    .filter(Boolean);

  const result = new Map<string, string>();

  if (ids.length === 0) return result;

  // possíveis nomes de models onde guardas imagens
  const modelCandidates = [
    "productImage",
    "productImages",
    "image",
    "images",
    "productPhoto",
    "productPhotos",
    "photo",
    "photos",
    "galleryImage",
    "galleryImages",
  ];

  // possíveis nomes do campo FK para produto
  const fkCandidates = ["productId", "product_id", "productID", "product"];

  // tenta um model de cada vez até um funcionar
  for (const modelName of modelCandidates) {
    const model = getAnyPrismaModel(modelName);
    if (!model) continue;

    for (const fk of fkCandidates) {
      try {
        // tenta fazer query com where IN e ordenação básica
        const rows = await model.findMany({
          where: { [fk]: { in: ids } },
          take: 5000,
        });

        if (!Array.isArray(rows) || rows.length === 0) continue;

        // construir mapa (primeira imagem por produto)
        for (const r of rows) {
          const pid = r?.[fk];
          const key =
            typeof pid === "number" ? String(pid) : typeof pid === "string" ? pid : null;

          if (!key) continue;
          if (result.has(key)) continue;

          const url = pickUrlFromImageRow(r);
          if (url) result.set(key, url);
        }

        // se já apanhou alguma, devolve logo (model certo)
        if (result.size > 0) return result;
      } catch {
        // falhou neste fk/model -> tenta próximo
      }
    }
  }

  return result;
}

/* ============================================================
   GET
   /api/player-version-long-sleeve-jerseys
============================================================ */

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = normalizeStr(searchParams.get("q"));

    const baseWhere: any = {
      AND: [
        { name: { contains: "Player Version", mode: "insensitive" } },
        {
          OR: [
            { name: { contains: "Long Sleeve", mode: "insensitive" } },
            { name: { contains: "Long-Sleeve", mode: "insensitive" } },
          ],
        },
        {
          NOT: [
            { name: { contains: "Retro", mode: "insensitive" } },
            { name: { contains: "Tracksuit", mode: "insensitive" } },
            { name: { contains: "Shorts", mode: "insensitive" } },
            { name: { contains: "Set", mode: "insensitive" } },
            { name: { contains: "Kids Kit", mode: "insensitive" } },
            { name: { contains: "Baby", mode: "insensitive" } },
            { name: { contains: "Infant", mode: "insensitive" } },
          ],
        },
      ],
    };

    const whereFinal: any = q
      ? {
          AND: [
            ...baseWhere.AND,
            {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                // team pode não existir -> se der erro, apanhamos no catch e refazemos
                { team: { contains: q, mode: "insensitive" } },
              ],
            },
          ],
        }
      : baseWhere;

    let productsRaw: any[] = [];

    // 1) tenta com team (se existir)
    try {
      productsRaw = await (prisma as any).product.findMany({
        where: whereFinal,
        take: 5000,
      });
    } catch {
      // 2) fallback sem team (só name)
      const whereNameOnly = q
        ? { AND: [...baseWhere.AND, { name: { contains: q, mode: "insensitive" } }] }
        : baseWhere;

      productsRaw = await (prisma as any).product.findMany({
        where: whereNameOnly,
        take: 5000,
      });
    }

    // filtro final no servidor (garante 100%)
    const products = (Array.isArray(productsRaw) ? productsRaw : []).filter(
      (p: any) => typeof p?.name === "string" && isPlayerVersionLongSleeveName(p.name)
    );

    // tenta extrair imagens diretamente do produto (se tiver campo)
    const ids = products.map((p: any) => p.id);

    // tenta buscar por um model de imagens separado (ProductImage etc.)
    const imageMap = await getFirstImagesByProductId(ids);

    const payload = products.map((p: any) => {
      const idKey = typeof p.id === "number" ? String(p.id) : String(p.id);
      const imgDirect = pickImageUrlFromProductRow(p);
      const imgFromMap = imageMap.get(idKey);

      return {
        id: p.id,
        name: p.name,
        slug: p.slug ?? undefined,
        price: typeof p.price === "number" ? p.price : undefined,
        team: p.team ?? null,
        img: imgDirect || imgFromMap || undefined,
      };
    });

    return NextResponse.json({ products: payload });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load products" },
      { status: 500 }
    );
  }
}
