import { z } from "zod";
import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { fail, ok } from "@/lib/server/response";
import { createCampaign, listCampaigns } from "@/lib/services/campaign-service";

const createSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  targetUrl: z.string().url("Invalid target URL"),
  industry: z.string().min(1, "Industry is required"),
  targetCountry: z.string().min(1, "Target country is required"),
  competitorUrls: z.array(z.string().url()).optional(),
});

export async function GET() {
  try {
    const userId = await getRequiredUserId();

    return ok(await listCampaigns(userId));
  } catch (error) {
    if (isUnauthorizedApiError(error)) {
      return fail("Unauthorized", 401);
    }
    console.error("List campaigns error:", error);
    return fail("Failed to fetch campaigns");
  }
}

export async function POST(req: Request) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();

    const body = await req.json();
    const data = createSchema.parse(body);

    return ok(
      await createCampaign({
        userId,
        name: data.name,
        targetUrl: data.targetUrl,
        industry: data.industry,
        targetCountry: data.targetCountry,
        competitorUrls: data.competitorUrls,
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
      return fail(error.errors[0].message, 400);
    }
    console.error("Create campaign error:", error);
    return fail("Failed to create campaign");
  }
}
