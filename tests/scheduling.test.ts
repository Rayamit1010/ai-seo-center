import assert from "node:assert/strict";
import test from "node:test";
import { computeNextScheduledRun } from "../lib/scheduling";

test("daily schedules respect timezone-local cutoffs", () => {
  const from = new Date("2026-04-08T15:40:00.000Z"); // 9:10 PM in Asia/Kolkata

  const nextRun = computeNextScheduledRun({
    frequency: "daily",
    hour: 21,
    minute: 0,
    timezone: "Asia/Kolkata",
    from,
  });

  assert.equal(nextRun.toISOString(), "2026-04-09T15:30:00.000Z");
});

test("weekly schedules keep the requested local weekday and time", () => {
  const from = new Date("2026-04-08T10:00:00.000Z"); // Wednesday afternoon in Asia/Kolkata

  const nextRun = computeNextScheduledRun({
    frequency: "weekly",
    weekday: 1,
    hour: 9,
    minute: 0,
    timezone: "Asia/Kolkata",
    from,
  });

  assert.equal(nextRun.toISOString(), "2026-04-13T03:30:00.000Z");
});

test("monthly schedules roll into the next month after the slot passes", () => {
  const from = new Date("2026-04-28T16:00:00.000Z"); // 9:30 PM in Asia/Kolkata

  const nextRun = computeNextScheduledRun({
    frequency: "monthly",
    monthDay: 28,
    hour: 21,
    minute: 0,
    timezone: "Asia/Kolkata",
    from,
  });

  assert.equal(nextRun.toISOString(), "2026-05-28T15:30:00.000Z");
});
