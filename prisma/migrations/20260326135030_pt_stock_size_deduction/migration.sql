-- DropForeignKey
ALTER TABLE "public"."CartItem" DROP CONSTRAINT "CartItem_productId_fkey";

-- DropForeignKey
ALTER TABLE "public"."OptionGroup" DROP CONSTRAINT "OptionGroup_productId_fkey";

-- DropForeignKey
ALTER TABLE "public"."OptionValue" DROP CONSTRAINT "OptionValue_groupId_fkey";

-- DropForeignKey
ALTER TABLE "public"."SizeStock" DROP CONSTRAINT "SizeStock_productId_fkey";

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "public"."Order"("userId");

-- CreateIndex
CREATE INDEX "Order_sessionId_idx" ON "public"."Order"("sessionId");

-- CreateIndex
CREATE INDEX "SizeStock_size_idx" ON "public"."SizeStock"("size");

-- CreateIndex
CREATE INDEX "SizeStock_available_idx" ON "public"."SizeStock"("available");

-- AddForeignKey
ALTER TABLE "public"."SizeStock" ADD CONSTRAINT "SizeStock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OptionGroup" ADD CONSTRAINT "OptionGroup_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OptionValue" ADD CONSTRAINT "OptionValue_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."OptionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CartItem" ADD CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
