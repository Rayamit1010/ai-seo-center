CREATE TABLE "CompetitorAnalysis" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "competitorId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "strengths" TEXT NOT NULL DEFAULT '[]',
    "weaknesses" TEXT NOT NULL DEFAULT '[]',
    "contentGaps" TEXT NOT NULL DEFAULT '[]',
    "keywordOpportunities" TEXT NOT NULL DEFAULT '[]',
    "backlinkGaps" TEXT NOT NULL DEFAULT '[]',
    "quickWins" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompetitorAnalysis_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CompetitorAnalysis_userId_createdAt_idx" ON "CompetitorAnalysis"("userId", "createdAt" DESC);
CREATE INDEX "CompetitorAnalysis_competitorId_idx" ON "CompetitorAnalysis"("competitorId");

ALTER TABLE "CompetitorAnalysis" ADD CONSTRAINT "CompetitorAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompetitorAnalysis" ADD CONSTRAINT "CompetitorAnalysis_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "CompetitorTracking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
