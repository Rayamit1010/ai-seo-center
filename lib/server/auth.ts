import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export class UnauthorizedApiError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedApiError";
  }
}

export async function getRequiredUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    throw new UnauthorizedApiError();
  }

  return userId;
}

export function isUnauthorizedApiError(error: unknown): error is UnauthorizedApiError {
  return error instanceof UnauthorizedApiError;
}

// Admin/owner users bypass all subscription and quota checks.
// Recognises admins by DB role OR by email listed in ADMIN_EMAILS env var (comma-separated).
export async function isAdminUser(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, email: true },
  });
  if (user?.role === "admin") return true;

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.length > 0 && !!user?.email && adminEmails.includes(user.email.toLowerCase());
}
