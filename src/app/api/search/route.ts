// src/app/api/search/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ================= utils ================= */

function normalize(s: string) {
  return s.normalize("NFKD").replace(/\p{Diacritic}/gu, "").trim();
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
  imageUrls: string[]; // ✅ substitui "images"
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
  const debug = url.searchParams.get("debug") === "1";
  if (!qRaw) {
    return NextResponse.json(
      debug ? { products: [], info: { reason: "empty query" } } : { products: [] }
    );
  }

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
      take: 150,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        slug: true,
        name: true,
        team: true,
        basePrice: true,
        imageUrls: true, // ✅ campo correto
        description: true,
        updatedAt: true,
      },
    })) as Row[];

    // ---------- Fallback: carregar e filtrar em JS ----------
    let usedFallback = false;
    let totalAll = 0;

    if (!rows.length) {
      const all = (await prisma.product.findMany({
        take: 1000,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          slug: true,
          name: true,
          team: true,
          basePrice: true,
          imageUrls: true, // ✅ campo correto
          description: true,
          updatedAt: true,
        },
      })) as Row[];

      totalAll = all.length;
      rows = all.filter((p: Row) => matchesRow(p, qFull, tokens));
      usedFallback = true;
    }

    const products: UIProduct[] = rows.map((p: Row) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      img: Array.isArray(p.imageUrls) ? p.imageUrls[0] : undefined,
      price: centsToEur(p.basePrice),
    }));

    if (debug) {
      return NextResponse.json({
        products,
        info: {
          query: qRaw,
          tokens,
          matched: products.length,
          usedFallback,
          totalAll: usedFallback ? totalAll : undefined,
          sample: products.slice(0, 5).map((x) => x.name),
        },
      });
    }

    return NextResponse.json({ products });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (debug) {
      return NextResponse.json({ products: [], error: msg }, { status: 500 });
    }
    return NextResponse.json({ products: [] });
  }
}
