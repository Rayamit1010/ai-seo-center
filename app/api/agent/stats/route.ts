import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logRouteTiming, measureStep } from "@/lib/server/observability";
import { getAgentStats } from "@/lib/services/agent-stats-service";

export async function GET() {
  const startedAt = performance.now();
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as Record<string, unknown>)?.id as string | undefined;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { value: agentStatsResult, timing } = await measureStep(
      "agent-stats-service",
      () => getAgentStats(userId)
    );

    logRouteTiming({
      name: "agent-stats",
      startedAt,
      steps: [timing, ...agentStatsResult.timings],
      meta: { userId },
    });

    return NextResponse.json({ success: true, data: agentStatsResult.stats });
  } catch (error) {
    logRouteTiming({
      name: "agent-stats",
      startedAt,
      meta: { failed: true },
      error,
    });
    console.error("Agent stats error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
