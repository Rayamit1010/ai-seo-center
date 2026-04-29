import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { callClaudeJSON } from "@/lib/anthropic";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import {
  buildAuthorityRoadmapPrompt,
  buildPRCampaignPrompt,
  buildFounderBrandPrompt,
} from "@/lib/prompts/authority";

const schema = z.object({
  action: z.enum(["roadmap", "pr_campaign", "founder_brand"]),
  // Roadmap fields
  currentDR: z.number().optional(),
  monthlyTraffic: z.number().optional(),
  revenueGoal: z.string().optional(),
  teamSize: z.number().optional(),
  // PR Campaign fields
  industry: z.string().optional(),
  targetAudience: z.string().optional(),
  quarter: z.string().optional(),
  // Founder Brand fields
  founderName: z.string().optional(),
  expertiseAreas: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    assertTrustedOrigin(req);
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = schema.parse(body);

    if (data.action === "roadmap") {
      const { system, user } = buildAuthorityRoadmapPrompt({
        currentDR: data.currentDR ?? 10,
        monthlyTraffic: data.monthlyTraffic ?? 1000,
        revenueGoal: data.revenueGoal ?? "$100,000",
        teamSize: data.teamSize ?? 3,
      });
      const result = await callClaudeJSON(system, user, 8192, { userId, task: "authority-roadmap" });
      return NextResponse.json({ success: true, data: result });
    }

    if (data.action === "pr_campaign") {
      const { system, user } = buildPRCampaignPrompt({
        industry: data.industry ?? "Technology",
        targetAudience: data.targetAudience ?? "B2B decision makers",
        quarter: data.quarter ?? "Q1",
      });
      const result = await callClaudeJSON(system, user, 8192, { userId, task: "authority-pr" });
      return NextResponse.json({ success: true, data: result });
    }

    if (data.action === "founder_brand") {
      const { system, user } = buildFounderBrandPrompt({
        founderName: data.founderName ?? "Founder",
        expertiseAreas: data.expertiseAreas ?? "SEO, AI, SaaS",
        targetAudience: data.targetAudience ?? "Tech startups and SMEs",
      });
      const result = await callClaudeJSON(system, user, 8192, { userId, task: "authority-founder" });
      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    if (isInvalidOriginError(error)) {
      return NextResponse.json({ error: "That request came from an unexpected origin." }, { status: 403 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Authority error:", error);
    return NextResponse.json({ error: "Authority analysis failed" }, { status: 500 });
  }
}
