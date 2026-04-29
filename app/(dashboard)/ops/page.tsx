"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Bot,
  Clock3,
  DatabaseZap,
  RefreshCw,
  Siren,
} from "lucide-react";
import { ErrorState } from "@/components/ui/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { humanizeErrorMessage } from "@/lib/errors";

interface OpsPayload {
  generatedAt: string;
  architecture: {
    rateLimitProvider: string;
    jobQueueProvider: string;
    jobQueueRemoteOnly: boolean;
  };
  queue: {
    provider: string;
    remoteOnly: boolean;
    localPending: number;
    remotePending: number;
    processing: number;
    deadLetter: number;
    totalPending: number;
    recentEvents: Array<{
      id: string;
      jobName: string;
      success: boolean;
      createdAt: string;
      reason: string | null;
      rawError: string | null;
    }>;
  };
  ai: {
    health: {
      totals: {
        attempts: number;
        failovers: number;
        configuredProviders: number;
        healthyProviders: number;
      };
      providers: Array<{
        id: string;
        name: string;
        configured: boolean;
        successRate: number;
        averageLatencyMs: number | null;
        failovers: number;
        healthScore: number;
        cooldownUntil: string | null;
        lastError: string | null;
      }>;
    };
    providersWithIssues: Array<{
      id: string;
      name: string;
      configured: boolean;
      cooldownUntil: string | null;
      lastError: string | null;
      healthScore: number;
    }>;
  };
  incidents: Array<{
    id: string;
    source: string;
    title: string;
    createdAt: string;
    reason: string;
    rawError: string | null;
  }>;
  summary: {
    incidentCount: number;
    pendingJobs: number;
    healthyProviders: number;
    configuredProviders: number;
  };
}

export default function OpsPage() {
  const [data, setData] = useState<OpsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);

  const loadOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      setDetail(null);

      const response = await fetch("/api/ops/overview", { cache: "no-store" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.reason || payload.error || "Failed to load operations overview");
      }

      if (!payload.success) {
        throw new Error(payload.reason || "The operations overview came back incomplete.");
      }

      setData(payload.data);
    } catch (caughtError) {
      setError(humanizeErrorMessage(caughtError));
      setDetail(caughtError instanceof Error ? caughtError.message : null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOverview();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-text-primary">
            Operations Center
          </h2>
          <p className="mt-1 text-text-secondary">
            Live status for routing, queueing, and the reasons behind recent issues.
          </p>
        </div>
        <Button variant="outline" onClick={() => void loadOverview()} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {error ? (
        <ErrorState
          title="The ops view could not fully load"
          message={error}
          detail={detail}
          onRetry={() => void loadOverview()}
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard title="Pending Jobs" value={data?.summary.pendingJobs ?? (loading ? "..." : 0)} icon={Clock3} />
        <MetricCard title="Recent Incidents" value={data?.summary.incidentCount ?? (loading ? "..." : 0)} icon={Siren} />
        <MetricCard title="Healthy AI" value={data ? `${data.summary.healthyProviders}/${data.summary.configuredProviders}` : loading ? "..." : "0/0"} icon={Bot} />
        <MetricCard title="Failovers" value={data?.ai.health.totals.failovers ?? (loading ? "..." : 0)} icon={Activity} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="overflow-hidden border-primary/20 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.12),transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))]">
          <CardHeader>
            <CardTitle>Infrastructure Mode</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <InfraChip
                label="Rate Limiter"
                value={data?.architecture.rateLimitProvider ?? (loading ? "Loading..." : "Unknown")}
              />
              <InfraChip
                label="Job Queue"
                value={data?.architecture.jobQueueProvider ?? (loading ? "Loading..." : "Unknown")}
              />
              <InfraChip
                label="Queue Routing"
                value={
                  data
                    ? data.architecture.jobQueueRemoteOnly
                      ? "Remote worker only"
                      : "Local fallback enabled"
                    : loading
                      ? "Loading..."
                      : "Unknown"
                }
              />
              <InfraChip
                label="Generated"
                value={
                  data
                    ? new Date(data.generatedAt).toLocaleTimeString()
                    : loading
                      ? "Loading..."
                      : "Unknown"
                }
              />
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <p className="text-sm font-medium text-text-primary">Queue Snapshot</p>
              <div className="mt-3 grid gap-3 md:grid-cols-4">
                <StatPill label="Total Pending" value={data?.queue.totalPending ?? 0} />
                <StatPill label="Local Pending" value={data?.queue.localPending ?? 0} />
                <StatPill label="Remote Pending" value={data?.queue.remotePending ?? 0} />
                <StatPill label="Dead Letter" value={data?.queue.deadLetter ?? 0} />
              </div>
              <p className="mt-3 text-xs text-text-muted">
                Processing now: {data?.queue.processing ?? 0}
              </p>
            </div>

            <Link href="/settings">
              <Button variant="outline" className="w-full">
                Review Provider Settings <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Providers Needing Attention</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data?.ai.providersWithIssues.length ? (
              data.ai.providersWithIssues.map((provider) => (
                <div
                  key={provider.id}
                  className="rounded-2xl border border-border/70 bg-background/70 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-text-primary">{provider.name}</p>
                    <Badge variant={provider.configured ? "warning" : "destructive"}>
                      {provider.configured ? "Needs review" : "Missing key"}
                    </Badge>
                    {provider.cooldownUntil ? <Badge variant="outline">Cooling down</Badge> : null}
                  </div>
                  <p className="mt-2 text-sm text-text-secondary">
                    {provider.lastError
                      ? humanizeErrorMessage(provider.lastError)
                      : "This provider is configured but not currently in a healthy state."}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    Health score: {provider.healthScore}
                    {provider.lastError ? ` · Technical detail: ${provider.lastError}` : ""}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-background/60 p-8 text-center text-sm text-text-secondary">
                No active provider issues right now. The AI router looks healthy.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Incidents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data?.incidents.length ? (
            data.incidents.map((incident) => (
              <div
                key={incident.id}
                className="rounded-2xl border border-border/70 bg-background/70 p-4"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={incident.source === "ai" ? "warning" : "destructive"}>
                      {incident.source.toUpperCase()}
                    </Badge>
                    <p className="font-medium text-text-primary">{incident.title}</p>
                  </div>
                  <span className="text-xs text-text-muted">
                    {new Date(incident.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-3 text-sm text-text-secondary">{incident.reason}</p>
                {incident.rawError ? (
                  <p className="mt-1 text-xs text-text-muted">
                    Technical detail: {incident.rawError}
                  </p>
                ) : null}
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-background/60 p-8 text-center text-sm text-text-secondary">
              No recent incidents were detected. That usually means the system is behaving normally.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  icon: typeof DatabaseZap;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-6">
        <div>
          <p className="text-sm text-text-secondary">{title}</p>
          <p className="mt-2 font-mono text-2xl font-bold text-text-primary">{value}</p>
        </div>
        <div className="rounded-xl bg-primary-light p-3">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </CardContent>
    </Card>
  );
}

function InfraChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-background p-4">
      <p className="text-xs uppercase tracking-wide text-text-muted">{label}</p>
      <p className="mt-1 text-sm font-medium text-text-primary">{value}</p>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-surface p-4">
      <p className="text-xs uppercase tracking-wide text-text-muted">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold text-text-primary">{value}</p>
    </div>
  );
}
