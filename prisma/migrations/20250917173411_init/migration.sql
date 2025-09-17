-- AlterTable
ALTER TABLE "public"."Product" ALTER COLUMN "description" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Player_team_idx" ON "public"."Player"("team");

-- CreateIndex
CREATE INDEX "Product_team_idx" ON "public"."Product"("team");
