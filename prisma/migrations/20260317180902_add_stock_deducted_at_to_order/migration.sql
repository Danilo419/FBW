-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "stockDeductedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Order_stockDeductedAt_idx" ON "public"."Order"("stockDeductedAt");
