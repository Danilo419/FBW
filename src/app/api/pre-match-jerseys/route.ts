// src/app/api/pre-match-jerseys/route.ts
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

function isPreMatchName(name: string) {
  const n = name.toUpperCase();

  const isPreMatch =
    n.includes("PRE-MATCH") ||
    n.includes("PRE MATCH") ||
    n.includes("PREMATCH") ||
    n.includes("WARM-UP") ||
    n.includes("WARM UP") ||
    n.includes("WARMUP");

  if (!isPreMatch) return false;

  // excluir itens óbvios que não sejam camisola/top
  if (n.includes("SHORTS")) return false;
  if (n.includes("TRACKSUIT")) return false;
  if (n.includes("CROP TOP")) return false;
  if (n.includes("SCARF")) return false;
  if (n.includes("BALL")) return false;
  if (n.includes("POSTER")) return false;

  // excluir infantis / completos
  if (n.includes("KIDS KIT")) return false;
  if (n.includes("BABY")) return false;
  if (n.includes("INFANT")) return false;

  // kit completo (mantém, mas sem matar nomes normais)
  if (n.includes("FULL KIT")) return false;
  if (n.includes("KIT SET")) return false;
  if (n.includes("JERSEY + SHORTS")) return false;
  if (n.includes("WITH SHORTS")) return false;

  // se tiver " KIT" genérico mas for claramente “PRE-MATCH … JERSEY”, deixa passar
  // (caso contrário, evita kits completos genéricos)
  if (n.includes(" KIT") && !(n.includes("JERSEY") || n.includes("TOP"))) {
    return false;
  }

  return true;
}

/* ================= GET ================= */

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = normalizeStr(searchParams.get("q"));

    // Vamos buscar tudo que contenha "pre" ou "warm" e depois filtrar com segurança.
    // (Assim apanhamos variações: "Pre Match", "Warmup", etc.)
    const baseWhereAny: any = {
      OR: [
        { name: { contains: "pre", mode: "insensitive" as const } },
        { name: { contains: "warm", mode: "insensitive" as const } },
      ],
    };

    let whereFinal: any = baseWhereAny;

    if (q) {
      // pesquisa opcional por name/team (se existir)
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

    const filtered = (rows ?? []).filter(
      (p) => typeof p?.name === "string" && isPreMatchName((p as any).name)
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
      { error: err?.message || "Failed to load pre-match jerseys" },
      { status: 500 }
    );
  }
}
