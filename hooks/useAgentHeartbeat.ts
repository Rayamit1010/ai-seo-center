"use client";

import { useState, useEffect, useCallback } from "react";
import { HEARTBEAT_INTERVAL_MS } from "@/lib/agent/constants";
import type { AgentHeartbeatStatus } from "@/lib/agent/types";
import { humanizeErrorMessage } from "@/lib/errors";

const defaultStatus: AgentHeartbeatStatus = {
  isRunning: false,
  lastRun: null,
  nextRun: null,
  cycleIntervalMinutes: 15,
  pending: { discover: 0, qualify: 0, contact: 0, draft: 0, send: 0 },
  todayStats: { emailsSent: 0, dailyLimit: 50, prospectsDiscovered: 0, prospectsQualified: 0 },
};

type HeartbeatPayload = {
  success: boolean;
  data?: AgentHeartbeatStatus & {
    cycle?: {
      skipped?: boolean;
      reason?: string;
      processed?: number;
    };
  };
  error?: string;
  reason?: string;
};

export function useAgentHeartbeat(pollingEnabled = true, intervalMs = HEARTBEAT_INTERVAL_MS) {
  const [status, setStatus] = useState<AgentHeartbeatStatus>(defaultStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyPayload = useCallback((payload: HeartbeatPayload) => {
    if (!payload.success || !payload.data) {
      throw new Error(payload.reason || payload.error || "Failed to load agent status");
    }

    setStatus({
      isRunning: payload.data.isRunning ?? false,
      lastRun: payload.data.lastRun ?? null,
      nextRun: payload.data.nextRun ?? null,
      cycleIntervalMinutes: payload.data.cycleIntervalMinutes ?? defaultStatus.cycleIntervalMinutes,
      pending: payload.data.pending ?? defaultStatus.pending,
      todayStats: payload.data.todayStats ?? defaultStatus.todayStats,
    });
  }, []);

  const fetchStatus = useCallback(async () => {
    if (!pollingEnabled) return;
    try {
      setLoading(true);
      const response = await fetch("/api/agent/heartbeat", { cache: "no-store" });
      const payload = (await response.json()) as HeartbeatPayload;
      if (!response.ok) {
        throw new Error(payload.reason || payload.error || "Failed to load agent status");
      }
      applyPayload(payload);
      setError(null);
    } catch (caughtError) {
      setError(humanizeErrorMessage(caughtError));
    } finally {
      setLoading(false);
    }
  }, [applyPayload, pollingEnabled]);

  const triggerNow = useCallback(async (campaignId?: string) => {
    try {
      setLoading(true);
      const response = await fetch("/api/agent/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(campaignId ? { campaignId } : {}),
      });
      const payload = (await response.json()) as HeartbeatPayload;
      if (!response.ok) {
        throw new Error(payload.reason || payload.error || "Failed to run the agent");
      }
      applyPayload(payload);
      setError(null);
      return payload.data?.cycle;
    } catch (caughtError) {
      const nextError = humanizeErrorMessage(caughtError);
      setError(nextError);
      throw new Error(nextError);
    } finally {
      setLoading(false);
    }
  }, [applyPayload]);

  useEffect(() => {
    if (!pollingEnabled) return;
    void fetchStatus();
    const interval = setInterval(() => {
      void fetchStatus();
    }, intervalMs);
    return () => clearInterval(interval);
  }, [fetchStatus, intervalMs, pollingEnabled]);

  return { status, loading, error, triggerNow, refresh: fetchStatus };
}
