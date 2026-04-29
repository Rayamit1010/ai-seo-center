import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { fail, ok } from "@/lib/server/response";
import {
  deleteProjectProfile,
  getProjectProfile,
  updateProjectProfile,
} from "@/lib/services/project-profile-service";
import { updateProjectProfileSchema } from "@/lib/validation/project-profile";
import { z } from "zod";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getRequiredUserId();
    const { id } = await params;
    const profile = await getProjectProfile(userId, id);

    if (!profile) {
      return fail("Project profile not found.", 404);
    }

    return ok(profile);
  } catch (error) {
    if (isUnauthorizedApiError(error)) {
      return fail("Unauthorized", 401);
    }
    console.error("Get project profile error:", error);
    return fail("That website profile could not be loaded right now.");
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
    const body = await req.json();
    const data = updateProjectProfileSchema.parse(body);

    const profile = await updateProjectProfile({
      userId,
      id,
      updates: data,
    });

    if (!profile) {
      return fail("Project profile not found.", 404);
    }

    return ok(profile);
  } catch (error) {
    if (isInvalidOriginError(error)) {
      return fail("That request came from an unexpected origin.", 403);
    }
    if (isUnauthorizedApiError(error)) {
      return fail("Unauthorized", 401);
    }
    if (error instanceof z.ZodError) {
      return fail(error.errors[0]?.message || "The project update is not valid.", 400);
    }
    console.error("Update project profile error:", error);
    return fail("The website profile could not be updated right now.");
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
    const deleted = await deleteProjectProfile(userId, id);

    if (!deleted) {
      return fail("Project profile not found.", 404);
    }

    return ok({ deleted: true });
  } catch (error) {
    if (isInvalidOriginError(error)) {
      return fail("That request came from an unexpected origin.", 403);
    }
    if (isUnauthorizedApiError(error)) {
      return fail("Unauthorized", 401);
    }
    console.error("Delete project profile error:", error);
    return fail("The website profile could not be removed right now.");
  }
}
