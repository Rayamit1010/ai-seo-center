import { runAgentCycle } from "@/lib/agent";
import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { fail, ok } from "@/lib/server/response";
import { getAgentHeartbeatStatus } from "@/lib/services/agent-status-service";

export async function GET() {
  try {
    const userId = await getRequiredUserId();
    return ok(await getAgentHeartbeatStatus(userId));
  } catch (error) {
    if (isUnauthorizedApiError(error)) {
      return fail("Unauthorized", 401);
    }
    console.error("Agent heartbeat status error:", error);
    return fail("Agent status could not be loaded right now.");
  }
}

export async function POST(req: Request) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();

    const body = await req.json().catch(() => ({}));
    const campaignId = (body as { campaignId?: string }).campaignId;

    const result = await runAgentCycle(userId, campaignId);
    const status = await getAgentHeartbeatStatus(userId);

    return ok({
      ...status,
      cycle: result,
    });
  } catch (error) {
    if (isInvalidOriginError(error)) {
      return fail("That request came from an unexpected origin.", 403);
    }
    if (isUnauthorizedApiError(error)) {
      return fail("Unauthorized", 401);
    }
    console.error("Agent heartbeat error:", error);
    return fail("Agent cycle failed");
  }
}
