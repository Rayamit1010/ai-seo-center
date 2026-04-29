import { prisma } from "@/lib/db";
import { scrapeUrl } from "@/lib/scraper";
import { BATCH_SIZES } from "./constants";
import type { AgentLogEntry } from "./types";

/** Check if backlinks have been placed on prospect sites */
export async function processTrackResults(
  userId: string,
  campaignId: string | undefined,
  log: AgentLogEntry[]
): Promise<void> {
  // Get prospects that have had all emails sent (breakup_sent or completed)
  const prospects = await prisma.backlinkProspect.findMany({
    where: {
      userId,
      stage: { in: ["email_sent", "follow_up_1", "follow_up_2", "breakup_sent"] },
      linkAcquired: false,
      ...(campaignId ? { campaignId } : {}),
    },
    include: { campaign: true },
    take: BATCH_SIZES.track,
    orderBy: { emailSentAt: "asc" },
  });

  for (const prospect of prospects) {
    const startTime = Date.now();
    const targetUrl = prospect.campaign?.targetUrl || "";

    if (!targetUrl) continue;

    try {
      // Scrape the prospect URL to check for our backlink
      const scraped = await scrapeUrl(prospect.url);

      const targetDomain = new URL(targetUrl).hostname.replace("www.", "");

      // Check if any external link points to our domain
      const hasBacklink = scraped.externalLinkUrls.some((link) => {
        try {
          const linkDomain = new URL(link).hostname.replace("www.", "");
          return linkDomain === targetDomain;
        } catch {
          return false;
        }
      });

      if (hasBacklink) {
        const linkUrl = scraped.externalLinkUrls.find((link) => {
          try {
            return new URL(link).hostname.replace("www.", "") === targetDomain;
          } catch {
            return false;
          }
        });

        await prisma.backlinkProspect.update({
          where: { id: prospect.id },
          data: {
            linkAcquired: true,
            linkUrl: linkUrl || targetUrl,
            stage: "completed",
          },
        });

        // Update campaign link count
        if (prospect.campaignId) {
          await prisma.backlinkCampaign.update({
            where: { id: prospect.campaignId },
            data: { totalLinks: { increment: 1 } },
          });
        }

        log.push({
          timestamp: new Date().toISOString(),
          stage: "track",
          action: `Backlink acquired from ${prospect.domain}!`,
          prospectDomain: prospect.domain,
          success: true,
          detail: linkUrl || undefined,
          durationMs: Date.now() - startTime,
        });
      }
    } catch {
      // Scrape failed — silently skip, will retry next heartbeat
    }
  }
}
