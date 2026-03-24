// src/lib/discount-codes.ts
import { prisma } from "@/lib/prisma";

export const DISCOUNT_COOKIE = "footballworld_discount_code";

export function normalizeDiscountCode(value: string) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

export function calcDiscountOnProductsOnly(
  productSubtotalCents: number,
  percentOff: number
) {
  const subtotal = Math.max(0, Number(productSubtotalCents || 0));
  const percent = Math.max(0, Number(percentOff || 0));

  if (subtotal <= 0 || percent <= 0) return 0;

  return Math.round((subtotal * percent) / 100);
}

export async function getDiscountCodeByRawCode(rawCode: string) {
  const code = normalizeDiscountCode(rawCode);
  if (!code) return null;

  return prisma.discountCode.findUnique({
    where: { code },
  });
}

export async function getValidDiscountCode(rawCode: string) {
  const code = normalizeDiscountCode(rawCode);
  if (!code) return null;

  const now = new Date();

  const discount = await prisma.discountCode.findUnique({
    where: { code },
  });

  if (!discount) return null;
  if (!discount.active) return null;
  if (discount.maxUses <= 0) return null;
  if (discount.usesCount >= discount.maxUses) return null;
  if (discount.expiresAt && discount.expiresAt < now) return null;

  return discount;
}

export function getDiscountCodeStatus(input: {
  active: boolean;
  maxUses: number;
  usesCount: number;
  expiresAt: Date | null;
}) {
  const now = new Date();

  if (!input.active) return "inactive";
  if (input.maxUses <= 0) return "invalid";
  if (input.usesCount >= input.maxUses) return "used";
  if (input.expiresAt && input.expiresAt < now) return "expired";

  return "valid";
}

export function calculateDiscountSummary(params: {
  productSubtotalCents: number;
  shippingCents: number;
  percentOff?: number | null;
}) {
  const productSubtotalCents = Math.max(
    0,
    Number(params.productSubtotalCents || 0)
  );
  const shippingCents = Math.max(0, Number(params.shippingCents || 0));
  const percentOff = Math.max(0, Number(params.percentOff || 0));

  const discountAmountCents = calcDiscountOnProductsOnly(
    productSubtotalCents,
    percentOff
  );

  const totalCents = Math.max(
    0,
    productSubtotalCents - discountAmountCents + shippingCents
  );

  return {
    productSubtotalCents,
    shippingCents,
    percentOff,
    discountAmountCents,
    totalCents,
  };
}

/**
 * Helpers opcionais para integração com Stripe.
 * Estes helpers usam cast seguro para não dar erro mesmo
 * enquanto o Prisma Client ainda não tiver os novos campos.
 */
export function hasStripeNativeDiscountIds(input: {
  stripeCouponId?: string | null;
  stripePromotionCodeId?: string | null;
}) {
  return Boolean(
    String(input.stripeCouponId || "").trim() ||
      String(input.stripePromotionCodeId || "").trim()
  );
}

export function getStripeDiscountRefs(input: unknown) {
  const obj = (input ?? {}) as {
    stripeCouponId?: string | null;
    stripePromotionCodeId?: string | null;
  };

  const stripeCouponId = String(obj.stripeCouponId || "").trim() || null;
  const stripePromotionCodeId =
    String(obj.stripePromotionCodeId || "").trim() || null;

  return {
    stripeCouponId,
    stripePromotionCodeId,
    hasStripeNativeDiscount: Boolean(
      stripeCouponId || stripePromotionCodeId
    ),
  };
}