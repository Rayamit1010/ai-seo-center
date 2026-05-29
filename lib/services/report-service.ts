import { prisma } from "@/lib/db";
import { buildReportDocument, parseReportContent, type ReportDocument } from "@/lib/reports";
import { parseStoredJson } from "@/lib/server/response";
import { getExternalDataSnapshot } from "@/lib/services/external-data-service";
import { resolveProjectProfileByUrl } from "@/lib/services/project-profile-service";
import { extractDomain } from "@/lib/utils";

export async function listReports(userId: string, limit = 50, cursor?: string) {
  const reports = await prisma.report.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    // Omit 'content' from list — it can be megabytes; load it in the detail endpoint
    select: {
      id: true,
      title: true,
      type: true,
      auditId: true,
      createdAt: true,
    },
  });

  const hasMore = reports.length > limit;
  const rows = hasMore ? reports.slice(0, limit) : reports;
  return { rows, nextCursor: hasMore ? rows[rows.length - 1].id : null, hasMore };
}

export async function createReport(params: {
  userId: string;
  title: string;
  type: string;
  content: Record<string, unknown>;
  auditId?: string;
}) {
  return prisma.report.create({
    data: {
      userId: params.userId,
      title: params.title,
      type: params.type,
      content: JSON.stringify(params.content),
      auditId: params.auditId || null,
    },
  });
}

export async function createGeneratedReportFromAudit(params: {
  userId: string;
  auditId: string;
  clientName?: string;
  projectName?: string;
  recipientEmail?: string;
  title?: string;
  type?: string;
}) {
  const audit = await prisma.audit.findFirst({
    where: {
      id: params.auditId,
      userId: params.userId,
      status: "COMPLETE",
    },
    select: {
      id: true,
      url: true,
      title: true,
      summary: true,
      createdAt: true,
      scores: true,
      onPage: true,
      technical: true,
      offPage: true,
      keywords: true,
      checklist: true,
    },
  });

  if (!audit) {
    return null;
  }

  const domain = extractDomain(audit.url);
  const previousAudits = await prisma.audit.findMany({
    where: {
      userId: params.userId,
      status: "COMPLETE",
      id: { not: audit.id },
      createdAt: { lt: audit.createdAt },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      url: true,
      title: true,
      createdAt: true,
      scores: true,
    },
    take: 12,
  });

  const previousAudit = previousAudits.find((item) => extractDomain(item.url) === domain);
  const projectProfile = await resolveProjectProfileByUrl(params.userId, audit.url);
  const externalData = await getExternalDataSnapshot(projectProfile);

  const comparablePreviousAudit =
    previousAudit
      ? {
          title: previousAudit.title,
          createdAt: previousAudit.createdAt,
          scores: parseStoredJson(previousAudit.scores, null),
        }
      : null;

  const document = buildReportDocument(
    {
      id: audit.id,
      url: audit.url,
      title: audit.title,
      summary: audit.summary,
      createdAt: audit.createdAt,
      scores: parseStoredJson(audit.scores, null),
      onPage: parseStoredJson(audit.onPage, null),
      technical: parseStoredJson(audit.technical, null),
      offPage: parseStoredJson(audit.offPage, null),
      keywords: parseStoredJson(audit.keywords, null),
      checklist: parseStoredJson(audit.checklist, null),
    },
    {
      clientName: params.clientName,
      projectName: params.projectName,
      recipientEmail: params.recipientEmail,
      title: params.title,
      previousAudit: comparablePreviousAudit,
      externalData,
    }
  );

  const report = await prisma.report.create({
    data: {
      userId: params.userId,
      title: params.title?.trim() || document.title,
      type: params.type || document.type,
      content: JSON.stringify(document),
      auditId: audit.id,
    },
    select: {
      id: true,
      title: true,
      type: true,
      auditId: true,
      content: true,
      createdAt: true,
    },
  });

  return {
    ...report,
    content: parseReportContent(report.content),
  };
}

export async function deleteReport(userId: string, id: string) {
  const report = await prisma.report.findFirst({
    where: { id, userId },
    select: { id: true },
  });

  if (!report) {
    return null;
  }

  await prisma.report.delete({ where: { id } });
  return report;
}

export async function updateReportDocument(params: {
  userId: string;
  id: string;
  updates: {
    title?: string;
    clientName?: string;
    projectName?: string;
    recipientEmail?: string;
    status?: ReportDocument["status"];
    branding?: Partial<ReportDocument["branding"]>;
    sentAt?: string | null;
  };
}) {
  const report = await prisma.report.findFirst({
    where: { id: params.id, userId: params.userId },
    select: {
      id: true,
      title: true,
      type: true,
      auditId: true,
      content: true,
      createdAt: true,
    },
  });

  if (!report) {
    return null;
  }

  const content = parseReportContent(report.content);
  if (!content) {
    return null;
  }

  const nextContent: ReportDocument = {
    ...content,
    title: params.updates.title?.trim() || content.title,
    clientName: params.updates.clientName?.trim() ?? content.clientName,
    projectName: params.updates.projectName?.trim() ?? content.projectName,
    recipientEmail: params.updates.recipientEmail?.trim() ?? content.recipientEmail,
    status: params.updates.status ?? content.status,
    branding: {
      accent: params.updates.branding?.accent || content.branding.accent,
      agencyLabel: params.updates.branding?.agencyLabel || content.branding.agencyLabel,
      footerNote: params.updates.branding?.footerNote || content.branding.footerNote,
    },
    delivery: {
      lastUpdatedAt: new Date().toISOString(),
      sentAt: params.updates.sentAt === undefined ? content.delivery.sentAt : params.updates.sentAt,
    },
  };

  const updated = await prisma.report.update({
    where: { id: report.id },
    data: {
      title: nextContent.title,
      content: JSON.stringify(nextContent),
    },
    select: {
      id: true,
      title: true,
      type: true,
      auditId: true,
      content: true,
      createdAt: true,
    },
  });

  return {
    ...updated,
    content: parseReportContent(updated.content),
  };
}
