import { prisma } from "@/lib/db";
import { checkBacklinkPresence } from "@/lib/scraper";
import { getResendClient } from "@/lib/resend";

const RECHECK_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const ALERT_THROTTLE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const CHECK_CONCURRENCY = 6;

/** Links a user has acquired, with their current monitored status. */
export async function listMonitoredLinks(userId: string) {
  const prospects = await prisma.backlinkProspect.findMany({
    where: { userId, linkAcquired: true, linkUrl: { not: null } },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      domain: true,
      linkUrl: true,
      anchorText: true,
      linkDofollow: true,
      linkStatus: true,
      lastLinkCheckAt: true,
      campaign: { select: { id: true, name: true, targetUrl: true } },
    },
  });

  const summary = {
    total: prospects.length,
    live: prospects.filter((p) => p.linkStatus === "live").length,
    lost: prospects.filter((p) => p.linkStatus === "lost").length,
    dofollow: prospects.filter((p) => p.linkStatus === "live" && p.linkDofollow === true).length,
    unchecked: prospects.filter((p) => !p.linkStatus).length,
  };

  return { links: prospects, summary };
}

/** Re-checks a single acquired link on demand and returns the updated record. */
export async function recheckLink(userId: string, prospectId: string) {
  const prospect = await prisma.backlinkProspect.findFirst({
    where: { id: prospectId, userId, linkAcquired: true },
    include: { campaign: { select: { targetUrl: true } } },
  });
  if (!prospect?.linkUrl || !prospect.campaign?.targetUrl) return null;

  return applyLinkCheck(prospect.id, prospect.linkUrl, prospect.campaign.targetUrl, prospect.linkStatus);
}

async function applyLinkCheck(
  prospectId: string,
  linkUrl: string,
  targetUrl: string,
  previousStatus: string | null
) {
  const result = await checkBacklinkPresence(linkUrl, targetUrl);
  const newStatus = result.reachable ? (result.linkFound ? "live" : "lost") : previousStatus;
  const statusChanged = !!previousStatus && !!newStatus && previousStatus !== newStatus;

  const now = new Date();

  const updated = await prisma.backlinkProspect.update({
    where: { id: prospectId },
    data: {
      linkStatus: newStatus ?? undefined,
      linkDofollow: result.linkFound ? result.dofollow : undefined,
      anchorText: result.anchorText ?? undefined,
      lastLinkCheckAt: now,
    },
  });

  await prisma.linkCheck.create({
    data: {
      prospectId,
      linkFound: result.linkFound,
      dofollow: result.dofollow,
      anchorText: result.anchorText,
      statusChanged,
    },
  });

  return { prospect: updated, result, statusChanged };
}

/**
 * Re-checks acquired links that are due (never checked, or checked more than 7 days
 * ago), and sends a throttled email alert per user when a link is lost. Called from
 * the link-monitor cron.
 */
export async function runLinkChecks(limit = 30) {
  const cutoff = new Date(Date.now() - RECHECK_INTERVAL_MS);

  const due = await prisma.backlinkProspect.findMany({
    where: {
      linkAcquired: true,
      linkUrl: { not: null },
      OR: [{ lastLinkCheckAt: null }, { lastLinkCheckAt: { lt: cutoff } }],
    },
    take: limit,
    select: {
      id: true,
      userId: true,
      domain: true,
      linkUrl: true,
      linkStatus: true,
      lastLinkAlertAt: true,
      campaign: { select: { name: true, targetUrl: true } },
    },
  });

  let checked = 0;
  const lostByUser = new Map<string, Array<{ id: string; domain: string; campaignName: string }>>();

  for (let i = 0; i < due.length; i += CHECK_CONCURRENCY) {
    const batch = due.slice(i, i + CHECK_CONCURRENCY);
    await Promise.all(
      batch.map(async (prospect) => {
        if (!prospect.linkUrl || !prospect.campaign?.targetUrl) return;

        try {
          const { statusChanged, prospect: updated } = await applyLinkCheck(
            prospect.id,
            prospect.linkUrl,
            prospect.campaign.targetUrl,
            prospect.linkStatus
          );
          checked += 1;

          const becameLost = statusChanged && updated.linkStatus === "lost";
          const sevenDaysAgo = new Date(Date.now() - ALERT_THROTTLE_MS);
          const alertEligible = !prospect.lastLinkAlertAt || prospect.lastLinkAlertAt < sevenDaysAgo;

          if (becameLost && alertEligible) {
            const existing = lostByUser.get(prospect.userId) ?? [];
            existing.push({ id: prospect.id, domain: prospect.domain, campaignName: prospect.campaign.name });
            lostByUser.set(prospect.userId, existing);
          }
        } catch (error) {
          console.error(`Link check failed for prospect ${prospect.id}:`, error);
        }
      })
    );
  }

  for (const [userId, lostLinks] of lostByUser) {
    await sendLostLinkAlert(userId, lostLinks);
  }

  return { checked, alerted: lostByUser.size };
}

async function sendLostLinkAlert(
  userId: string,
  lostLinks: Array<{ id: string; domain: string; campaignName: string }>
) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
  if (!user?.email) return;

  try {
    const resend = getResendClient();
    const rows = lostLinks
      .map(
        (link) =>
          `<li><strong>${link.domain}</strong> (campaign: ${link.campaignName})</li>`
      )
      .join("");

    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "alerts@ai-seo-center.com",
      to: user.email,
      subject: `Link Lost Alert: ${lostLinks.length} backlink${lostLinks.length > 1 ? "s" : ""} no longer found`,
      html: `
        <h2>Link Monitoring Alert</h2>
        <p>Hi ${user.name ?? "there"},</p>
        <p>The following acquired backlink${lostLinks.length > 1 ? "s are" : " is"} no longer detected on the referring page:</p>
        <ul>${rows}</ul>
        <p style="margin-top:16px">Log in to AI SEO Center to review the link monitoring dashboard.</p>
      `,
    });

    await prisma.backlinkProspect.updateMany({
      where: { id: { in: lostLinks.map((l) => l.id) } },
      data: { lastLinkAlertAt: new Date() },
    });
  } catch (error) {
    console.error("Failed to send link lost alert email:", error);
  }
}
