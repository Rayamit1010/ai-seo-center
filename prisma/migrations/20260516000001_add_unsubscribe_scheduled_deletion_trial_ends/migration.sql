-- AlterTable: User — add unsubscribe token and scheduled deletion
ALTER TABLE "User" ADD COLUMN "unsubscribeToken" TEXT;
ALTER TABLE "User" ADD COLUMN "scheduledDeletionAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "User_unsubscribeToken_key" ON "User"("unsubscribeToken");

-- AlterTable: Subscription — add trial end date
ALTER TABLE "Subscription" ADD COLUMN "trialEndsAt" TIMESTAMP(3);
