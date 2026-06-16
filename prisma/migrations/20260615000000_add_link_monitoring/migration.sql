-- Link Monitoring: track acquired backlinks for live/lost status, dofollow/nofollow, anchor text

ALTER TABLE "BacklinkProspect" ADD COLUMN IF NOT EXISTS "anchorText" TEXT;
ALTER TABLE "BacklinkProspect" ADD COLUMN IF NOT EXISTS "linkDofollow" BOOLEAN;
ALTER TABLE "BacklinkProspect" ADD COLUMN IF NOT EXISTS "linkStatus" TEXT;
ALTER TABLE "BacklinkProspect" ADD COLUMN IF NOT EXISTS "lastLinkCheckAt" TIMESTAMP(3);
ALTER TABLE "BacklinkProspect" ADD COLUMN IF NOT EXISTS "lastLinkAlertAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "LinkCheck" (
    "id" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "linkFound" BOOLEAN NOT NULL,
    "dofollow" BOOLEAN,
    "anchorText" TEXT,
    "statusChanged" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "LinkCheck_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BacklinkProspect_linkAcquired_lastLinkCheckAt_idx" ON "BacklinkProspect"("linkAcquired", "lastLinkCheckAt");
CREATE INDEX IF NOT EXISTS "LinkCheck_prospectId_checkedAt_idx" ON "LinkCheck"("prospectId", "checkedAt" DESC);

ALTER TABLE "LinkCheck" ADD CONSTRAINT "LinkCheck_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "BacklinkProspect"("id") ON DELETE CASCADE ON UPDATE CASCADE;
