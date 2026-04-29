import { Resend } from "resend";
import { prisma } from "@/lib/db";
import { buildReportDocument, parseReportContent, reportDocumentToHtml, type ReportDocument } from "@/lib/reports";
import { computeNextScheduledRun } from "@/lib/scheduling";
import { parseStoredJson } from "@/lib/server/response";
import { getExternalDataSnapshot } from "@/lib/services/external-data-service";
import { resolveProjectProfileByUrl } from "@/lib/services/project-profile-service";
import { extractDomain } from "@/lib/utils";

const REPORT_SCHEDULE_LEASE_MS = 15 * 60 * 1000;

function getReportsFromEmail() {
  return process.env.REPORTS_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || "SEO Reports <onboarding@resend.dev>";
}

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Report email delivery is not configured yet. Add RESEND_API_KEY first.");
  }
  return new Resend(apiKey);
}

function getNow() {
  return new Date();
}

export function computeNextScheduleRun(input: {
  frequency: "daily" | "weekly" | "monthly";
  weekday?: number | null;
  monthDay?: number | null;
  hour: number;
  minute: number;
  timezone?: string;
  from?: Date;
}) {
  return computeNextScheduledRun({
    frequency: input.frequency,
    weekday: input.weekday,
    monthDay: input.monthDay,
    hour: input.hour,
    minute: input.minute,
    timezone: input.timezone,
    from: input.from || getNow(),
  });
}

async function getLatestComparableAudit(userId: string, targetUrl: string, auditId?: string | null) {
  const targetDomain = extractDomain(targetUrl);
  const audits = await prisma.audit.findMany({
    where: {
      userId,
      status: "COMPLETE",
    },
    orderBy: { createdAt: "desc" },
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
    take: 25,
  });

  const selectedAudit =
    (auditId ? audits.find((audit) => audit.id === auditId) : null) ||
    audits.find((audit) => extractDomain(audit.url) === targetDomain) ||
    null;

  if (!selectedAudit) {
    return null;
  }

  const previousAudit = audits.find(
    (audit) => audit.id !== selectedAudit.id && extractDomain(audit.url) === targetDomain && audit.createdAt < selectedAudit.createdAt
  );

  return {
    audit: selectedAudit,
    previousAudit,
  };
}

export async function listReportSchedules(userId: string) {
  return prisma.reportSchedule.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createReportSchedule(params: {
  userId: string;
  auditId?: string;
  targetUrl: string;
  clientName: string;
  projectName: string;
  recipientEmail: string;
  frequency: "daily" | "weekly" | "monthly";
  weekday?: number | null;
  monthDay?: number | null;
  hour: number;
  minute: number;
  timezone?: string;
  deliveryMode?: "email" | "draft";
}) {
  const nextRunAt = computeNextScheduleRun({
    frequency: params.frequency,
    weekday: params.weekday,
    monthDay: params.monthDay,
    hour: params.hour,
    minute: params.minute,
    timezone: params.timezone,
  });

  return prisma.reportSchedule.create({
    data: {
      userId: params.userId,
      auditId: params.auditId || null,
      targetUrl: params.targetUrl,
      clientName: params.clientName,
      projectName: params.projectName,
      recipientEmail: params.recipientEmail,
      frequency: params.frequency,
      weekday: params.weekday ?? null,
      monthDay: params.monthDay ?? null,
      hour: params.hour,
      minute: params.minute,
      timezone: params.timezone || "UTC",
      deliveryMode: params.deliveryMode || "email",
      nextRunAt,
    },
  });
}

export async function updateReportSchedule(params: {
  userId: string;
  id: string;
  updates: Partial<{
    clientName: string;
    projectName: string;
    recipientEmail: string;
    frequency: "daily" | "weekly" | "monthly";
    weekday: number | null;
    monthDay: number | null;
    hour: number;
    minute: number;
    timezone: string;
    deliveryMode: "email" | "draft";
    isActive: boolean;
  }>;
}) {
  const existing = await prisma.reportSchedule.findFirst({
    where: { id: params.id, userId: params.userId },
  });
  if (!existing) {
    return null;
  }

  const frequency = params.updates.frequency || (existing.frequency as "daily" | "weekly" | "monthly");
  const weekday = params.updates.weekday === undefined ? existing.weekday : params.updates.weekday;
  const monthDay = params.updates.monthDay === undefined ? existing.monthDay : params.updates.monthDay;
  const hour = params.updates.hour ?? existing.hour;
  const minute = params.updates.minute ?? existing.minute;

  const nextRunAt = computeNextScheduleRun({
    frequency,
    weekday,
    monthDay,
    hour,
    minute,
    timezone: params.updates.timezone ?? existing.timezone,
  });

  return prisma.reportSchedule.update({
    where: { id: existing.id },
    data: {
      clientName: params.updates.clientName ?? existing.clientName,
      projectName: params.updates.projectName ?? existing.projectName,
      recipientEmail: params.updates.recipientEmail ?? existing.recipientEmail,
      frequency,
      weekday,
      monthDay,
      hour,
      minute,
      timezone: params.updates.timezone ?? existing.timezone,
      deliveryMode: params.updates.deliveryMode ?? (existing.deliveryMode as "email" | "draft"),
      isActive: params.updates.isActive ?? existing.isActive,
      nextRunAt,
      leaseUntil: null,
      processingRunAt: null,
    },
  });
}

export async function deleteReportSchedule(userId: string, id: string) {
  const schedule = await prisma.reportSchedule.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!schedule) {
    return null;
  }
  await prisma.reportSchedule.delete({ where: { id } });
  return schedule;
}

export async function listReportDeliveryLogs(userId: string) {
  return prisma.reportDeliveryLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 25,
  });
}

export async function generateScheduledReport(params: {
  userId: string;
  auditId?: string | null;
  targetUrl: string;
  clientName: string;
  projectName: string;
  recipientEmail: string;
}) {
  const comparable = await getLatestComparableAudit(params.userId, params.targetUrl, params.auditId);
  if (!comparable) {
    throw new Error("No completed audit is available yet for this schedule.");
  }

  const projectProfile = await resolveProjectProfileByUrl(params.userId, comparable.audit.url);
  const externalData = await getExternalDataSnapshot(projectProfile);

  const document = buildReportDocument(
    {
      id: comparable.audit.id,
      url: comparable.audit.url,
      title: comparable.audit.title,
      summary: comparable.audit.summary,
      createdAt: comparable.audit.createdAt,
      scores: parseStoredJson(comparable.audit.scores, null),
      onPage: parseStoredJson(comparable.audit.onPage, null),
      technical: parseStoredJson(comparable.audit.technical, null),
      offPage: parseStoredJson(comparable.audit.offPage, null),
      keywords: parseStoredJson(comparable.audit.keywords, null),
      checklist: parseStoredJson(comparable.audit.checklist, null),
    },
    {
      clientName: params.clientName,
      projectName: params.projectName,
      recipientEmail: params.recipientEmail,
      previousAudit: comparable.previousAudit
        ? {
            title: comparable.previousAudit.title,
            createdAt: comparable.previousAudit.createdAt,
            scores: parseStoredJson(comparable.previousAudit.scores, null),
          }
        : null,
      status: params.recipientEmail ? "ready_to_send" : "draft",
      externalData,
    }
  );

  const report = await prisma.report.create({
    data: {
      userId: params.userId,
      title: document.title,
      type: document.type,
      content: JSON.stringify(document),
      auditId: comparable.audit.id,
    },
  });

  return {
    reportId: report.id,
    document,
  };
}

export async function sendReportEmail(params: {
  userId: string;
  reportId: string;
  recipientEmail?: string;
}) {
  const report = await prisma.report.findFirst({
    where: { id: params.reportId, userId: params.userId },
    select: {
      id: true,
      title: true,
      content: true,
    },
  });

  if (!report) {
    throw new Error("The report could not be found.");
  }

  const content = parseReportContent(report.content);
  if (!content) {
    throw new Error("The saved report content is not valid anymore.");
  }

  const recipientEmail = params.recipientEmail?.trim() || content.recipientEmail;
  if (!recipientEmail) {
    throw new Error("Add a recipient email before sending this report.");
  }

  const queuedLog = await prisma.reportDeliveryLog.create({
    data: {
      userId: params.userId,
      reportId: report.id,
      recipientEmail,
      subject: content.emailSubject,
      status: "queued",
      provider: "resend",
    },
  });

  try {
    const resend = getResendClient();
    const html = reportDocumentToHtml(content).replace(
      "</body>",
      `<p style="font-family:Arial,sans-serif;color:#475569;margin-top:24px;white-space:pre-line;">${escapeHtml(
        content.emailBody
      ).replace(/\n/g, "<br />")}</p></body>`
    );

    await resend.emails.send({
      from: getReportsFromEmail(),
      to: recipientEmail,
      subject: content.emailSubject,
      html,
      text: content.emailBody,
    });

    const sentAt = new Date().toISOString();

    const nextContent: ReportDocument = {
      ...content,
      status: "sent",
      recipientEmail,
      delivery: {
        lastUpdatedAt: sentAt,
        sentAt,
      },
    };

    await prisma.$transaction([
      prisma.report.update({
        where: { id: report.id },
        data: {
          content: JSON.stringify(nextContent),
          title: nextContent.title,
        },
      }),
      prisma.reportDeliveryLog.update({
        where: { id: queuedLog.id },
        data: {
          status: "sent",
          sentAt,
        },
      }),
    ]);

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email delivery failed.";
    await prisma.reportDeliveryLog.update({
      where: { id: queuedLog.id },
      data: {
        status: "failed",
        errorMessage: message,
      },
    });
    throw error;
  }
}

export async function claimDueReportSchedules(now = getNow(), limit = 20) {
  const dueSchedules = await prisma.reportSchedule.findMany({
    where: {
      isActive: true,
      nextRunAt: { lte: now },
      OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }],
    },
    orderBy: { nextRunAt: "asc" },
    take: limit * 3,
  });

  const claimed = [];

  for (const schedule of dueSchedules) {
    if (claimed.length >= limit) {
      break;
    }

    const leaseUntil = new Date(now.getTime() + REPORT_SCHEDULE_LEASE_MS);
    const nextRunAt = computeNextScheduleRun({
      frequency: schedule.frequency as "daily" | "weekly" | "monthly",
      weekday: schedule.weekday,
      monthDay: schedule.monthDay,
      hour: schedule.hour,
      minute: schedule.minute,
      timezone: schedule.timezone,
      from: now,
    });
    const claim = await prisma.reportSchedule.updateMany({
      where: {
        id: schedule.id,
        isActive: true,
        nextRunAt: schedule.nextRunAt,
        OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }],
      },
      data: {
        leaseUntil,
        processingRunAt: schedule.nextRunAt,
        nextRunAt,
      },
    });

    if (claim.count === 1) {
      claimed.push({
        ...schedule,
        nextRunAt,
        leaseUntil,
        processingRunAt: schedule.nextRunAt,
      });
    }
  }

  return claimed;
}

export async function enqueueDueReportSchedules() {
  return claimDueReportSchedules();
}

export async function markScheduleRunComplete(scheduleId: string) {
  await prisma.reportSchedule.update({
    where: { id: scheduleId },
    data: {
      lastRunAt: getNow(),
      leaseUntil: null,
      processingRunAt: null,
    },
  });
}

export async function markScheduleRunFailed(
  scheduleId: string,
  options: { retryCurrentRun?: boolean } = {}
) {
  const schedule = await prisma.reportSchedule.findUnique({
    where: { id: scheduleId },
    select: {
      processingRunAt: true,
    },
  });

  await prisma.reportSchedule.update({
    where: { id: scheduleId },
    data: {
      nextRunAt: options.retryCurrentRun ? schedule?.processingRunAt || undefined : undefined,
      leaseUntil: null,
      processingRunAt: null,
    },
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
