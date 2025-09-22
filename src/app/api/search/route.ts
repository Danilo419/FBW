// src/app/api/search/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ================= utils ================= */

/** Remove acentos/diacríticos e normaliza espaços */
function normalize(s: string) {
  return s.normalize("NFKD").replace(/\p{Diacritic}/gu, "").trim();
}

/** Parte a query em tokens simples e seguros */
function splitTokens(q: string) {
  const s = normalize(q)
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return s ? s.split(" ") : [];
}

/** Converte cêntimos para euros */
function centsToEur(v?: number | null) {
  if (typeof v !== "number" || !Number.isFinite(v)) return undefined;
  return Math.round(v) / 100;
}

/** Seleção do Prisma (ajusta se mudares o select) */
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

/** Match em JS (fallback ultra robusto) */
function matchesRow(p: Row, qFull: string, tokens: string[]) {
  const hay = normalize(
    `${p.name} ${p.slug} ${p.team} ${p.description ?? ""}`
  ).toLowerCase();

  if (qFull && hay.includes(qFull)) return true;
  if (tokens.length === 0) return false;
  return tokens.every((t: string) => hay.includes(t));
}

/* ================= handler ================= */

export async function GET(req: Request) {
  const url = new URL(req.url);
  const qRaw = (url.searchParams.get("q") || "").trim();
  if (!qRaw) return NextResponse.json({ products: [] });

  const qFull = normalize(qRaw).toLowerCase();
  const tokens = splitTokens(qRaw);

  try {
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

    const where =
      tokensMatch && tokens.length > 1 ? { OR: [fullMatch, tokensMatch] } : fullMatch;

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

      rows = all.filter((p: Row) => matchesRow(p, qFull, tokens));
    }

    const products: UIProduct[] = rows.map((p: Row) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      img: Array.isArray(p.images) ? p.images[0] : undefined,
      price: centsToEur(p.basePrice),
    }));

    return NextResponse.json({ products });
  } catch {
    // Em caso de erro, devolve vazio (evita quebrar a página)
    return NextResponse.json({ products: [] });
  }
}
