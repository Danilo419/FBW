"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updatePtStockQuantity(formData: FormData) {
  const productId = String(formData.get("productId") || "");
  const ptStockQtyRaw = String(formData.get("ptStockQty") || "0");

  if (!productId) {
    throw new Error("Invalid product.");
  }

  const ptStockQty = Math.max(0, Number.parseInt(ptStockQtyRaw, 10) || 0);

  await prisma.product.update({
    where: { id: productId },
    data: {
      ptStockQty,
    },
  });

  revalidatePath("/admin/pt-stock/products");
  revalidatePath(`/admin/pt-stock/products/${productId}/stock`);
  revalidatePath("/pt-stock");
  revalidatePath(`/pt-stock/${productId}`);

  redirect("/admin/pt-stock/products");
}