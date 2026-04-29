import { prisma } from "@/lib/db";
import { scrapeUrl } from "@/lib/scraper";
import { callClaudeJSON } from "@/lib/anthropic";
import { buildQualifyPrompt } from "@/lib/prompts/agent-qualify";
import {
  buildProjectProfileContext,
  resolveProjectProfileByUrl,
} from "@/lib/services/project-profile-service";
import { BATCH_SIZES } from "./constants";
import { buildQualificationHeuristic } from "./score";
import type { AgentLogEntry, QualificationResult } from "./types";

export async function processQualifyProspects(
  userId: string,
  campaignId: string | undefined,
  log: AgentLogEntry[]
): Promise<void> {
  // Get prospects in "discovered" stage
  const prospects = await prisma.backlinkProspect.findMany({
    where: {
      userId,
      stage: "discovered",
      ...(campaignId ? { campaignId } : {}),
    },
    include: { campaign: true },
    take: BATCH_SIZES.qualify,
    orderBy: { createdAt: "asc" },
  });

  for (const prospect of prospects) {
    const startTime = Date.now();

    // Mark as qualifying
    await prisma.backlinkProspect.update({
      where: { id: prospect.id },
      data: { stage: "qualifying" },
    });

    try {
      const projectProfile = prospect.campaign?.targetUrl
        ? await resolveProjectProfileByUrl(userId, prospect.campaign.targetUrl)
        : null;

      // Scrape the prospect's homepage
      const scraped = await scrapeUrl(prospect.url);
      const heuristic = buildQualificationHeuristic({
        scraped,
        industry: prospect.campaign?.industry || "technology",
        domain: prospect.domain,
      });

      const scrapedSummary = JSON.stringify({
        title: scraped.title,
        metaDescription: scraped.metaDescription,
        h1: scraped.h1,
        h2: scraped.h2.slice(0, 10),
        wordCount: scraped.wordCount,
        externalLinks: scraped.externalLinks,
        internalLinks: scraped.internalLinks,
        hasSchema: scraped.schemaTypes.length > 0,
        isHttps: scraped.hasHttps,
        imagesTotal: scraped.totalImages,
        imagesWithoutAlt: scraped.imagesWithoutAlt,
        schemaTypes: scraped.schemaTypes,
        titleLength: scraped.titleLength,
        metaDescriptionLength: scraped.metaDescriptionLength,
        htmlSize: scraped.htmlSize,
        heuristic,
      });

      const { system, user } = buildQualifyPrompt({
        domain: prospect.domain,
        scrapedData: scrapedSummary,
        industry: prospect.campaign?.industry || "technology",
        targetUrl: prospect.campaign?.targetUrl || "",
        projectContext: buildProjectProfileContext(projectProfile),
      });

      const result = await callClaudeJSON<QualificationResult>(
        system,
        user,
        2048,
        { userId, task: "agent-qualify" }
      );

      const mergedResult: QualificationResult = {
        ...result,
        authorityScore: Math.round((result.authorityScore + heuristic.authorityScore) / 2),
        topicalFit: Math.round((result.topicalFit + heuristic.topicalFit) / 2),
        editorialQuality: Math.round((result.editorialQuality + heuristic.editorialQuality) / 2),
        spamRisk: Math.round((result.spamRisk + heuristic.spamRisk) / 2),
        linkWorthiness: Math.round((result.linkWorthiness + heuristic.linkWorthiness) / 2),
        positiveSignals: [...new Set([...(result.positiveSignals || []), ...heuristic.positiveSignals])].slice(0, 6),
        redFlags: [...new Set([...(result.redFlags || []), ...heuristic.redFlags])].slice(0, 6),
        outreachReadiness:
          result.spamRisk >= 65 || heuristic.spamRisk >= 65
            ? "avoid"
            : result.qualityScore >= 65 && result.relevanceScore >= 6
            ? "ready"
            : "needs_review",
      };

      // Determine if rejected
      const isRejected =
        mergedResult.qualityTier === "rejected" ||
        mergedResult.qualityScore < 40 ||
        mergedResult.spamRisk >= 70 ||
        mergedResult.outreachReadiness === "avoid";

      await prisma.backlinkProspect.update({
        where: { id: prospect.id },
        data: {
          qualityScore: mergedResult.linkWorthiness,
          qualityTier: mergedResult.qualityTier,
          relevanceScore: mergedResult.relevanceScore,
          qualifyData: JSON.stringify({
            ...mergedResult,
            heuristic,
          }),
          outreachAngle: mergedResult.recommendedAngle,
          stage: isRejected ? "rejected" : "qualified",
          stageError: isRejected
            ? mergedResult.spamRisk >= 70
              ? "Spam risk too high"
              : "Below quality threshold"
            : null,
        },
      });

      log.push({
        timestamp: new Date().toISOString(),
        stage: "qualify",
        action: isRejected
          ? `Rejected ${prospect.domain} (score: ${result.qualityScore})`
          : `Qualified ${prospect.domain} (worthiness: ${mergedResult.linkWorthiness}, tier: ${mergedResult.qualityTier})`,
        prospectDomain: prospect.domain,
        success: true,
        durationMs: Date.now() - startTime,
        detail: `${mergedResult.outreachReadiness} · spam risk ${mergedResult.spamRisk}/100 · topical fit ${mergedResult.topicalFit}/100`,
      });
    } catch (error) {
      await prisma.backlinkProspect.update({
        where: { id: prospect.id },
        data: {
          stage: "failed",
          stageError: `Qualification failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      });

      log.push({
        timestamp: new Date().toISOString(),
        stage: "qualify",
        action: `Failed to qualify ${prospect.domain}`,
        prospectDomain: prospect.domain,
        success: false,
        detail: error instanceof Error ? error.message : "Unknown error",
        durationMs: Date.now() - startTime,
      });
    }
  }
}
