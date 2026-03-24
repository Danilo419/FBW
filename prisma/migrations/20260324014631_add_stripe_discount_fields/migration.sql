-- AlterTable
ALTER TABLE "public"."DiscountCode" ADD COLUMN     "stripeCouponId" TEXT,
ADD COLUMN     "stripePromotionCodeId" TEXT;

-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "finalProductSubtotalCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "stripeCouponIdUsed" TEXT,
ADD COLUMN     "stripePromotionCodeIdUsed" TEXT;

-- CreateIndex
CREATE INDEX "DiscountCode_stripeCouponId_idx" ON "public"."DiscountCode"("stripeCouponId");

-- CreateIndex
CREATE INDEX "DiscountCode_stripePromotionCodeId_idx" ON "public"."DiscountCode"("stripePromotionCodeId");

-- CreateIndex
CREATE INDEX "Order_stripeCouponIdUsed_idx" ON "public"."Order"("stripeCouponIdUsed");

-- CreateIndex
CREATE INDEX "Order_stripePromotionCodeIdUsed_idx" ON "public"."Order"("stripePromotionCodeIdUsed");
