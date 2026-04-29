export class InvalidOriginError extends Error {
  constructor() {
    super("Invalid request origin");
    this.name = "InvalidOriginError";
  }
}

function normalizeOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function getAllowedOrigins(req: Request) {
  const origins = new Set<string>();
  const envOrigins = [
    process.env.NEXTAUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ]
    .map((value) => (value ? normalizeOrigin(value) : null))
    .filter((value): value is string => Boolean(value));

  for (const origin of envOrigins) {
    origins.add(origin);
  }

  const forwardedProto = req.headers.get("x-forwarded-proto");
  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = forwardedHost || req.headers.get("host");

  if (host) {
    origins.add(`${forwardedProto || "http"}://${host}`);
    origins.add(`https://${host}`);
    origins.add(`http://${host}`);
  }

  return origins;
}

export function assertTrustedOrigin(req: Request) {
  const method = req.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return;
  }

  const origin = req.headers.get("origin");
  if (!origin) {
    if (process.env.NODE_ENV !== "production") {
      return;
    }
    throw new InvalidOriginError();
  }

  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) {
    throw new InvalidOriginError();
  }

  const allowedOrigins = getAllowedOrigins(req);
  if (!allowedOrigins.has(normalizedOrigin)) {
    throw new InvalidOriginError();
  }
}

export function isInvalidOriginError(error: unknown): error is InvalidOriginError {
  return error instanceof InvalidOriginError;
}
