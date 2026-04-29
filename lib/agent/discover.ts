import { prisma } from "@/lib/db";
import { scrapeUrl } from "@/lib/scraper";
import { callClaudeJSON } from "@/lib/anthropic";
import { buildDiscoveryPrompt } from "@/lib/prompts/agent-discover";
import {
  buildProjectProfileContext,
  resolveProjectProfileByUrl,
} from "@/lib/services/project-profile-service";
import { BATCH_SIZES } from "./constants";
import type { AgentLogEntry, DiscoveryResult } from "./types";

export async function processDiscoverProspects(
  userId: string,
  campaignId: string | undefined,
  log: AgentLogEntry[]
): Promise<void> {
  // Get active campaigns
  const campaigns = await prisma.backlinkCampaign.findMany({
    where: {
      userId,
      status: "active",
      ...(campaignId ? { id: campaignId } : {}),
    },
  });

  for (const campaign of campaigns.slice(0, 1)) {
    // Process 1 campaign per heartbeat
    const startTime = Date.now();

    try {
      const projectProfile = await resolveProjectProfileByUrl(userId, campaign.targetUrl);

      // Get existing prospect domains to avoid duplicates
      const existing = await prisma.backlinkProspect.findMany({
        where: { campaignId: campaign.id },
        select: { domain: true },
      });
      const existingDomains = existing.map((p) => p.domain);

      // Parse competitor URLs
      const competitorUrls: string[] = campaign.competitorUrls
        ? JSON.parse(campaign.competitorUrls)
        : [];

      // Scrape competitor sites for context (limit to batch size)
      const competitorData: string[] = [];
      for (const url of competitorUrls.slice(0, BATCH_SIZES.discover)) {
        try {
          const scraped = await scrapeUrl(url);
          competitorData.push(
            JSON.stringify({
              url: scraped.url,
              title: scraped.title,
              externalLinks: scraped.externalLinks,
              h2: scraped.h2.slice(0, 5),
              metaDescription: scraped.metaDescription,
            })
          );
        } catch {
          // Skip failed scrapes
        }
      }

      if (competitorData.length === 0 && competitorUrls.length === 0) {
        // No competitors — use the target URL itself for context
        try {
          const scraped = await scrapeUrl(campaign.targetUrl);
          competitorData.push(
            JSON.stringify({
              url: scraped.url,
              title: scraped.title,
              externalLinks: scraped.externalLinks,
              h2: scraped.h2.slice(0, 5),
              industry: campaign.industry,
            })
          );
        } catch {
          // Continue with minimal context
        }
      }

      const { system, user } = buildDiscoveryPrompt({
        targetUrl: campaign.targetUrl,
        industry: campaign.industry,
        targetCountry: campaign.targetCountry,
        competitorData: competitorData.join("\n---\n"),
        existingDomains,
        projectContext: buildProjectProfileContext(projectProfile),
      });

      const result = await callClaudeJSON<DiscoveryResult>(system, user, 4096, {
        userId,
        task: "agent-discover",
      });

      // Create prospect records
      let created = 0;
      for (const prospect of result.prospects) {
        // Skip if domain already exists
        if (existingDomains.includes(prospect.domain)) continue;

        await prisma.backlinkProspect.create({
          data: {
            userId,
            campaignId: campaign.id,
            domain: prospect.domain,
            url: prospect.url,
            discoveryMethod: prospect.discoveryMethod,
            outreachAngle: prospect.suggestedAngle,
            discoveryData: JSON.stringify(prospect),
            stage: "discovered",
          },
        });
        created++;
        existingDomains.push(prospect.domain);
      }

      // Update campaign stats
      await prisma.backlinkCampaign.update({
        where: { id: campaign.id },
        data: {
          totalProspects: { increment: created },
        },
      });

      log.push({
        timestamp: new Date().toISOString(),
        stage: "discover",
        action: `Discovered ${created} new prospects for campaign "${campaign.name}"`,
        success: true,
        durationMs: Date.now() - startTime,
      });
    } catch (error) {
      log.push({
        timestamp: new Date().toISOString(),
        stage: "discover",
        action: `Discovery failed for campaign "${campaign.name}"`,
        success: false,
        detail: error instanceof Error ? error.message : "Unknown error",
        durationMs: Date.now() - startTime,
      });
    }
  }
}
