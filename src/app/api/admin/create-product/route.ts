// src/app/api/admin/create-product/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OptionType } from "@prisma/client";

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

/** Catálogo de labels legíveis para as badges (mesmos "values" usados no admin) */
const BADGE_LABELS = new Map<string, string>([
  // Europe (top 8)
  ["premier-league-regular", "Premier League – League Badge"],
  ["premier-league-champions", "Premier League – Champions (Gold)"],
  ["la-liga-regular", "La Liga – League Badge"],
  ["la-liga-champions", "La Liga – Champion"],
  ["serie-a-regular", "Serie A – League Badge"],
  ["serie-a-scudetto", "Italy – Scudetto (Serie A Champion)"],
  ["bundesliga-regular", "Bundesliga – League Badge"],
  ["bundesliga-champions", "Bundesliga – Champion (Meister Badge)"],
  ["ligue1-regular", "Ligue 1 – League Badge"],
  ["ligue1-champions", "Ligue 1 – Champion"],
  ["primeira-liga-regular", "Primeira Liga – League Badge"],
  ["primeira-liga-champions", "Primeira Liga – Champion"],
  ["eredivisie-regular", "Eredivisie – League Badge"],
  ["eredivisie-champions", "Eredivisie – Champion"],
  ["scottish-premiership-regular", "Scottish Premiership – League Badge"],
  ["scottish-premiership-champions", "Scottish Premiership – Champion"],
  // Others mentioned
  ["mls-regular", "MLS – League Badge"],
  ["mls-champions", "MLS – Champions (MLS Cup Holders)"],
  ["brasileirao-regular", "Brazil – Brasileirão – League Badge"],
  ["brasileirao-champions", "Brazil – Brasileirão – Champion"],
  ["super-lig-regular", "Turkey – Süper Lig – League Badge"],
  ["super-lig-champions", "Turkey – Süper Lig – Champion"],
  ["spl-saudi-regular", "Saudi Pro League – League Badge"],
  ["spl-saudi-champions", "Saudi Pro League – Champion"],
  // UEFA / FIFA
  ["ucl-regular", "UEFA Champions League – Starball Badge"],
  ["ucl-winners", "UEFA Champions League – Winners Badge"],
  ["uel-regular", "UEFA Europa League – Badge"],
  ["uel-winners", "UEFA Europa League – Winners Badge"],
  ["uecl-regular", "UEFA Europa Conference League – Badge"],
  ["uecl-winners", "UEFA Europa Conference League – Winners Badge"],
  ["club-world-cup-champions", "Club World Cup – Champions Badge"],
]);

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
    const description = (String(form.get("description") || "").trim() || null) as string | null;

    const badges = getAllStrings(form.getAll("badges"));          // ex.: ["ucl-regular", ...]
    const imageUrlsRaw = getAllStrings(form.getAll("imageUrls")); // URLs (Vercel Blob)

    // Só aceita URLs http(s)
    const imageUrls = imageUrlsRaw.filter((u) => /^https?:\/\//i.test(u));
    if (imageUrls.length === 0) {
      return NextResponse.json(
        { error: "At least one image url is required." },
        { status: 400 }
      );
    }

    // Sizes: apenas os selecionados no formulário
    const sizeGroup = (String(form.get("sizeGroup") || "adult") as "adult" | "kid");
    const sizes = getAllStrings(form.getAll("sizes"))
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    // Slug único
    const base = toSlug(`${team ? team + " " : ""}${name}${season ? " " + season : ""}`);
    let slug = base || toSlug(name) || `product-${Date.now()}`;
    let suffix = 1;
    while (await prisma.product.findUnique({ where: { slug } })) {
      slug = `${base}-${suffix++}`;
    }

    // 1) Criar produto
    const created = await prisma.product.create({
      data: {
        name,
        team,
        season,
        description,
        slug,
        basePrice,     // Int (cêntimos)
        badges,        // String[] (se a tua tabela Product tiver esta coluna)
        imageUrls,     // String[] (Postgres text[])
      },
      select: { id: true, slug: true },
    });

    // 2) Criar APENAS os tamanhos escolhidos (sem preencher o resto)
    // Usa o teu modelo real (no teu projeto é "SizeStock")
    try {
      if (sizes.length > 0) {
        await prisma.sizeStock.createMany({
          data: sizes.map((s) => ({
            productId: created.id,
            size: s,          // já em maiúsculas
            available: true,  // começa disponível; depois editas no admin
            // stock: null      // se tiveres este campo e quiseres iniciar como null
          })),
          skipDuplicates: true,
        });
      }
    } catch {
      // Se o modelo SizeStock não existir no schema, ignorar silenciosamente
    }

    // 3) Bootstrapping de Option Groups para o configurador
    // 3.1 Customization (sempre)
    await prisma.optionGroup.create({
      data: {
        productId: created.id,
        key: "customization",
        label: "Customization",
        type: OptionType.RADIO,
        required: true,
        values: {
          create: [
            { value: "none",               label: "No customization",                         priceDelta: 0 },
            { value: "name-number",        label: "Name & Number",                             priceDelta: 0 },
            { value: "badge",              label: "Competition Badge",                         priceDelta: 0 },
            { value: "name-number-badge",  label: "Name & Number + Competition Badge",         priceDelta: 0 },
          ],
        },
      },
    });

    // 3.2 Badges (só se houver alguma escolhida no admin)
    if (badges.length > 0) {
      await prisma.optionGroup.create({
        data: {
          productId: created.id,
          key: "badges",
          label: "Competition Badge",
          type: OptionType.ADDON,
          required: false,
          values: {
            create: badges.map((v) => ({
              value: v,
              label: BADGE_LABELS.get(v) ?? v,
              priceDelta: 0,
            })),
          },
        },
      });
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
