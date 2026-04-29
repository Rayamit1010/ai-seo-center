import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { callClaudeJSON } from "@/lib/anthropic";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { buildKeywordPrompt } from "@/lib/prompts/keywords";
import type { KeywordResearchResult } from "@/types";

const keywordSchema = z.object({
  seedKeyword: z.string().min(1, "Seed keyword is required"),
  targetCountry: z.string().min(1),
  industry: z.string().min(1),
  targetAudience: z.string().min(1),
  competitorDomains: z.string().optional(),
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
    const data = keywordSchema.parse(body);

    const { system, user } = buildKeywordPrompt(data);
    const result = await callClaudeJSON<KeywordResearchResult>(system, user, 8192, {
      userId,
      task: "keywords",
    });

    // Save to database
    await prisma.keywordResearch.create({
      data: {
        userId,
        seedKeyword: data.seedKeyword,
        targetCountry: data.targetCountry,
        industry: data.industry,
        results: JSON.stringify(result),
      },
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (isInvalidOriginError(error)) {
      return NextResponse.json({ error: "That request came from an unexpected origin." }, { status: 403 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Keyword research error:", error);
    return NextResponse.json({ error: "Keyword research failed" }, { status: 500 });
  }
}
