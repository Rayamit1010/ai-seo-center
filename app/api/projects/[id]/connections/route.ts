import { getProjectProfile } from "@/lib/services/project-profile-service";
import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { fail, ok } from "@/lib/server/response";
import { getExternalDataSnapshot } from "@/lib/services/external-data-service";
import { inspectProjectCmsConnection } from "@/lib/integrations/cms";

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

    const [externalData, cms] = await Promise.all([
      getExternalDataSnapshot(profile),
      inspectProjectCmsConnection(userId, id),
    ]);

    return ok({
      projectId: profile.id,
      searchConsole: profile.searchConsoleSiteUrl
        ? {
            configured: true,
            ok: Boolean(externalData?.searchConsole),
            message:
              externalData?.searchConsole
                ? "Search Console data loaded successfully."
                : externalData?.warnings.find((warning) =>
                    warning.toLowerCase().includes("search console")
                  ) || "Search Console is configured but data could not be loaded right now.",
          }
        : {
            configured: false,
            ok: false,
            message: "Search Console is not connected for this project.",
          },
      ga4: profile.ga4PropertyId
        ? {
            configured: true,
            ok: Boolean(externalData?.ga4),
            message:
              externalData?.ga4
                ? "GA4 data loaded successfully."
                : externalData?.warnings.find((warning) =>
                    warning.toLowerCase().includes("ga4")
                  ) || "GA4 is configured but data could not be loaded right now.",
          }
        : {
            configured: false,
            ok: false,
            message: "GA4 is not connected for this project.",
          },
      cms,
      warnings: externalData?.warnings || [],
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (isUnauthorizedApiError(error)) {
      return fail("Unauthorized", 401);
    }
    console.error("Project connection check error:", error);
    return fail("The project connections could not be checked right now.");
  }
}
