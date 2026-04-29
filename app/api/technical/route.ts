import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { scrapeUrl } from "@/lib/scraper";
import { getPageSpeedData } from "@/lib/pagespeed";
import { buildAuditContext } from "@/lib/seo-analyzer";
import { callClaudeJSON } from "@/lib/anthropic";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { buildTechnicalPrompt } from "@/lib/prompts/technical";
import type { TechnicalSEOResult } from "@/types";

const schema = z.object({
  url: z.string().url("Invalid URL"),
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
    const { url } = schema.parse(body);

    // Run scraping and PageSpeed in parallel
    const [scrapeResult, psResult] = await Promise.allSettled([
      scrapeUrl(url),
      getPageSpeedData(url),
    ]);

    if (scrapeResult.status === "rejected") {
      return NextResponse.json(
        { error: `Failed to scrape: ${scrapeResult.reason}` },
        { status: 500 }
      );
    }

    const scrapedData = scrapeResult.value;
    const pagespeedData = psResult.status === "fulfilled" ? psResult.value : null;

    const scrapedDataJson = buildAuditContext(scrapedData);
    const pagespeedDataJson = pagespeedData ? JSON.stringify(pagespeedData, null, 2) : null;

    const { system, user } = buildTechnicalPrompt(scrapedDataJson, pagespeedDataJson);
    const result = await callClaudeJSON<TechnicalSEOResult>(system, user, 8192, {
      userId,
      task: "technical",
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (isInvalidOriginError(error)) {
      return NextResponse.json({ error: "That request came from an unexpected origin." }, { status: 403 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Technical SEO error:", error);
    return NextResponse.json({ error: "Technical analysis failed" }, { status: 500 });
  }
}
