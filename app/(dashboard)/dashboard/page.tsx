"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  BarChart3,
  TrendingUp,
  ArrowRight,
  Globe,
  Tags,
  LinkIcon,
  MessageSquare,
  Activity,
  Brain,
  ShieldCheck,
  TimerReset,
} from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { formatDate } from "@/lib/utils";
import { humanizeErrorMessage } from "@/lib/errors";
import { useAgentStats } from "@/hooks/useAgentStats";

interface AuditSummary {
  id: string;
  url: string;
  title: string | null;
  status: string;
  scores: { overall: number } | null;
  createdAt: string;
}

export default function DashboardPage() {
  const [audits, setAudits] = useState<AuditSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const { stats, error: statsError } = useAgentStats();

  const loadAudits = async () => {
    try {
      setLoading(true);
      setError(null);
      setErrorDetail(null);

      const res = await fetch("/api/audit");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.reason || data.error || "Failed to load audits");
      }

      if (data.success) {
        setAudits(data.data);
      }
    } catch (caughtError) {
      setError(humanizeErrorMessage(caughtError));
      setErrorDetail(caughtError instanceof Error ? caughtError.message : null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAudits();
  }, []);

  const completedAudits = audits.filter((a) => a.status === "COMPLETE");
  const avgScore =
    completedAudits.length > 0
      ? Math.round(
          completedAudits.reduce(
            (sum, a) => sum + ((a.scores as { overall: number } | null)?.overall ?? 0),
            0
          ) / completedAudits.length
        )
      : 0;

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h2 className="font-heading text-2xl font-bold text-text-primary">
          Welcome to SEO Command Center
        </h2>
        <p className="mt-1 text-text-secondary">
          Your AI-powered SEO toolkit for techgeekstudio.com
        </p>
      </div>

      {error || statsError ? (
        <ErrorState
          title="Some dashboard data needs attention"
          message={error || statsError || "Part of the dashboard could not be loaded."}
          detail={errorDetail}
          onRetry={() => void loadAudits()}
        />
      ) : null}

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Audits"
          value={loading ? "..." : audits.length}
          icon={Search}
          change="All time"
          changeType="neutral"
        />
        <KPICard
          title="Avg SEO Score"
          value={loading ? "..." : avgScore}
          icon={BarChart3}
          change={avgScore >= 80 ? "Excellent" : avgScore >= 60 ? "Needs work" : "Critical"}
          changeType={avgScore >= 80 ? "positive" : avgScore >= 60 ? "neutral" : "negative"}
        />
        <KPICard
          title="Completed"
          value={loading ? "..." : completedAudits.length}
          icon={TrendingUp}
          change="Audits completed"
          changeType="positive"
        />
        <KPICard
          title="Healthy AI Providers"
          value={stats.aiHealth ? `${stats.aiHealth.totals.healthyProviders}/${stats.aiHealth.totals.configuredProviders}` : "..."}
          icon={Brain}
          change={
            stats.aiHealth
              ? `${stats.aiHealth.totals.failovers} failovers handled`
              : "Monitoring AI mesh"
          }
          changeType={stats.aiHealth && stats.aiHealth.totals.healthyProviders > 0 ? "positive" : "neutral"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden border-primary/20 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.15),transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))]">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>AI Command Mesh</CardTitle>
                <p className="text-sm text-text-secondary">
                  Live health, failover pressure, and recommended engines for your workflows.
                </p>
              </div>
              <Badge variant="success">
                {stats.aiHealth?.totals.healthyProviders ?? 0} healthy
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.aiHealth?.providers?.length ? (
              stats.aiHealth.providers.map((provider) => (
                <div
                  key={provider.id}
                  className="grid gap-3 rounded-xl border border-border/70 bg-background/70 p-4 md:grid-cols-[1.2fr_0.8fr_0.7fr_0.7fr]"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-text-primary">{provider.name}</p>
                      {provider.recommended ? <Badge variant="success">Recommended</Badge> : null}
                      {provider.cooldownUntil ? <Badge variant="warning">Cooling down</Badge> : null}
                    </div>
                    <p className="mt-1 text-xs text-text-secondary">
                      {provider.lastError || "Healthy and ready for AI workloads"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-text-muted">Success</p>
                    <p className="mt-1 font-mono text-lg font-semibold text-text-primary">
                      {provider.successRate}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-text-muted">Avg Latency</p>
                    <p className="mt-1 font-mono text-lg font-semibold text-text-primary">
                      {provider.averageLatencyMs ? `${provider.averageLatencyMs}ms` : "--"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-text-muted">Health</p>
                    <p className="mt-1 font-mono text-lg font-semibold text-text-primary">
                      {provider.healthScore}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-background/60 p-8 text-center text-sm text-text-secondary">
                Start using chat or AI tools to build provider health telemetry.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Operations Pulse</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-background p-4">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-text-primary">AI Attempts</p>
                  <p className="text-xs text-text-secondary">All providers combined</p>
                </div>
              </div>
              <p className="font-mono text-xl font-bold text-text-primary">
                {stats.aiHealth?.totals.attempts ?? 0}
              </p>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-background p-4">
              <div className="flex items-center gap-3">
                <TimerReset className="h-5 w-5 text-warning" />
                <div>
                  <p className="text-sm font-medium text-text-primary">Auto Failovers</p>
                  <p className="text-xs text-text-secondary">Requests rescued by routing</p>
                </div>
              </div>
              <p className="font-mono text-xl font-bold text-text-primary">
                {stats.aiHealth?.totals.failovers ?? 0}
              </p>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-background p-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-success" />
                <div>
                  <p className="text-sm font-medium text-text-primary">Reply Rate</p>
                  <p className="text-xs text-text-secondary">Backlink agent output quality</p>
                </div>
              </div>
              <p className="font-mono text-xl font-bold text-text-primary">
                {stats.replyRate}%
              </p>
            </div>
            <Link href="/settings">
              <Button variant="outline" className="w-full">
                Tune AI Router <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="mb-4 font-heading text-lg font-semibold text-text-primary">
          Quick Actions
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/audit", icon: Globe, label: "New SEO Audit", desc: "Analyze any URL" },
            { href: "/keywords", icon: Tags, label: "Keyword Research", desc: "Discover opportunities" },
            { href: "/backlinks", icon: LinkIcon, label: "Backlink Strategy", desc: "Build authority" },
            { href: "/chat", icon: MessageSquare, label: "AI Chat", desc: "Ask anything SEO" },
          ].map((action) => (
            <Link key={action.href} href={action.href}>
              <div className="group flex items-center gap-4 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/50 hover:bg-surface-hover">
                <div className="rounded-lg bg-primary-light p-2.5">
                  <action.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">{action.label}</p>
                  <p className="text-xs text-text-muted">{action.desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-text-muted transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Audits */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-heading text-lg font-semibold text-text-primary">
            Recent Audits
          </h3>
          <Link href="/reports">
            <Button variant="ghost" size="sm">
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : audits.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center">
            <Search className="mx-auto h-10 w-10 text-text-muted" />
            <p className="mt-3 text-sm text-text-secondary">
              No audits yet. Start your first SEO audit!
            </p>
            <Link href="/audit">
              <Button className="mt-4" size="sm">
                Run First Audit
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {audits.slice(0, 5).map((audit) => (
              <Link key={audit.id} href={`/audit/${audit.id}`}>
                <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/50">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-light font-mono text-sm font-bold text-primary">
                      {(audit.scores as { overall: number } | null)?.overall ?? "—"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {audit.title || audit.url}
                      </p>
                      <p className="text-xs text-text-muted font-mono">{audit.url}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        audit.status === "COMPLETE"
                          ? "success"
                          : audit.status === "FAILED"
                            ? "destructive"
                            : "warning"
                      }
                    >
                      {audit.status}
                    </Badge>
                    <span className="text-xs text-text-muted">
                      {formatDate(audit.createdAt)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
