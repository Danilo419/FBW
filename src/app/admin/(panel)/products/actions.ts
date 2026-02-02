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
  const n = Number(String(v).replace(",", "."));
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

/** Accepts JSON, lines or commas; returns an array of URLs */
function parseImagesText(input: unknown): string[] {
  if (input == null) return [];
  const raw = String(input).trim();
  if (!raw) return [];

  try {
    const j = JSON.parse(raw);
    if (Array.isArray(j)) return j.map((x) => String(x)).filter(Boolean);
  } catch {
    // ignore JSON error and fallback
  }

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

/** Robust boolean parser */
function parseBool(v: unknown, fallback = false): boolean {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return fallback;
  if (["1", "true", "yes", "on"].includes(s)) return true;
  if (["0", "false", "no", "off"].includes(s)) return false;
  return fallback;
}

/**
 * ✅ IMPORTANT: If the form sends multiple values for the same key
 * (hidden input + checkbox), we must take the LAST one.
 */
function getLastFormValue(formData: FormData, key: string): FormDataEntryValue | null {
  const all = formData.getAll(key);
  if (!all || all.length === 0) return null;

  // take the last non-empty string if possible
  for (let i = all.length - 1; i >= 0; i--) {
    const v = all[i];
    if (typeof v === "string") {
      const t = v.trim();
      if (t !== "") return t;
    } else {
      // File or other value
      return v;
    }
  }

  // fallback to the last
  return all[all.length - 1] ?? null;
}

/* ========================= teamType (CLUB vs NATION) ========================= */

type TeamTypeLocal = "CLUB" | "NATION";

function parseTeamType(v: unknown): TeamTypeLocal {
  const raw = String(v ?? "").trim().toUpperCase();
  return raw === "NATION" ? "NATION" : "CLUB";
}

/** Revalidates public routes related to a product */
function revalidatePublicProduct(meta?: {
  slug?: string | null;
  team?: string | null;
  season?: string | null;
  teamType?: TeamTypeLocal | string | null;
}) {
  if (!meta) return;

  // ✅ product page (your route is /products/[slug])
  if (meta.slug) revalidatePath(`/products/${meta.slug}`);

  const t = String(meta.teamType ?? "CLUB").toUpperCase();
  const base = t === "NATION" ? "/nations" : "/clubs";

  if (meta.team) revalidatePath(`${base}/${slugify(meta.team)}`);

  // other listings
  if (meta.team) revalidatePath(`/products/team/${slugify(meta.team)}`);
  if (meta.season) revalidatePath(`/products/season/${encodeURIComponent(meta.season)}`);

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

/**
 * ✅ Resolve allowNameNumber robustly and correctly with hidden-input + checkbox forms.
 *
 * Priority:
 *  1) allowNameNumber (explicit flag, recommended)
 *  2) disableCustomization (legacy flag; inverted)
 *  3) fallback to existing DB value (so it never flips by accident)
 */
async function resolveAllowNameNumber(productId: string, formData: FormData): Promise<boolean> {
  const allowRaw = getLastFormValue(formData, "allowNameNumber");
  if (allowRaw !== null) {
    return parseBool(allowRaw, true);
  }

  const disableRaw = getLastFormValue(formData, "disableCustomization");
  if (disableRaw !== null) {
    const disable = parseBool(disableRaw, false);
    return !disable;
  }

  const existing = await prisma.product.findUnique({
    where: { id: productId },
    select: { allowNameNumber: true },
  });

  return existing?.allowNameNumber !== false;
}

/* ========================= Actions ========================= */

/**
 * Updates main product fields, including images.
 *
 * Expects FormData:
 *  - id, name, team, teamType, season?, description?, price (EUR)
 *  - imagesText? (JSON, lines or commas)
 *
 * Customization flag:
 *  - allowNameNumber? ("true"/"false") ✅ recommended
 *  - OR disableCustomization? ("true"/"false") (legacy; inverted)
 */
export async function updateProduct(formData: FormData) {
  const id = String(formData.get("id") || "").trim();
  if (!id) throw new Error("Missing product id");

  const name = String(formData.get("name") || "").trim();
  const team = String(formData.get("team") || "").trim();
  const teamType = parseTeamType(formData.get("teamType"));

  const season = toNullableString(formData.get("season"));
  const description = toNullableString(formData.get("description"));
  const basePrice = toCents(formData.get("price"));

  const imageUrls = parseImagesText(formData.get("imagesText"));

  // ✅ This is the key fix: correct boolean reading even with hidden+checkbox
  const allowNameNumber = await resolveAllowNameNumber(id, formData);

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
      allowNameNumber,
    },
    select: { id: true, slug: true, team: true, season: true, teamType: true },
  });

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);

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
  if (updated?.productId) revalidatePath(`/admin/products/${updated.productId}`);
}

/**
 * Creates/assigns badges to the product "badges" OptionGroup.
 */
export async function saveBadges(formData: FormData) {
  const productId = String(formData.get("productId") || "").trim();
  if (!productId) return { ok: false, error: "Missing productId." };

  const existingIds = getAllStrings(formData.getAll("badgeIds[]"));
  const newLabels = getAllStrings(formData.getAll("newBadges[]"));
  const newPricesEur = getAllStrings(formData.getAll("newBadgePrices[]"));

  try {
    const group = await prisma.$transaction(async (tx) => {
      const group = await ensureBadgesGroup(productId);

      if (existingIds.length) {
        await tx.optionValue.updateMany({
          where: { id: { in: existingIds } },
          data: { groupId: group.id },
        });
      }

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
          data: { groupId: group.id, value, label, priceDelta },
        });
      }

      return tx.optionGroup.findUnique({
        where: { id: group.id },
        include: { values: true },
      });
    });

    revalidatePath(`/admin/products/${productId}`);
    revalidatePath("/admin/products");

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
 */
export async function setSelectedBadges(formData: FormData) {
  const productId = String(formData.get("productId") || "").trim();
  if (!productId) return { ok: false, error: "Missing productId." };

  const selected = getAllStrings(formData.getAll("selectedBadges[]"));

  try {
    const updated = await prisma.product.update({
      where: { id: productId },
      data: { badges: selected },
      select: { slug: true, team: true, season: true, teamType: true },
    });

    revalidatePath(`/admin/products/${productId}`);
    revalidatePath("/admin/products");

    // ✅ Revalidate product page + listings
    revalidatePublicProduct(updated);

    return { ok: true };
  } catch (e: any) {
    console.error("setSelectedBadges error:", e);
    return { ok: false, error: e?.message ?? "Error updating Product.badges." };
  }
}
