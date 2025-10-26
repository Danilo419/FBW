// src/app/api/admin/create-product/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ================== Helpers ================== */
function getAllStrings(list: FormDataEntryValue[] | undefined): string[] {
  if (!list) return [];
  return list.map((x) => (typeof x === "string" ? x : "")).filter(Boolean);
}

function toSlug(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function parsePriceToCents(raw: string): number {
  const n = Number(String(raw).replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return NaN;
  return Math.round(n * 100);
}

/* ================== Handler ================== */
export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const name = String(form.get("name") || "").trim();
    const team = String(form.get("team") || "").trim();
    const priceStr = String(form.get("price") || "").trim();

    if (!name || !team || !priceStr) {
      return NextResponse.json(
        { error: "Missing required fields: name, team or price." },
        { status: 400 }
      );
    }

    const basePrice = parsePriceToCents(priceStr);
    if (!Number.isFinite(basePrice)) {
      return NextResponse.json({ error: "Invalid price." }, { status: 400 });
    }

    const season = (String(form.get("season") || "").trim() || null) as string | null;
    const description = (String(form.get("description") || "").trim() || null) as
      | string
      | null;

    const badges = getAllStrings(form.getAll("badges"));
    const imageUrlsRaw = getAllStrings(form.getAll("imageUrls"));

    // Só aceita URLs http(s) — os do Vercel Blob já são https://...public.blob.vercel-storage.com
    const imageUrls = imageUrlsRaw.filter((u) => /^https?:\/\//i.test(u));

    if (imageUrls.length === 0) {
      return NextResponse.json(
        { error: "At least one image url is required." },
        { status: 400 }
      );
    }

    // Sizes
    const sizeGroup = (String(form.get("sizeGroup") || "adult") as "adult" | "kid");
    const sizes = getAllStrings(form.getAll("sizes"));

    // Slug único
    const base = toSlug(
      `${team ? team + " " : ""}${name}${season ? " " + season : ""}`
    );
    let slug = base || toSlug(name) || `product-${Date.now()}`;
    let suffix = 1;
    while (await prisma.product.findUnique({ where: { slug } })) {
      slug = `${base}-${suffix++}`;
    }

    // Criação do produto
    const created = await prisma.product.create({
      data: {
        name,
        team,
        season,
        description,
        slug,
        basePrice,     // Int (cêntimos)
        badges,        // String[] (Postgres text[])
        imageUrls,     // String[] (Postgres text[])
      },
      select: { id: true, slug: true },
    });

    // Tenta criar stocks (ignora se não existir a tabela)
    try {
      if (sizes.length > 0) {
        await prisma.sizeStock.createMany({
          data: sizes.map((s) => ({
            productId: created.id,
            size: s,
            available: true,
          })),
          skipDuplicates: true,
        });
      }
    } catch {
      // Silencioso se SizeStock não existir no schema
    }

    return NextResponse.json(
      { ok: true, id: created.id, slug: created.slug, sizeGroup, sizes },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("create-product error:", err);
    return NextResponse.json({ error: "Failed to create product." }, { status: 500 });
  }
}
