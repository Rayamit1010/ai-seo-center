import { z } from "zod";
import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { fail, ok } from "@/lib/server/response";
import {
  deleteCampaign,
  getCampaignDetails,
  updateCampaign,
} from "@/lib/services/campaign-service";

const patchSchema = z.object({
  status: z.enum(["active", "paused", "completed"]).optional(),
  name: z.string().trim().min(1).max(120).optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getRequiredUserId();

    const { id } = await params;

    const campaign = await getCampaignDetails(userId, id);
    if (!campaign) {
      return fail("Campaign not found", 404);
    }

    return ok(campaign);
  } catch (error) {
    if (isInvalidOriginError(error)) {
      return fail("That request came from an unexpected origin.", 403);
    }
    if (isUnauthorizedApiError(error)) {
      return fail("Unauthorized", 401);
    }
    console.error("Get campaign error:", error);
    return fail("Failed to fetch campaign");
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();

    const { id } = await params;
    const body = patchSchema.parse(await req.json());

    const campaign = await updateCampaign(userId, id, body);
    if (!campaign) {
      return fail("Campaign not found", 404);
    }

    return ok(campaign);
  } catch (error) {
    if (isInvalidOriginError(error)) {
      return fail("That request came from an unexpected origin.", 403);
    }
    if (isUnauthorizedApiError(error)) {
      return fail("Unauthorized", 401);
    }
    if (error instanceof z.ZodError) {
      return fail(error.errors[0].message, 400);
    }
    console.error("Update campaign error:", error);
    return fail("Failed to update campaign");
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();

    const { id } = await params;

    const campaign = await deleteCampaign(userId, id);
    if (!campaign) {
      return fail("Campaign not found", 404);
    }

    return ok({ deleted: true });
  } catch (error) {
    if (isInvalidOriginError(error)) {
      return fail("That request came from an unexpected origin.", 403);
    }
    if (isUnauthorizedApiError(error)) {
      return fail("Unauthorized", 401);
    }
    console.error("Delete campaign error:", error);
    return fail("Failed to delete campaign");
  }
}
