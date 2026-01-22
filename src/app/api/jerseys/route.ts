// src/app/api/jerseys/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ================= Helpers ================= */

function normalizeStr(s?: string | null) {
  return (s ?? "").replace(/\s{2,}/g, " ").trim();
}

function centsToEur(v?: number | null) {
  if (typeof v !== "number" || !Number.isFinite(v)) return undefined;
  return Math.round(v) / 100;
}

/* ================= Filter (server-side safety) ================= */

function isStandardShortSleeveName(name: string) {
  const n = name.toUpperCase();

  if (n.includes("PLAYER VERSION")) return false;
  if (n.includes("LONG SLEEVE")) return false;
  if (n.includes("RETRO")) return false;

  if (n.includes("SET")) return false;
  if (n.includes("SHORTS")) return false;
  if (n.includes("TRACKSUIT")) return false;
  if (n.includes("CROP TOP")) return false;
  if (n.includes("KIDS KIT")) return false;
  if (n.includes("BABY")) return false;
  if (n.includes("INFANT")) return false;
  if (n.includes(" KIT")) return false;

  return true;
}

/* ================= GET ================= */

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = normalizeStr(searchParams.get("q"));

    // Base: queremos "jersey" (camisolas), mas evitar "retro/player/long sleeve"
    const baseWhere: any = {
      AND: [
        { name: { contains: "jersey", mode: "insensitive" as const } },
        { NOT: { name: { contains: "player version", mode: "insensitive" as const } } },
        { NOT: { name: { contains: "long sleeve", mode: "insensitive" as const } } },
        { NOT: { name: { contains: "retro", mode: "insensitive" as const } } },
      ],
    };

    let whereFinal: any = baseWhere;

    if (q) {
      // tenta name OU team
      whereFinal = {
        AND: [
          baseWhere,
          {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { team: { contains: q, mode: "insensitive" as const } },
            ],
          },
        ],
      };
    }

    // ✅ Buscar com SELECT explícito (igual ao /api/search)
    let rows = await prisma.product.findMany({
      where: whereFinal,
      take: 5000,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        slug: true,
        name: true,
        team: true,
        basePrice: true, // ✅ cents
        imageUrls: true, // ✅ array
        updatedAt: true,
      },
    });

    // fallback se "team" não existir no schema
    if (q && rows.length === 0) {
      rows = await prisma.product.findMany({
        where: {
          AND: [
            baseWhere,
            { name: { contains: q, mode: "insensitive" as const } },
          ],
        },
        take: 5000,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          slug: true,
          name: true,
          team: true,
          basePrice: true,
          imageUrls: true,
          updatedAt: true,
        },
      });
    }

    // filtro final (garante que fica igual ao teu frontend)
    const filtered = (rows ?? []).filter(
      (p) =>
        typeof p?.name === "string" && isStandardShortSleeveName((p as any).name)
    );

    const payload = filtered.map((p: any) => ({
      id: p.id,
      name: p.name,
      slug: p.slug ?? undefined,
      team: p.team ?? null,
      // ✅ preço correto (EUR) vindo de basePrice (cents)
      price: centsToEur(p.basePrice),
      // ✅ imagem correta (primeira do array)
      img: Array.isArray(p.imageUrls) ? p.imageUrls[0] : null,
    }));

    return NextResponse.json({ products: payload });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load jerseys" },
      { status: 500 }
    );
  }
}
