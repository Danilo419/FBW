-- AlterTable
ALTER TABLE "public"."OptionValue" ADD COLUMN     "playerId" TEXT,
ADD COLUMN     "playerName" TEXT,
ADD COLUMN     "playerNumber" INTEGER;

-- CreateTable
CREATE TABLE "public"."Player" (
    "id" TEXT NOT NULL,
    "team" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "position" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OptionGroup_productId_idx" ON "public"."OptionGroup"("productId");

-- CreateIndex
CREATE INDEX "OptionValue_groupId_idx" ON "public"."OptionValue"("groupId");

-- CreateIndex
CREATE INDEX "OptionValue_playerId_idx" ON "public"."OptionValue"("playerId");

-- CreateIndex
CREATE INDEX "SizeStock_productId_idx" ON "public"."SizeStock"("productId");

-- AddForeignKey
ALTER TABLE "public"."OptionValue" ADD CONSTRAINT "OptionValue_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "public"."Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
