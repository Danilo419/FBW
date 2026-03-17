-- AlterTable
ALTER TABLE "public"."SizeStock" ADD COLUMN     "ptStockQty" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "SizeStock_ptStockQty_idx" ON "public"."SizeStock"("ptStockQty");
