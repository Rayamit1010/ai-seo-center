import { NextResponse } from "next/server";
import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { fail } from "@/lib/server/response";
import { prisma } from "@/lib/db";
import type { BriefOutput } from "@/lib/prompts/brief-generator";

export const dynamic = "force-dynamic";

function toMarkdown(brief: BriefOutput, keyword: string): string {
  const lines: string[] = [
    `# Content Brief: ${keyword}`,
    "",
    `**Search Intent:** ${brief.searchIntent}`,
    `**Recommended Word Count:** ${brief.wordCount}`,
    `**Target Audience:** ${brief.targetAudience}`,
    `**Content Goal:** ${brief.contentGoal}`,
    "",
    `## H1 Suggestion`,
    `> ${brief.h1Suggestion}`,
    "",
    `## Meta Tags`,
    `**Title (${brief.metaTitle.length}/60):** ${brief.metaTitle}`,
    `**Description (${brief.metaDescription.length}/160):** ${brief.metaDescription}`,
    "",
    `## Content Outline`,
    "",
    ...brief.outline.flatMap((s) => [`### ${s.h2}`, `${s.description}`, `*~${s.suggestedWordCount} words*`, ""]),
    `## LSI Keywords`,
    brief.lsiKeywords.map((k) => `- ${k}`).join("\n"),
    "",
    `## Internal Link Opportunities`,
    brief.internalLinks.map((l) => `- ${l}`).join("\n"),
  ];
  return lines.join("\n");
}

function toHtml(brief: BriefOutput, keyword: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Content Brief: ${keyword}</title>
<style>body{font-family:system-ui,sans-serif;max-width:800px;margin:2rem auto;padding:0 1rem;color:#1a1a1a}h1{color:#6366f1}h2{border-bottom:2px solid #eee;padding-bottom:.5rem}blockquote{border-left:4px solid #6366f1;padding-left:1rem;color:#444}ul{line-height:2}</style></head><body>
<h1>Content Brief: ${keyword}</h1>
<p><strong>Search Intent:</strong> ${brief.searchIntent} | <strong>Word Count:</strong> ${brief.wordCount}</p>
<p><strong>Audience:</strong> ${brief.targetAudience}</p>
<p><strong>Goal:</strong> ${brief.contentGoal}</p>
<h2>H1 Suggestion</h2><blockquote>${brief.h1Suggestion}</blockquote>
<h2>Meta Tags</h2>
<p><strong>Title:</strong> ${brief.metaTitle}</p>
<p><strong>Description:</strong> ${brief.metaDescription}</p>
<h2>Content Outline</h2>
${brief.outline.map((s) => `<h3>${s.h2}</h3><p>${s.description}</p><p><em>~${s.suggestedWordCount} words</em></p>`).join("")}
<h2>LSI Keywords</h2><ul>${brief.lsiKeywords.map((k) => `<li>${k}</li>`).join("")}</ul>
<h2>Internal Links</h2><ul>${brief.internalLinks.map((l) => `<li>${l}</li>`).join("")}</ul>
</body></html>`;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getRequiredUserId();
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") ?? "markdown";

    const record = await prisma.contentBrief.findFirst({ where: { id, userId } });
    if (!record) return fail("Brief not found", 404);

    const parsed = JSON.parse(record.brief) as BriefOutput;

    if (format === "json") {
      return NextResponse.json(parsed, {
        headers: { "Content-Disposition": `attachment; filename="brief-${id}.json"` },
      });
    }

    if (format === "html") {
      return new Response(toHtml(parsed, record.keyword), {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `attachment; filename="brief-${id}.html"`,
        },
      });
    }

    return new Response(toMarkdown(parsed, record.keyword), {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="brief-${id}.md"`,
      },
    });
  } catch (error) {
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    return fail("Export failed");
  }
}
