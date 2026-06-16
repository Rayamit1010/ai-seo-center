import assert from "node:assert/strict";
import test from "node:test";
import { nextRunDate } from "../lib/services/automation-service";

// All "from" dates are at 08:00 UTC (the scheduled hour) so we can reason
// about next-run in calendar terms rather than time-of-day terms.

test("daily: advances exactly one calendar day and lands at 08:00", () => {
  const from = new Date("2026-06-16T08:00:00.000Z");
  const next = nextRunDate("daily", from);
  assert.equal(next.toISOString(), "2026-06-17T08:00:00.000Z");
});

test("daily: works across month boundary", () => {
  const from = new Date("2026-06-30T08:00:00.000Z");
  const next = nextRunDate("daily", from);
  assert.equal(next.toISOString(), "2026-07-01T08:00:00.000Z");
});

test("weekly: advances exactly 7 days and lands at 08:00", () => {
  const from = new Date("2026-06-16T08:00:00.000Z");
  const next = nextRunDate("weekly", from);
  assert.equal(next.toISOString(), "2026-06-23T08:00:00.000Z");
});

test("weekly: is the default for unknown frequency values", () => {
  const from = new Date("2026-06-16T08:00:00.000Z");
  const next = nextRunDate("unknown", from);
  assert.equal(next.toISOString(), "2026-06-23T08:00:00.000Z");
});

test("monthly: advances to the 1st of next month", () => {
  const from = new Date("2026-06-16T08:00:00.000Z");
  const next = nextRunDate("monthly", from);
  assert.equal(next.toISOString(), "2026-07-01T08:00:00.000Z");
});

test("monthly: does not overflow when source day is 31 (Jan → Feb)", () => {
  const from = new Date("2026-01-31T08:00:00.000Z");
  const next = nextRunDate("monthly", from);
  // Should land on Feb 1, not Mar 2 or Mar 3 (day-31 overflow into March)
  assert.equal(next.getUTCMonth(), 1, "should be February (month index 1)");
  assert.equal(next.getUTCDate(), 1, "should be the 1st");
});

test("monthly: crosses year boundary (December → January)", () => {
  const from = new Date("2026-12-16T08:00:00.000Z");
  const next = nextRunDate("monthly", from);
  assert.equal(next.getUTCFullYear(), 2027);
  assert.equal(next.getUTCMonth(), 0);
  assert.equal(next.getUTCDate(), 1);
});

test("does not mutate the input date", () => {
  const from = new Date("2026-06-16T08:00:00.000Z");
  const original = from.toISOString();
  nextRunDate("daily", from);
  assert.equal(from.toISOString(), original);
});
