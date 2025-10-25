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
      imageUrls, // <<<<<<<<<<<<<< usar o nome novo do schema
    },
  });

  // refresca as páginas relevantes no painel e listagens públicas
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
  revalidatePath("/products");
}

/**
 * Alterna disponibilidade de um SizeStock para o novo esquema (boolean `available`).
 * Mantém o nome antigo para compatibilidade com o teu componente (SizeAvailabilityToggle).
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
