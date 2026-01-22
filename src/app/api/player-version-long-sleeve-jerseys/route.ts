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
  // tenta vários formatos comuns (sem rebentar o build)
  if (typeof p?.img === "string" && p.img) return p.img;
  if (typeof p?.image === "string" && p.image) return p.image;
  if (typeof p?.imageUrl === "string" && p.imageUrl) return p.imageUrl;

  const imgs = p?.images;

  // relação prisma (array de objetos)
  if (Array.isArray(imgs) && imgs.length > 0) {
    const first = imgs[0];

    if (typeof first === "string") return first;

    if (first && typeof first === "object") {
      if (typeof first.url === "string" && first.url) return first.url;
      if (typeof first.src === "string" && first.src) return first.src;
      if (typeof first.path === "string" && first.path) return first.path;
      if (typeof first.imageUrl === "string" && first.imageUrl)
        return first.imageUrl;
    }
  }

  // json/string único
  if (typeof imgs === "string" && imgs) return imgs;

  return undefined;
}

function isPlayerVersionLongSleeveName(name: string) {
  const n = name.toUpperCase();

  // requisitos
  if (!n.includes("PLAYER VERSION")) return false;

  const isLongSleeve =
    n.includes("LONG SLEEVE") ||
    n.includes("LONG-SLEEVE") ||
    /\bL\/S\b/.test(n) ||
    /\bLS\b/.test(n);

  if (!isLongSleeve) return false;

  // exclusões
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
   /api/player-version-long-sleeve-jerseys
   Opcional: ?q=chelsea  (filtra por nome/equipa)
============================================================ */

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = normalizeStr(searchParams.get("q"));

    // Prisma typed pode variar no teu projeto (images, img, etc),
    // por isso usamos (prisma as any) para incluir imagens sem dar erro TS.
    const productsRaw = await (prisma as any).product.findMany({
      where: {
        AND: [
          // já reduz bastante no DB
          { name: { contains: "Player Version", mode: "insensitive" } },
          // long sleeve (no DB) — as variações LS/L-S apanhamos no filtro JS
          {
            OR: [
              { name: { contains: "Long Sleeve", mode: "insensitive" } },
              { name: { contains: "Long-Sleeve", mode: "insensitive" } },
            ],
          },

          // exclusões principais no DB (para performance)
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

          // pesquisa opcional por nome/equipa
          ...(q
            ? [
                {
                  OR: [
                    { name: { contains: q, mode: "insensitive" } },
                    { team: { contains: q, mode: "insensitive" } },
                  ],
                },
              ]
            : []),
        ],
      },

      // tenta trazer imagens sem depender do schema exato
      include: {
        images: true,
      },

      // segurança: não rebenta com milhares sem querer
      take: 5000,

      orderBy: { createdAt: "desc" },
    });

    // filtro final (garante que só sai o que cumpre TODOS os requisitos)
    const filtered = (Array.isArray(productsRaw) ? productsRaw : [])
      .filter((p: any) => typeof p?.name === "string" && isPlayerVersionLongSleeveName(p.name))
      .map((p: any) => ({
        id: p.id,
        name: p.name,
        slug: p.slug ?? undefined,
        price: typeof p.price === "number" ? p.price : undefined,
        team: p.team ?? null,
        img: pickImageUrl(p),
      }));

    return NextResponse.json({ products: filtered });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load products" },
      { status: 500 }
    );
  }
}
