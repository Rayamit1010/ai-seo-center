import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { fail, ok } from "@/lib/server/response";
import { createProjectProfile, listProjectProfiles } from "@/lib/services/project-profile-service";
import { createProjectProfileSchema } from "@/lib/validation/project-profile";
import { z } from "zod";

export async function GET() {
  try {
    const userId = await getRequiredUserId();
    return ok(await listProjectProfiles(userId));
  } catch (error) {
    if (isUnauthorizedApiError(error)) {
      return fail("Unauthorized", 401);
    }
    console.error("List project profiles error:", error);
    return fail("The website strategy workspace could not be loaded right now.");
  }
}

export async function POST(req: Request) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();
    const body = await req.json();
    const data = createProjectProfileSchema.parse(body);

    return ok(
      await createProjectProfile({
        userId,
        name: data.name,
        websiteUrl: data.websiteUrl,
        industry: data.industry,
        targetCountry: data.targetCountry,
        targetAudience: data.targetAudience,
        brandVoice: data.brandVoice,
        businessGoal: data.businessGoal,
        conversionGoals: data.conversionGoals,
        primaryServices: data.primaryServices,
        backlinkRules: data.backlinkRules,
        contentPlaybook: data.contentPlaybook,
        nichePlaybook: data.nichePlaybook,
        searchConsoleSiteUrl: data.searchConsoleSiteUrl,
        ga4PropertyId: data.ga4PropertyId,
        cmsProvider: data.cmsProvider,
        cmsBaseUrl: data.cmsBaseUrl,
        cmsUsername: data.cmsUsername,
        cmsAppPassword: data.cmsAppPassword,
        cmsWebhookUrl: data.cmsWebhookUrl,
        cmsPublishStatus: data.cmsPublishStatus,
        notes: data.notes,
        isDefault: data.isDefault,
      })
    );
  } catch (error) {
    if (isInvalidOriginError(error)) {
      return fail("That request came from an unexpected origin.", 403);
    }
    if (isUnauthorizedApiError(error)) {
      return fail("Unauthorized", 401);
    }
    if (error instanceof z.ZodError) {
      return fail(error.errors[0]?.message || "The project payload is not valid.", 400);
    }
    console.error("Create project profile error:", error);
    return fail("The website profile could not be saved right now.");
  }
}
