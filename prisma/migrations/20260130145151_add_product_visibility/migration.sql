-- AlterTable
ALTER TABLE "public"."Product" ADD COLUMN     "isVisible" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "Product_isVisible_idx" ON "public"."Product"("isVisible");
