-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "confirmationEmailProviderId" TEXT,
ADD COLUMN     "confirmationEmailSentAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Order_confirmationEmailSentAt_idx" ON "public"."Order"("confirmationEmailSentAt");
