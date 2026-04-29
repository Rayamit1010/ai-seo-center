import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { scrapeUrl, parseHtml } from "@/lib/scraper";
import { buildAuditContext } from "@/lib/seo-analyzer";
import { callClaudeJSON } from "@/lib/anthropic";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import {
  buildContentAnalysisPrompt,
  buildMetaTagPrompt,
  buildSchemaPrompt,
} from "@/lib/prompts/content";
import type { ContentAnalysisResult, MetaTagResult, SchemaGeneratorResult } from "@/types";

const schema = z.object({
  action: z.enum(["analyze", "meta_tags", "schema"]),
  // Analyze fields
  url: z.string().url().optional(),
  html: z.string().optional(),
  // Meta tag fields
  topic: z.string().optional(),
  targetKeyword: z.string().optional(),
  targetAudience: z.string().optional(),
  tone: z.string().optional(),
  // Schema fields
  pageType: z.string().optional(),
  details: z.record(z.string()).optional(),
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

    if (data.action === "analyze") {
      let scrapedData;
      if (data.url) {
        scrapedData = await scrapeUrl(data.url);
      } else if (data.html) {
        scrapedData = parseHtml(data.html, "paste://input");
      } else {
        return NextResponse.json({ error: "URL or HTML required" }, { status: 400 });
      }

      const context = buildAuditContext(scrapedData);
      const { system, user } = buildContentAnalysisPrompt(context);
      const result = await callClaudeJSON<ContentAnalysisResult>(system, user, 8192, {
        userId,
        task: "content-analyze",
      });
      return NextResponse.json({ success: true, data: result });
    }

    if (data.action === "meta_tags") {
      if (!data.topic || !data.targetKeyword) {
        return NextResponse.json({ error: "Topic and target keyword required" }, { status: 400 });
      }
      const { system, user } = buildMetaTagPrompt({
        topic: data.topic,
        targetKeyword: data.targetKeyword,
        targetAudience: data.targetAudience ?? "B2B tech decision makers",
        tone: data.tone ?? "professional",
      });
      const result = await callClaudeJSON<MetaTagResult>(system, user, 4096, {
        userId,
        task: "content-meta",
      });
      return NextResponse.json({ success: true, data: result });
    }

    if (data.action === "schema") {
      if (!data.pageType) {
        return NextResponse.json({ error: "Page type required" }, { status: 400 });
      }
      const { system, user } = buildSchemaPrompt({
        pageType: data.pageType,
        details: data.details ?? {},
      });
      const result = await callClaudeJSON<SchemaGeneratorResult>(system, user, 4096, {
        userId,
        task: "content-schema",
      });
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
    console.error("Content analysis error:", error);
    return NextResponse.json({ error: "Content analysis failed" }, { status: 500 });
  }
}
