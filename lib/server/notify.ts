import { prisma } from "@/lib/db";

export type NotificationType = "rank_drop" | "audit_complete" | "invite" | "system" | "content";

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  url?: string,
  data?: Record<string, unknown>
) {
  try {
    return await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        url,
        data: data ? JSON.stringify(data) : undefined,
      },
    });
  } catch {
    // Non-critical — never let notification creation break core flows
  }
}
