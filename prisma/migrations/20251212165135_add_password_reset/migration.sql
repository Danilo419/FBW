-- CreateEnum
CREATE TYPE "public"."ShippingStatus" AS ENUM ('PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED');

-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "shippedAt" TIMESTAMP(3),
ADD COLUMN     "shippingStatus" "public"."ShippingStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "trackingCode" TEXT,
ADD COLUMN     "trackingUrl" TEXT;

-- CreateTable
CREATE TABLE "public"."PasswordResetToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "public"."PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_email_idx" ON "public"."PasswordResetToken"("email");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "public"."PasswordResetToken"("expiresAt");

-- CreateIndex
CREATE INDEX "Order_shippingStatus_idx" ON "public"."Order"("shippingStatus");

-- CreateIndex
CREATE INDEX "Order_shippedAt_idx" ON "public"."Order"("shippedAt");

-- CreateIndex
CREATE INDEX "Order_deliveredAt_idx" ON "public"."Order"("deliveredAt");

-- CreateIndex
CREATE INDEX "Order_trackingCode_idx" ON "public"."Order"("trackingCode");
