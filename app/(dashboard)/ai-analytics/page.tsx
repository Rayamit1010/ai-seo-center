"use client";

import { useEffect, useState } from "react";
import { Activity, AlertTriangle, Brain, CheckCircle2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { humanizeErrorMessage } from "@/lib/errors";

interface AnalyticsPayload {
  health: {
    totals: {
      attempts: number;
      failovers: number;
      configuredProviders: number;
      healthyProviders: number;
    };
  };
  providerSummary: Array<{
    id: string;
    name: string;
    configured: boolean;
    successRate: number;
    averageLatencyMs: number | null;
    attempts: number;
    failures: number;
    failovers: number;
    healthScore: number;
    lastError: string | null;
    cooldownUntil: string | null;
    taskBreakdown: Record<string, number>;
    recentEvents: Array<{
      id: string;
      success: boolean;
      latencyMs: number;
      task: string | null;
      createdAt: string;
    }>;
  }>;
  timeline: Array<{
    id: string;
    providerId: string;
    task: string | null;
    success: boolean;
    failover: boolean;
    latencyMs: number;
    errorMessage: string | null;
    createdAt: string;
  }>;
}

export default function AIAnalyticsPage() {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      setDetail(null);
      const response = await fetch("/api/ai/analytics");
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.reason || payload.error || "Failed to load AI analytics");
      }

      if (payload.success) {
        setData(payload.data);
      }
    } catch (caughtError) {
      setError(humanizeErrorMessage(caughtError));
      setDetail(caughtError instanceof Error ? caughtError.message : null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAnalytics();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-text-primary">AI Analytics</h2>
          <p className="mt-1 text-text-secondary">
            Persistent telemetry for provider health, failovers, latency, and task routing.
          </p>
        </div>
        <Button variant="outline" onClick={() => void loadAnalytics()} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {error ? (
        <ErrorState
          title="AI analytics could not fully load"
          message={error}
          detail={detail}
          onRetry={() => void loadAnalytics()}
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard title="AI Attempts" value={data?.health.totals.attempts ?? 0} icon={Brain} />
        <MetricCard title="Failovers" value={data?.health.totals.failovers ?? 0} icon={RefreshCw} />
        <MetricCard title="Configured" value={data?.health.totals.configuredProviders ?? 0} icon={CheckCircle2} />
        <MetricCard title="Healthy" value={data?.health.totals.healthyProviders ?? 0} icon={Activity} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {data?.providerSummary.map((provider) => (
          <Card key={provider.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>{provider.name}</CardTitle>
                <div className="flex gap-2">
                  <Badge variant={provider.configured ? "success" : "outline"}>
                    {provider.configured ? "Configured" : "Missing key"}
                  </Badge>
                  {provider.cooldownUntil ? <Badge variant="warning">Cooling down</Badge> : null}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                <StatChip label="Health" value={provider.healthScore} />
                <StatChip label="Success" value={`${provider.successRate}%`} />
                <StatChip label="Latency" value={provider.averageLatencyMs ? `${provider.averageLatencyMs}ms` : "--"} />
                <StatChip label="Failovers" value={provider.failovers} />
              </div>

              <div className="rounded-xl bg-background p-4">
                <p className="text-sm font-medium text-text-primary">Task Mix</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(provider.taskBreakdown).length > 0 ? (
                    Object.entries(provider.taskBreakdown).map(([task, count]) => (
                      <Badge key={task} variant="outline">
                        {task}: {count}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-text-secondary">No persisted task usage yet</span>
                  )}
                </div>
              </div>

              <div className="rounded-xl bg-background p-4">
                <p className="text-sm font-medium text-text-primary">Recent Events</p>
                <div className="mt-3 space-y-2">
                  {provider.recentEvents.length > 0 ? (
                    provider.recentEvents.map((event) => (
                      <div key={event.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          {event.success ? (
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-warning" />
                          )}
                          <span className="text-text-primary">{event.task || "general"}</span>
                        </div>
                        <span className="text-text-secondary">
                          {event.latencyMs}ms · {new Date(event.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-text-secondary">No provider events stored yet.</p>
                  )}
                </div>
                {provider.lastError ? (
                  <p className="mt-3 text-sm text-warning">Last error: {provider.lastError}</p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Telemetry Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data?.timeline.length ? (
            data.timeline.map((event) => (
              <div key={event.id} className="flex flex-col gap-2 rounded-xl border border-border bg-background p-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant={event.success ? "success" : "destructive"}>
                    {event.providerId}
                  </Badge>
                  <span className="text-sm text-text-primary">{event.task || "general"}</span>
                  {event.failover ? <Badge variant="warning">Failover</Badge> : null}
                </div>
                <div className="flex items-center gap-3 text-sm text-text-secondary">
                  <span>{event.latencyMs}ms</span>
                  <span>{new Date(event.createdAt).toLocaleString()}</span>
                  {event.errorMessage ? <span className="text-warning">{event.errorMessage}</span> : null}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-text-secondary">No telemetry stored yet. Use the AI tools to generate analytics.</p>
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
  icon: typeof Brain;
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

function StatChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-background p-4">
      <p className="text-xs uppercase tracking-wide text-text-muted">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold text-text-primary">{value}</p>
    </div>
  );
}
