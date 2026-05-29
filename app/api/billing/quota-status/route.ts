import { ok, fail } from "@/lib/server/response";
import { getRequiredUserId } from "@/lib/server/auth";
import { getUsageSummary } from "@/lib/server/subscription-guard";

export async function GET() {
  try {
    const userId = await getRequiredUserId();
    const usage = await getUsageSummary(userId);

    function pct(current: number, limit: number) {
      if (limit === -1) return 0; // unlimited
      if (limit === 0) return 100;
      return Math.round((current / limit) * 100);
    }

    const quotas = {
      aiCalls: { current: usage.aiCallsToday, limit: usage.aiCallsLimit, pct: pct(usage.aiCallsToday, usage.aiCallsLimit) },
      projects: { current: usage.projectsCount, limit: usage.projectsLimit, pct: pct(usage.projectsCount, usage.projectsLimit) },
      keywords: { current: usage.keywordsCount, limit: usage.keywordsLimit, pct: pct(usage.keywordsCount, usage.keywordsLimit) },
    };

    const nudge = Object.values(quotas).some((q) => q.pct >= 80);

    return ok({ quotas, nudge });
  } catch (error) {
    return fail("Failed to fetch quota status");
  }
}
