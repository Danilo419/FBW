/*
  Warnings:

  - You are about to drop the column `images` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Product" DROP COLUMN "images",
ADD COLUMN     "badges" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
