import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Garante Node.js (Prisma não funciona em Edge)
export const runtime = "nodejs";

function getAllStrings(v: FormDataEntryValue[] | undefined): string[] {
  if (!v) return [];
  return v.map((x) => (typeof x === "string" ? x : "")).filter(Boolean);
}

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

    const priceCents = Math.round(parseFloat(priceStr) * 100);
    if (!Number.isFinite(priceCents) || priceCents < 0) {
      return NextResponse.json({ error: "Invalid price." }, { status: 400 });
    }

    const season = String(form.get("season") || "").trim() || null;
    const description = String(form.get("description") || "").trim() || null;
    const badges = getAllStrings(form.getAll("badges"));
    const imageUrls = getAllStrings(form.getAll("imageUrls")); // ← URLs do Vercel Blob
    const sizeGroup = (String(form.get("sizeGroup") || "adult") as "adult" | "kid");
    const sizes = getAllStrings(form.getAll("sizes"));

    // ⬇️ IMPORTANTE: este create assume que o teu Product tem:
    // - basePrice    Int
    // - badges       String[]    (Postgres text[])
    // - imageUrls    String[]    (Postgres text[])
    // Se ainda não tiveres estes campos, cria uma migration ou,
    // como alternativa temporária, podes guardar em JSON (ver comentários abaixo).
    const product = await prisma.product.create({
      data: {
        name,
        team,
        season,
        description,
        basePrice: priceCents,
        badges,     // text[]
        imageUrls,  // text[]
      } as any, // ← 'as any' evita erro caso o tipo gerado ainda não conheça estes campos (até correres a migration)
      select: { id: true },
    });

    // Guardar stocks das sizes (se existir a tabela SizeStock)
    try {
      if (sizes.length > 0) {
        await prisma.sizeStock.createMany({
          data: sizes.map((s) => ({
            productId: product.id,
            size: s,
            available: true,
          })),
          skipDuplicates: true,
        });
      }
    } catch {
      // Se não existir a tabela SizeStock, ignoramos silenciosamente
    }

    return NextResponse.json({ ok: true, id: product.id });
  } catch (err) {
    console.error("create-product error:", err);
    return NextResponse.json({ error: "Failed to create product." }, { status: 500 });
  }
}
