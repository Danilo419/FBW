"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function deleteReviewAction(formData: FormData): Promise<void> {
  const reviewId = String(formData.get("reviewId") ?? "").trim();
  if (!reviewId) throw new Error("Missing reviewId");

  await prisma.review.delete({
    where: { id: reviewId },
  });

  revalidatePath("/admin/users");
}

export async function deleteUserAction(formData: FormData): Promise<void> {
  const userId = String(formData.get("userId") ?? "").trim();
  if (!userId) throw new Error("Missing userId");

  await prisma.$transaction(async (tx) => {
    // Apagar reviews primeiro (evita erro FK se não houver cascade)
    await tx.review.deleteMany({ where: { userId } });

    // Apagar user
    await tx.user.delete({ where: { id: userId } });
  });

  revalidatePath("/admin/users");
}
