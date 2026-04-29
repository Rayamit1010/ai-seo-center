export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "An unexpected error occurred.";
}

export function humanizeErrorMessage(error: unknown): string {
  const message = getErrorMessage(error);
  const lower = message.toLowerCase();

  if (lower.includes("unauthorized")) {
    return "You need to sign in again before this page can load fresh data.";
  }

  if (lower.includes("api key not configured") || lower.includes("missing key")) {
    return "One of the AI providers is missing its API key, so the request could not be completed there.";
  }

  if (lower.includes("rate limit") || lower.includes("quota") || lower.includes("429")) {
    return "That provider has hit its usage limit for now, so the system is waiting or switching to another provider.";
  }

  if (
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("overloaded") ||
    lower.includes("temporarily unavailable")
  ) {
    return "The provider took too long to respond or is temporarily overloaded. Retrying later should help.";
  }

  if (lower.includes("fetch failed") || lower.includes("network")) {
    return "The app could not reach the service over the network. This is usually a temporary connectivity issue.";
  }

  if (lower.includes("json")) {
    return "The service replied in an unexpected format, so the app could not safely process the result.";
  }

  if (lower.includes("redis")) {
    return "The shared infrastructure service is not responding correctly right now, so background processing may be delayed.";
  }

  if (lower.includes("internal urls are not allowed")) {
    return "That URL points to a local or private address, which is blocked for security reasons.";
  }

  return "Something went wrong, but the app caught it safely. Please try again, and if it keeps happening we can inspect the logs and recent incidents.";
}

export function summarizeError(error: unknown) {
  return {
    raw: getErrorMessage(error),
    human: humanizeErrorMessage(error),
  };
}
