-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "discountAmountCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "discountCodeId" TEXT,
ADD COLUMN     "discountCodeText" TEXT,
ADD COLUMN     "discountPercent" INTEGER,
ADD COLUMN     "productSubtotalCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "shippingCents" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "public"."DiscountCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "percentOff" INTEGER NOT NULL DEFAULT 10,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "usesCount" INTEGER NOT NULL DEFAULT 0,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscountCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DiscountCode_code_key" ON "public"."DiscountCode"("code");

-- CreateIndex
CREATE INDEX "DiscountCode_active_idx" ON "public"."DiscountCode"("active");

-- CreateIndex
CREATE INDEX "DiscountCode_code_active_idx" ON "public"."DiscountCode"("code", "active");

-- CreateIndex
CREATE INDEX "DiscountCode_expiresAt_idx" ON "public"."DiscountCode"("expiresAt");

-- CreateIndex
CREATE INDEX "DiscountCode_createdAt_idx" ON "public"."DiscountCode"("createdAt");

-- CreateIndex
CREATE INDEX "Order_discountCodeId_idx" ON "public"."Order"("discountCodeId");

-- CreateIndex
CREATE INDEX "Order_discountCodeText_idx" ON "public"."Order"("discountCodeText");

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_discountCodeId_fkey" FOREIGN KEY ("discountCodeId") REFERENCES "public"."DiscountCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
