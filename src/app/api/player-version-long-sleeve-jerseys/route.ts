// src/app/api/player-version-long-sleeve-jerseys/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   Helpers
============================================================ */

function normalizeStr(s?: string | null) {
  return (s ?? "").replace(/\s{2,}/g, " ").trim();
}

function pickImageUrl(p: any): string | undefined {
  // campos diretos comuns
  const direct =
    p?.img ??
    p?.image ??
    p?.imageUrl ??
    p?.thumbnail ??
    p?.thumb ??
    p?.photo ??
    p?.photoUrl;

  if (typeof direct === "string" && direct) return direct;

  const imgs = p?.images;

  // se vier relação (array de objetos)
  if (Array.isArray(imgs) && imgs.length > 0) {
    const first = imgs[0];

    if (typeof first === "string" && first) return first;

    if (first && typeof first === "object") {
      if (typeof first.url === "string" && first.url) return first.url;
      if (typeof first.src === "string" && first.src) return first.src;
      if (typeof first.path === "string" && first.path) return first.path;
      if (typeof first.imageUrl === "string" && first.imageUrl)
        return first.imageUrl;
      if (typeof first.secureUrl === "string" && first.secureUrl)
        return first.secureUrl;
    }
  }

  // se guardas json/string
  if (typeof imgs === "string" && imgs) return imgs;

  return undefined;
}

function isPlayerVersionLongSleeveName(name: string) {
  const n = name.toUpperCase();

  if (!n.includes("PLAYER VERSION")) return false;

  const isLongSleeve =
    n.includes("LONG SLEEVE") ||
    n.includes("LONG-SLEEVE") ||
    /\bL\/S\b/.test(n) ||
    /\bLS\b/.test(n);
  if (!isLongSleeve) return false;

  const EXCLUDE = [
    "RETRO",
    "SET",
    "SHORTS",
    "TRACKSUIT",
    "CROP TOP",
    "KIDS KIT",
    "BABY",
    "INFANT",
    "FULL KIT",
    "KIT SET",
    "JERSEY + SHORTS",
    "WITH SHORTS",
  ];

  for (const x of EXCLUDE) {
    if (n.includes(x)) return false;
  }

  return true;
}

/* ============================================================
   GET
============================================================ */

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = normalizeStr(searchParams.get("q"));

    const baseWhere: any = {
      AND: [
        { name: { contains: "Player Version", mode: "insensitive" } },
        {
          OR: [
            { name: { contains: "Long Sleeve", mode: "insensitive" } },
            { name: { contains: "Long-Sleeve", mode: "insensitive" } },
          ],
        },
        {
          NOT: [
            { name: { contains: "Retro", mode: "insensitive" } },
            { name: { contains: "Tracksuit", mode: "insensitive" } },
            { name: { contains: "Shorts", mode: "insensitive" } },
            { name: { contains: "Set", mode: "insensitive" } },
            { name: { contains: "Kids Kit", mode: "insensitive" } },
            { name: { contains: "Baby", mode: "insensitive" } },
            { name: { contains: "Infant", mode: "insensitive" } },
          ],
        },
      ],
    };

    let whereWithQ: any = baseWhere;

    if (q) {
      whereWithQ = {
        AND: [
          ...baseWhere.AND,
          {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { team: { contains: q, mode: "insensitive" } }, // pode não existir
            ],
          },
        ],
      };
    }

    let productsRaw: any[] = [];

    // 1) tenta trazer imagens via relação "images"
    try {
      productsRaw = await (prisma as any).product.findMany({
        where: whereWithQ,
        take: 5000,
        include: { images: true }, // ✅ isto é o que faltava para as imagens virem
      });
    } catch {
      // 2) se falhar (team não existe ou images não é relação), tenta sem team e/ou sem include
      const whereNameOnly =
        q
          ? {
              AND: [
                ...baseWhere.AND,
                { name: { contains: q, mode: "insensitive" } },
              ],
            }
          : baseWhere;

      try {
        productsRaw = await (prisma as any).product.findMany({
          where: whereNameOnly,
          take: 5000,
          include: { images: true },
        });
      } catch {
        // 3) último fallback: sem include (pelo menos não dá 500)
        productsRaw = await (prisma as any).product.findMany({
          where: whereNameOnly,
          take: 5000,
        });
      }
    }

    const filtered = (Array.isArray(productsRaw) ? productsRaw : [])
      .filter(
        (p: any) =>
          typeof p?.name === "string" && isPlayerVersionLongSleeveName(p.name)
      )
      .map((p: any) => ({
        id: p.id,
        name: p.name,
        slug: p.slug ?? undefined,
        price: typeof p.price === "number" ? p.price : undefined,
        team: p.team ?? null,
        img: pickImageUrl(p), // ✅ agora vai conseguir apanhar images[0].url
      }));

    return NextResponse.json({ products: filtered });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load products" },
      { status: 500 }
    );
  }
}
