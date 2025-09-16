-- CreateTable
CREATE TABLE "public"."Visit" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "referrer" TEXT,
    "ua" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Visit_createdAt_idx" ON "public"."Visit"("createdAt");

-- CreateIndex
CREATE INDEX "Visit_visitorId_createdAt_idx" ON "public"."Visit"("visitorId", "createdAt");
