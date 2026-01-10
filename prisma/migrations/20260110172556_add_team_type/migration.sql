-- CreateEnum
CREATE TYPE "public"."TeamType" AS ENUM ('CLUB', 'NATION');

-- AlterTable
ALTER TABLE "public"."Product" ADD COLUMN     "teamType" "public"."TeamType" NOT NULL DEFAULT 'CLUB';

-- CreateIndex
CREATE INDEX "Product_teamType_idx" ON "public"."Product"("teamType");

-- CreateIndex
CREATE INDEX "Product_teamType_team_idx" ON "public"."Product"("teamType", "team");
