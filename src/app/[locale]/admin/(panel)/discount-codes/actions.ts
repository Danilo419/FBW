// src/app/[locale]/admin/(panel)/discount-codes/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { normalizeDiscountCode } from "@/lib/discount-codes";

function randomPart(length = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";

  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }

  return out;
}

async function generateUniqueCode(prefix?: string) {
  const safePrefix = normalizeDiscountCode(prefix || "").replace(
    /[^A-Z0-9-]/g,
    ""
  );

  for (let i = 0; i < 100; i++) {
    const raw = safePrefix ? `${safePrefix}-${randomPart(8)}` : randomPart(8);
    const code = normalizeDiscountCode(raw);

    const exists = await prisma.discountCode.findUnique({
      where: { code },
      select: { id: true },
    });

    if (!exists) return code;
  }

  throw new Error("Could not generate a unique discount code.");
}

function revalidateDiscountCodePages(locale?: string) {
  revalidatePath("/admin/discount-codes");
  revalidatePath("/pt/admin/discount-codes");
  revalidatePath("/en/admin/discount-codes");

  if (locale) {
    revalidatePath(`/${locale}/admin/discount-codes`);
  }
}

export async function createDiscountCodes(formData: FormData) {
  const amountRaw = String(formData.get("amount") || "1");
  const prefixRaw = String(formData.get("prefix") || "");
  const percentRaw = String(formData.get("percentOff") || "10");
  const expiresAtRaw = String(formData.get("expiresAt") || "");
  const stripePromotionCodeIdRaw = String(
    formData.get("stripePromotionCodeId") || ""
  );
  const stripeCouponIdRaw = String(formData.get("stripeCouponId") || "");
  const locale = String(formData.get("locale") || "");

  const amount = Math.max(
    1,
    Math.min(500, Number.parseInt(amountRaw, 10) || 1)
  );
  const percentOff = Math.max(
    1,
    Math.min(100, Number.parseInt(percentRaw, 10) || 10)
  );

  let expiresAt: Date | null = null;
  if (expiresAtRaw) {
    const parsed = new Date(expiresAtRaw);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error("Invalid expiration date.");
    }
    expiresAt = parsed;
  }

  const stripePromotionCodeId = stripePromotionCodeIdRaw.trim() || null;
  const stripeCouponId = stripeCouponIdRaw.trim() || null;

  const rows: Array<{
    code: string;
    percentOff: number;
    active: boolean;
    maxUses: number;
    usesCount: number;
    expiresAt: Date | null;
    stripePromotionCodeId: string | null;
    stripeCouponId: string | null;
  }> = [];

  for (let i = 0; i < amount; i++) {
    const code = await generateUniqueCode(prefixRaw);

    rows.push({
      code,
      percentOff,
      active: true,
      maxUses: 1,
      usesCount: 0,
      expiresAt,
      stripePromotionCodeId,
      stripeCouponId,
    });
  }

  await prisma.discountCode.createMany({
    data: rows,
  });

  revalidateDiscountCodePages(locale);
}

export async function toggleDiscountCode(formData: FormData) {
  const id = String(formData.get("id") || "");
  const locale = String(formData.get("locale") || "");

  if (!id) {
    throw new Error("Invalid discount code id.");
  }

  const current = await prisma.discountCode.findUnique({
    where: { id },
    select: {
      id: true,
      active: true,
      usesCount: true,
      maxUses: true,
      usedAt: true,
      expiresAt: true,
    },
  });

  if (!current) {
    throw new Error("Discount code not found.");
  }

  const safeCurrent = current as typeof current & {
    usedByOrderId?: string | null;
  };

  const now = new Date();
  const isUsed = Boolean(
    current.usedAt ||
      safeCurrent.usedByOrderId ||
      current.usesCount >= 1 ||
      current.usesCount >= current.maxUses
  );
  const isExpired = Boolean(current.expiresAt && current.expiresAt < now);

  if (isUsed) {
    throw new Error("Used discount codes cannot be reactivated or changed.");
  }

  if (isExpired) {
    throw new Error("Expired discount codes cannot be reactivated or changed.");
  }

  await prisma.discountCode.update({
    where: { id },
    data: {
      active: !current.active,
    },
  });

  revalidateDiscountCodePages(locale);
}

export async function deleteDiscountCode(formData: FormData) {
  const id = String(formData.get("id") || "");
  const locale = String(formData.get("locale") || "");

  if (!id) {
    throw new Error("Invalid discount code id.");
  }

  await prisma.discountCode.delete({
    where: { id },
  });

  revalidateDiscountCodePages(locale);
}