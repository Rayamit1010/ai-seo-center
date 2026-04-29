type SupportedScheduleFrequency = "daily" | "weekly" | "monthly";

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function resolveTimeZone(timeZone?: string | null) {
  const candidate = timeZone?.trim() || "UTC";

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return "UTC";
  }
}

function getZonedParts(date: Date, timeZone?: string | null) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: resolveTimeZone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hour12: false,
  });

  const values = formatter.formatToParts(date).reduce<Record<string, string>>(
    (accumulator, part) => {
      if (part.type !== "literal") {
        accumulator[part.type] = part.value;
      }
      return accumulator;
    },
    {}
  );

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
    weekday: WEEKDAY_INDEX[values.weekday] ?? 0,
  };
}

function shiftCalendarDate(year: number, month: number, day: number, deltaDays: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + deltaDays);

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function shiftCalendarMonth(year: number, month: number, deltaMonths: number) {
  const date = new Date(Date.UTC(year, month - 1, 1));
  date.setUTCMonth(date.getUTCMonth() + deltaMonths);

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone?: string | null) {
  const parts = getZonedParts(date, timeZone);
  const utcEquivalent = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );

  return utcEquivalent - date.getTime();
}

function zonedLocalTimeToUtc(params: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  timeZone?: string | null;
}) {
  const firstGuess = new Date(
    Date.UTC(params.year, params.month - 1, params.day, params.hour, params.minute, 0, 0)
  );
  const firstOffset = getTimeZoneOffsetMs(firstGuess, params.timeZone);
  const corrected = new Date(firstGuess.getTime() - firstOffset);
  const correctedOffset = getTimeZoneOffsetMs(corrected, params.timeZone);

  if (correctedOffset === firstOffset) {
    return corrected;
  }

  return new Date(firstGuess.getTime() - correctedOffset);
}

function hasReachedScheduledTime(
  currentHour: number,
  currentMinute: number,
  targetHour: number,
  targetMinute: number
) {
  return (
    currentHour > targetHour ||
    (currentHour === targetHour && currentMinute >= targetMinute)
  );
}

export function computeNextScheduledRun(input: {
  frequency: SupportedScheduleFrequency;
  weekday?: number | null;
  monthDay?: number | null;
  hour: number;
  minute: number;
  timezone?: string | null;
  from?: Date;
}) {
  const from = input.from || new Date();
  const timeZone = resolveTimeZone(input.timezone);
  const local = getZonedParts(from, timeZone);

  if (input.frequency === "daily") {
    const nextDate = hasReachedScheduledTime(
      local.hour,
      local.minute,
      input.hour,
      input.minute
    )
      ? shiftCalendarDate(local.year, local.month, local.day, 1)
      : { year: local.year, month: local.month, day: local.day };

    return zonedLocalTimeToUtc({
      ...nextDate,
      hour: input.hour,
      minute: input.minute,
      timeZone,
    });
  }

  if (input.frequency === "weekly") {
    let dayOffset = ((input.weekday ?? 1) - local.weekday + 7) % 7;

    if (
      dayOffset === 0 &&
      hasReachedScheduledTime(local.hour, local.minute, input.hour, input.minute)
    ) {
      dayOffset = 7;
    }

    const nextDate = shiftCalendarDate(local.year, local.month, local.day, dayOffset);
    return zonedLocalTimeToUtc({
      ...nextDate,
      hour: input.hour,
      minute: input.minute,
      timeZone,
    });
  }

  const safeMonthDay = Math.min(Math.max(input.monthDay ?? 1, 1), 28);
  const useCurrentMonth =
    local.day < safeMonthDay ||
    (local.day === safeMonthDay &&
      !hasReachedScheduledTime(local.hour, local.minute, input.hour, input.minute));

  const targetMonth = useCurrentMonth
    ? { year: local.year, month: local.month }
    : shiftCalendarMonth(local.year, local.month, 1);

  return zonedLocalTimeToUtc({
    ...targetMonth,
    day: safeMonthDay,
    hour: input.hour,
    minute: input.minute,
    timeZone,
  });
}
