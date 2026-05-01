import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { fail, ok } from "@/lib/server/response";
import { enqueueBackgroundJob } from "@/lib/server/job-queue";
import { createAuditJob, listAudits } from "@/lib/services/audit-service";
import { checkFeatureLimit } from "@/lib/server/subscription-guard";

const auditSchema = z.object({
  url: z.string().url().optional(),
  htmlContent: z.string().optional(),
  inputType: z.enum(["url", "paste"]).default("url"),
});

export async function POST(req: Request) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();

    // Rate limit: 10 audits per hour per user
    if (!(await checkRateLimit(`audit:${userId}`, 10, 3600000))) {
      return fail("Rate limit exceeded. Max 10 audits per hour.", 429);
    }

    const projectLimit = await checkFeatureLimit(userId, "projects");
    if (!projectLimit.allowed) {
      return fail(
        `Project limit reached (${projectLimit.current}/${projectLimit.limit}). Upgrade your plan to run more audits.`,
        402
      );
    }

    const body = await req.json();
    const data = auditSchema.parse(body);

    if (data.inputType === "url" && !data.url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }
    if (data.inputType === "paste" && !data.htmlContent) {
      return NextResponse.json(
        { error: "HTML content is required" },
        { status: 400 }
      );
    }

    const audit = await createAuditJob({
      userId,
      url: data.url,
      htmlContent: data.htmlContent,
      inputType: data.inputType,
    });

    await enqueueBackgroundJob({
      name: "process-audit",
      payload: {
        auditId: audit.id,
        userId,
        data,
      },
    });

    return ok({
      auditId: audit.id,
      status: "SCRAPING",
    });
  } catch (error) {
    if (isInvalidOriginError(error)) {
      return fail("That request came from an unexpected origin.", 403);
    }
    if (isUnauthorizedApiError(error)) {
      return fail("Unauthorized", 401);
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Audit creation error:", error);
    return NextResponse.json(
      { error: "Failed to start audit" },
      { status: 500 }
    );
  }
}

/** GET: List all audits for current user */
export async function GET() {
  try {
    const userId = await getRequiredUserId();
    return ok(await listAudits(userId));
  } catch (error) {
    if (isUnauthorizedApiError(error)) {
      return fail("Unauthorized", 401);
    }
    console.error("List audits error:", error);
    return fail("Failed to fetch audits");
  }
}
