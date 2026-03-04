-- CreateEnum
CREATE TYPE "public"."ProductChannel" AS ENUM ('GLOBAL', 'PT_STOCK_CTT');

-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "channel" "public"."ProductChannel" NOT NULL DEFAULT 'GLOBAL';

-- AlterTable
ALTER TABLE "public"."Product" ADD COLUMN     "channel" "public"."ProductChannel" NOT NULL DEFAULT 'GLOBAL',
ADD COLUMN     "ptStockQty" INTEGER;

-- CreateIndex
CREATE INDEX "Order_channel_idx" ON "public"."Order"("channel");

-- CreateIndex
CREATE INDEX "Product_channel_idx" ON "public"."Product"("channel");
