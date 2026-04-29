import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { fail, ok } from "@/lib/server/response";
import {
  createReportSchedule,
  deleteReportSchedule,
  listReportSchedules,
  updateReportSchedule,
} from "@/lib/services/report-automation-service";
import {
  createReportScheduleSchema,
  updateReportScheduleSchema,
} from "@/lib/validation/reports";
import { z } from "zod";

export async function GET() {
  try {
    const userId = await getRequiredUserId();
    return ok(await listReportSchedules(userId));
  } catch (error) {
    if (isUnauthorizedApiError(error)) {
      return fail("Unauthorized", 401);
    }
    console.error("List report schedules error:", error);
    return fail("The report schedules could not be loaded.");
  }
}

export async function POST(req: Request) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();
    const body = await req.json();
    const data = createReportScheduleSchema.parse(body);
    return ok(await createReportSchedule({ userId, ...data }));
  } catch (error) {
    if (isInvalidOriginError(error)) {
      return fail("That request came from an unexpected origin.", 403);
    }
    if (isUnauthorizedApiError(error)) {
      return fail("Unauthorized", 401);
    }
    if (error instanceof z.ZodError) {
      return fail(error.errors[0]?.message || "The report schedule is not valid.", 400);
    }
    console.error("Create report schedule error:", error);
    return fail("The report schedule could not be created.");
  }
}

export async function PATCH(req: Request) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();
    const body = await req.json();
    const data = updateReportScheduleSchema.parse(body);

    const schedule = await updateReportSchedule({
      userId,
      id: data.id,
      updates: {
        clientName: data.clientName,
        projectName: data.projectName,
        recipientEmail: data.recipientEmail,
        frequency: data.frequency,
        weekday: data.weekday,
        monthDay: data.monthDay,
        hour: data.hour,
        minute: data.minute,
        timezone: data.timezone,
        deliveryMode: data.deliveryMode,
        isActive: data.isActive,
      },
    });

    if (!schedule) {
      return fail("The report schedule could not be found.", 404);
    }

    return ok(schedule);
  } catch (error) {
    if (isInvalidOriginError(error)) {
      return fail("That request came from an unexpected origin.", 403);
    }
    if (isUnauthorizedApiError(error)) {
      return fail("Unauthorized", 401);
    }
    if (error instanceof z.ZodError) {
      return fail(error.errors[0]?.message || "The report schedule update is not valid.", 400);
    }
    console.error("Update report schedule error:", error);
    return fail("The report schedule could not be updated.");
  }
}

export async function DELETE(req: Request) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return fail("Schedule ID required", 400);
    }

    const schedule = await deleteReportSchedule(userId, id);
    if (!schedule) {
      return fail("The report schedule could not be found.", 404);
    }

    return ok({ deleted: true });
  } catch (error) {
    if (isInvalidOriginError(error)) {
      return fail("That request came from an unexpected origin.", 403);
    }
    if (isUnauthorizedApiError(error)) {
      return fail("Unauthorized", 401);
    }
    console.error("Delete report schedule error:", error);
    return fail("The report schedule could not be deleted.");
  }
}
