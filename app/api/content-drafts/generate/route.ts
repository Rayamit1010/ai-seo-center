import { NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { checkRateLimit } from "@/lib/server/rate-limiter";
import { ok, fail } from "@/lib/server/response";
import { prisma } from "@/lib/db";
import {
  ARTICLE_SYSTEM_PROMPT,
  buildArticlePrompt,
  type ArticleOutput,
} from "@/lib/prompts/article-writer";

export const dynamic = "force-dynamic";

const schema = z.object({
  keyword: z.string().min(1).max(200),
  briefId: z.string().optional(),
  tone: z.enum(["professional", "conversational", "educational", "persuasive"]).default("professional"),
});

export async function POST(req: Request) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();

    if (!(await checkRateLimit(`article:${userId}`, 5, 3_600_000))) {
      return fail("Rate limit: max 5 articles per hour", 429);
    }

    const body = await req.json();
    const data = schema.parse(body);

    let outline = "";
    let lsiKeywords: string[] = [];
    let targetAudience = "general audience";
    let wordCount = 1800;

    if (data.briefId) {
      const brief = await prisma.contentBrief.findUnique({
        where: { id: data.briefId, userId },
      });
      if (brief) {
        try {
          const parsed = JSON.parse(brief.brief) as {
            outline?: Array<{ h2: string; description: string }>;
            lsiKeywords?: string[];
            targetAudience?: string;
            wordCount?: number;
          };
          outline = (parsed.outline ?? [])
            .map((s) => `## ${s.h2}\n${s.description}`)
            .join("\n\n");
          lsiKeywords = parsed.lsiKeywords ?? [];
          targetAudience = parsed.targetAudience ?? targetAudience;
          wordCount = parsed.wordCount ?? wordCount;
        } catch {
          /* use defaults */
        }
      }
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      system: ARTICLE_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildArticlePrompt(
            data.keyword,
            data.tone,
            outline,
            lsiKeywords,
            targetAudience,
            wordCount
          ),
        },
      ],
    });

    const rawText = response.content[0]?.type === "text" ? response.content[0].text : "";
    let parsed: ArticleOutput;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText) as ArticleOutput;
    } catch {
      return fail("Article generation failed — AI returned unexpected format", 500);
    }

    const draft = await prisma.contentDraft.create({
      data: {
        userId,
        briefId: data.briefId ?? null,
        keyword: data.keyword,
        title: parsed.title,
        content: parsed.content,
        metaTitle: parsed.metaTitle,
        metaDesc: parsed.metaDescription,
        wordCount: parsed.wordCount,
        tone: data.tone,
        status: "draft",
      },
    });

    return ok({ draft, parsed });
  } catch (error) {
    if (isInvalidOriginError(error)) return fail("Forbidden", 403);
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    console.error("Article generate error:", error);
    return fail("Failed to generate article");
  }
}
