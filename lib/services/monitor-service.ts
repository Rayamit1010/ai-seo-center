import { prisma } from "@/lib/db";
import { parseStoredJson } from "@/lib/server/response";
import { enqueueBackgroundJob } from "@/lib/server/job-queue";
import { checkFeatureLimit } from "@/lib/server/subscription-guard";
import { getResendClient } from "@/lib/resend";
import type { AuditChecklist, AuditScores } from "@/types";

export class MonitorLimitError extends Error {
  constructor(public current: number, public limit: number) {
    super("Site monitor limit reached");
    this.name = "MonitorLimitError";
  }
}

const FREQUENCY_MS: Record<string, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

const SEVERITY_ORDER: Array<keyof AuditChecklist> = ["critical", "high", "medium", "longTerm"];

export async function listMonitors(userId: string) {
  const monitors = await prisma.siteMonitor.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      audits: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, status: true, scores: true, createdAt: true },
      },
      _count: { select: { tasks: { where: { status: "open" } } } },
    },
  });

  return monitors.map((monitor) => ({
    id: monitor.id,
    name: monitor.name,
    url: monitor.url,
    frequency: monitor.frequency,
    isActive: monitor.isActive,
    nextRunAt: monitor.nextRunAt,
    lastRunAt: monitor.lastRunAt,
    latestAudit: monitor.audits[0]
      ? {
          id: monitor.audits[0].id,
          status: monitor.audits[0].status,
          scores: parseStoredJson<AuditScores | null>(monitor.audits[0].scores, null),
          createdAt: monitor.audits[0].createdAt,
        }
      : null,
    openTaskCount: monitor._count.tasks,
  }));
}

export async function createMonitor(
  userId: string,
  params: { name: string; url: string; frequency: "daily" | "weekly" }
) {
  const limit = await checkFeatureLimit(userId, "monitors");
  if (!limit.allowed) {
    throw new MonitorLimitError(limit.current, limit.limit);
  }

  return prisma.siteMonitor.create({
    data: {
      userId,
      name: params.name,
      url: params.url,
      frequency: params.frequency,
      nextRunAt: new Date(),
    },
  });
}

export async function getMonitorDetails(userId: string, id: string) {
  const monitor = await prisma.siteMonitor.findFirst({
    where: { id, userId },
    include: {
      audits: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, status: true, scores: true, summary: true, createdAt: true },
      },
      tasks: true,
    },
  });

  if (!monitor) return null;

  const severityRank = (severity: string) => {
    const idx = SEVERITY_ORDER.indexOf(severity as keyof AuditChecklist);
    return idx === -1 ? SEVERITY_ORDER.length : idx;
  };

  return {
    ...monitor,
    audits: monitor.audits.map((audit) => ({
      ...audit,
      scores: parseStoredJson<AuditScores | null>(audit.scores, null),
    })),
    tasks: [...monitor.tasks].sort((a, b) => {
      if (a.status !== b.status) return a.status === "open" ? -1 : 1;
      return severityRank(a.severity) - severityRank(b.severity);
    }),
  };
}

export async function updateMonitor(
  userId: string,
  id: string,
  data: { name?: string; frequency?: "daily" | "weekly"; isActive?: boolean }
) {
  const monitor = await prisma.siteMonitor.findFirst({ where: { id, userId }, select: { id: true } });
  if (!monitor) return null;

  return prisma.siteMonitor.update({ where: { id }, data });
}

export async function deleteMonitor(userId: string, id: string) {
  const monitor = await prisma.siteMonitor.findFirst({ where: { id, userId }, select: { id: true } });
  if (!monitor) return null;

  await prisma.siteMonitor.delete({ where: { id } });
  return monitor;
}

export async function updateTaskStatus(
  userId: string,
  taskId: string,
  status: "open" | "resolved" | "dismissed"
) {
  const task = await prisma.seoTask.findFirst({ where: { id: taskId, userId } });
  if (!task) return null;

  return prisma.seoTask.update({
    where: { id: taskId },
    data: { status, resolvedAt: status === "open" ? null : new Date() },
  });
}

/** Claims due monitors and kicks off audit jobs for them. Called from the site-monitor cron. */
export async function runDueMonitors(limit = 20) {
  const now = new Date();
  const due = await prisma.siteMonitor.findMany({
    where: {
      isActive: true,
      nextRunAt: { lte: now },
      OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }],
    },
    take: limit,
  });

  let started = 0;

  for (const monitor of due) {
    const leaseUntil = new Date(now.getTime() + 30 * 60 * 1000);
    const claim = await prisma.siteMonitor.updateMany({
      where: { id: monitor.id, leaseUntil: monitor.leaseUntil },
      data: { leaseUntil },
    });
    if (claim.count !== 1) continue;

    try {
      const audit = await prisma.audit.create({
        data: {
          userId: monitor.userId,
          url: monitor.url,
          inputType: "url",
          status: "SCRAPING",
          monitorId: monitor.id,
        },
      });

      await enqueueBackgroundJob({
        name: "process-audit",
        payload: {
          auditId: audit.id,
          userId: monitor.userId,
          data: { url: monitor.url, inputType: "url" },
        },
      });

      const intervalMs = FREQUENCY_MS[monitor.frequency] ?? FREQUENCY_MS.weekly;
      await prisma.siteMonitor.update({
        where: { id: monitor.id },
        data: {
          lastRunAt: now,
          nextRunAt: new Date(now.getTime() + intervalMs),
          leaseUntil: null,
        },
      });
      started += 1;
    } catch (error) {
      console.error(`Failed to start monitor run for ${monitor.id}:`, error);
      await prisma.siteMonitor.update({ where: { id: monitor.id }, data: { leaseUntil: null } });
    }
  }

  return { claimed: due.length, started };
}

/**
 * Diffs a completed monitor-triggered audit's checklist against the monitor's
 * open SeoTasks: new findings become tasks, fixed findings are auto-resolved,
 * and previously-resolved findings that reappear are reopened.
 */
export async function syncTasksForAudit(auditId: string) {
  const audit = await prisma.audit.findUnique({
    where: { id: auditId },
    select: { id: true, userId: true, monitorId: true, checklist: true },
  });

  if (!audit?.monitorId || !audit.checklist) return;

  const checklist = parseStoredJson<AuditChecklist | null>(audit.checklist, null);
  if (!checklist) return;

  const seenActions = new Set<string>();

  for (const severity of SEVERITY_ORDER) {
    for (const item of checklist[severity] ?? []) {
      const action = item.action.slice(0, 500);
      seenActions.add(action);

      await prisma.seoTask.upsert({
        where: { monitorId_action: { monitorId: audit.monitorId, action } },
        update: {
          auditId: audit.id,
          severity,
          impact: item.impact,
          effort: item.effort,
          module: item.module,
          lastSeenAt: new Date(),
        },
        create: {
          userId: audit.userId,
          monitorId: audit.monitorId,
          auditId: audit.id,
          action,
          module: item.module,
          impact: item.impact,
          effort: item.effort,
          severity,
          status: "open",
        },
      });
    }
  }

  // Reopen previously-resolved findings that have reappeared
  if (seenActions.size > 0) {
    await prisma.seoTask.updateMany({
      where: { monitorId: audit.monitorId, action: { in: Array.from(seenActions) }, status: "resolved" },
      data: { status: "open", resolvedAt: null },
    });
  }

  // Auto-resolve open tasks whose finding no longer appears
  await prisma.seoTask.updateMany({
    where: { monitorId: audit.monitorId, status: "open", action: { notIn: Array.from(seenActions) } },
    data: { status: "resolved", resolvedAt: new Date() },
  });

  await maybeSendMonitorAlert(audit.monitorId, audit.id);
}

async function maybeSendMonitorAlert(monitorId: string, auditId: string) {
  const monitor = await prisma.siteMonitor.findUnique({
    where: { id: monitorId },
    include: {
      audits: {
        orderBy: { createdAt: "desc" },
        take: 2,
        select: { scores: true },
      },
    },
  });
  if (!monitor) return;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  if (monitor.lastAlertSentAt && monitor.lastAlertSentAt > sevenDaysAgo) return;

  const [latest, previous] = monitor.audits;
  const latestScores = parseStoredJson<AuditScores | null>(latest?.scores ?? null, null);
  const previousScores = previous ? parseStoredJson<AuditScores | null>(previous.scores, null) : null;
  const scoreDrop = previousScores && latestScores ? previousScores.overall - latestScores.overall : 0;

  const newCriticalTasks = await prisma.seoTask.count({
    where: { monitorId, auditId, severity: "critical", status: "open" },
  });

  if (newCriticalTasks === 0 && scoreDrop < 5) return;

  const user = await prisma.user.findUnique({ where: { id: monitor.userId }, select: { email: true, name: true } });
  if (!user?.email) return;

  try {
    const resend = getResendClient();
    const reasons: string[] = [];
    if (newCriticalTasks > 0) {
      reasons.push(`${newCriticalTasks} new critical issue${newCriticalTasks > 1 ? "s" : ""} found`);
    }
    if (scoreDrop >= 5) {
      reasons.push(`overall SEO score dropped by ${scoreDrop} points (${previousScores?.overall} → ${latestScores?.overall})`);
    }

    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "alerts@ai-seo-center.com",
      to: user.email,
      subject: `Site Health Alert: ${monitor.name}`,
      html: `
        <h2>Site Health Alert</h2>
        <p>Hi ${user.name ?? "there"},</p>
        <p>Your monitored site <strong>${monitor.name}</strong> (${monitor.url}) needs attention:</p>
        <ul>${reasons.map((r) => `<li>${r}</li>`).join("")}</ul>
        <p style="margin-top:16px">Log in to AI SEO Center to review the full task list and details.</p>
      `,
    });

    await prisma.siteMonitor.update({ where: { id: monitorId }, data: { lastAlertSentAt: new Date() } });
  } catch (error) {
    console.error("Failed to send site monitor alert email:", error);
  }
}
