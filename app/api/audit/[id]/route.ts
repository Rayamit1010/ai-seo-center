import { NextResponse } from "next/server";
import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { fail, ok } from "@/lib/server/response";
import { deleteAudit, getAuditDetails } from "@/lib/services/audit-service";

/** GET: Fetch a single audit by ID */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getRequiredUserId();

    const { id } = await params;

    const audit = await getAuditDetails(userId, id);
    if (!audit) {
      return fail("Audit not found", 404);
    }

    return ok(audit);
  } catch (error) {
    if (isUnauthorizedApiError(error)) {
      return fail("Unauthorized", 401);
    }
    console.error("Get audit error:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit" },
      { status: 500 }
    );
  }
}

/** DELETE: Delete an audit */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();

    const { id } = await params;

    const audit = await deleteAudit(userId, id);
    if (!audit) {
      return fail("Audit not found", 404);
    }

    return ok({ deleted: true });
  } catch (error) {
    if (isInvalidOriginError(error)) {
      return fail("That request came from an unexpected origin.", 403);
    }
    if (isUnauthorizedApiError(error)) {
      return fail("Unauthorized", 401);
    }
    console.error("Delete audit error:", error);
    return NextResponse.json(
      { error: "Failed to delete audit" },
      { status: 500 }
    );
  }
}
