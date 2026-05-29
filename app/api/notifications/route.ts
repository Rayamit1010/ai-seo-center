import { prisma } from "@/lib/db";
import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { fail, ok } from "@/lib/server/response";

export const dynamic = "force-dynamic";

const SEVERITY_MAP: Record<string, "info" | "warning" | "error" | "success"> = {
  rank_drop: "warning",
  audit_complete: "success",
  invite: "info",
  system: "info",
  content: "success",
};

export async function GET() {
  try {
    const userId = await getRequiredUserId();

    const dbNotifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const unreadCount = dbNotifications.filter((n) => !n.read).length;

    const items = dbNotifications.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      severity: SEVERITY_MAP[n.type] ?? "info",
      createdAt: n.createdAt.toISOString(),
      href: n.url ?? "/ops",
      read: n.read,
    }));

    if (items.length === 0) {
      items.push({
        id: "system-healthy",
        title: "System looks healthy",
        message: "No recent notifications. Your SEO operations are running smoothly.",
        severity: "success",
        createdAt: new Date().toISOString(),
        href: "/ops",
        read: true,
      });
    }

    return ok({ unreadCount, items });
  } catch (error) {
    if (isUnauthorizedApiError(error)) {
      return fail("Unauthorized", 401);
    }
    console.error("Notifications error:", error);
    return fail("Failed to load notifications", 500);
  }
}
