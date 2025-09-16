// src/app/api/reviews/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Resolve a origem do site para chamar o /api/realtime a partir do server */
function siteOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/* =======================================================================
   GET /api/reviews?productId=xxx
   - Se productId vier: devolve reviews desse produto + média desse produto
   - Se não vier: devolve média global (usada no About/LiveStats)
   ======================================================================= */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId") || undefined;

  const where = productId ? { productId } : {};

  const [list, agg] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        // devolve dados do autor para mostrar nome/foto
        user: { select: { name: true, image: true } },
      },
    }),
    prisma.review.aggregate({
      where,
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ]);

  const reviews = list.map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt.toISOString(),
    user: r.user ? { name: r.user.name, image: r.user.image } : null,
  }));

  const average = Number(agg._avg.rating ?? 0);
  const total = Number(agg._count._all ?? 0);

  // compat: também devolve avg/count
  return NextResponse.json({
    reviews,
    average,
    total,
    avg: average,
    count: total,
  });
}

/* =======================================================================
   POST /api/reviews
   body: { productId: string, rating: number (0..5), comment?: string }
   - Requer sessão (para gravar userId e podermos mostrar nome/foto)
   ======================================================================= */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user || !(session.user as any).id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const body = await req.json().catch(() => ({}));
  const { productId, rating, comment } = body || {};

  if (!productId || typeof productId !== "string") {
    return NextResponse.json({ error: "Missing productId" }, { status: 400 });
  }

  const r = Number(rating);
  if (!Number.isFinite(r) || r < 0 || r > 5) {
    return NextResponse.json({ error: "Rating must be between 0 and 5" }, { status: 400 });
  }

  // confirmar que o produto existe
  const prod = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!prod) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  await prisma.review.create({
    data: {
      productId,
      userId, // grava o autor para exibir nome/foto
      rating: Math.round(r), // 0..5 inteiro
      comment:
        typeof comment === "string" && comment.trim().length
          ? comment.trim().slice(0, 1000)
          : null,
    },
  });

  // Média GLOBAL (para o About/LiveStats)
  const globalAgg = await prisma.review.aggregate({
    _avg: { rating: true },
    _count: { _all: true },
  });

  const average = Number(globalAgg._avg.rating ?? 0);
  const total = Number(globalAgg._count._all ?? 0);

  // Emite realtime -> canal 'stats', evento 'rating:update'
  try {
    await fetch(`${siteOrigin()}/api/realtime`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        channel: "stats",
        event: "rating:update",
        data: { avg: average, count: total, average, total },
      }),
    });
  } catch {
    // não falha a request se o realtime não estiver ligado
  }

  // compat: devolve average/total e avg/count
  return NextResponse.json({
    ok: true,
    average,
    total,
    avg: average,
    count: total,
  });
}
