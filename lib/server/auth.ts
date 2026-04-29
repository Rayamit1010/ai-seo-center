import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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
