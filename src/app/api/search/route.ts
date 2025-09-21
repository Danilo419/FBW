// src/app/api/search/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/* ---------------- utils ---------------- */

function normalize(q: string) {
  return q
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

function splitTokens(q: string) {
  const s = normalize(q)
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return s ? s.split(" ") : [];
}

function centsToEur(v?: number | null) {
  if (typeof v !== "number" || !Number.isFinite(v)) return undefined;
  return Math.round(v) / 100;
}

/** O que devolvemos ao front */
type UIProduct = {
  id: string;
  name: string;
  slug?: string;
  img?: string;
  price?: number; // euros
};

/** Seleção que pedimos ao Prisma */
type Row = {
  id: string;
  slug: string;
  name: string;
  team: string;
  basePrice: number; // cents
  images: string[];
  updatedAt: Date;
};

/* ---------------- handler ---------------- */

export async function GET(req: Request) {
  const url = new URL(req.url);
  const qRaw = (url.searchParams.get("q") || "").trim();
  if (!qRaw) return NextResponse.json({ products: [] });

  const q = normalize(qRaw);
  const tokens = splitTokens(qRaw);

  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = (globalThis as any).__prisma ?? new PrismaClient();
    (globalThis as any).__prisma = prisma;

    // Estratégia 1: match direto com o texto completo
    const fullMatch = {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
        { team: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ],
    };

    // Estratégia 2: AND dos tokens (cada token pode estar em qualquer um dos campos)
    const tokensMatch =
      tokens.length > 0
        ? {
            AND: tokens.map((t) => ({
              OR: [
                { name: { contains: t, mode: "insensitive" } },
                { slug: { contains: t, mode: "insensitive" } },
                { team: { contains: t, mode: "insensitive" } },
                { description: { contains: t, mode: "insensitive" } },
              ],
            })),
          }
        : undefined;

    const where =
      tokensMatch && tokens.length > 1
        ? { OR: [fullMatch, tokensMatch] }
        : fullMatch;

    const rows = (await prisma.product.findMany({
      where,
      take: 100,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        slug: true,
        name: true,
        team: true,
        basePrice: true,
        images: true,
        updatedAt: true,
      },
    })) as Row[];

    const products: UIProduct[] = rows.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      img: Array.isArray(p.images) ? p.images[0] : undefined,
      price: centsToEur(p.basePrice),
    }));

    return NextResponse.json({ products });
  } catch {
    // Falha silenciosa (sem expor detalhes)
    return NextResponse.json({ products: [] });
  }
}
