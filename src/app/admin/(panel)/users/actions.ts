"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/* ===================== Reviews ===================== */

export async function deleteReviewAction(formData: FormData): Promise<void> {
  const reviewId = String(formData.get("reviewId") ?? "").trim();
  if (!reviewId) throw new Error("Missing reviewId");

  await prisma.review.delete({
    where: { id: reviewId },
  });

  revalidatePath("/admin/users");
}

/* ===================== Users ===================== */

export async function deleteUserAction(formData: FormData): Promise<void> {
  const userId = String(formData.get("userId") ?? "").trim();
  if (!userId) throw new Error("Missing userId");

  await prisma.$transaction(async (tx) => {
    // Delete user reviews first (avoid FK errors)
    await tx.review.deleteMany({
      where: { userId },
    });

    // Delete user
    await tx.user.delete({
      where: { id: userId },
    });
  });

  revalidatePath("/admin/users");
}
