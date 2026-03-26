/*
  Warnings:

  - You are about to drop the column `discountCodeId` on the `Order` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[usedByOrderId]` on the table `DiscountCode` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."Order" DROP CONSTRAINT "Order_discountCodeId_fkey";

-- DropIndex
DROP INDEX "public"."Order_discountCodeId_idx";

-- AlterTable
ALTER TABLE "public"."DiscountCode" ADD COLUMN     "usedByOrderId" TEXT;

-- AlterTable
ALTER TABLE "public"."Order" DROP COLUMN "discountCodeId";

-- CreateIndex
CREATE UNIQUE INDEX "DiscountCode_usedByOrderId_key" ON "public"."DiscountCode"("usedByOrderId");

-- CreateIndex
CREATE INDEX "DiscountCode_usedAt_idx" ON "public"."DiscountCode"("usedAt");

-- CreateIndex
CREATE INDEX "DiscountCode_usedByOrderId_idx" ON "public"."DiscountCode"("usedByOrderId");

-- AddForeignKey
ALTER TABLE "public"."DiscountCode" ADD CONSTRAINT "DiscountCode_usedByOrderId_fkey" FOREIGN KEY ("usedByOrderId") REFERENCES "public"."Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
