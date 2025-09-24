-- AlterTable
ALTER TABLE "public"."Product" ADD COLUMN     "season" TEXT;

-- CreateIndex
CREATE INDEX "Product_season_idx" ON "public"."Product"("season");
