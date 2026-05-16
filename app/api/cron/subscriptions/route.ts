import { prisma } from "@/lib/db";
import { getResendClient } from "@/lib/resend";
import { ok, fail } from "@/lib/server/response";
import { buildSubscriptionExpiryEmail } from "@/lib/email-templates-ops";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXTAUTH_URL ?? "https://seoagent.techgeekstudio.com";

function isAuthorizedCronRequest(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return fail("Unauthorized", 401);
  }

  try {
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const inSixDays = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);

    // Find active subs expiring in the 6–7 day window (run daily → only fires once per sub)
    const expiring = await prisma.subscription.findMany({
      where: {
        status: "active",
        currentPeriodEnd: { gte: inSixDays, lte: sevenDaysFromNow },
      },
      include: {
        user: { select: { email: true, name: true } },
        plan: { select: { name: true } },
      },
    });

    const resend = getResendClient();
    let sent = 0;

    for (const sub of expiring) {
      if (!sub.user.email) continue;

      const { subject, html } = buildSubscriptionExpiryEmail({
        userName: sub.user.name ?? "there",
        planName: sub.plan.name,
        expiresAt: sub.currentPeriodEnd,
        renewUrl: `${APP_URL}/billing`,
      });

      try {
        await resend.emails.send({
          from: `TechGeekStudio SEO <noreply@techgeekstudio.com>`,
          to: sub.user.email,
          subject,
          html,
        });
        sent++;
      } catch (emailErr) {
        console.error(`Expiry email failed for ${sub.user.email}:`, emailErr);
      }
    }

    return ok({ checked: expiring.length, sent });
  } catch (error) {
    console.error("Subscription expiry cron error:", error);
    return fail("Subscription expiry check failed");
  }
}
