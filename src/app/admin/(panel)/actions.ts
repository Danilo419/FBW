// src/app/admin/(panel)/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/* =========================================================
 * ORDERS
 * =======================================================*/

/** Seta um status arbitrário (string livre / compat). */
export async function setOrderStatus(orderId: string, status: string) {
  try {
    await prisma.order.update({
      where: { id: orderId },
      data: { status },
    });
  } catch (err) {
    console.error("setOrderStatus error:", err);
  } finally {
    revalidatePath("/admin");
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
  }
}

/** Marca ou desmarca como RESOLVED; se desmarcar, volta ao status original. */
export async function toggleResolved(params: {
  orderId: string;
  makeResolved: boolean;
  /** status para restaurar quando desmarca (ex.: "paid" ou "pending"). */
  fallbackStatus?: string;
}) {
  const { orderId, makeResolved, fallbackStatus = "PENDING" } = params;

  if (makeResolved) {
    await setOrderStatus(orderId, "RESOLVED");
  } else {
    await setOrderStatus(orderId, fallbackStatus);
  }
}

/* =========================================================
 * PRODUCTS
 * =======================================================*/

/** Atualiza campos principais do produto (name, team, season, desc, basePrice). */
export async function updateProduct(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "");
  const team = String(formData.get("team") ?? "");
  const seasonRaw = String(formData.get("season") ?? "");
  const descriptionRaw = String(formData.get("description") ?? "");
  const priceStr = String(formData.get("price") ?? "0");

  // preço vem em euros -> converter para cêntimos com arredondamento seguro
  const basePrice = Math.round(Number.parseFloat(priceStr.replace(",", ".")) * 100);

  try {
    await prisma.product.update({
      where: { id },
      data: {
        name,
        team,
        season: seasonRaw || null,
        description: descriptionRaw || null,
        basePrice: Number.isFinite(basePrice) ? basePrice : 0,
      },
    });
  } catch (err) {
    console.error("updateProduct error:", err);
  } finally {
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${id}`);
  }
}

/**
 * Torna um tamanho indisponível (stock=0) ou disponível (stock > 0).
 * Por omissão, quando volta a disponível, repõe o stock para 10 (ajusta ao teu fluxo).
 */
export async function setSizeUnavailable(args: {
  sizeId: string;
  unavailable: boolean;
  restoreStock?: number; // default 10
}) {
  const { sizeId, unavailable, restoreStock = 10 } = args;

  try {
    const size = await prisma.sizeStock.update({
      where: { id: sizeId },
      data: {
        stock: unavailable ? 0 : Math.max(restoreStock, 1),
      },
      select: { productId: true },
    });

    // Revalidar lista e página do produto
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${size.productId}`);
  } catch (err) {
    console.error("setSizeUnavailable error:", err);
    // Mesmo em erro, revalida lista para evitar UI stale
    revalidatePath("/admin/products");
  }
}
