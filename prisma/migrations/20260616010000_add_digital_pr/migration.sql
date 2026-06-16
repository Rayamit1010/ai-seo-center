-- CreateTable
CREATE TABLE "PrCampaign" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "angle" TEXT,
    "niche" TEXT,
    "keyMessages" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "pressRelease" TEXT,
    "pitchTemplate" TEXT,
    "targetPublications" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrCoverage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "publicationName" TEXT NOT NULL,
    "coverageUrl" TEXT,
    "mentionType" TEXT,
    "publishedAt" TIMESTAMP(3),
    "dofollow" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrCoverage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrCampaign_userId_createdAt_idx" ON "PrCampaign"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "PrCoverage_userId_createdAt_idx" ON "PrCoverage"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "PrCoverage_campaignId_idx" ON "PrCoverage"("campaignId");

-- AddForeignKey
ALTER TABLE "PrCampaign" ADD CONSTRAINT "PrCampaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrCoverage" ADD CONSTRAINT "PrCoverage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrCoverage" ADD CONSTRAINT "PrCoverage_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "PrCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
