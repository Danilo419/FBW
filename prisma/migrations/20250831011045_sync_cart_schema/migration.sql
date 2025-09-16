/*
  Warnings:

  - You are about to drop the column `optionsJson` on the `CartItem` table. All the data in the column will be lost.
  - You are about to drop the column `totalPrice` on the `CartItem` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[sessionId]` on the table `Cart` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `lineTotal` to the `CartItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `options` to the `CartItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."CartItem" DROP CONSTRAINT "CartItem_cartId_fkey";

-- DropIndex
DROP INDEX "public"."Cart_sessionId_idx";

-- AlterTable
ALTER TABLE "public"."CartItem" DROP COLUMN "optionsJson",
DROP COLUMN "totalPrice",
ADD COLUMN     "lineTotal" INTEGER NOT NULL,
ADD COLUMN     "options" JSONB NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Cart_sessionId_key" ON "public"."Cart"("sessionId");

-- AddForeignKey
ALTER TABLE "public"."Cart" ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "public"."Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;
