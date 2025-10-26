// src/app/api/reviews/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cloudinary config (produção e dev) */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

/** Resolve a origem do site para o realtime */
function siteOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/* =======================================================================
   Helpers
   ======================================================================= */
function isImage(file: File) {
  return !!file && typeof file.type === "string" && file.type.startsWith("image/");
}

async function uploadToCloudinary(file: File, opts: { productId: string }) {
  const folder = (process.env.CLOUDINARY_FOLDER || "reviews").replace(/\/+$/, "");
  const bytes = Buffer.from(await file.arrayBuffer());

  // upload_stream para não estourar memória com ficheiros grandes
  const secureUrl: string = await new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: `p_${opts.productId}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        overwrite: false,
        resource_type: "image",
        // Transformações leves para web:
        format: "webp",
        quality: "auto:good",
        transformation: [{ fetch_format: "auto", quality: "auto" }],
      },
      (err: unknown, result?: UploadApiResponse) => {
        if (err || !result?.secure_url) return reject(err || new Error("Upload failed"));
        resolve(result.secure_url);
      }
    );
    upload.end(bytes);
  });

  return secureUrl;
}

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

  return NextResponse.json({
    reviews,
    average,
    total,
    avg: average,
    count: total,
  });
}

/* =======================================================================
   POST /api/reviews  (multipart/form-data)
   Fields: productId, rating, comment, images[] (até 4)
   Requer sessão
   ======================================================================= */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as any).id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  // multipart
  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const productId = String(formData.get("productId") || "");
  const ratingStr = String(formData.get("rating") ?? "0");
  const comment = String(formData.get("comment") ?? "");
  const files = formData.getAll("images") as File[];

  if (!productId) {
    return NextResponse.json({ error: "Missing productId" }, { status: 400 });
  }

  const r = Number(ratingStr);
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

  // Upload para Cloudinary (até 4 imagens)
  const imageUrls: string[] = [];
  for (const [i, f] of files.entries()) {
    if (i >= 4) break;
    if (!isImage(f)) continue;
    try {
      const url = await uploadToCloudinary(f, { productId });
      imageUrls.push(url);
    } catch {
      // ignora falha individual para não bloquear o review inteiro
    }
  }

  // Criar review
  await prisma.review.create({
    data: {
      productId,
      userId,
      rating: Math.round(r),
      comment: comment.trim().length ? comment.trim().slice(0, 1000) : null,
      imageUrls,
    },
  });

  // Média GLOBAL (para About/LiveStats)
  const globalAgg = await prisma.review.aggregate({
    _avg: { rating: true },
    _count: { _all: true },
  });

  const average = Number(globalAgg._avg.rating ?? 0);
  const total = Number(globalAgg._count._all ?? 0);

  // Realtime
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
    // silencioso
  }

  return NextResponse.json({
    ok: true,
    average,
    total,
    avg: average,
    count: total,
    imageUrls,
  });
}
