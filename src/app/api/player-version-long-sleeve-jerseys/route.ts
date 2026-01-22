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

  // string direta
  if (isProbablyUrl(obj)) return obj;

  // array
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const u = findFirstUrlDeep(item, depth + 1);
      if (u) return u;
    }
    return null;
  }

  // objeto
  if (typeof obj === "object") {
    // chaves comuns primeiro (mais rápidas)
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

    // depois varre tudo
    for (const k of Object.keys(obj)) {
      const v = (obj as any)[k];
      const u = findFirstUrlDeep(v, depth + 1);
      if (u) return u;
    }
  }

  return null;
}

function pickImageFromProduct(p: any): string | null {
  if (!p) return null;

  // campos diretos comuns
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

  // relações/arrays comuns
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
    const v = p?.[key];
    const u = findFirstUrlDeep(v, 0);
    if (u) return u;
  }

  // último fallback: tenta achar qualquer url em qualquer lugar do objeto
  const any = findFirstUrlDeep(p, 0);
  return any;
}

function toNumberMaybe(v: any): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v && typeof v === "object") {
    // Prisma Decimal às vezes tem toNumber()
    if (typeof v.toNumber === "function") {
      try {
        const n = v.toNumber();
        if (typeof n === "number" && Number.isFinite(n)) return n;
      } catch {}
    }
    // ou toString()
    if (typeof v.toString === "function") {
      const s = String(v.toString());
      const n = Number(s);
      if (Number.isFinite(n)) return n;
    }
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function pickPriceFromProduct(p: any): number | null {
  if (!p) return null;

  // tenta nomes comuns primeiro
  const directKeys = [
    "price",
    "priceEur",
    "priceEUR",
    "price_eur",
    "amount",
    "amountEur",
    "amountEUR",
  ];

  for (const k of directKeys) {
    const n = toNumberMaybe(p?.[k]);
    if (n != null) return n;
  }

  // cents -> euros
  const centsKeys = ["priceCents", "price_cents", "amountCents", "amount_cents"];
  for (const k of centsKeys) {
    const n = toNumberMaybe(p?.[k]);
    if (n != null) return Math.round(n) / 100;
  }

  // se tiver variants/variantOptions, tenta procurar um preço lá dentro
  const deep = findFirstNumberWithKey(p, 0);
  return deep;
}

function findFirstNumberWithKey(obj: any, depth = 0): number | null {
  if (!obj || depth > 4) return null;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const n = findFirstNumberWithKey(item, depth + 1);
      if (n != null) return n;
    }
    return null;
  }

  if (typeof obj === "object") {
    for (const k of Object.keys(obj)) {
      const v = (obj as any)[k];
      // procura campos que contenham "price" ou "amount"
      if (/price|amount/i.test(k)) {
        const n = toNumberMaybe(v);
        if (n != null) {
          // se parecer cents (muito grande), converte
          if (n >= 1000) return Math.round(n) / 100;
          return n;
        }
      }
      const nested = findFirstNumberWithKey(v, depth + 1);
      if (nested != null) return nested;
    }
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
    // combinações (às vezes existe images + variants)
    { images: true, variants: true },
    { productImages: true, variants: true },
    { variants: true },
    // sem include
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
    } catch {
      // tenta o próximo include
    }
  }

  return [];
}

/* ============================================================
   GET
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

    // tenta incluir team na pesquisa (se existir); se der erro, fazemos fallback
    let whereFinal: any = baseWhere;

    if (q) {
      whereFinal = {
        AND: [
          ...baseWhere.AND,
          {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { team: { contains: q, mode: "insensitive" } },
            ],
          },
        ],
      };
    }

    let productsRaw: any[] = [];

    // 1) tenta com team
    productsRaw = await findManyWithBestInclude(whereFinal);

    // 2) fallback sem team (se tiver vindo vazio por causa de erro/coluna inexistente)
    if (productsRaw.length === 0) {
      const whereNameOnly = q
        ? {
            AND: [
              ...baseWhere.AND,
              { name: { contains: q, mode: "insensitive" } },
            ],
          }
        : baseWhere;

      productsRaw = await findManyWithBestInclude(whereNameOnly);
    }

    const filtered = (Array.isArray(productsRaw) ? productsRaw : [])
      .filter(
        (p: any) =>
          typeof p?.name === "string" &&
          isPlayerVersionLongSleeveName(p.name)
      )
      .map((p: any) => {
        const img = pickImageFromProduct(p);
        const price = pickPriceFromProduct(p);

        return {
          id: p.id,
          name: p.name,
          slug: p.slug ?? undefined,
          team: p.team ?? null,
          price: typeof price === "number" ? price : undefined,
          // IMPORTANT: usar null em vez de undefined para conseguires ver no JSON
          img: img ?? null,
        };
      });

    return NextResponse.json({ products: filtered });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load products" },
      { status: 500 }
    );
  }
}
