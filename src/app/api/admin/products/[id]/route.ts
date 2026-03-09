// src/app/api/admin/products/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProductChannel, TeamType } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

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

function parseBool(v: unknown): boolean {
  const raw = String(v ?? "").trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes" || raw === "on";
}

function parseTeamType(v: unknown): TeamType {
  const raw = String(v ?? "").trim().toUpperCase();
  return raw === "NATION" ? TeamType.NATION : TeamType.CLUB;
}

function parseChannel(v: unknown): ProductChannel {
  const raw = String(v ?? "").trim().toUpperCase();
  return raw === "PT_STOCK_CTT"
    ? ProductChannel.PT_STOCK_CTT
    : ProductChannel.GLOBAL;
}

async function buildUniqueSlug(
  name: string,
  team: string,
  season: string | null,
  excludeId: string
) {
  const base = toSlug(`${team ? team + " " : ""}${name}${season ? " " + season : ""}`);
  let slug = base || toSlug(name) || `product-${Date.now()}`;
  let suffix = 1;

  while (true) {
    const existing = await prisma.product.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing || existing.id === excludeId) return slug;
    slug = `${base}-${suffix++}`;
  }
}

/* ================== GET ================== */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        basePrice: true,
        imageUrls: true,
        team: true,
        teamType: true,
        season: true,
        channel: true,
        isVisible: true,
        allowNameNumber: true,
        sizes: {
          select: {
            size: true,
            available: true,
          },
          orderBy: { size: "asc" },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    return NextResponse.json(
      {
        product: {
          id: product.id,
          name: product.name,
          description: product.description,
          basePrice: product.basePrice,
          imageUrls: Array.isArray(product.imageUrls) ? product.imageUrls : [],
          team: product.team,
          teamType: product.teamType,
          season: product.season,
          channel: product.channel,
          isVisible: product.isVisible,
          allowNameNumber: product.allowNameNumber,
          sizes: product.sizes
            .filter((s) => s.available)
            .map((s) => s.size),
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[/api/admin/products/[id]] GET error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to load product." },
      { status: 500 }
    );
  }
}

/* ================== PUT ================== */
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const form = await req.formData();

    const existing = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        channel: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    const requestedChannel = parseChannel(form.get("channel"));
    const forcedPTStock =
      parseBool(form.get("isPtStock")) || parseBool(form.get("ptStockOnly"));
    const isPTStock =
      requestedChannel === ProductChannel.PT_STOCK_CTT || forcedPTStock;

    const channel = isPTStock
      ? ProductChannel.PT_STOCK_CTT
      : requestedChannel || existing.channel;

    const name = String(form.get("name") || "").trim();
    const priceStr = String(form.get("price") || "").trim();

    let team = String(form.get("team") || "").trim();
    let teamType = parseTeamType(form.get("teamType"));
    let season = (String(form.get("season") || "").trim() || null) as string | null;

    if (isPTStock) {
      team = "Portugal Stock";
      teamType = TeamType.CLUB;
      season = null;
    }

    if (!name || !priceStr || (!isPTStock && !team)) {
      return NextResponse.json(
        {
          error: isPTStock
            ? "Missing required fields: name or price."
            : "Missing required fields: name, team or price.",
        },
        { status: 400 }
      );
    }

    const basePrice = parsePriceToCents(priceStr);
    if (!Number.isFinite(basePrice)) {
      return NextResponse.json({ error: "Invalid price." }, { status: 400 });
    }

    const description =
      (String(form.get("description") || "").trim() || null) as string | null;

    const imageUrlsRaw = getAllStrings(form.getAll("imageUrls"));
    const imageUrls = imageUrlsRaw.filter((u) => /^https?:\/\//i.test(u));

    if (imageUrls.length === 0) {
      return NextResponse.json(
        { error: "At least one image url is required." },
        { status: 400 }
      );
    }

    const sizeGroup = String(form.get("sizeGroup") || "adult") as "adult" | "kid";
    const sizes = getAllStrings(form.getAll("sizes"))
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    const slug = await buildUniqueSlug(name, team, season, id);

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          name,
          team,
          teamType,
          season,
          description,
          slug,
          basePrice,
          imageUrls,
          channel,
          badges: isPTStock ? [] : undefined,
          allowNameNumber: isPTStock ? false : undefined,
        },
      });

      // Limpa todos os size stocks antigos e recria apenas os novos
      await tx.sizeStock.deleteMany({
        where: { productId: id },
      });

      if (sizes.length > 0) {
        await tx.sizeStock.createMany({
          data: sizes.map((size) => ({
            productId: id,
            size,
            available: true,
          })),
          skipDuplicates: true,
        });
      }

      // Para PT Stock, remover option groups que não devem existir
      if (isPTStock) {
        const groups = await tx.optionGroup.findMany({
          where: { productId: id },
          select: { id: true },
        });

        if (groups.length > 0) {
          const groupIds = groups.map((g) => g.id);

          await tx.optionValue.deleteMany({
            where: { groupId: { in: groupIds } },
          });

          await tx.optionGroup.deleteMany({
            where: { id: { in: groupIds } },
          });
        }
      }
    });

    return NextResponse.json(
      {
        ok: true,
        id,
        slug,
        channel,
        isPTStock,
        sizeGroup,
        sizes,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[/api/admin/products/[id]] PUT error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to update product." },
      { status: 500 }
    );
  }
}