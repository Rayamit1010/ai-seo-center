-- CreateTable
CREATE TABLE "CitationBusiness" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "niche" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CitationBusiness_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Citation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "directoryName" TEXT NOT NULL,
    "directoryUrl" TEXT NOT NULL,
    "citationUrl" TEXT,
    "status" TEXT,
    "nameMatch" BOOLEAN,
    "addressMatch" BOOLEAN,
    "phoneMatch" BOOLEAN,
    "lastCheckedAt" TIMESTAMP(3),
    "lastAlertAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Citation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CitationBusiness_userId_key" ON "CitationBusiness"("userId");

-- CreateIndex
CREATE INDEX "Citation_userId_lastCheckedAt_idx" ON "Citation"("userId", "lastCheckedAt");

-- CreateIndex
CREATE INDEX "Citation_businessId_idx" ON "Citation"("businessId");

-- AddForeignKey
ALTER TABLE "CitationBusiness" ADD CONSTRAINT "CitationBusiness_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "CitationBusiness"("id") ON DELETE CASCADE ON UPDATE CASCADE;
