// src/app/api/search/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/* ---------------- helpers ---------------- */

function loose(s: unknown) {
  return (s ?? "")
    .toString()
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
const tokensOf = (q: string) => loose(q).split(" ").filter(Boolean);

function centsToEur(v?: number | null): number | undefined {
  if (typeof v !== "number" || !Number.isFinite(v)) return undefined;
  return Math.round(v) / 100;
}

type UIProduct = {
  id: string;
  name: string;
  slug?: string;
  img?: string;
  price?: number; // euros
};

/* Tipagem do registo que selecionamos no Prisma */
type Row = {
  id: string;
  slug: string;
  name: string;
  team: string;
  basePrice: number; // cents
  images: string[];  // urls
  updatedAt: string | Date;
};

/* ---------------- handler ---------------- */

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ products: [] });

  const tokens = tokensOf(q);
  if (!tokens.length) return NextResponse.json({ products: [] });

  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = (globalThis as any).__prisma ?? new PrismaClient();
    (globalThis as any).__prisma = prisma;

    // AND de tokens; cada token tenta em OR name/slug/team/description
    const where = {
      AND: tokens.map((t) => ({
        OR: [
          { name: { contains: t, mode: "insensitive" } },
          { slug: { contains: t, mode: "insensitive" } },
          { team: { contains: t, mode: "insensitive" } },
          { description: { contains: t, mode: "insensitive" } },
        ],
      })),
    };

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

    const products: UIProduct[] = rows.map((p: Row) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      img: Array.isArray(p.images) ? p.images[0] : undefined,
      price: centsToEur(p.basePrice),
    }));

    return NextResponse.json({ products });
  } catch {
    // fallback silencioso
    return NextResponse.json({ products: [] });
  }
}
