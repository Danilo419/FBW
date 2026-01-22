// src/app/api/concept-kits/route.ts
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

function isConceptName(name: string) {
  const n = name.toUpperCase();
  if (!n.includes("CONCEPT")) return false;

  // excluir itens óbvios que não são "jersey/kit"
  const EXCLUDE = ["SHORTS", "TRACKSUIT", "CROP TOP", "SCARF", "BALL", "POSTER"];
  for (const x of EXCLUDE) if (n.includes(x)) return false;

  // excluir infantis específicos
  if (n.includes("KIDS KIT")) return false;
  if (n.includes("BABY")) return false;
  if (n.includes("INFANT")) return false;

  // aqui NÃO excluímos " KIT" genérico (porque concept kit é válido)
  return true;
}

/* ================= GET ================= */

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = normalizeStr(searchParams.get("q"));

    // base: nome contém "Concept"
    const baseWhere: any = {
      name: { contains: "Concept", mode: "insensitive" as const },
    };

    let whereFinal: any = baseWhere;

    // pesquisa opcional por name/team
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

    // fallback se "team" não existir no teu schema
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
      (p) => typeof p?.name === "string" && isConceptName(p.name)
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
      { error: err?.message || "Failed to load concept kits" },
      { status: 500 }
    );
  }
}
