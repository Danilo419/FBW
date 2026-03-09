// src/app/api/search/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProductChannel } from "@prisma/client";

export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

type ItemOut = {
  id: string;
  name: string;
  slug: string;
  // preço em EUR (converte de basePrice em cêntimos)
  price: number;
  imageUrl?: string | null;
  clubName?: string | null;
};

function sortByRelevance(items: ItemOut[], q: string): ItemOut[] {
  const phrase = q.toLowerCase();

  return [...items].sort((a, b) => {
    const an = (a.name + " " + (a.clubName || "")).toLowerCase();
    const bn = (b.name + " " + (b.clubName || "")).toLowerCase();

    const aExact = an === phrase ? 1 : 0;
    const bExact = bn === phrase ? 1 : 0;
    if (aExact !== bExact) return bExact - aExact;

    const aStarts = an.startsWith(phrase) ? 1 : 0;
    const bStarts = bn.startsWith(phrase) ? 1 : 0;
    if (aStarts !== bStarts) return bStarts - aStarts;

    const aIdx = an.indexOf(phrase);
    const bIdx = bn.indexOf(phrase);
    if (aIdx !== bIdx) {
      return (aIdx === -1 ? 1 : aIdx) - (bIdx === -1 ? 1 : bIdx);
    }

    return a.name.localeCompare(b.name);
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const limitParam = Number(searchParams.get("limit"));
    const limit = Number.isFinite(limitParam)
      ? Math.max(1, Math.min(24, limitParam))
      : 12;

    if (q.length < 2) {
      return NextResponse.json({ items: [] as ItemOut[] }, { status: 200 });
    }

    const terms = q.split(/\s+/).filter(Boolean);

    const products = await prisma.product.findMany({
      where: {
        isVisible: true,

        // ✅ esconder produtos PT Stock da pesquisa do header
        NOT: {
          channel: ProductChannel.PT_STOCK_CTT,
        },

        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { team: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
          { season: { contains: q, mode: "insensitive" } },
          {
            AND: terms.map((t) => ({
              OR: [
                { name: { contains: t, mode: "insensitive" as const } },
                { team: { contains: t, mode: "insensitive" as const } },
                { slug: { contains: t, mode: "insensitive" as const } },
                { season: { contains: t, mode: "insensitive" as const } },
              ],
            })),
          },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        basePrice: true,
        imageUrls: true,
        team: true,
      },
      take: limit,
      orderBy: { name: "asc" },
    });

    const mapped: ItemOut[] = products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: Math.max(0, (p.basePrice ?? 0) / 100),
      imageUrl:
        Array.isArray(p.imageUrls) && p.imageUrls.length > 0
          ? p.imageUrls[0]
          : null,
      clubName: p.team || null,
    }));

    const loweredTerms = terms.map((t) => t.toLowerCase());
    const narrowed = mapped.filter((it) => {
      const hay = (it.name + " " + (it.clubName || "")).toLowerCase();
      return loweredTerms.every((t) => hay.includes(t));
    });

    const sorted = sortByRelevance(
      narrowed.length ? narrowed : mapped,
      q
    ).slice(0, limit);

    return NextResponse.json({ items: sorted }, { status: 200 });
  } catch (err) {
    console.error("[/api/search/products] error:", err);
    return NextResponse.json(
      { error: "SERVER_ERROR", items: [] as ItemOut[] },
      { status: 500 }
    );
  }
}