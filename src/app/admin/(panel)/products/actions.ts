"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/** Update product main fields */
export async function updateProduct(formData: FormData) {
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "");
  const team = String(formData.get("team") || "");
  const season = String(formData.get("season") || "") || null;
  const description = String(formData.get("description") || "") || null;
  const priceStr = String(formData.get("price") || "0");

  const basePrice = Math.round(parseFloat(priceStr) * 100);

  await prisma.product.update({
    where: { id },
    data: { name, team, season, description, basePrice },
  });

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
}

/** Toggle size availability (stock=0 => unavailable) */
export async function setSizeUnavailable(args: { sizeId: string; unavailable: boolean }) {
  const { sizeId, unavailable } = args;

  const restoredStock = 10; // adjust to your default

  const size = await prisma.sizeStock.update({
    where: { id: sizeId },
    data: { stock: unavailable ? 0 : restoredStock },
  });

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${size.productId}`);
}
