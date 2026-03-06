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
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function parsePriceToCents(raw: string): number {
  const n = Number(String(raw).replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return NaN;
  return Math.round(n * 100);
}

/* ================== teamType (CLUB vs NATION) ================== */
type TeamTypeLocal = "CLUB" | "NATION";
function parseTeamType(v: unknown): TeamTypeLocal {
  const raw = String(v ?? "").trim().toUpperCase();
  return raw === "NATION" ? "NATION" : "CLUB";
}

/* ================== bool parsing ================== */
function parseBool(v: unknown): boolean {
  const raw = String(v ?? "").trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes" || raw === "on";
}

/** Catálogo de labels legíveis para as badges (mesmos "values" usados no admin) */
const BADGE_LABELS = new Map<string, string>([
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
  ["primeira-liga-regular", "Primeira Liga (Portugal) – League Badge"],
  ["primeira-liga-champions", "Primeira Liga – Champion"],
  ["eredivisie-regular", "Eredivisie – League Badge"],
  ["eredivisie-champions", "Eredivisie – Champion"],
  ["scottish-premiership-regular", "Scottish Premiership – League Badge"],
  ["scottish-premiership-champions", "Scottish Premiership – Champion"],
  ["mls-regular", "MLS – League Badge"],
  ["mls-champions", "MLS – Champions (MLS Cup Holders)"],
  ["brasileirao-regular", "Brazil – Brasileirão – League Badge"],
  ["brasileirao-champions", "Brazil – Brasileirão – Champion"],
  ["super-lig-regular", "Turkey – Süper Lig – League Badge"],
  ["super-lig-champions", "Turkey – Süper Lig – Champion (if applicable)"],
  ["spl-saudi-regular", "Saudi Pro League – League Badge"],
  ["spl-saudi-champions", "Saudi Pro League – Champion (if applicable)"],
  ["ucl-regular", "UEFA Champions League – Starball Badge"],
  ["ucl-winners", "UEFA Champions League – Winners Badge"],
  ["uel-regular", "UEFA Europa League – Badge"],
  ["uel-winners", "UEFA Europa League – Winners Badge"],
  ["uecl-regular", "UEFA Europa Conference League – Badge"],
  ["uecl-winners", "UEFA Europa Conference League – Winners Badge"],
  ["fifa-world-cup-regular", "FIFA World Cup – Tournament Badge"],
  ["fifa-world-cup-winners", "FIFA World Cup – Winners Badge"],
  ["olympic-football-regular", "Olympic Football – Tournament Badge"],
  ["olympic-football-winners", "Olympic Football – Winners Badge"],
  ["uefa-euro-regular", "UEFA EURO – Tournament Badge"],
  ["uefa-euro-winners", "UEFA EURO – Winners Badge"],
  ["uefa-nations-league-regular", "UEFA Nations League – Tournament Badge"],
  ["uefa-nations-league-winners", "UEFA Nations League – Winners Badge"],
  ["uefa-finalissima-regular", "Finalissima – Match Badge"],
  ["uefa-finalissima-winners", "Finalissima – Winners Badge"],
  ["copa-america-regular", "Copa América – Tournament Badge"],
  ["copa-america-winners", "Copa América – Winners Badge"],
  ["afcon-regular", "AFCON (Africa Cup of Nations) – Tournament Badge"],
  ["afcon-winners", "AFCON (Africa Cup of Nations) – Winners Badge"],
  ["afc-asian-cup-regular", "AFC Asian Cup – Tournament Badge"],
  ["afc-asian-cup-winners", "AFC Asian Cup – Winners Badge"],
  ["afc-nations-league-regular", "AFC Nations League – Tournament Badge"],
  ["afc-nations-league-winners", "AFC Nations League – Winners Badge"],
  ["concacaf-gold-cup-regular", "CONCACAF Gold Cup – Tournament Badge"],
  ["concacaf-gold-cup-winners", "CONCACAF Gold Cup – Winners Badge"],
  ["concacaf-nations-league-regular", "CONCACAF Nations League – Tournament Badge"],
  ["concacaf-nations-league-winners", "CONCACAF Nations League – Winners Badge"],
  ["ofc-nations-cup-regular", "OFC Nations Cup – Tournament Badge"],
  ["ofc-nations-cup-winners", "OFC Nations Cup – Winners Badge"],
  ["club-world-cup-champions", "Club World Cup – Champions Badge"],
  ["intercontinental-cup-champions", "FIFA Intercontinental Cup – Champions Badge"],
]);

/* ================== Handler ================== */
export async function POST(req: Request) {
  try {
    const form = await req.formData();

    // ✅ canal (PT Stock vs normal)
    const channel = String(form.get("channel") ?? "").trim(); // ex: "PT_STOCK_CTT"
    const isPTStock = channel === "PT_STOCK_CTT" || parseBool(form.get("isPtStock")) || parseBool(form.get("ptStockOnly"));

    const name = String(form.get("name") || "").trim();
    const priceStr = String(form.get("price") || "").trim();

    // ✅ Para PT Stock, team/teamType/season/badges/customization não são usados
    // ✅ Para normal, continuam obrigatórios
    let team = String(form.get("team") || "").trim();
    let teamType = parseTeamType(form.get("teamType"));
    let season = (String(form.get("season") || "").trim() || null) as string | null;

    if (isPTStock) {
      team = "Portugal Stock";
      teamType = "CLUB";
      season = null;
    }

    if (!name || !priceStr || (!isPTStock && !team)) {
      return NextResponse.json(
        { error: isPTStock ? "Missing required fields: name or price." : "Missing required fields: name, team or price." },
        { status: 400 }
      );
    }

    const basePrice = parsePriceToCents(priceStr);
    if (!Number.isFinite(basePrice)) {
      return NextResponse.json({ error: "Invalid price." }, { status: 400 });
    }

    const description = (String(form.get("description") || "").trim() || null) as string | null;

    // ✅ PT Stock: ignora disableCustomization/badges
    const dcRaw = String(form.get("disableCustomization") ?? "").toLowerCase();
    const disableCustomization =
      dcRaw === "true" ||
      dcRaw === "on" ||
      dcRaw === "1" ||
      dcRaw === "yes" ||
      (dcRaw === "" && form.has("disableCustomization"));

    const badges = isPTStock ? [] : getAllStrings(form.getAll("badges"));
    const imageUrlsRaw = getAllStrings(form.getAll("imageUrls"));

    const imageUrls = imageUrlsRaw.filter((u) => /^https?:\/\//i.test(u));
    if (imageUrls.length === 0) {
      return NextResponse.json({ error: "At least one image url is required." }, { status: 400 });
    }

    const sizeGroup = String(form.get("sizeGroup") || "adult") as "adult" | "kid";
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

    // ✅ data tipada do Prisma não deixa meter campos extra sem existirem no schema,
    // então montamos como "any" e só adicionamos canal/flags se tu tiveres isso no schema.
    const productData: any = {
      name,
      team,
      teamType,
      season,
      description,
      slug,
      basePrice,
      badges,
      imageUrls,
    };

    // ✅ Se no teu schema existir "channel"/"ptStockOnly"/"isPtStock", isto grava e resolve o teu filtro do admin.
    if (channel) productData.channel = channel;
    if (isPTStock) {
      productData.ptStockOnly = true;
      productData.isPtStock = true;
    }

    // 1) Criar produto
    const created = await prisma.product.create({
      data: productData,
      select: { id: true, slug: true },
    });

    // 2) Criar APENAS os tamanhos escolhidos
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
      // ignorar se não existir
    }

    // ✅ 3) Option Groups
    // PT Stock: NÃO cria customization e NÃO cria badges
    if (!isPTStock) {
      // 3.1 Customization (se não estiver desativado)
      if (!disableCustomization) {
        const hasBadges = badges.length > 0;
        const valuesToCreate = [
          { value: "none", label: "No customization", priceDelta: 0 },
          { value: "name-number", label: "Name & Number", priceDelta: 0 },
          ...(hasBadges
            ? [
                { value: "badge", label: "Competition Badge", priceDelta: 0 },
                { value: "name-number-badge", label: "Name & Number + Competition Badge", priceDelta: 0 },
              ]
            : []),
        ];

        await prisma.optionGroup.create({
          data: {
            productId: created.id,
            key: "customization",
            label: "Customization",
            type: OptionType.RADIO,
            required: true,
            values: { create: valuesToCreate },
          },
        });
      }

      // 3.2 Badges
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
    }

    return NextResponse.json(
      {
        ok: true,
        id: created.id,
        slug: created.slug,
        channel: channel || null,
        isPTStock,
        teamType,
        sizeGroup,
        sizes,
        disableCustomization: isPTStock ? true : disableCustomization,
        badgesCount: badges.length,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("create-product error:", err);
    return NextResponse.json({ error: "Failed to create product." }, { status: 500 });
  }
}