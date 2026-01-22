// src/app/api/home-products/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseLimit(raw: string | null): number | "all" {
  if (!raw) return 120; // default razoável
  const v = raw.trim().toLowerCase();
  if (v === "all" || v === "infinite" || v === "infinity") return "all";
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 120;
  return Math.floor(n);
}

// (opcional) baralhar em memória — para "all" pode ser pesado, então deixei desligado por default
function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const limitRaw = searchParams.get("limit");
    const limit = parseLimit(limitRaw);

    // cursor opcional (paginação)
    const cursor = searchParams.get("cursor");

    // se quiseres baralhar no servidor, manda ?shuffle=1
    const shuffleParam = searchParams.get("shuffle");
    const shouldShuffle = shuffleParam === "1" || shuffleParam === "true";

    // Seleciona só o que a Home precisa (reduz payload e acelera MUITO)
    const select = {
      id: true,
      slug: true,
      name: true,
      team: true,
      club: true,
      clubName: true,

      basePrice: true,
      priceCents: true,
      price: true,
      compareAtPriceCents: true,
      compareAtPrice: true,

      imageUrls: true,
      mainImage: true,
      mainImageUrl: true,
      mainImageURL: true,
      image: true,
      imageUrl: true,
      imageURL: true,

      createdAt: true,
    };

    // ============================
    // MODO "ALL" → devolve tudo
    // ============================
    if (limit === "all") {
      const products = await prisma.product.findMany({
        orderBy: { createdAt: "desc" },
        select,
      });

      const out = shouldShuffle ? shuffle(products) : products;

      return NextResponse.json({
        products: out,
        pageInfo: {
          mode: "all",
          count: out.length,
          nextCursor: null,
        },
      });
    }

    // ============================
    // MODO "PAGINADO"
    // ============================
    const take = Math.max(1, limit);

    const products = await prisma.product.findMany({
      take: take + 1, // +1 para saber se há "next page"
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
      orderBy: { createdAt: "desc" },
      select,
    });

    const hasMore = products.length > take;
    const pageItems = hasMore ? products.slice(0, take) : products;

    const out = shouldShuffle ? shuffle(pageItems) : pageItems;
    const nextCursor = hasMore ? pageItems[pageItems.length - 1]?.id ?? null : null;

    return NextResponse.json({
      products: out,
      pageInfo: {
        mode: "paged",
        limit: take,
        count: out.length,
        nextCursor,
      },
    });
  } catch (err) {
    console.error("Error in /api/home-products:", err);
    return NextResponse.json(
      { products: [], error: "Failed to load products" },
      { status: 500 }
    );
  }
}
