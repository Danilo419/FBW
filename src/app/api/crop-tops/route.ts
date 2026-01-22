// src/app/api/crop-tops/route.ts
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

/* ================= Filter ================= */

function isCropTopName(name: string) {
  const n = name.toUpperCase();

  const isCrop =
    n.includes("CROP TOP") ||
    n.includes("CROP-TOP") ||
    n.includes("CROPPED TOP") ||
    n.includes("CROPPED TEE") ||
    n.includes("CROPPED SHIRT") ||
    n.includes("CROP TEE") ||
    n.includes("CROP SHIRT") ||
    n.includes("CROPPED JERSEY") ||
    n.includes("CROP JERSEY") ||
    n.startsWith("CROP ") ||
    n.includes(" CROP ") ||
    n.includes(" CROPPED ");

  if (!isCrop) return false;

  // Excluir conjuntos completos / itens que não são top
  if (n.includes(" FULL KIT")) return false;
  if (n.includes("KIT SET")) return false;
  if (n.includes("JERSEY + SHORTS")) return false;
  if (n.includes("WITH SHORTS")) return false;
  if (n.includes("SHORTS")) return false;
  if (n.includes("TRACKSUIT")) return false;

  // Se tiver " KIT" genérico, quase sempre é conjunto -> excluir
  if (n.includes(" KIT")) return false;
  if (n.includes(" SET")) return false;

  // Excluir acessórios óbvios
  if (n.includes("SCARF")) return false;
  if (n.includes("BALL")) return false;
  if (n.includes("POSTER")) return false;

  return true;
}

/* ================= GET ================= */

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = normalizeStr(searchParams.get("q"));

    // Busca ampla: "crop" / "cropped"
    const baseWhereAny: any = {
      OR: [
        { name: { contains: "crop", mode: "insensitive" as const } },
        { name: { contains: "cropped", mode: "insensitive" as const } },
      ],
    };

    let whereFinal: any = baseWhereAny;

    if (q) {
      whereFinal = {
        AND: [
          baseWhereAny,
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

    // fallback se "team" não existir
    if (q && rows.length === 0) {
      rows = await prisma.product.findMany({
        where: {
          AND: [
            baseWhereAny,
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
      (p) => typeof p?.name === "string" && isCropTopName(p.name)
    );

    const payload = filtered.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug ?? undefined,
      team: (p as any).team ?? null,
      // ✅ preço correto (EUR) vindo de basePrice (cents)
      price: centsToEur((p as any).basePrice),
      // ✅ imagem correta (primeira do array)
      img: Array.isArray((p as any).imageUrls) ? (p as any).imageUrls[0] : null,
    }));

    return NextResponse.json({ products: payload });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load crop tops" },
      { status: 500 }
    );
  }
}
