import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { enqueueBackgroundJob } from "@/lib/server/job-queue";
import { fail, ok } from "@/lib/server/response";
import { sendReportSchema } from "@/lib/validation/reports";
import { z } from "zod";

export async function POST(req: Request) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();
    const body = await req.json();
    const data = sendReportSchema.parse(body);

    await enqueueBackgroundJob({
      name: "send-report-email",
      payload: {
        userId,
        reportId: data.reportId,
        recipientEmail: data.recipientEmail,
      },
    });

    return ok({ queued: true });
  } catch (error) {
    if (isInvalidOriginError(error)) {
      return fail("That request came from an unexpected origin.", 403);
    }
    if (isUnauthorizedApiError(error)) {
      return fail("Unauthorized", 401);
    }
    if (error instanceof z.ZodError) {
      return fail(error.errors[0]?.message || "The email request is not valid.", 400);
    }
    console.error("Queue report email error:", error);
    return fail("The report email could not be queued right now.");
  }
}
