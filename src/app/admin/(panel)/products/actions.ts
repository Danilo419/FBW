// src/app/admin/(panel)/products/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/* ========================= Helpers ========================= */

function toNullableString(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

/** Converts "39.90" -> 3990; invalid values become 0 */
function toCents(v: unknown): number {
  if (v == null) return 0;
  // accepts comma or dot
  const n = Number(String(v).replace(",", "."));
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

/** Accepts JSON, lines or commas; returns an array of URLs */
function parseImagesText(input: unknown): string[] {
  if (input == null) return [];
  const raw = String(input).trim();
  if (!raw) return [];

  // try JSON first
  try {
    const j = JSON.parse(raw);
    if (Array.isArray(j)) {
      return j.map((x) => String(x)).filter(Boolean);
    }
  } catch {
    // ignore JSON error and fallback
  }

  // fallback: split by newline or comma
  return raw
    .split(/\r?\n|,/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function getAllStrings(list: FormDataEntryValue[] | undefined): string[] {
  if (!list) return [];
  return list.map((v) => (typeof v === "string" ? v.trim() : "")).filter(Boolean);
}

function slugify(s: string) {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ========================= teamType (CLUB vs NATION) ========================= */

/**
 * NOTE:
 * - We do NOT import TeamType from Prisma Client to avoid "no exported member" issues.
 * - We only store "CLUB" | "NATION" in Product.teamType.
 */
type TeamTypeLocal = "CLUB" | "NATION";

function parseTeamType(v: unknown): TeamTypeLocal {
  const raw = String(v ?? "").trim().toUpperCase();
  return raw === "NATION" ? "NATION" : "CLUB";
}

/** Robust boolean parser */
function parseBool(v: unknown, fallback = false): boolean {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return fallback;
  if (["1", "true", "yes", "on"].includes(s)) return true;
  if (["0", "false", "no", "off"].includes(s)) return false;
  return fallback;
}

/** Revalidates public routes related to a product */
function revalidatePublicProduct(meta?: {
  slug?: string | null;
  team?: string | null;
  season?: string | null;
  teamType?: TeamTypeLocal | string | null;
}) {
  if (!meta) return;

  // Public product page
  if (meta.slug) {
    revalidatePath(`/products/${meta.slug}`);
  }

  // Revalidate correct listings (CLUB vs NATION)
  const t = String(meta.teamType ?? "CLUB").toUpperCase();
  const base = t === "NATION" ? "/nations" : "/clubs";

  if (meta.team) {
    revalidatePath(`${base}/${slugify(meta.team)}`);
  }

  // Optional aggregated listings (if your app has them)
  if (meta.team) {
    revalidatePath(`/products/team/${slugify(meta.team)}`);
  }
  if (meta.season) {
    revalidatePath(`/products/season/${encodeURIComponent(meta.season)}`);
  }

  // Optional general listing pages
  revalidatePath("/products");
  revalidatePath("/clubs");
  revalidatePath("/nations");
}

/** Ensures there's a "badges" OptionGroup for a product. */
async function ensureBadgesGroup(productId: string) {
  let group = await prisma.optionGroup.findFirst({
    where: { productId, key: "badges" },
  });

  if (!group) {
    group = await prisma.optionGroup.create({
      data: {
        productId,
        key: "badges",
        label: "Badges",
        type: "ADDON",
        required: false,
      },
    });
  }

  return group;
}

/* ========================= Actions ========================= */

/**
 * Updates main product fields, including images.
 * Expects FormData:
 *  - id, name, team, teamType, season?, description?, price (EUR)
 *  - imagesText? (JSON, lines or commas)
 *  - disableCustomization? ("true"/"false") -> stored as Product.allowNameNumber (inverted)
 */
export async function updateProduct(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) throw new Error("Missing product id");

  const name = String(formData.get("name") || "").trim();
  const team = String(formData.get("team") || "").trim();

  // NEW: teamType from <select name="teamType">
  const teamType = parseTeamType(formData.get("teamType"));

  const season = toNullableString(formData.get("season"));
  const description = toNullableString(formData.get("description"));
  const basePrice = toCents(formData.get("price"));

  const imageUrls = parseImagesText(formData.get("imagesText"));

  // Admin checkbox:
  // disableCustomization=true means "do NOT allow Name & Number"
  const disableCustomization = parseBool(formData.get("disableCustomization"), false);
  const allowNameNumber = !disableCustomization;

  const updated = await prisma.product.update({
    where: { id },
    data: {
      name,
      team,
      teamType,
      season,
      description,
      basePrice,
      imageUrls,

      // This is what controls the Name/Number block
      allowNameNumber,
    },
    select: { id: true, slug: true, team: true, season: true, teamType: true },
  });

  // Admin
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);

  // Public
  revalidatePublicProduct(updated);
}

/**
 * Toggles availability of a SizeStock row (boolean `available`).
 */
export async function setSizeUnavailable(args: { sizeId: string; unavailable: boolean }) {
  const { sizeId, unavailable } = args;
  if (!sizeId) throw new Error("Missing sizeId");

  const updated = await prisma.sizeStock.update({
    where: { id: sizeId },
    data: { available: !unavailable },
    select: { productId: true },
  });

  revalidatePath("/admin/products");
  if (updated?.productId) {
    revalidatePath(`/admin/products/${updated.productId}`);
  }
}

/**
 * Creates/assigns badges to the product "badges" OptionGroup.
 *
 * FormData:
 *  - productId: string
 *  - badgeIds[]: ids of existing OptionValue to attach to the group
 *  - newBadges[]: labels to create new OptionValue (value = slug(label))
 *  - newBadgePrices[] (optional): aligned by index with newBadges[] (EUR)
 *
 * Note: This creates/attaches option values. The selected badges saved on Product are handled by `setSelectedBadges`.
 */
export async function saveBadges(formData: FormData) {
  const productId = String(formData.get("productId") || "");
  if (!productId) {
    return { ok: false, error: "Missing productId." };
  }

  const existingIds = getAllStrings(formData.getAll("badgeIds[]"));
  const newLabels = getAllStrings(formData.getAll("newBadges[]"));
  const newPricesEur = getAllStrings(formData.getAll("newBadgePrices[]"));

  try {
    const group = await prisma.$transaction(async (tx) => {
      // 1) ensure "badges" group
      const group = await ensureBadgesGroup(productId);

      // 2) attach existing OptionValues
      if (existingIds.length) {
        await tx.optionValue.updateMany({
          where: { id: { in: existingIds } },
          data: { groupId: group.id },
        });
      }

      // 3) create new OptionValues
      for (let i = 0; i < newLabels.length; i++) {
        const label = newLabels[i];
        if (!label) continue;

        const value = slugify(label);

        const already = await tx.optionValue.findFirst({
          where: { groupId: group.id, OR: [{ value }, { label }] },
          select: { id: true },
        });
        if (already) continue;

        const priceDelta = i < newPricesEur.length ? toCents(newPricesEur[i]) : 0;

        await tx.optionValue.create({
          data: {
            groupId: group.id,
            value,
            label,
            priceDelta,
          },
        });
      }

      return tx.optionGroup.findUnique({
        where: { id: group.id },
        include: { values: true },
      });
    });

    // Admin
    revalidatePath(`/admin/products/${productId}`);
    revalidatePath("/admin/products");

    // Public
    const meta = await prisma.product.findUnique({
      where: { id: productId },
      select: { slug: true, team: true, season: true, teamType: true },
    });
    revalidatePublicProduct(meta || undefined);

    return { ok: true, group };
  } catch (e: any) {
    console.error("saveBadges error:", e);
    return { ok: false, error: e?.message ?? "Unexpected error while saving badges." };
  }
}

/**
 * Saves which badges are selected on the product (Product.badges column).
 *
 * FormData:
 *  - productId: string
 *  - selectedBadges[]: array of values/keys to keep in Product.badges
 */
export async function setSelectedBadges(formData: FormData) {
  const productId = String(formData.get("productId") || "");
  if (!productId) {
    return { ok: false, error: "Missing productId." };
  }

  const selected = getAllStrings(formData.getAll("selectedBadges[]"));

  try {
    const updated = await prisma.product.update({
      where: { id: productId },
      data: { badges: selected },
      select: { slug: true, team: true, season: true, teamType: true },
    });

    // Admin
    revalidatePath(`/admin/products/${productId}`);
    revalidatePath("/admin/products");

    // Public
    revalidatePublicProduct(updated);

    return { ok: true };
  } catch (e: any) {
    console.error("setSelectedBadges error:", e);
    return { ok: false, error: e?.message ?? "Error updating Product.badges." };
  }
}
