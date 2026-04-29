export type RouteTimingStep = {
  label: string;
  durationMs: number;
};

type RouteTimingLogInput = {
  name: string;
  startedAt: number;
  steps?: RouteTimingStep[];
  meta?: Record<string, unknown>;
  error?: unknown;
  thresholdMs?: number;
};

function getSlowApiThresholdMs() {
  const configured = Number(process.env.SLOW_API_THRESHOLD_MS ?? "750");
  return Number.isFinite(configured) && configured > 0 ? configured : 750;
}

export async function measureStep<T>(
  label: string,
  operation: () => Promise<T>
): Promise<{ value: T; timing: RouteTimingStep }> {
  const startedAt = performance.now();
  const value = await operation();
  return {
    value,
    timing: {
      label,
      durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
    },
  };
}

export function logRouteTiming(input: RouteTimingLogInput) {
  const durationMs =
    Math.round((performance.now() - input.startedAt) * 100) / 100;
  const thresholdMs = input.thresholdMs ?? getSlowApiThresholdMs();
  const shouldLog =
    process.env.NODE_ENV !== "test" &&
    (durationMs >= thresholdMs ||
      process.env.LOG_ALL_API_TIMINGS === "true" ||
      Boolean(input.error));

  if (!shouldLog) {
    return;
  }

  const level = input.error || durationMs >= thresholdMs ? "warn" : "info";
  const payload = {
    route: input.name,
    durationMs,
    thresholdMs,
    steps: input.steps,
    meta: input.meta,
    error:
      input.error instanceof Error
        ? input.error.message
        : input.error
          ? String(input.error)
          : undefined,
  };

  if (level === "warn") {
    console.warn("Slow route detected:", payload);
    return;
  }

  console.info("Route timing:", payload);
}
