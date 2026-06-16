import { prisma } from "@/lib/db";
import { getResendClient } from "@/lib/resend";

const LEASE_MS = 10 * 60 * 1000; // 10-minute lease to prevent double-processing

export type WorkflowType = "weekly-site-audit" | "rank-summary" | "backlink-health" | "citation-health";

export interface WorkflowConfig {
  recipientEmail: string;
  targetUrl?: string;        // for site-audit type
  projectName?: string;
}

function nextRunDate(frequency: string): Date {
  const now = new Date();
  if (frequency === "daily") {
    now.setDate(now.getDate() + 1);
    now.setHours(8, 0, 0, 0);
  } else if (frequency === "monthly") {
    now.setMonth(now.getMonth() + 1);
    now.setDate(1);
    now.setHours(8, 0, 0, 0);
  } else {
    // weekly
    now.setDate(now.getDate() + 7);
    now.setHours(8, 0, 0, 0);
  }
  return now;
}

export async function listWorkflows(userId: string) {
  return prisma.automationWorkflow.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createWorkflow(
  userId: string,
  data: { name: string; type: WorkflowType; config: WorkflowConfig; frequency?: string }
) {
  const frequency = data.frequency ?? "weekly";
  const firstRun = new Date();
  firstRun.setDate(firstRun.getDate() + 1);
  firstRun.setHours(8, 0, 0, 0);

  return prisma.automationWorkflow.create({
    data: {
      userId,
      name: data.name,
      type: data.type,
      configJson: JSON.stringify(data.config),
      frequency,
      nextRunAt: firstRun,
    },
  });
}

export async function toggleWorkflow(userId: string, id: string, enabled: boolean) {
  return prisma.automationWorkflow.updateMany({
    where: { id, userId },
    data: { enabled },
  });
}

export async function deleteWorkflow(userId: string, id: string) {
  return prisma.automationWorkflow.deleteMany({ where: { id, userId } });
}

export async function runDueAutomations(limit = 10) {
  const now = new Date();
  const due = await prisma.automationWorkflow.findMany({
    where: {
      enabled: true,
      nextRunAt: { lte: now },
      OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }],
    },
    take: limit,
  });

  let processed = 0;
  for (const wf of due) {
    // Acquire lease
    const leased = await prisma.automationWorkflow.updateMany({
      where: {
        id: wf.id,
        OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }],
      },
      data: { leaseUntil: new Date(Date.now() + LEASE_MS) },
    });
    if (!leased.count) continue;

    let status: "success" | "error" = "success";
    let summary = "";
    try {
      summary = await runWorkflow(wf.userId, wf.type as WorkflowType, JSON.parse(wf.configJson) as WorkflowConfig);
      processed++;
    } catch (err) {
      status = "error";
      summary = err instanceof Error ? err.message : "Unknown error";
      console.error(`Automation ${wf.id} failed:`, err);
    }

    await prisma.automationWorkflow.update({
      where: { id: wf.id },
      data: {
        lastRunAt: now,
        lastRunStatus: status,
        lastRunSummary: summary,
        nextRunAt: nextRunDate(wf.frequency),
        leaseUntil: null,
      },
    });
  }

  return { processed };
}

async function runWorkflow(userId: string, type: WorkflowType, config: WorkflowConfig): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
  const recipientEmail = config.recipientEmail || user?.email;
  if (!recipientEmail) throw new Error("No recipient email");

  switch (type) {
    case "rank-summary":
      return runRankSummary(userId, recipientEmail, user?.name ?? "there");
    case "backlink-health":
      return runBacklinkHealth(userId, recipientEmail, user?.name ?? "there");
    case "citation-health":
      return runCitationHealth(userId, recipientEmail, user?.name ?? "there");
    case "weekly-site-audit":
      return runSiteAuditSummary(userId, recipientEmail, user?.name ?? "there", config.targetUrl);
    default:
      throw new Error(`Unknown workflow type: ${type as string}`);
  }
}

async function runRankSummary(userId: string, to: string, name: string): Promise<string> {
  // Get latest rank history entry per keyword for this user
  const keywords = await prisma.trackedKeyword.findMany({
    where: { userId, isActive: true },
    take: 20,
    select: {
      keyword: true,
      rankHistory: {
        orderBy: { checkedAt: "desc" },
        take: 1,
        select: { position: true, previousPos: true, change: true },
      },
    },
  });

  if (!keywords.length) return "No keywords tracked";

  const improved = keywords.filter((k) => k.rankHistory[0]?.change && k.rankHistory[0].change > 0).length;
  const declined = keywords.filter((k) => k.rankHistory[0]?.change && k.rankHistory[0].change < 0).length;
  const top10 = keywords.filter((k) => k.rankHistory[0]?.position != null && k.rankHistory[0].position <= 10).length;

  const rows = keywords
    .slice(0, 10)
    .map((k) => {
      const h = k.rankHistory[0];
      const pos = h?.position ?? null;
      const change = h?.change ?? null;
      const arrow = change === null ? "" : change > 0 ? `↑${change}` : change < 0 ? `↓${Math.abs(change)}` : "→";
      return `<tr><td style="padding:4px 8px">${k.keyword}</td><td style="padding:4px 8px;text-align:center">${pos ?? "–"}</td><td style="padding:4px 8px;text-align:center;color:${change && change > 0 ? "green" : "red"}">${arrow}</td></tr>`;
    })
    .join("");

  await sendEmail(to, `Rank Tracking Summary — ${new Date().toLocaleDateString()}`, `
<h2>Rank Tracking Summary</h2>
<p>Hi ${name},</p>
<p>Here's your keyword ranking update:</p>
<ul>
  <li><strong>${improved}</strong> keywords improved</li>
  <li><strong>${declined}</strong> keywords declined</li>
  <li><strong>${top10}</strong> keywords in top 10</li>
</ul>
<table border="1" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:13px">
  <tr style="background:#f3f4f6"><th style="padding:6px 8px;text-align:left">Keyword</th><th style="padding:6px 8px">Position</th><th style="padding:6px 8px">Change</th></tr>
  ${rows}
</table>
`);

  return `Sent rank summary: ${improved} up, ${declined} down, ${top10} in top 10`;
}

async function runBacklinkHealth(userId: string, to: string, name: string): Promise<string> {
  const prospects = await prisma.backlinkProspect.findMany({
    where: { userId, linkAcquired: true, linkUrl: { not: null } },
    select: { domain: true, linkStatus: true, linkDofollow: true },
  });

  const total = prospects.length;
  const live = prospects.filter((p) => p.linkStatus === "live").length;
  const lost = prospects.filter((p) => p.linkStatus === "lost").length;
  const dofollow = prospects.filter((p) => p.linkStatus === "live" && p.linkDofollow).length;

  await sendEmail(to, `Backlink Health Report — ${new Date().toLocaleDateString()}`, `
<h2>Backlink Health Report</h2>
<p>Hi ${name},</p>
<p>Your weekly backlink health summary:</p>
<ul>
  <li><strong>${total}</strong> total acquired backlinks</li>
  <li><strong style="color:green">${live}</strong> live links</li>
  <li><strong style="color:red">${lost}</strong> lost links</li>
  <li><strong>${dofollow}</strong> dofollow links</li>
</ul>
${lost > 0 ? `<p><strong>Action needed:</strong> ${lost} link${lost > 1 ? "s have" : " has"} been lost. Log in to investigate and re-acquire.</p>` : "<p>All monitored links are healthy!</p>"}
`);

  return `Sent backlink health: ${live} live, ${lost} lost`;
}

async function runCitationHealth(userId: string, to: string, name: string): Promise<string> {
  const business = await prisma.citationBusiness.findUnique({
    where: { userId },
    include: { citations: { select: { status: true, directoryName: true } } },
  });

  if (!business) return "No citation profile set up";

  const total = business.citations.length;
  const verified = business.citations.filter((c) => c.status === "verified").length;
  const inconsistent = business.citations.filter((c) => c.status === "inconsistent").length;
  const inconsistentNames = business.citations.filter((c) => c.status === "inconsistent").map((c) => c.directoryName).join(", ");

  await sendEmail(to, `Citation Health Report — ${new Date().toLocaleDateString()}`, `
<h2>Citation Monitor Report</h2>
<p>Hi ${name},</p>
<p>Citation consistency report for <strong>${business.name}</strong>:</p>
<ul>
  <li><strong>${total}</strong> directories tracked</li>
  <li><strong style="color:green">${verified}</strong> verified (NAP consistent)</li>
  <li><strong style="color:orange">${inconsistent}</strong> inconsistent</li>
</ul>
${inconsistent > 0 ? `<p><strong>Fix needed:</strong> ${inconsistentNames}</p>` : "<p>All citations are consistent!</p>"}
`);

  return `Sent citation health: ${verified} verified, ${inconsistent} inconsistent`;
}

async function runSiteAuditSummary(userId: string, to: string, name: string, targetUrl?: string): Promise<string> {
  const query = targetUrl ? { userId, url: { contains: targetUrl } } : { userId };
  const audit = await prisma.audit.findFirst({
    where: query,
    orderBy: { createdAt: "desc" },
    select: { url: true, title: true, scores: true, createdAt: true },
  });

  if (!audit) return "No audit data found";

  const scores = audit.scores ? JSON.parse(audit.scores) as Record<string, number> : {};

  await sendEmail(to, `Site Audit Summary — ${audit.url}`, `
<h2>Site Audit Summary</h2>
<p>Hi ${name},</p>
<p>Latest audit data for <strong>${audit.url}</strong> (${new Date(audit.createdAt).toLocaleDateString()}):</p>
<ul>
  ${Object.entries(scores).map(([k, v]) => `<li><strong>${k}:</strong> ${v}/100</li>`).join("")}
</ul>
<p>Log in to view the full audit report and recommendations.</p>
`);

  return `Sent site audit summary for ${audit.url}`;
}

async function sendEmail(to: string, subject: string, html: string) {
  const resend = getResendClient();
  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "automations@ai-seo-center.com",
    to,
    subject,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">${html}<hr style="margin-top:24px"/><p style="font-size:11px;color:#9ca3af">Sent by TGS SEO Automation Engine. <a href="#">Manage notifications</a></p></div>`,
  });
}
