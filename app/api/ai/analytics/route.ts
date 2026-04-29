import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAIHealthSummary } from "@/lib/anthropic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [events, health] = await Promise.all([
      prisma.aIProviderEvent.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 250,
      }),
      getAIHealthSummary(userId),
    ]);

    const providerSummary = health.providers.map((provider) => {
      const providerEvents = events.filter((event) => event.providerId === provider.id);
      const taskBreakdown = providerEvents.reduce<Record<string, number>>((acc, event) => {
        const key = event.task || "general";
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {});

      return {
        ...provider,
        recentEvents: providerEvents.slice(0, 8),
        taskBreakdown,
      };
    });

    const timeline = events
      .slice(0, 40)
      .reverse()
      .map((event) => ({
        id: event.id,
        providerId: event.providerId,
        task: event.task,
        success: event.success,
        failover: event.failover,
        latencyMs: event.latencyMs,
        errorMessage: event.errorMessage,
        createdAt: event.createdAt,
      }));

    return NextResponse.json({
      success: true,
      data: {
        health,
        providerSummary,
        timeline,
      },
    });
  } catch (error) {
    console.error("AI analytics error:", error);
    return NextResponse.json({ error: "Failed to load AI analytics" }, { status: 500 });
  }
}
