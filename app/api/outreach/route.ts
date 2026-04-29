import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { scrapeUrl } from "@/lib/scraper";
import { callClaudeJSON } from "@/lib/anthropic";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { buildOutreachPrompt } from "@/lib/prompts/outreach";
import type { OutreachEmailSequence } from "@/types";

const outreachSchema = z.object({
  targetUrl: z.string().url("Invalid target URL"),
  targetName: z.string().min(1, "Target name is required"),
  targetEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  angle: z.enum(["guest_post", "niche_edit", "resource_link", "partnership", "digital_pr"]),
  contentAngle: z.string().min(1, "Content angle is required"),
});

export async function POST(req: Request) {
  try {
    assertTrustedOrigin(req);
    const session = await getServerSession(authOptions);
    const userId = (session?.user as Record<string, unknown>)?.id as string | undefined;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = outreachSchema.parse(body);

    // Scrape target site for personalization context
    const scrapedData = await scrapeUrl(data.targetUrl);
    const targetSiteData = JSON.stringify({
      siteName: scrapedData.title,
      url: scrapedData.url,
      recentH2s: scrapedData.h2.slice(0, 5),
      contentPreview: scrapedData.visibleText.slice(0, 500),
      niche: scrapedData.metaKeywords || "tech",
    });

    // Get user profile for company info
    const user = await prisma.user.findUnique({ where: { id: userId } });

    const { system, user: userPrompt } = buildOutreachPrompt({
      targetSiteData,
      angle: data.angle,
      contentAngle: data.contentAngle,
      agencyInfo: {
        name: user?.company || "TechGeekStudio",
        website: user?.website || "https://techgeekstudio.com",
        description: "Global tech agency specializing in SEO, AI solutions, and software development.",
      },
      targetName: data.targetName,
    });

    const result = await callClaudeJSON<OutreachEmailSequence>(system, userPrompt, 4096, {
      userId,
      task: "outreach",
    });

    // Save to database
    const campaign = await prisma.outreachCampaign.create({
      data: {
        userId,
        targetDomain: new URL(data.targetUrl).hostname,
        targetEmail: data.targetEmail || null,
        niche: scrapedData.metaKeywords || "tech",
        angle: data.angle,
        emailSubject: result.subject,
        emailBody: result.body,
        followUps: JSON.stringify({
          followUp1: result.followUp1,
          followUp2: result.followUp2,
          breakup: result.breakup,
          linkedInMessage: result.linkedInMessage,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: { ...result, campaignId: campaign.id },
    });
  } catch (error) {
    if (isInvalidOriginError(error)) {
      return NextResponse.json({ error: "That request came from an unexpected origin." }, { status: 403 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Outreach error:", error);
    return NextResponse.json({ error: "Outreach generation failed" }, { status: 500 });
  }
}
