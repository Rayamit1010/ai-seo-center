import { prisma } from "@/lib/db";
import { ok, fail } from "@/lib/server/response";
import { bulkCheckRankings } from "@/lib/rank-tracker/dataforseo";
import { getResendClient } from "@/lib/resend";

export const dynamic = "force-dynamic";

function isAuthorizedCronRequest(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  // Vercel Cron sends Authorization: Bearer <secret>
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return fail("Unauthorized", 401);
  }

  try {
    // Fetch all active keywords grouped by userId
    const keywords = await prisma.trackedKeyword.findMany({
      where: { isActive: true },
      select: { id: true, userId: true, keyword: true, targetDomain: true },
    });

    if (keywords.length === 0) {
      return ok({ processed: 0, message: "No active keywords to check." });
    }

    // Group by userId
    const byUser = new Map<string, string[]>();
    for (const kw of keywords) {
      const existing = byUser.get(kw.userId) ?? [];
      existing.push(kw.id);
      byUser.set(kw.userId, existing);
    }

    let processed = 0;

    for (const [userId, keywordIds] of byUser) {
      try {
        // Capture rank history before updating
        const beforeHistory = await prisma.rankHistory.findMany({
          where: {
            keywordId: { in: keywordIds },
          },
          orderBy: { checkedAt: "desc" },
          distinct: ["keywordId"],
          select: { keywordId: true, position: true },
        });

        await bulkCheckRankings(keywordIds);

        // Check for significant drops and send alerts
        const afterHistory = await prisma.rankHistory.findMany({
          where: {
            keywordId: { in: keywordIds },
          },
          orderBy: { checkedAt: "desc" },
          distinct: ["keywordId"],
          select: { keywordId: true, position: true, change: true },
        });

        const droppedKeywords: Array<{
          keyword: string;
          domain: string;
          oldPos: number;
          newPos: number;
          drop: number;
        }> = [];

        for (const after of afterHistory) {
          if (after.change === null || after.change >= 0 || after.position === null) {
            continue;
          }

          const drop = Math.abs(after.change);
          if (drop <= 3) continue;

          const before = beforeHistory.find((b) => b.keywordId === after.keywordId);
          const kw = keywords.find((k) => k.id === after.keywordId);

          if (before?.position !== null && before?.position !== undefined && kw) {
            droppedKeywords.push({
              keyword: kw.keyword,
              domain: kw.targetDomain,
              oldPos: before.position,
              newPos: after.position,
              drop,
            });
          }
        }

        // Send alert if drops detected
        if (droppedKeywords.length > 0) {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, name: true },
          });

          if (user?.email) {
            try {
              const resend = getResendClient();
              const rows = droppedKeywords
                .map(
                  (kw) =>
                    `<tr>
                      <td style="padding:8px;border-bottom:1px solid #eee">${kw.keyword}</td>
                      <td style="padding:8px;border-bottom:1px solid #eee">${kw.domain}</td>
                      <td style="padding:8px;border-bottom:1px solid #eee">#${kw.oldPos}</td>
                      <td style="padding:8px;border-bottom:1px solid #eee">#${kw.newPos}</td>
                      <td style="padding:8px;border-bottom:1px solid #eee;color:#dc2626">-${kw.drop}</td>
                    </tr>`
                )
                .join("");

              await resend.emails.send({
                from: process.env.EMAIL_FROM ?? "alerts@ai-seo-center.com",
                to: user.email,
                subject: `Rank Drop Alert: ${droppedKeywords.length} keyword(s) dropped significantly`,
                html: `
                  <h2>Rank Drop Alert</h2>
                  <p>Hi ${user.name ?? "there"},</p>
                  <p>The following keywords have dropped more than 3 positions since the last check:</p>
                  <table style="width:100%;border-collapse:collapse;font-size:14px">
                    <thead>
                      <tr style="background:#f3f4f6">
                        <th style="padding:8px;text-align:left">Keyword</th>
                        <th style="padding:8px;text-align:left">Domain</th>
                        <th style="padding:8px;text-align:left">Previous</th>
                        <th style="padding:8px;text-align:left">Current</th>
                        <th style="padding:8px;text-align:left">Change</th>
                      </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                  </table>
                  <p style="margin-top:16px">Log in to AI SEO Center to investigate and take action.</p>
                `,
              });
            } catch (emailError) {
              console.error("Failed to send rank drop alert email:", emailError);
            }
          }
        }

        processed += keywordIds.length;
      } catch (userError) {
        console.error(`Rank check failed for user ${userId}:`, userError);
      }
    }

    return ok({ processed, message: `Checked ${processed} keywords across ${byUser.size} users.` });
  } catch (error) {
    console.error("Cron rank-check error:", error);
    return fail("The rank check cron job could not be completed.");
  }
}
