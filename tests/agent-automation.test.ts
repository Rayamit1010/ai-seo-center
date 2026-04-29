import assert from "node:assert/strict";
import test from "node:test";
import { computeNextAgentRunFromConfig } from "../lib/services/agent-automation-service";

test("agent scheduling respects the most recent queued or heartbeat activity", () => {
  const nextRun = computeNextAgentRunFromConfig({
    lastHeartbeatAt: new Date("2026-04-08T10:00:00.000Z"),
    lastCycleQueuedAt: new Date("2026-04-08T10:10:00.000Z"),
    cycleIntervalMinutes: 15,
  });

  assert.equal(nextRun?.toISOString(), "2026-04-08T10:25:00.000Z");
});

test("agent scheduling returns null when no prior activity exists", () => {
  const nextRun = computeNextAgentRunFromConfig({
    lastHeartbeatAt: null,
    lastCycleQueuedAt: null,
    cycleIntervalMinutes: 15,
  });

  assert.equal(nextRun, null);
});
