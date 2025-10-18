"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/** Seta um status arbitrário */
export async function setOrderStatus(orderId: string, status: string) {
  await prisma.order.update({
    where: { id: orderId },
    data: { status },
  });
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
}

/** Marca ou desmarca como RESOLVED; se desmarcar, volta ao status original */
export async function toggleResolved(params: {
  orderId: string;
  makeResolved: boolean;
  fallbackStatus?: string; // usado quando desmarca
}) {
  const { orderId, makeResolved, fallbackStatus = "PENDING" } = params;

  if (makeResolved) {
    await setOrderStatus(orderId, "RESOLVED");
  } else {
    // regressa ao status fornecido pelo client (original)
    await setOrderStatus(orderId, fallbackStatus);
  }
}
