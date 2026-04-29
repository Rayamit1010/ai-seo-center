import { publishToProjectCms } from "@/lib/integrations/cms";
import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { fail, ok } from "@/lib/server/response";
import { contentPublishSchema } from "@/lib/validation/content";
import { z } from "zod";

export async function POST(req: Request) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();
    const body = await req.json();
    const data = contentPublishSchema.parse(body);

    return ok(
      await publishToProjectCms({
        userId,
        projectId: data.projectId,
        title: data.title,
        html: data.html,
        excerpt: data.excerpt,
        slug: data.slug,
        status: data.status,
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
      return fail(error.errors[0]?.message || "The CMS publish request is not valid.", 400);
    }
    console.error("CMS publish error:", error);
    return fail(
      error instanceof Error
        ? error.message
        : "The CMS publish step failed before the content could be sent."
    );
  }
}
