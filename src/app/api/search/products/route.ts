// src/app/api/search/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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
  // mantido por compatibilidade com a UI (aqui não há relação Club)
  clubName?: string | null;
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const limitParam = Number(searchParams.get("limit"));
    const limit = Number.isFinite(limitParam)
      ? Math.max(1, Math.min(12, limitParam))
      : 8;

    if (q.length < 2) {
      return NextResponse.json({ items: [] as ItemOut[] }, { status: 200 });
    }

    const terms = q.split(/\s+/).filter(Boolean);

    const products = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { team: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
          { season: { contains: q, mode: "insensitive" } },
          // tenta também por cada termo isolado no name/team
          ...terms.map((t) => ({ name: { contains: t, mode: "insensitive" as const } })),
          ...terms.map((t) => ({ team: { contains: t, mode: "insensitive" as const } })),
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        basePrice: true, // cêntimos
        images: true,    // string[]
      },
      take: limit,
      orderBy: { name: "asc" },
    });

    const items: ItemOut[] = products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: Math.max(0, (p.basePrice ?? 0) / 100), // EUR
      imageUrl: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null,
      clubName: null,
    }));

    return NextResponse.json({ items }, { status: 200 });
  } catch (err) {
    console.error("[/api/search/products] error:", err);
    return NextResponse.json({ error: "SERVER_ERROR", items: [] as ItemOut[] }, { status: 500 });
  }
}
