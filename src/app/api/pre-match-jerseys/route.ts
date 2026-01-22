import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ================= Helpers ================= */

function normalizeStr(s?: string | null) {
  return (s ?? "").replace(/\s{2,}/g, " ").trim();
}

function isProbablyUrl(v: any) {
  return (
    typeof v === "string" &&
    v.length > 6 &&
    (v.startsWith("http://") ||
      v.startsWith("https://") ||
      v.startsWith("/") ||
      v.startsWith("data:image/"))
  );
}

function findFirstUrlDeep(obj: any, depth = 0): string | null {
  if (!obj || depth > 4) return null;

  if (isProbablyUrl(obj)) return obj;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const u = findFirstUrlDeep(item, depth + 1);
      if (u) return u;
    }
    return null;
  }

  if (typeof obj === "object") {
    const commonKeys = [
      "url",
      "src",
      "path",
      "imageUrl",
      "secureUrl",
      "publicUrl",
      "link",
      "href",
      "thumbnail",
      "thumb",
    ];

    for (const k of commonKeys) {
      if (isProbablyUrl((obj as any)[k])) return (obj as any)[k];
    }

    for (const k of Object.keys(obj)) {
      const u = findFirstUrlDeep((obj as any)[k], depth + 1);
      if (u) return u;
    }
  }

  return null;
}

function pickImageFromProduct(p: any): string | null {
  if (!p) return null;

  const directCandidates = [
    "img",
    "image",
    "imageUrl",
    "photo",
    "photoUrl",
    "cover",
    "coverUrl",
    "thumbnail",
    "thumb",
  ];

  for (const key of directCandidates) {
    const v = p?.[key];
    if (isProbablyUrl(v)) return v;
  }

  const relCandidates = [
    "images",
    "productImages",
    "gallery",
    "galleryImages",
    "photos",
    "media",
    "productMedia",
    "assets",
    "files",
  ];

  for (const key of relCandidates) {
    const u = findFirstUrlDeep(p?.[key], 0);
    if (u) return u;
  }

  return findFirstUrlDeep(p, 0);
}

function toNumberMaybe(v: any): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;

  if (v && typeof v === "object") {
    if (typeof v.toNumber === "function") {
      try {
        const n = v.toNumber();
        if (typeof n === "number" && Number.isFinite(n)) return n;
      } catch {}
    }
    if (typeof v.toString === "function") {
      const n = Number(String(v.toString()));
      if (Number.isFinite(n)) return n;
    }
  }

  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function pickPriceFromProduct(p: any): number | null {
  if (!p) return null;

  const directKeys = ["price", "priceEur", "priceEUR", "price_eur", "amount"];
  for (const k of directKeys) {
    const n = toNumberMaybe(p?.[k]);
    if (n != null) return n;
  }

  const centsKeys = ["priceCents", "price_cents", "amountCents", "amount_cents"];
  for (const k of centsKeys) {
    const n = toNumberMaybe(p?.[k]);
    if (n != null) return Math.round(n) / 100;
  }

  return null;
}

async function findManyWithBestInclude(where: any) {
  const includeCandidates: any[] = [
    { images: true },
    { productImages: true },
    { gallery: true },
    { galleryImages: true },
    { photos: true },
    { media: true },
    { productMedia: true },
    { assets: true },
    { files: true },
    null,
  ];

  for (const inc of includeCandidates) {
    try {
      const res = await (prisma as any).product.findMany({
        where,
        take: 5000,
        ...(inc ? { include: inc } : {}),
      });
      return Array.isArray(res) ? res : [];
    } catch {}
  }

  return [];
}

/* ================= Filter ================= */

function isPreMatchName(name: string) {
  const n = name.toUpperCase();

  const isPreMatch =
    n.includes("PRE-MATCH") ||
    n.includes("PRE MATCH") ||
    n.includes("PREMATCH") ||
    n.includes("WARM-UP") ||
    n.includes("WARM UP") ||
    n.includes("WARMUP");

  if (!isPreMatch) return false;

  // excluir itens óbvios que não sejam camisola/top
  if (n.includes("SHORTS")) return false;
  if (n.includes("TRACKSUIT")) return false;
  if (n.includes("CROP TOP")) return false;
  if (n.includes("SCARF")) return false;
  if (n.includes("BALL")) return false;
  if (n.includes("POSTER")) return false;

  // excluir infantis / completos
  if (n.includes("KIDS KIT")) return false;
  if (n.includes("BABY")) return false;
  if (n.includes("INFANT")) return false;

  // kit completo (mantém, mas sem matar nomes normais)
  if (n.includes("FULL KIT")) return false;
  if (n.includes("KIT SET")) return false;
  if (n.includes("JERSEY + SHORTS")) return false;
  if (n.includes("WITH SHORTS")) return false;

  // se tiver " KIT" genérico mas for claramente “PRE-MATCH … JERSEY”, deixa passar
  // (caso contrário, evita kits completos genéricos)
  if (n.includes(" KIT") && !(n.includes("JERSEY") || n.includes("TOP"))) {
    return false;
  }

  return true;
}

/* ================= GET ================= */

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = normalizeStr(searchParams.get("q"));

    // Vamos buscar tudo que contenha "pre" ou "warm" e depois filtrar com segurança.
    // (Assim apanhamos variações: "Pre Match", "Warmup", etc.)
    const baseWhereAny: any = {
      OR: [
        { name: { contains: "pre", mode: "insensitive" } },
        { name: { contains: "warm", mode: "insensitive" } },
      ],
    };

    let whereFinal: any = baseWhereAny;

    if (q) {
      // pesquisa opcional por name/team (se existir)
      whereFinal = {
        AND: [
          baseWhereAny,
          {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { team: { contains: q, mode: "insensitive" } },
            ],
          },
        ],
      };
    }

    let productsRaw = await findManyWithBestInclude(whereFinal);

    // fallback se "team" não existir
    if (q && productsRaw.length === 0) {
      const whereNameOnly = {
        AND: [baseWhereAny, { name: { contains: q, mode: "insensitive" } }],
      };
      productsRaw = await findManyWithBestInclude(whereNameOnly);
    }

    const products = (productsRaw ?? []).filter(
      (p: any) => typeof p?.name === "string" && isPreMatchName(p.name)
    );

    const payload = products.map((p: any) => ({
      id: p.id,
      name: p.name,
      slug: p.slug ?? undefined,
      team: p.team ?? null,
      price: pickPriceFromProduct(p) ?? undefined,
      img: pickImageFromProduct(p) ?? null,
    }));

    return NextResponse.json({ products: payload });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load pre-match jerseys" },
      { status: 500 }
    );
  }
}
