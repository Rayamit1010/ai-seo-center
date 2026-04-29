import { prisma } from "@/lib/db";
import { callClaudeJSON } from "@/lib/anthropic";
import { buildAgentEmailPrompt } from "@/lib/prompts/agent-email";
import {
  buildProjectProfileContext,
  resolveProjectProfileByUrl,
} from "@/lib/services/project-profile-service";
import { BATCH_SIZES } from "./constants";
import type { AgentLogEntry, DraftedEmail } from "./types";

export async function processDraftEmails(
  userId: string,
  campaignId: string | undefined,
  log: AgentLogEntry[]
): Promise<void> {
  const prospects = await prisma.backlinkProspect.findMany({
    where: {
      userId,
      stage: "contact_found",
      ...(campaignId ? { campaignId } : {}),
    },
    include: { campaign: true },
    take: BATCH_SIZES.draftEmail,
    orderBy: { qualityScore: "desc" },
  });

  // Get user info for sender details
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const agentConfig = await prisma.agentConfig.findUnique({
    where: { userId },
  });

  for (const prospect of prospects) {
    const startTime = Date.now();

    await prisma.backlinkProspect.update({
      where: { id: prospect.id },
      data: { stage: "drafting_email" },
    });

    try {
      const projectProfile = prospect.campaign?.targetUrl
        ? await resolveProjectProfileByUrl(userId, prospect.campaign.targetUrl)
        : null;

      // Build context from discovery and qualification data
      const discoveryData = prospect.discoveryData
        ? JSON.parse(prospect.discoveryData)
        : {};

      const { system, user: userPrompt } = buildAgentEmailPrompt({
        targetDomain: prospect.domain,
        targetSiteData: JSON.stringify({
          domain: prospect.domain,
          url: prospect.url,
          qualityScore: prospect.qualityScore,
          qualityTier: prospect.qualityTier,
          angle: prospect.outreachAngle,
          ...discoveryData,
        }),
        contactName: prospect.contactName || "Editor",
        outreachAngle: prospect.outreachAngle || "guest_post",
        senderName: agentConfig?.fromName || user?.name || "Team",
        senderCompany: user?.company || "TechGeekStudio",
        senderWebsite: user?.website || "https://techgeekstudio.com",
        industry: prospect.campaign?.industry || "technology",
        projectContext: buildProjectProfileContext(projectProfile),
      });

      const result = await callClaudeJSON<DraftedEmail>(system, userPrompt, 4096, {
        userId,
        task: "agent-draft-email",
      });

      // Calculate follow-up schedule
      const now = new Date();
      const followUp1Date = new Date(
        now.getTime() + result.followUp1.delayDays * 86400000
      );
      const followUp2Date = new Date(
        now.getTime() + result.followUp2.delayDays * 86400000
      );
      const breakupDate = new Date(
        now.getTime() + result.breakup.delayDays * 86400000
      );

      const fromEmail =
        agentConfig?.fromEmail || process.env.RESEND_FROM_EMAIL || "";

      // Update prospect with drafted email
      await prisma.backlinkProspect.update({
        where: { id: prospect.id },
        data: {
          emailSubject: result.subject,
          emailBody: result.body,
          followUpData: JSON.stringify({
            followUp1: result.followUp1,
            followUp2: result.followUp2,
            breakup: result.breakup,
          }),
          stage: "email_drafted",
        },
      });

      // Create email queue entries
      await prisma.emailQueue.createMany({
        data: [
          {
            prospectId: prospect.id,
            emailType: "initial",
            toEmail: prospect.contactEmail!,
            fromEmail,
            subject: result.subject,
            body: result.body,
            scheduledFor: now,
            status: "pending",
          },
          {
            prospectId: prospect.id,
            emailType: "follow_up_1",
            toEmail: prospect.contactEmail!,
            fromEmail,
            subject: result.followUp1.subject,
            body: result.followUp1.body,
            scheduledFor: followUp1Date,
            status: "pending",
          },
          {
            prospectId: prospect.id,
            emailType: "follow_up_2",
            toEmail: prospect.contactEmail!,
            fromEmail,
            subject: result.followUp2.subject,
            body: result.followUp2.body,
            scheduledFor: followUp2Date,
            status: "pending",
          },
          {
            prospectId: prospect.id,
            emailType: "breakup",
            toEmail: prospect.contactEmail!,
            fromEmail,
            subject: result.breakup.subject,
            body: result.breakup.body,
            scheduledFor: breakupDate,
            status: "pending",
          },
        ],
      });

      log.push({
        timestamp: new Date().toISOString(),
        stage: "draft_email",
        action: `Drafted email sequence for ${prospect.domain} (${prospect.contactEmail})`,
        prospectDomain: prospect.domain,
        success: true,
        durationMs: Date.now() - startTime,
      });
    } catch (error) {
      await prisma.backlinkProspect.update({
        where: { id: prospect.id },
        data: {
          stage: "failed",
          stageError: `Email drafting failed: ${error instanceof Error ? error.message : "Unknown"}`,
        },
      });

      log.push({
        timestamp: new Date().toISOString(),
        stage: "draft_email",
        action: `Email draft failed for ${prospect.domain}`,
        prospectDomain: prospect.domain,
        success: false,
        detail: error instanceof Error ? error.message : "Unknown error",
        durationMs: Date.now() - startTime,
      });
    }
  }
}
