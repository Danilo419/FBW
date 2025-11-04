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
  // aceita vírgula ou ponto
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

/** Garante que existe um OptionGroup "badges" para o produto. */
async function ensureBadgesGroup(productId: string) {
  // não há unique composto no schema, por isso usamos findFirst + create
  let group = await prisma.optionGroup.findFirst({
    where: { productId, key: "badges" },
  });

  if (!group) {
    group = await prisma.optionGroup.create({
      data: {
        productId,
        key: "badges",
        label: "Badges",
        type: "ADDON", // com base no teu enum OptionType
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
 *  - id, name, team, season?, description?, price (em EUR)
 *  - imagesText? (JSON, linhas ou vírgulas)
 */
export async function updateProduct(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) throw new Error("Missing product id");

  const name = String(formData.get("name") || "").trim();
  const team = String(formData.get("team") || "").trim();
  const season = toNullableString(formData.get("season"));
  const description = toNullableString(formData.get("description"));
  const basePrice = toCents(formData.get("price"));

  // 👇 corresponde ao campo do schema: Product.imageUrls String[]
  const imageUrls = parseImagesText(formData.get("imagesText"));

  await prisma.product.update({
    where: { id },
    data: {
      name,
      team,
      season,
      description,
      basePrice,
      imageUrls,
    },
  });

  // refresca as páginas relevantes no painel e listagens públicas
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
  revalidatePath("/products");
}

/**
 * Alterna disponibilidade de um SizeStock (boolean `available`).
 * Mantém o nome antigo para compatibilidade com o teu componente.
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
 *
 * FormData esperado:
 *  - productId: string
 *  - badgeIds[]: ids de OptionValue já existentes que queres associar ao grupo
 *  - newBadges[]: labels para criar novos OptionValue (value é slug do label)
 *  - newBadgePrices[] (opcional): alinhado por índice com newBadges[] (em EUR)
 *
 * Nota: esta action apenas cria/associa **opções** (OptionValue).
 * Para gravar quais estão **selecionadas** no produto (coluna Product.badges),
 * usa a action `setSelectedBadges`.
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
    const result = await prisma.$transaction(async (tx) => {
      // 1) garantir grupo "badges"
      const group = await ensureBadgesGroup(productId);

      // 2) ligar OptionValue existentes pelo id (caso venham de uma pesquisa)
      if (existingIds.length) {
        await tx.optionValue.updateMany({
          where: { id: { in: existingIds } },
          data: { groupId: group.id },
        });
      }

      // 3) criar novos OptionValue por label
      for (let i = 0; i < newLabels.length; i++) {
        const label = newLabels[i];
        if (!label) continue;

        // tentar evitar duplicados: ver se já existe um value/label igual neste group
        const value = slugify(label);
        const already = await tx.optionValue.findFirst({
          where: { groupId: group.id, OR: [{ value }, { label }] },
          select: { id: true },
        });
        if (already) continue;

        const priceDelta =
          i < newPricesEur.length ? toCents(newPricesEur[i]) : 0;

        await tx.optionValue.create({
          data: {
            groupId: group.id,
            value,
            label,
            priceDelta,
          },
        });
      }

      // devolver snapshot do grupo com valores
      return tx.optionGroup.findUnique({
        where: { id: group.id },
        include: { values: true },
      });
    });

    // Revalidar painel (e página pública se quiseres)
    revalidatePath(`/admin/products/${productId}`);
    revalidatePath("/admin/products");

    return { ok: true, group: result };
  } catch (e: any) {
    console.error("saveBadges error:", e);
    return { ok: false, error: e?.message ?? "Erro inesperado ao gravar badges." };
  }
}

/**
 * Grava quais badges estão selecionadas no produto (coluna Product.badges).
 *
 * FormData esperado:
 *  - productId: string
 *  - selectedBadges[]: array de chaves/labels que queres manter no Product.badges
 *
 * Recomendação: usa como `selectedBadges[]` o `value` (slug) do OptionValue.
 */
export async function setSelectedBadges(formData: FormData) {
  const productId = String(formData.get("productId") || "");
  if (!productId) {
    return { ok: false, error: "Falta productId." };
  }

  const selected = getAllStrings(formData.getAll("selectedBadges[]"));

  try {
    await prisma.product.update({
      where: { id: productId },
      data: { badges: selected },
    });

    revalidatePath(`/admin/products/${productId}`);
    revalidatePath("/admin/products");
    // Se a tua página pública usa o slug, podes revalidar também:
    // const slug = (await prisma.product.findUnique({ where: { id: productId }, select: { slug: true } }))?.slug;
    // if (slug) revalidatePath(`/product/${slug}`);

    return { ok: true };
  } catch (e: any) {
    console.error("setSelectedBadges error:", e);
    return { ok: false, error: e?.message ?? "Erro ao atualizar Product.badges." };
  }
}
