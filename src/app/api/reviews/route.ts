// src/app/api/reviews/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// (Opcional) Se quiseres manter upload server-side no fallback, descomenta:
// import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// (Opcional) Cloudinary server-side — só necessário se usares o fallback com upload
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
//   api_key: process.env.CLOUDINARY_API_KEY!,
//   api_secret: process.env.CLOUDINARY_API_SECRET!,
// });

function siteOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

// (Opcional) helper para upload server-side no fallback
// function isImage(file: File) {
//   return !!file && typeof file.type === "string" && file.type.startsWith("image/");
// }
// async function uploadToCloudinary(file: File, opts: { productId: string }) {
//   const folder = (process.env.CLOUDINARY_FOLDER || "reviews").replace(/\/+$/, "");
//   const bytes = Buffer.from(await file.arrayBuffer());
//   const secureUrl: string = await new Promise((resolve, reject) => {
//     const up = cloudinary.uploader.upload_stream(
//       {
//         folder,
//         public_id: `p_${opts.productId}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
//         overwrite: false,
//         resource_type: "image",
//         format: "webp",
//         quality: "auto:good",
//         transformation: [{ fetch_format: "auto", quality: "auto" }],
//       },
//       (err: unknown, result?: UploadApiResponse) => {
//         if (err || !result?.secure_url) return reject(err || new Error("Upload failed"));
//         resolve(result.secure_url);
//       }
//     );
//     up.end(bytes);
//   });
//   return secureUrl;
// }

/* =======================================================================
   GET /api/reviews?productId=xxx
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
        imageUrls: true,
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
    imageUrls: r.imageUrls ?? [],
    user: r.user ? { name: r.user.name, image: r.user.image } : null,
  }));

  const average = Number(agg._avg.rating ?? 0);
  const total = Number(agg._count._all ?? 0);

  return NextResponse.json({ reviews, average, total, avg: average, count: total });
}

/* =======================================================================
   POST /api/reviews
   Aceita:
     A) JSON (novo fluxo — recomendado):
        { productId, rating, comment?, imageUrls?: string[] }
     B) multipart/form-data (fallback antigo): productId, rating, comment
   Requer sessão
   ======================================================================= */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as any).id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  // helpers de validação comuns
  const ensureProduct = async (productId?: string) => {
    if (!productId) return { ok: false as const, status: 400, error: "Missing productId" };
    const prod = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!prod) return { ok: false as const, status: 404, error: "Product not found" };
    return { ok: true as const };
  };
  const ensureRating = (rating: any) => {
    const r = Number(rating);
    if (!Number.isFinite(r) || r < 0 || r > 5) {
      return { ok: false as const, status: 400, error: "Rating must be between 0 and 5" };
    }
    return { ok: true as const, value: Math.round(r) };
  };

  const contentType = req.headers.get("content-type") || "";

  // ---------- A) JSON ----------
  if (contentType.includes("application/json")) {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const productId: string | undefined = typeof body.productId === "string" ? body.productId : undefined;
    const ratingChk = ensureRating(body.rating);
    if (!ratingChk.ok) return NextResponse.json({ error: ratingChk.error }, { status: ratingChk.status });

    const prodChk = await ensureProduct(productId);
    if (!prodChk.ok) return NextResponse.json({ error: prodChk.error }, { status: prodChk.status });

    const comment =
      typeof body.comment === "string" && body.comment.trim().length
        ? body.comment.trim().slice(0, 1000)
        : null;

    const imageUrls: string[] = Array.isArray(body.imageUrls)
      ? body.imageUrls
          .filter((u: unknown) => typeof u === "string" && /^https?:\/\//i.test(u as string))
          .slice(0, 4)
      : [];

    await prisma.review.create({
      data: {
        productId: productId!,
        userId,
        rating: ratingChk.value,
        comment,
        imageUrls,
      },
    });
  } else {
    // ---------- B) multipart/form-data (fallback) ----------
    const formData = await req.formData().catch(() => null);
    if (!formData) return NextResponse.json({ error: "Invalid form data" }, { status: 400 });

    const productId = String(formData.get("productId") || "");
    const ratingStr = String(formData.get("rating") ?? "0");
    const commentRaw = String(formData.get("comment") ?? "");

    const ratingChk = ensureRating(ratingStr);
    if (!ratingChk.ok) return NextResponse.json({ error: ratingChk.error }, { status: ratingChk.status });

    const prodChk = await ensureProduct(productId);
    if (!prodChk.ok) return NextResponse.json({ error: prodChk.error }, { status: prodChk.status });

    // NOTA: neste fallback não processamos ficheiros para evitar 413 na Vercel.
    // Se quiseres mesmo aceitar uploads aqui, reativa o bloco Cloudinary acima e processa "images" do formData.
    const comment = commentRaw.trim().length ? commentRaw.trim().slice(0, 1000) : null;

    await prisma.review.create({
      data: {
        productId,
        userId,
        rating: ratingChk.value,
        comment,
        imageUrls: [],
      },
    });
  }

  // Agregados globais (para realtime/LiveStats)
  const globalAgg = await prisma.review.aggregate({
    _avg: { rating: true },
    _count: { _all: true },
  });
  const average = Number(globalAgg._avg.rating ?? 0);
  const total = Number(globalAgg._count._all ?? 0);

  // Realtime (best-effort)
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
  } catch {}

  return NextResponse.json({ ok: true, average, total, avg: average, count: total });
}
