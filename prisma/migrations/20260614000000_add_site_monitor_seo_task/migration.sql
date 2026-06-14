-- Continuous Technical SEO Monitoring & Auto-Tasks

CREATE TABLE IF NOT EXISTS "SiteMonitor" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'weekly',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "nextRunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastRunAt" TIMESTAMP(3),
    "leaseUntil" TIMESTAMP(3),
    "lastAlertSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteMonitor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SeoTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "monitorId" TEXT NOT NULL,
    "auditId" TEXT,
    "action" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "impact" TEXT NOT NULL,
    "effort" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoTask_pkey" PRIMARY KEY ("id")
);

-- Audit gains an optional link back to the monitor that triggered it
ALTER TABLE "Audit" ADD COLUMN IF NOT EXISTS "monitorId" TEXT;

CREATE INDEX IF NOT EXISTS "SiteMonitor_userId_createdAt_idx" ON "SiteMonitor"("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "SiteMonitor_isActive_nextRunAt_idx" ON "SiteMonitor"("isActive", "nextRunAt");

CREATE UNIQUE INDEX IF NOT EXISTS "SeoTask_monitorId_action_key" ON "SeoTask"("monitorId", "action");
CREATE INDEX IF NOT EXISTS "SeoTask_userId_status_severity_idx" ON "SeoTask"("userId", "status", "severity");
CREATE INDEX IF NOT EXISTS "SeoTask_monitorId_status_idx" ON "SeoTask"("monitorId", "status");
CREATE INDEX IF NOT EXISTS "Audit_monitorId_createdAt_idx" ON "Audit"("monitorId", "createdAt" DESC);

ALTER TABLE "SiteMonitor" ADD CONSTRAINT "SiteMonitor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SeoTask" ADD CONSTRAINT "SeoTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SeoTask" ADD CONSTRAINT "SeoTask_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "SiteMonitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SeoTask" ADD CONSTRAINT "SeoTask_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "SiteMonitor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
