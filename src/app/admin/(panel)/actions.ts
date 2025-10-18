"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function markOrderResolved(orderId: string) {
  try {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "RESOLVED" }, // ajuste se seu enum usar outro valor
    });
  } catch (e) {
    console.error("markOrderResolved:", e);
  } finally {
    revalidatePath("/admin");
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
  }
}
