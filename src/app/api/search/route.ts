// src/app/api/search/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function loose(s: unknown) {
  return (s ?? "")
    .toString()
    .toLowerCase()
    .replace(/[-_]+/g, " ")     // "real-madrid" -> "real madrid"
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
const tokensOf = (q: string) => loose(q).split(" ").filter(Boolean);

type Any = Record<string, any>;

// preço -> euros
function toPrice(p: any): number | undefined {
  if (p == null) return undefined;
  if (typeof p === "number") return p >= 1000 ? Math.round(p) / 100 : p;
  if (typeof p === "string") {
    const n = Number(p);
    return Number.isFinite(n) ? (n >= 1000 ? Math.round(n) / 100 : n) : undefined;
  }
  if (typeof p?.toNumber === "function") return toPrice(p.toNumber());
  if (typeof p?.toString === "function") return toPrice(p.toString());
  return undefined;
}

function normalizeProduct(p: Any) {
  const name = p.name ?? p.title ?? p.productName ?? "Product";
  const img =
    p.img ??
    p.image ??
    p.imageUrl ??
    (Array.isArray(p.images) ? (p.images[0]?.url ?? p.images[0]) : undefined);

  const price =
    toPrice(p.basePrice) ??
    toPrice(p.price) ??
    toPrice(p.price_cents) ??
    toPrice(p.price_eur);

  return {
    id: p.id ?? p.slug ?? name,
    name,
    slug: p.slug,
    img,
    price,
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ products: [] });

  const tokens = tokensOf(q);
  if (!tokens.length) return NextResponse.json({ products: [] });

  // 1) tenta Product “direto” (os campos name/slug/description são quase universais)
  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = (globalThis as any).__prisma ?? new PrismaClient();
    (globalThis as any).__prisma = prisma;

    // AND de tokens; cada token procura em OR name/slug/description
    const where: any = {
      AND: tokens.map((t) => ({
        OR: [
          { name: { contains: t, mode: "insensitive" } },
          { slug: { contains: t, mode: "insensitive" } },
          { description: { contains: t, mode: "insensitive" } },
          // Se tiveres estes campos no teu schema, podes descomentar:
          // { teamSlug: { contains: t, mode: "insensitive" } },
          // { clubSlug: { contains: t, mode: "insensitive" } },
          // { category: { contains: t, mode: "insensitive" } },
        ],
      })),
    };

    // Se o modelo se chama "Product", o client é prisma.product
    // (Prisma transforma o nome do modelo em camelCase)
    if ((prisma as any).product?.findMany) {
      const rows = await (prisma as any).product.findMany({
        where,
        take: 100, // evita scan gigante
        orderBy: { updatedAt: "desc" },
      });
      const products = Array.isArray(rows) ? rows.map(normalizeProduct) : [];
      return NextResponse.json({ products });
    }
  } catch (e) {
    // cai para os fallbacks abaixo
  }

  // 2) fallback super-genérico: tenta carregar alguma lista e filtra no Node
  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = (globalThis as any).__prisma ?? new PrismaClient();
    (globalThis as any).__prisma = prisma;

    // tenta alguns nomes comuns
    for (const key of ["product", "products", "item", "items", "listing", "listings"]) {
      const model = (prisma as any)[key];
      if (!model?.findMany) continue;
      const rows: any[] = await model.findMany({ take: 500 });
      if (!rows?.length) continue;

      const hay = (p: any) =>
        loose(
          [
            p.name,
            p.title,
            p.productName,
            p.slug,
            p.description,
            p.team,
            p.teamSlug,
            p.club,
            p.clubSlug,
            p.category,
            p.categorySlug,
            Array.isArray(p.tags) ? p.tags.join(" ") : "",
          ]
            .filter(Boolean)
            .join(" ")
        );

      const filtered = rows.filter((r) => {
        const h = hay(r);
        return tokens.every((t) => h.includes(t));
      });

      const products = filtered.map(normalizeProduct);
      return NextResponse.json({ products });
    }
  } catch {}

  return NextResponse.json({ products: [] });
}
