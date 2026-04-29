import { prisma } from "@/lib/db";
import { sendOutreachEmail } from "@/lib/resend";
import { BATCH_SIZES } from "./constants";
import type { AgentLogEntry } from "./types";

/** Process pending emails from the queue */
export async function processSendEmails(
  userId: string,
  config: {
    dailyEmailLimit: number;
    emailsSentToday: number;
    lastResetDate: string | null;
    fromEmail: string;
  },
  log: AgentLogEntry[]
): Promise<void> {
  // Reset daily counter if new day
  const today = new Date().toISOString().split("T")[0];
  if (config.lastResetDate !== today) {
    await prisma.agentConfig.update({
      where: { userId },
      data: { emailsSentToday: 0, lastResetDate: today },
    });
    config.emailsSentToday = 0;
  }

  const remainingToday = config.dailyEmailLimit - config.emailsSentToday;
  if (remainingToday <= 0) {
    log.push({
      timestamp: new Date().toISOString(),
      stage: "send_email",
      action: `Daily email limit reached (${config.dailyEmailLimit}/${config.dailyEmailLimit})`,
      success: true,
    });
    return;
  }

  // Get pending emails that are scheduled for now or earlier
  const pendingEmails = await prisma.emailQueue.findMany({
    where: {
      status: "pending",
      scheduledFor: { lte: new Date() },
      attempts: { lt: 3 },
      prospect: { userId },
    },
    include: { prospect: true },
    take: Math.min(BATCH_SIZES.sendEmail, remainingToday),
    orderBy: { scheduledFor: "asc" },
  });

  for (const email of pendingEmails) {
    const startTime = Date.now();

    // Mark as sending
    await prisma.emailQueue.update({
      where: { id: email.id },
      data: { status: "sending", attempts: { increment: 1 } },
    });

    try {
      const result = await sendOutreachEmail({
        from: email.fromEmail || config.fromEmail,
        to: email.toEmail,
        subject: email.subject,
        body: email.body,
      });

      // Mark as sent
      await prisma.emailQueue.update({
        where: { id: email.id },
        data: {
          status: "sent",
          sentAt: new Date(),
          resendId: result.id,
        },
      });

      // Update prospect stage based on email type
      const stageMap: Record<string, string> = {
        initial: "email_sent",
        follow_up_1: "follow_up_1",
        follow_up_2: "follow_up_2",
        breakup: "breakup_sent",
      };

      const dateMap: Record<string, string> = {
        initial: "emailSentAt",
        follow_up_1: "followUp1SentAt",
        follow_up_2: "followUp2SentAt",
        breakup: "breakupSentAt",
      };

      await prisma.backlinkProspect.update({
        where: { id: email.prospectId },
        data: {
          stage: stageMap[email.emailType] || email.prospect.stage,
          [dateMap[email.emailType]]: new Date(),
        },
      });

      // Update campaign sent count
      if (email.emailType === "initial" && email.prospect.campaignId) {
        await prisma.backlinkCampaign.update({
          where: { id: email.prospect.campaignId },
          data: { totalSent: { increment: 1 } },
        });
      }

      // Increment daily counter
      await prisma.agentConfig.update({
        where: { userId },
        data: { emailsSentToday: { increment: 1 } },
      });
      config.emailsSentToday++;

      log.push({
        timestamp: new Date().toISOString(),
        stage: "send_email",
        action: `Sent ${email.emailType} to ${email.toEmail} (${email.prospect.domain})`,
        prospectDomain: email.prospect.domain,
        success: true,
        durationMs: Date.now() - startTime,
      });
    } catch (error) {
      const isFinalAttempt = email.attempts + 1 >= email.maxAttempts;

      await prisma.emailQueue.update({
        where: { id: email.id },
        data: {
          status: isFinalAttempt ? "failed" : "pending",
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
        },
      });

      if (isFinalAttempt) {
        // Cancel remaining follow-ups for this prospect
        await prisma.emailQueue.updateMany({
          where: {
            prospectId: email.prospectId,
            status: "pending",
          },
          data: { status: "cancelled" },
        });
      }

      log.push({
        timestamp: new Date().toISOString(),
        stage: "send_email",
        action: `Failed to send ${email.emailType} to ${email.toEmail}${isFinalAttempt ? " (final attempt)" : ""}`,
        prospectDomain: email.prospect.domain,
        success: false,
        detail: error instanceof Error ? error.message : "Unknown error",
        durationMs: Date.now() - startTime,
      });
    }
  }
}
