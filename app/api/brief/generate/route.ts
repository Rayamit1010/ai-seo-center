import { NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { ok, fail } from "@/lib/server/response";
import { prisma } from "@/lib/db";
import { BRIEF_SYSTEM_PROMPT, buildBriefPrompt, type BriefOutput } from "@/lib/prompts/brief-generator";

export const dynamic = "force-dynamic";

const schema = z.object({
  keyword: z.string().min(1).max(200),
  targetUrl: z.string().url().optional(),
  country: z.enum(["IN", "US", "GB", "AU", "CA"]).default("IN"),
});

const COUNTRY_GL: Record<string, string> = { IN: "in", US: "us", GB: "gb", AU: "au", CA: "ca" };

async function fetchSerpData(keyword: string, country: string): Promise<string> {
  const key = process.env.SERPAPI_KEY;
  if (!key) return "";
  try {
    const gl = COUNTRY_GL[country] ?? "in";
    const url = `https://serpapi.com/search?q=${encodeURIComponent(keyword)}&gl=${gl}&hl=en&num=5&api_key=${key}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return "";
    const data = (await res.json()) as { organic_results?: Array<{ title?: string; link?: string; snippet?: string }> };
    const results = data.organic_results ?? [];
    return results
      .slice(0, 5)
      .map((r, i) => `${i + 1}. ${r.title ?? ""}\n${r.link ?? ""}\n${r.snippet ?? ""}`)
      .join("\n\n");
  } catch {
    return "";
  }
}

export async function POST(req: Request) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();

    if (!(await checkRateLimit(`brief:${userId}`, 10, 3_600_000))) {
      return fail("Rate limit: max 10 briefs per hour", 429);
    }

    const body = await req.json();
    const data = schema.parse(body);

    const serpData = await fetchSerpData(data.keyword, data.country);

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250514",
      max_tokens: 2000,
      system: BRIEF_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildBriefPrompt(data.keyword, data.country, serpData, "") }],
    });

    const rawText = response.content[0]?.type === "text" ? response.content[0].text : "";
    let parsed: BriefOutput;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText) as BriefOutput;
    } catch {
      return fail("Brief generation failed — AI returned unexpected format", 500);
    }

    const brief = await prisma.contentBrief.create({
      data: {
        userId,
        keyword: data.keyword,
        targetUrl: data.targetUrl,
        country: data.country,
        searchIntent: parsed.searchIntent,
        wordCount: parsed.wordCount,
        brief: JSON.stringify(parsed),
        outline: JSON.stringify(parsed.outline),
        lsiKeywords: JSON.stringify(parsed.lsiKeywords),
        status: "draft",
      },
    });

    return ok({ brief, parsed });
  } catch (error) {
    if (isInvalidOriginError(error)) return fail("Forbidden", 403);
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    console.error("Brief generate error:", error);
    return fail("Failed to generate brief");
  }
}
