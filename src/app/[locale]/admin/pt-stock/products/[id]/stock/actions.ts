"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updatePtStockQuantity(formData: FormData) {
  const productId = String(formData.get("productId") || "").trim();
  const locale = String(formData.get("locale") || "pt").trim() || "pt";

  if (!productId) {
    throw new Error("Invalid product.");
  }

  const sizeIds = formData
    .getAll("sizeIds")
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  const updates: Array<{
    id: string;
    ptStockQty: number;
    available: boolean;
  }> = [];

  for (const sizeId of sizeIds) {
    const qtyRaw = String(formData.get(`sizeStock_${sizeId}`) || "0");
    const qty = Math.max(0, Number.parseInt(qtyRaw, 10) || 0);
    const available = formData.get(`available_${sizeId}`) === "on";

    updates.push({
      id: sizeId,
      ptStockQty: qty,
      available,
    });
  }

  const totalFromSizes = updates.reduce((sum, item) => sum + item.ptStockQty, 0);

  await prisma.$transaction(async (tx) => {
    for (const item of updates) {
      await tx.sizeStock.update({
        where: { id: item.id },
        data: {
          ptStockQty: item.ptStockQty,
          available: item.available,
        },
      });
    }

    await tx.product.update({
      where: { id: productId },
      data: {
        ptStockQty: totalFromSizes,
      },
    });
  });

  revalidatePath(`/${locale}/admin/pt-stock/products`);
  revalidatePath(`/${locale}/admin/pt-stock/products/${productId}/stock`);
  revalidatePath(`/${locale}/pt-stock`);
  revalidatePath(`/${locale}/pt-stock/${productId}`);

  redirect(`/${locale}/admin/pt-stock/products`);
}