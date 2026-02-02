// src/app/admin/(panel)/products/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/* ========================= helpers ========================= */

function toNullableString(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

/** Converte "39.90" -> 3990; valores inválidos viram 0 */
function toCents(v: unknown): number {
  if (v == null) return 0;
  const n = Number(String(v).replace(",", "."));
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

/** Aceita JSON, linhas ou vírgulas; devolve array de URLs */
function parseImagesText(input: unknown): string[] {
  if (input == null) return [];
  const raw = String(input).trim();
  if (!raw) return [];

  // tenta JSON primeiro
  try {
    const j = JSON.parse(raw);
    if (Array.isArray(j)) {
      return j.map((x) => String(x)).filter(Boolean);
    }
  } catch {
    // ignora erro de JSON e tenta fallback
  }

  // fallback: separar por linha ou vírgula
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

/**
 * ✅ Lê boolean de FormData mesmo quando existem inputs duplicados (checkbox + hidden)
 * - Se qualquer valor for "true"/"1"/"on"/"yes" => true
 * - Caso contrário => false
 */
function readBool(formData: FormData, key: string): boolean {
  const all = formData.getAll(key);
  for (const v of all) {
    if (typeof v !== "string") continue;
    const t = v.trim().toLowerCase();
    if (t === "true" || t === "1" || t === "on" || t === "yes") return true;
  }
  return false;
}

/* ========================= teamType (CLUB vs NATION) ========================= */

type TeamTypeLocal = "CLUB" | "NATION";

function parseTeamType(v: unknown): TeamTypeLocal {
  const raw = String(v ?? "").trim().toUpperCase();
  return raw === "NATION" ? "NATION" : "CLUB";
}

/** Revalida rotas públicas relacionadas com um produto */
function revalidatePublicProduct(meta?: {
  slug?: string | null;
  team?: string | null;
  season?: string | null;
  teamType?: TeamTypeLocal | string | null;
}) {
  if (!meta) return;

  // página pública do produto
  if (meta.slug) revalidatePath(`/products/${meta.slug}`);

  const t = String(meta.teamType ?? "CLUB").toUpperCase();
  const base = t === "NATION" ? "/nations" : "/clubs";

  if (meta.team) revalidatePath(`${base}/${slugify(meta.team)}`);

  // (Opcional) listagens agregadas
  if (meta.team) revalidatePath(`/products/team/${slugify(meta.team)}`);
  if (meta.season) revalidatePath(`/products/season/${encodeURIComponent(meta.season)}`);

  // (Opcional) páginas index
  revalidatePath("/products");
  revalidatePath("/clubs");
  revalidatePath("/nations");
}

/** Garante que existe um OptionGroup "badges" para o produto. */
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

/* ========================= actions ========================= */

/**
 * Atualiza campos principais do produto, incluindo imagens.
 * Espera no FormData:
 *  - id, name, team, teamType, season?, description?, price (em EUR)
 *  - imagesText?
 *  - disableCustomization (checkbox + hidden) -> converte para Product.allowNameNumber
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

  // ✅ Personalization:
  // checkbox "disableCustomization" significa REMOVER Name & Number => allowNameNumber = false
  const disableCustomization = readBool(formData, "disableCustomization");
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

      // ✅ o campo certo do teu schema
      allowNameNumber,
    },
    select: { id: true, slug: true, team: true, season: true, teamType: true },
  });

  // Painel
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);

  // Público
  revalidatePublicProduct(updated);
}

/**
 * Alterna disponibilidade de um SizeStock (boolean `available`).
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
 * Cria/associa badges ao OptionGroup "badges" do produto.
 */
export async function saveBadges(formData: FormData) {
  const productId = String(formData.get("productId") || "");
  if (!productId) {
    return { ok: false, error: "Falta productId." };
  }

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
    return { ok: false, error: e?.message ?? "Erro inesperado ao gravar badges." };
  }
}

/**
 * Grava quais badges estão selecionadas no produto (coluna Product.badges).
 */
export async function setSelectedBadges(formData: FormData) {
  const productId = String(formData.get("productId") || "");
  if (!productId) {
    return { ok: false, error: "Falta productId." };
  }

  const selected = getAllStrings(formData.getAll("selectedBadges[]"));

  try {
    const updated = await prisma.product.update({
      where: { id: productId },
      data: { badges: selected },
      select: { slug: true, team: true, season: true, teamType: true },
    });

    revalidatePath(`/admin/products/${productId}`);
    revalidatePath("/admin/products");

    revalidatePublicProduct(updated);

    return { ok: true };
  } catch (e: any) {
    console.error("setSelectedBadges error:", e);
    return { ok: false, error: e?.message ?? "Erro ao atualizar Product.badges." };
  }
}
