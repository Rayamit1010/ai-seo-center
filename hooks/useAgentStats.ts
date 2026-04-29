"use client";

import { useState, useEffect } from "react";
import type { PipelineStats } from "@/lib/agent/types";
import { humanizeErrorMessage } from "@/lib/errors";

const defaultStats: PipelineStats = {
  stages: {},
  campaigns: 0,
  totalProspects: 0,
  totalSent: 0,
  totalReplied: 0,
  totalLinks: 0,
  highQualityProspects: 0,
  averageQualityScore: 0,
  lowRiskProspects: 0,
  linksThisMonth: 0,
  replyRate: 0,
  conversionRate: 0,
  emailsSentToday: 0,
  dailyLimit: 50,
  topCampaigns: [],
};

export function useAgentStats(pollInterval = 30000) {
  const [stats, setStats] = useState<PipelineStats>(defaultStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchStats = async () => {
      try {
        const res = await fetch("/api/agent/stats", {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.reason || data.error || "Failed to fetch agent stats");
        }

        if (data.success) {
          setStats(data.data);
          setError(null);
        }
      } catch (caughtError) {
        if (controller.signal.aborted) {
          return;
        }
        setError(humanizeErrorMessage(caughtError));
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void fetchStats();
    const interval = setInterval(fetchStats, pollInterval);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [pollInterval]);

  return { stats, loading, error };
}
