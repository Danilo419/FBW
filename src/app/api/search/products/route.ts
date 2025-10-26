// src/app/api/search/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

type ItemOut = {
  id: string;
  name: string;
  slug: string;
  // preço em EUR (converte de basePrice em cêntimos)
  price: number;
  imageUrl?: string | null; // ← miniatura para o preview
  // mantido por compatibilidade com a UI (aqui não há relação Club)
  clubName?: string | null;
};

function sortByRelevance(items: ItemOut[], q: string): ItemOut[] {
  const phrase = q.toLowerCase();
  return [...items].sort((a, b) => {
    const an = (a.name + " " + (a.clubName || "")).toLowerCase();
    const bn = (b.name + " " + (b.clubName || "")).toLowerCase();

    // 1) match exato da frase inteira
    const aExact = an === phrase ? 1 : 0;
    const bExact = bn === phrase ? 1 : 0;
    if (aExact !== bExact) return bExact - aExact;

    // 2) começa pela frase
    const aStarts = an.startsWith(phrase) ? 1 : 0;
    const bStarts = bn.startsWith(phrase) ? 1 : 0;
    if (aStarts !== bStarts) return bStarts - aStarts;

    // 3) índice da ocorrência
    const aIdx = an.indexOf(phrase);
    const bIdx = bn.indexOf(phrase);
    if (aIdx !== bIdx) return (aIdx === -1 ? 1 : aIdx) - (bIdx === -1 ? 1 : bIdx);

    // 4) fallback alfabético
    return a.name.localeCompare(b.name);
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const limitParam = Number(searchParams.get("limit"));
    const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(24, limitParam)) : 12;

    if (q.length < 2) {
      return NextResponse.json({ items: [] as ItemOut[] }, { status: 200 });
    }

    const terms = q.split(/\s+/).filter(Boolean);

    // Busca por frase completa + todos os termos
    const products = await prisma.product.findMany({
      where: {
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
        basePrice: true, // cêntimos
        imageUrls: true, // ✅ array de imagens
      },
      take: limit,
      orderBy: { name: "asc" }, // ordem base; depois reordenamos por relevância
    });

    const mapped: ItemOut[] = products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: Math.max(0, (p.basePrice ?? 0) / 100), // EUR
      imageUrl: Array.isArray(p.imageUrls) && p.imageUrls.length > 0 ? p.imageUrls[0] : null, // ✅ thumb
      clubName: null,
    }));

    // Refinamento extra no servidor (AND por termo)
    const loweredTerms = terms.map((t) => t.toLowerCase());
    const narrowed = mapped.filter((it) => {
      const hay = (it.name + " " + (it.clubName || "")).toLowerCase();
      return loweredTerms.every((t) => hay.includes(t));
    });

    const sorted = sortByRelevance(narrowed.length ? narrowed : mapped, q).slice(0, limit);

    return NextResponse.json({ items: sorted }, { status: 200 });
  } catch (err) {
    console.error("[/api/search/products] error:", err);
    return NextResponse.json({ error: "SERVER_ERROR", items: [] as ItemOut[] }, { status: 500 });
  }
}
