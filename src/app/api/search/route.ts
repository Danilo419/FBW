// src/app/api/search/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/* ================= utils ================= */

function normalize(s: string) {
  return s
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

/** Seleção do Prisma */
type Row = {
  id: string;
  slug: string;
  name: string;
  team: string;
  basePrice: number; // cents
  images: string[];
  description: string | null;
  updatedAt: Date;
};
/** Payload para o UI */
type UIProduct = {
  id: string;
  name: string;
  slug?: string;
  img?: string;
  price?: number;
};

/* Match em JS (fallback ultra robusto) */
function matchesRow(p: Row, qFull: string, tokens: string[]) {
  const hay = normalize(
    `${p.name} ${p.slug} ${p.team} ${p.description ?? ""}`
  ).toLowerCase();

  if (qFull && hay.includes(qFull)) return true;
  if (tokens.length === 0) return false;
  return tokens.every((t) => hay.includes(t));
}

/* ================= handler ================= */

export async function GET(req: Request) {
  const url = new URL(req.url);
  const qRaw = (url.searchParams.get("q") || "").trim();
  if (!qRaw) return NextResponse.json({ products: [] });

  const qFull = normalize(qRaw).toLowerCase();
  const tokens = splitTokens(qRaw);

  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = (globalThis as any).__prisma ?? new PrismaClient();
    (globalThis as any).__prisma = prisma;

    // ---------- Tentativa 1: WHERE no Prisma ----------
    const fullMatch = {
      OR: [
        { name: { contains: qRaw, mode: "insensitive" as const } },
        { slug: { contains: qRaw, mode: "insensitive" as const } },
        { team: { contains: qRaw, mode: "insensitive" as const } },
        { description: { contains: qRaw, mode: "insensitive" as const } },
      ],
    };
    const tokensMatch =
      tokens.length > 0
        ? {
            AND: tokens.map((t) => ({
              OR: [
                { name: { contains: t, mode: "insensitive" as const } },
                { slug: { contains: t, mode: "insensitive" as const } },
                { team: { contains: t, mode: "insensitive" as const } },
                { description: { contains: t, mode: "insensitive" as const } },
              ],
            })),
          }
        : undefined;

    const where = tokensMatch && tokens.length > 1 ? { OR: [fullMatch, tokensMatch] } : fullMatch;

    let rows = (await prisma.product.findMany({
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
        description: true,
        updatedAt: true,
      },
    })) as Row[];

    // ---------- Fallback: carregar e filtrar em JS ----------
    if (!rows.length) {
      const all = (await prisma.product.findMany({
        take: 500,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          slug: true,
          name: true,
          team: true,
          basePrice: true,
          images: true,
          description: true,
          updatedAt: true,
        },
      })) as Row[];

      rows = all.filter((p) => matchesRow(p, qFull, tokens));
    }

    const products: UIProduct[] = rows.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      img: Array.isArray(p.images) ? p.images[0] : undefined,
      price: centsToEur(p.basePrice),
    }));

    return NextResponse.json({ products });
  } catch {
    return NextResponse.json({ products: [] });
  }
}
