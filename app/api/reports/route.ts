import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { fail, ok } from "@/lib/server/response";
import {
  createGeneratedReportFromAudit,
  createReport,
  deleteReport,
  listReports,
  updateReportDocument,
} from "@/lib/services/report-service";
import { createReportSchema, updateReportSchema } from "@/lib/validation/reports";

export async function GET() {
  try {
    const userId = await getRequiredUserId();

    return ok(await listReports(userId));
  } catch (error) {
    if (isUnauthorizedApiError(error)) {
      return fail("Unauthorized", 401);
    }
    console.error("List reports error:", error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();

    const body = await req.json();
    const data = createReportSchema.parse(body);

    if (!data.content && !data.auditId) {
      return fail("A completed audit or report content is required to build a report.", 400);
    }

    if (data.auditId && !data.content) {
      const report = await createGeneratedReportFromAudit({
        userId,
        auditId: data.auditId,
        clientName: data.clientName,
        projectName: data.projectName,
        recipientEmail: data.recipientEmail,
        title: data.title,
        type: data.type,
      });

      if (!report) {
        return fail("The selected audit is not ready yet. Finish the audit first, then generate the report.", 400);
      }

      return ok(report);
    }

    return ok(
      await createReport({
        userId,
        title: data.title || "SEO report",
        type: data.type,
        content: data.content || {},
        auditId: data.auditId,
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
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Create report error:", error);
    return NextResponse.json({ error: "Failed to create report" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return fail("Report ID required", 400);
    }

    const report = await deleteReport(userId, id);
    if (!report) {
      return fail("Report not found", 404);
    }
    return ok({ deleted: true });
  } catch (error) {
    if (isInvalidOriginError(error)) {
      return fail("That request came from an unexpected origin.", 403);
    }
    if (isUnauthorizedApiError(error)) {
      return fail("Unauthorized", 401);
    }
    console.error("Delete report error:", error);
    return NextResponse.json({ error: "Failed to delete report" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();
    const body = await req.json();
    const data = updateReportSchema.parse(body);

    const report = await updateReportDocument({
      userId,
      id: data.id,
      updates: {
        title: data.title,
        clientName: data.clientName,
        projectName: data.projectName,
        recipientEmail: data.recipientEmail,
        status: data.status,
        branding: data.branding,
        sentAt: data.sentAt,
      },
    });

    if (!report) {
      return fail("The report could not be updated because it no longer exists or its content is not valid.", 404);
    }

    return ok(report);
  } catch (error) {
    if (isInvalidOriginError(error)) {
      return fail("That request came from an unexpected origin.", 403);
    }
    if (isUnauthorizedApiError(error)) {
      return fail("Unauthorized", 401);
    }
    if (error instanceof z.ZodError) {
      return fail(error.errors[0]?.message || "The report update payload is not valid.", 400);
    }
    console.error("Update report error:", error);
    return fail("The report could not be updated right now.");
  }
}
