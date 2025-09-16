/*
  Warnings:

  - You are about to drop the column `paypalCaptureId` on the `Order` table. All the data in the column will be lost.
  - The `status` column on the `Order` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- DropIndex
DROP INDEX "public"."Order_paypalOrderId_idx";

-- DropIndex
DROP INDEX "public"."Order_sessionId_idx";

-- DropIndex
DROP INDEX "public"."Order_stripeSessionId_idx";

-- DropIndex
DROP INDEX "public"."Order_userId_idx";

-- AlterTable
ALTER TABLE "public"."Order" DROP COLUMN "paypalCaptureId",
ADD COLUMN     "paypalCaptured" BOOLEAN,
ADD COLUMN     "shippingAddress1" TEXT,
ADD COLUMN     "shippingAddress2" TEXT,
ADD COLUMN     "shippingCity" TEXT,
ADD COLUMN     "shippingEmail" TEXT,
ADD COLUMN     "shippingFullName" TEXT,
ADD COLUMN     "shippingPhone" TEXT,
ADD COLUMN     "shippingPostalCode" TEXT,
ADD COLUMN     "shippingRegion" TEXT,
ADD COLUMN     "totalCents" INTEGER,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending',
ALTER COLUMN "currency" SET DEFAULT 'eur',
ALTER COLUMN "subtotal" SET DEFAULT 0,
ALTER COLUMN "total" DROP NOT NULL,
ALTER COLUMN "total" SET DATA TYPE DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "public"."Order"("status");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "public"."Order"("createdAt");

-- CreateIndex
CREATE INDEX "Review_createdAt_idx" ON "public"."Review"("createdAt");
