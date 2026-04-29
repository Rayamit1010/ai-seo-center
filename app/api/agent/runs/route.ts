import { prisma } from "@/lib/db";
import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { fail, ok, parseStoredJson } from "@/lib/server/response";

export async function GET() {
  try {
    const userId = await getRequiredUserId();

    const runs = await prisma.agentRun.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const data = runs.map((run) => ({
      ...run,
      log: parseStoredJson(run.log, []),
    }));

    return ok(data);
  } catch (error) {
    if (isUnauthorizedApiError(error)) {
      return fail("Unauthorized", 401);
    }
    console.error("Agent runs error:", error);
    return fail("Failed to fetch runs");
  }
}
