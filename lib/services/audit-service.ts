import { prisma } from "@/lib/db";
import { callClaudeJSON } from "@/lib/anthropic";
import { getPageSpeedData } from "@/lib/pagespeed";
import { buildAuditPrompt } from "@/lib/prompts/audit";
import { buildAuditContext } from "@/lib/seo-analyzer";
import { parseHtml, scrapeUrl } from "@/lib/scraper";
import { parseStoredJson } from "@/lib/server/response";
import type { FullAuditResult, ScrapedData } from "@/types";

export async function createAuditJob(params: {
  userId: string;
  url?: string;
  htmlContent?: string;
  inputType: "url" | "paste";
}) {
  return prisma.audit.create({
    data: {
      userId: params.userId,
      url: params.url || "paste://input",
      inputType: params.inputType,
      rawHtml: params.htmlContent || null,
      status: "SCRAPING",
    },
  });
}

export async function processAuditJob(
  auditId: string,
  userId: string,
  data: {
    url?: string;
    htmlContent?: string;
    inputType: "url" | "paste";
  }
) {
  let scrapedData: ScrapedData;
  let pagespeedData: unknown = null;

  if (data.inputType === "url" && data.url) {
    const [scrapeResult, pageSpeedResult] = await Promise.allSettled([
      scrapeUrl(data.url),
      getPageSpeedData(data.url),
    ]);

    if (scrapeResult.status === "rejected") {
      throw new Error(`Scraping failed: ${String(scrapeResult.reason)}`);
    }

    scrapedData = scrapeResult.value;

    if (pageSpeedResult.status === "fulfilled") {
      pagespeedData = pageSpeedResult.value;
    }
  } else if (data.htmlContent) {
    scrapedData = parseHtml(data.htmlContent, "paste://input");
  } else {
    throw new Error("No data to analyze");
  }

  await prisma.audit.update({
    where: { id: auditId },
    data: {
      title: scrapedData.title,
      scrapedData: JSON.stringify(scrapedData),
      pagespeedData: pagespeedData ? JSON.stringify(pagespeedData) : null,
      status: "ANALYZING",
    },
  });

  const scrapedDataJson = buildAuditContext(scrapedData);
  const pagespeedDataJson = pagespeedData
    ? JSON.stringify(pagespeedData, null, 2)
    : null;
  const { system, user } = buildAuditPrompt(
    scrapedDataJson,
    pagespeedDataJson
  );

  const result = await callClaudeJSON<FullAuditResult>(system, user, 8192, {
    userId,
    task: "audit",
  });

  await prisma.audit.update({
    where: { id: auditId },
    data: {
      scores: JSON.stringify(result.scores),
      onPage: JSON.stringify(result.onPage),
      technical: JSON.stringify(result.technical),
      offPage: JSON.stringify(result.offPage),
      keywords: JSON.stringify(result.keywords),
      checklist: JSON.stringify(result.checklist),
      summary: result.summary,
      status: "COMPLETE",
    },
  });
}

export async function markAuditFailed(auditId: string) {
  await prisma.audit.update({
    where: { id: auditId },
    data: {
      status: "FAILED",
    },
  });
}

export async function listAudits(userId: string, limit = 50, cursor?: string) {
  const audits = await prisma.audit.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      url: true,
      title: true,
      status: true,
      scores: true,
      summary: true,
      inputType: true,
      createdAt: true,
    },
  });

  const hasMore = audits.length > limit;
  const rows = hasMore ? audits.slice(0, limit) : audits;
  return {
    rows: rows.map((audit) => ({ ...audit, scores: parseStoredJson(audit.scores, null) })),
    nextCursor: hasMore ? rows[rows.length - 1].id : null,
    hasMore,
  };
}

export async function getAuditDetails(userId: string, id: string) {
  const audit = await prisma.audit.findFirst({
    where: { id, userId },
  });

  if (!audit) {
    return null;
  }

  return {
    ...audit,
    scrapedData: parseStoredJson(audit.scrapedData, null),
    pagespeedData: parseStoredJson(audit.pagespeedData, null),
    scores: parseStoredJson(audit.scores, null),
    onPage: parseStoredJson(audit.onPage, null),
    technical: parseStoredJson(audit.technical, null),
    offPage: parseStoredJson(audit.offPage, null),
    keywords: parseStoredJson(audit.keywords, null),
    checklist: parseStoredJson(audit.checklist, null),
  };
}

export async function deleteAudit(userId: string, id: string) {
  const audit = await prisma.audit.findFirst({
    where: { id, userId },
    select: { id: true },
  });

  if (!audit) {
    return null;
  }

  await prisma.audit.delete({
    where: { id },
  });

  return audit;
}
