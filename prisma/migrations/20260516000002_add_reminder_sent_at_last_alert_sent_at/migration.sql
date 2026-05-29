-- Add reminderSentAt to Subscription for expiry email deduplication
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "reminderSentAt" TIMESTAMP(3);

-- Add lastAlertSentAt to TrackedKeyword for rank-drop alert deduplication
ALTER TABLE "TrackedKeyword" ADD COLUMN IF NOT EXISTS "lastAlertSentAt" TIMESTAMP(3);
