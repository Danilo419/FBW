/*
  Warnings:

  - You are about to drop the column `stock` on the `SizeStock` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[productId,size]` on the table `SizeStock` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."SizeStock" DROP COLUMN "stock",
ADD COLUMN     "available" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX "SizeStock_productId_size_key" ON "public"."SizeStock"("productId", "size");
