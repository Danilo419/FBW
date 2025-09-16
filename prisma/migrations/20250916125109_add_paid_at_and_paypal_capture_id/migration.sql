-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paypalCaptureId" TEXT;

-- CreateIndex
CREATE INDEX "Order_paidAt_idx" ON "public"."Order"("paidAt");
