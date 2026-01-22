// src/app/api/current-season-25-26/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ================= utils ================= */

function normalizeStr(s?: string | null) {
  return (s ?? "").replace(/\s{2,}/g, " ").trim();
}

function centsToEur(v?: number | null) {
  if (typeof v !== "number" || !Number.isFinite(v)) return undefined;
  return Math.round(v) / 100;
}

/** Remove valores lixo tipo "club", "team", etc */
function cleanTeamLabel(v: any): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;

  const upper = s.toUpperCase();
  if (upper === "CLUB" || upper === "TEAM" || upper === "UNKNOWN") return null;

  return s;
}

/* ================= Filter (server-side) ================= */

function isCurrentSeasonName(name: string) {
  const n = (name ?? "").toUpperCase();
  if (!n.includes("25/26")) return false;
  if (n.includes("PLAYER VERSION")) return false;
  if (n.includes("RETRO")) return false;
  return true;
}

/* ================= GET ================= */

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = normalizeStr(searchParams.get("q"));

    // Base: 25/26 + não player/retro
    const baseWhere: any = {
      AND: [
        { name: { contains: "25/26", mode: "insensitive" as const } },
        { NOT: { name: { contains: "player version", mode: "insensitive" as const } } },
        { NOT: { name: { contains: "retro", mode: "insensitive" as const } } },
      ],
    };

    let whereFinal: any = baseWhere;

    if (q) {
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

    // ✅ Mesma seleção do /api/search
    let rows = await prisma.product.findMany({
      where: whereFinal,
      take: 5000,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        slug: true,
        name: true,
        team: true,
        basePrice: true,   // cents
        imageUrls: true,   // string[]
        updatedAt: true,
      },
    });

    // Fallback sem team
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

    // Segurança final
    const filtered = rows.filter(
      (p) => typeof p?.name === "string" && isCurrentSeasonName(p.name)
    );

    const payload = filtered.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug ?? undefined,
      // ✅ NUNCA mais devolve "club"
      team: cleanTeamLabel(p.team),
      // ✅ preço consistente
      price: centsToEur(p.basePrice),
      // ✅ imagem consistente
      img: Array.isArray(p.imageUrls) ? p.imageUrls[0] : null,
    }));

    return NextResponse.json({ products: payload });
  } catch (err: any) {
    console.error("current-season-25-26 error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to load current season products" },
      { status: 500 }
    );
  }
}
