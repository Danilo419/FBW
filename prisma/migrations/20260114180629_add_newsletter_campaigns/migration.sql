-- CreateTable
CREATE TABLE "public"."NewsletterCampaign" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "style" TEXT NOT NULL,
    "contentJson" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "NewsletterCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NewsletterSendLog" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "providerId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsletterSendLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NewsletterSendLog_campaignId_idx" ON "public"."NewsletterSendLog"("campaignId");

-- CreateIndex
CREATE INDEX "NewsletterSendLog_email_idx" ON "public"."NewsletterSendLog"("email");

-- AddForeignKey
ALTER TABLE "public"."NewsletterSendLog" ADD CONSTRAINT "NewsletterSendLog_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."NewsletterCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
