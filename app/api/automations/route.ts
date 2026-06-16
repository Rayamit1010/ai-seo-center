import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { fail, ok } from "@/lib/server/response";
import { listWorkflows, createWorkflow, type WorkflowType, type WorkflowConfig } from "@/lib/services/automation-service";

export async function GET() {
  try {
    const userId = await getRequiredUserId();
    return ok(await listWorkflows(userId));
  } catch (error) {
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    return fail("Failed to fetch workflows");
  }
}

export async function POST(req: Request) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();
    const body = (await req.json()) as {
      name: string;
      type: WorkflowType;
      config: WorkflowConfig;
      frequency?: string;
    };

    if (!body.name?.trim() || !body.type) return fail("Name and type are required", 400);
    if (!body.config?.recipientEmail) return fail("Recipient email is required", 400);

    const workflow = await createWorkflow(userId, body);
    return ok(workflow, { status: 201 });
  } catch (error) {
    if (isInvalidOriginError(error)) return fail("Forbidden", 403);
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    console.error("Create workflow error:", error);
    return fail("Failed to create workflow");
  }
}
