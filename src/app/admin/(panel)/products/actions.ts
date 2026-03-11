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
  return list
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean);
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
 * IMPORTANT: If the form sends multiple values for the same key
 * (hidden input + checkbox), we must take the LAST one.
 */
function getLastFormValue(formData: FormData, key: string): FormDataEntryValue | null {
  const all = formData.getAll(key);
  if (!all || all.length === 0) return null;

  for (let i = all.length - 1; i >= 0; i--) {
    const v = all[i];
    if (typeof v === "string") {
      const t = v.trim();
      if (t !== "") return t;
    } else {
      return v;
    }
  }

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

  if (meta.slug) revalidatePath(`/products/${meta.slug}`);

  const t = String(meta.teamType ?? "CLUB").toUpperCase();
  const base = t === "NATION" ? "/nations" : "/clubs";

  if (meta.team) revalidatePath(`${base}/${slugify(meta.team)}`);
  if (meta.team) revalidatePath(`/products/team/${slugify(meta.team)}`);
  if (meta.season) {
    revalidatePath(`/products/season/${encodeURIComponent(meta.season)}`);
  }

  revalidatePath("/products");
  revalidatePath("/clubs");
  revalidatePath("/nations");
}

/**
 * Resolve allowNameNumber robustly and correctly with hidden-input + checkbox forms.
 *
 * Priority:
 *  1) allowNameNumber (explicit flag, recommended)
 *  2) disableCustomization (legacy flag; inverted)
 *  3) fallback to existing DB value (so it never flips by accident)
 */
async function resolveAllowNameNumber(
  productId: string,
  formData: FormData
): Promise<boolean> {
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
 * Updates main product fields, including images + allowNameNumber.
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
    select: {
      id: true,
      slug: true,
      team: true,
      season: true,
      teamType: true,
    },
  });

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
  revalidatePublicProduct(updated);
}

/**
 * Toggles availability of a SizeStock row (boolean `available`).
 */
export async function setSizeUnavailable(args: {
  sizeId: string;
  unavailable: boolean;
}) {
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
 * SYNC badges OptionGroup:
 * - keep selected existing values
 * - create new ones
 * - REMOVE values that were removed in the UI
 * - ALSO clean Product.badges removing values that no longer exist
 */
export async function saveBadges(formData: FormData) {
  const productId = String(formData.get("productId") || "").trim();
  if (!productId) return { ok: false, error: "Missing productId." };

  const keepExistingIds = getAllStrings(formData.getAll("badgeIds[]"));
  const newLabels = getAllStrings(formData.getAll("newBadges[]"));
  const newPricesEur = getAllStrings(formData.getAll("newBadgePrices[]"));

  try {
    const result = await prisma.$transaction(async (tx) => {
      const group = await (async () => {
        let g = await tx.optionGroup.findFirst({
          where: { productId, key: "badges" },
        });

        if (!g) {
          g = await tx.optionGroup.create({
            data: {
              productId,
              key: "badges",
              label: "Badges",
              type: "ADDON",
              required: false,
            },
          });
        }

        return g;
      })();

      const createdIds: string[] = [];

      for (let i = 0; i < newLabels.length; i++) {
        const label = newLabels[i];
        if (!label) continue;

        const value = slugify(label);

        const already = await tx.optionValue.findFirst({
          where: {
            groupId: group.id,
            OR: [{ value }, { label }],
          },
          select: { id: true },
        });

        if (already) continue;

        const priceDelta = i < newPricesEur.length ? toCents(newPricesEur[i]) : 0;

        const created = await tx.optionValue.create({
          data: { groupId: group.id, value, label, priceDelta },
          select: { id: true },
        });

        createdIds.push(created.id);
      }

      if (keepExistingIds.length) {
        await tx.optionValue.updateMany({
          where: { id: { in: keepExistingIds } },
          data: { groupId: group.id },
        });
      }

      const keepIds = Array.from(new Set([...keepExistingIds, ...createdIds]));

      await tx.optionValue.deleteMany({
        where: {
          groupId: group.id,
          ...(keepIds.length ? { id: { notIn: keepIds } } : {}),
        },
      });

      const remaining = await tx.optionValue.findMany({
        where: { groupId: group.id },
        select: { value: true },
      });

      const allowedValues = new Set(remaining.map((r) => r.value));

      const prod = await tx.product.findUnique({
        where: { id: productId },
        select: { badges: true },
      });

      const currentBadges = Array.isArray(prod?.badges) ? prod!.badges : [];
      const cleanedBadges = currentBadges.filter((b) =>
        allowedValues.has(String(b))
      );

      if (cleanedBadges.length !== currentBadges.length) {
        await tx.product.update({
          where: { id: productId },
          data: { badges: cleanedBadges },
        });
      }

      const fullGroup = await tx.optionGroup.findUnique({
        where: { id: group.id },
        include: { values: true },
      });

      return { group: fullGroup };
    });

    revalidatePath(`/admin/products/${productId}`);
    revalidatePath("/admin/products");

    const meta = await prisma.product.findUnique({
      where: { id: productId },
      select: { slug: true, team: true, season: true, teamType: true },
    });

    revalidatePublicProduct(meta || undefined);

    return { ok: true, group: result.group };
  } catch (e: any) {
    console.error("saveBadges error:", e);
    return {
      ok: false,
      error: e?.message ?? "Unexpected error while saving badges.",
    };
  }
}

/**
 * Saves which badges are selected on the product (Product.badges column).
 *
 * IMPORTANT:
 * - We MUST revalidate the PUBLIC product page route (/products/[slug])
 * - and related listings, otherwise the ProductConfigurator may keep showing stale cached data.
 */
export async function setSelectedBadges(formData: FormData) {
  const productId = String(formData.get("productId") || "").trim();
  if (!productId) return { ok: false, error: "Missing productId." };

  const selected = getAllStrings(formData.getAll("selectedBadges[]"));

  try {
    const updated = await prisma.product.update({
      where: { id: productId },
      data: { badges: selected },
      select: {
        id: true,
        slug: true,
        team: true,
        season: true,
        teamType: true,
      },
    });

    revalidatePath(`/admin/products/${productId}`);
    revalidatePath("/admin/products");

    revalidatePublicProduct(updated);

    if (updated.slug) revalidatePath(`/products/${updated.slug}`);

    return { ok: true };
  } catch (e: any) {
    console.error("setSelectedBadges error:", e);
    return { ok: false, error: e?.message ?? "Error updating Product.badges." };
  }
}