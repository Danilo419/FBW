/*
  Warnings:

  - You are about to drop the column `lineTotal` on the `CartItem` table. All the data in the column will be lost.
  - You are about to drop the column `options` on the `CartItem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."CartItem" DROP COLUMN "lineTotal",
DROP COLUMN "options",
ADD COLUMN     "optionsJson" JSONB,
ADD COLUMN     "totalPrice" INTEGER NOT NULL DEFAULT 0;
