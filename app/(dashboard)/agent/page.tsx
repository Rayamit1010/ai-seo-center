"use client";

import { useState, useEffect, useCallback } from "react";
import { useAgentHeartbeat } from "@/hooks/useAgentHeartbeat";
import { useAgentStats } from "@/hooks/useAgentStats";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ErrorState } from "@/components/ui/error-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Bot,
  Play,
  Pause,
  Plus,
  Send,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Link,
  TrendingUp,
  Activity,
  Globe,
  Zap,
  ShieldAlert,
  Filter,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import { STAGE_LABELS } from "@/lib/agent/constants";
import type { AgentLogEntry } from "@/lib/agent/types";

interface AgentConfigData {
  isEnabled: boolean;
  autoDiscover: boolean;
  autoQualify: boolean;
  autoContact: boolean;
  autoDraft: boolean;
  autoSend: boolean;
  autoFollowUp: boolean;
  cycleIntervalMinutes: number;
  lastHeartbeatAt?: string | null;
  fromEmail: string;
  fromName: string;
  dailyEmailLimit: number;
}

interface Campaign {
  id: string;
  name: string;
  targetUrl: string;
  industry: string;
  targetCountry: string;
  status: string;
  totalProspects: number;
  totalSent: number;
  totalReplied: number;
  totalLinks: number;
  createdAt: string;
}

interface Prospect {
  id: string;
  domain: string;
  url: string;
  stage: string;
  qualityScore: number | null;
  qualityTier: string | null;
  contactEmail: string | null;
  contactName: string | null;
  emailSubject: string | null;
  linkAcquired: boolean;
  linkUrl?: string | null;
  relevanceScore?: number | null;
  stageError?: string | null;
  qualifyData?: {
    redFlags?: string[];
    reasoning?: string;
  } | null;
  createdAt: string;
}

interface AgentRun {
  id: string;
  runType: string;
  status: string;
  itemsProcessed: number;
  itemsSucceeded: number;
  itemsFailed: number;
  durationMs: number | null;
  log: AgentLogEntry[];
  createdAt: string;
}

export default function AgentPage() {
  const [config, setConfig] = useState<AgentConfigData | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [stageFilter, setStageFilter] = useState("all");
  const [prospectQuery, setProspectQuery] = useState("");

  const {
    status: heartbeatStatus,
    loading: heartbeatLoading,
    error: heartbeatError,
    triggerNow,
  } = useAgentHeartbeat(true);
  const { stats, error: statsError } = useAgentStats();

  // Fetch config + campaigns + runs
  const fetchAll = useCallback(async () => {
    try {
      const [configRes, campaignsRes, runsRes] = await Promise.all([
        fetch("/api/agent/config"),
        fetch("/api/agent/campaigns"),
        fetch("/api/agent/runs"),
      ]);

      if (configRes.ok) {
        const d = await configRes.json();
        if (d.success) setConfig(d.data);
      }
      if (campaignsRes.ok) {
        const d = await campaignsRes.json();
        if (d.success) setCampaigns(d.data);
      }
      if (runsRes.ok) {
        const d = await runsRes.json();
        if (d.success) setRuns(d.data);
      }
    } catch {
      toast.error("Failed to load agent data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Fetch prospects for all campaigns
  useEffect(() => {
    if (campaigns.length === 0) return;
    const fetchProspects = async () => {
      const settled = await Promise.allSettled(
        campaigns.map((campaign) => fetch(`/api/agent/campaigns/${campaign.id}`).then((response) => response.json()))
      );

      const nextProspects = settled.flatMap((result) => {
        if (result.status !== "fulfilled") {
          return [];
        }
        return result.value?.success && Array.isArray(result.value?.data?.prospects)
          ? (result.value.data.prospects as Prospect[])
          : [];
      });

      setProspects(nextProspects);
    };
    void fetchProspects();
  }, [campaigns]);

  const updateCampaignStatus = async (id: string, status: "active" | "paused" | "completed") => {
    try {
      const res = await fetch(`/api/agent/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.reason || data.error || "Failed to update campaign");
      }
      setCampaigns((prev) => prev.map((campaign) => (campaign.id === id ? { ...campaign, status } : campaign)));
      toast.success(status === "active" ? "Campaign resumed" : status === "paused" ? "Campaign paused" : "Campaign completed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update campaign");
    }
  };

  const toggleAgent = async () => {
    const newEnabled = !config?.isEnabled;
    try {
      const res = await fetch("/api/agent/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: newEnabled }),
      });
      if (res.ok) {
        const d = await res.json();
        setConfig(d.data);
        toast.success(newEnabled ? "Agent activated" : "Agent paused");
      }
    } catch {
      toast.error("Failed to update agent");
    }
  };

  const toggleConfigField = async (field: string, value: boolean) => {
    try {
      const res = await fetch("/api/agent/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        const d = await res.json();
        setConfig(d.data);
      }
    } catch {
      toast.error("Failed to update setting");
    }
  };

  const updateCycleInterval = async (value: string) => {
    const cycleIntervalMinutes = Number(value);
    if (!Number.isFinite(cycleIntervalMinutes)) {
      return;
    }

    try {
      const res = await fetch("/api/agent/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cycleIntervalMinutes }),
      });
      if (res.ok) {
        const d = await res.json();
        setConfig(d.data);
        toast.success("Automation interval updated");
      }
    } catch {
      toast.error("Failed to update automation interval");
    }
  };

  const runAgentNow = async () => {
    try {
      const cycle = await triggerNow();
      await fetchAll();
      toast.success(
        cycle?.skipped
          ? cycle.reason === "disabled"
            ? "The agent is paused, so no run was started."
            : cycle.reason === "already_running"
              ? "A backlink cycle is already running, so the manual run was skipped safely."
              : "The agent skipped this manual run safely."
          : "The agent cycle started successfully."
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to run the agent");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Pipeline funnel data
  const funnelStages = [
    { key: "discovered", label: "Discovered", icon: Search, color: "text-blue-400" },
    { key: "qualified", label: "Qualified", icon: CheckCircle, color: "text-cyan-400" },
    { key: "contact_found", label: "Contact Found", icon: Mail, color: "text-indigo-400" },
    { key: "email_drafted", label: "Email Ready", icon: Send, color: "text-violet-400" },
    { key: "email_sent", label: "Sent", icon: Send, color: "text-amber-400" },
    { key: "replied", label: "Replied", icon: TrendingUp, color: "text-green-400" },
    { key: "completed", label: "Link Acquired", icon: Link, color: "text-emerald-400" },
  ];

  const filteredProspects = prospects.filter((prospect) => {
    const matchesStage = stageFilter === "all" || prospect.stage === stageFilter;
    const haystack = `${prospect.domain} ${prospect.contactEmail || ""} ${prospect.contactName || ""}`.toLowerCase();
    const matchesQuery = haystack.includes(prospectQuery.toLowerCase());
    return matchesStage && matchesQuery;
  });

  const acquiredLinks = prospects.filter((prospect) => prospect.linkAcquired);
  const riskyProspects = prospects.filter(
    (prospect) =>
      (prospect.qualifyData?.redFlags?.length || 0) > 0 ||
      (prospect.stageError || "").toLowerCase().includes("spam")
  );
  const expertRecommendations = [
    stats.averageQualityScore < 65
      ? "Tighten qualification rules and reject weaker domains faster so the agent spends more time on sites that can realistically move authority."
      : "Qualification quality looks healthy. Push harder on contact discovery and personalized outreach to convert more of the good domains you already have.",
    stats.replyRate < 8
      ? "Reply rate is still soft. Improve outreach angles with stronger value exchange, more relevant anchor context, and tighter site-fit messaging."
      : "Reply rate is trending well. Focus on follow-up timing and editorial relationship building to turn replies into live links.",
    riskyProspects.length > 0
      ? "Spam-risk prospects are still entering the pipeline. Review those domains for thin content, link farm patterns, and irrelevant outbound linking before sending more emails."
      : "Spam-risk signals are under control. Keep protecting quality by prioritizing topical relevance and editorial standards over raw prospect volume.",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-text-primary flex items-center gap-3">
            <Bot className="h-8 w-8 text-primary" />
            AI Backlink Agent
          </h1>
          <p className="text-text-secondary mt-1">
            Autonomous backlink acquisition — zero human interaction needed
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowNewCampaign(!showNewCampaign)}
            variant="outline"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Button>
          <Button
            onClick={toggleAgent}
            variant={config?.isEnabled ? "destructive" : "default"}
          >
            {config?.isEnabled ? (
              <>
                <Pause className="mr-2 h-4 w-4" />
                Pause Agent
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Start Agent
              </>
            )}
          </Button>
          <Button
            onClick={() => void runAgentNow()}
            variant="outline"
            disabled={heartbeatLoading}
          >
            {heartbeatLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Activity className="mr-2 h-4 w-4" />
            )}
            Run Now
          </Button>
        </div>
      </div>

      {/* Agent Status Banner */}
      {config?.isEnabled && (
        <div className="flex items-center gap-3 rounded-xl bg-primary/10 border border-primary/20 px-4 py-3">
          <div className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
          </div>
          <span className="text-sm font-medium text-text-primary">
            Agent is running — UI heartbeat every 60s, worker automation every {config.cycleIntervalMinutes} min
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-3 text-xs text-text-muted">
            {heartbeatStatus.lastRun ? <span>Last run: {new Date(heartbeatStatus.lastRun).toLocaleTimeString()}</span> : null}
            {heartbeatStatus.nextRun ? <span>Next worker run: {new Date(heartbeatStatus.nextRun).toLocaleTimeString()}</span> : null}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      {heartbeatError ? <ErrorState message={heartbeatError} onRetry={() => void fetchAll()} /> : null}
      {statsError ? <ErrorState message={statsError} onRetry={() => void fetchAll()} /> : null}

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
        <KPICard
          label="Total Prospects"
          value={stats.totalProspects}
          icon={Globe}
          color="text-blue-400"
        />
        <KPICard
          label="Emails Sent Today"
          value={`${stats.emailsSentToday}/${stats.dailyLimit}`}
          icon={Mail}
          color="text-amber-400"
        />
        <KPICard
          label="Reply Rate"
          value={`${stats.replyRate}%`}
          icon={TrendingUp}
          color="text-green-400"
        />
        <KPICard
          label="Links Acquired"
          value={stats.totalLinks}
          icon={Link}
          color="text-emerald-400"
        />
        <KPICard
          label="Links This Month"
          value={stats.linksThisMonth}
          icon={ArrowUpRight}
          color="text-lime-400"
        />
        <KPICard
          label="Avg Quality"
          value={`${stats.averageQualityScore}/100`}
          icon={CheckCircle}
          color="text-cyan-400"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <Link className="h-5 w-5 text-primary" />
              Link Wins
            </h2>
          </CardHeader>
          <CardContent>
            {acquiredLinks.length === 0 ? (
              <p className="text-sm text-text-muted">No backlinks have been confirmed yet. Once links go live, they will show here with destination details.</p>
            ) : (
              <div className="space-y-3">
                {acquiredLinks.slice(0, 8).map((prospect) => (
                  <div key={prospect.id} className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{prospect.domain}</p>
                      <p className="text-xs text-text-muted">{prospect.linkUrl || prospect.url}</p>
                    </div>
                    <Badge variant="success">Live backlink</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-primary" />
              Quality Guardrail
            </h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-sm text-text-muted">High-quality prospects</p>
              <p className="mt-2 text-2xl font-bold text-text-primary">{stats.highQualityProspects}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-sm text-text-muted">Low-risk prospects</p>
              <p className="mt-2 text-2xl font-bold text-text-primary">{stats.lowRiskProspects}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-sm text-text-muted">Spam / risky prospects flagged</p>
              <p className="mt-2 text-2xl font-bold text-text-primary">{riskyProspects.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Best Campaigns Right Now
            </h2>
          </CardHeader>
          <CardContent>
            {!stats.topCampaigns || stats.topCampaigns.length === 0 ? (
              <p className="text-sm text-text-muted">Campaign performance will show here once the agent starts discovering, sending, and winning links.</p>
            ) : (
              <div className="space-y-3">
                {stats.topCampaigns.map((campaign) => (
                  <div key={campaign.id} className="rounded-lg border border-border bg-background p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-text-primary">{campaign.name}</p>
                        <p className="text-xs text-text-muted">
                          {campaign.totalProspects} prospects · {campaign.totalSent} sent · {campaign.totalReplied} replies
                        </p>
                      </div>
                      <Badge variant="success">{campaign.totalLinks} links</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              SEO Expert Recommendations
            </h2>
          </CardHeader>
          <CardContent className="space-y-3">
            {expertRecommendations.map((recommendation) => (
              <div key={recommendation} className="rounded-lg border border-border bg-background p-4 text-sm text-text-secondary">
                {recommendation}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* New Campaign Form */}
      {showNewCampaign && (
        <NewCampaignForm
          onCreated={() => {
            setShowNewCampaign(false);
            fetchAll();
          }}
          onCancel={() => setShowNewCampaign(false)}
        />
      )}

      {/* Pipeline Funnel */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Pipeline Funnel
          </h2>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {funnelStages.map((stage, i) => {
              const count = stats.stages[stage.key] || 0;
              const transitionalCount =
                stats.stages[stage.key.replace("found", "finding_contact").replace("drafted", "drafting_email")] || 0;
              return (
                <div key={stage.key} className="flex items-center">
                  <div className="flex flex-col items-center min-w-[100px]">
                    <stage.icon className={`h-5 w-5 ${stage.color} mb-1`} />
                    <span className="text-2xl font-bold text-text-primary">{count + transitionalCount}</span>
                    <span className="text-xs text-text-muted text-center">{stage.label}</span>
                  </div>
                  {i < funnelStages.length - 1 && (
                    <div className="mx-1 text-text-muted">→</div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Campaigns */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-text-primary">Active Campaigns</h2>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <p className="text-text-muted text-sm py-4 text-center">
              No campaigns yet. Create one to start the agent.
            </p>
          ) : (
            <div className="space-y-3">
              {campaigns.map((c) => (
                <div
                  key={c.id}
                  className="rounded-lg border border-border bg-background p-4"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <h3 className="font-medium text-text-primary">{c.name}</h3>
                      <p className="text-sm text-text-muted">
                        {c.targetUrl} · {c.industry} · {c.targetCountry}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="text-center">
                        <p className="text-lg font-bold text-text-primary">{c.totalProspects}</p>
                        <p className="text-xs text-text-muted">Prospects</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-amber-400">{c.totalSent}</p>
                        <p className="text-xs text-text-muted">Sent</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-green-400">{c.totalReplied}</p>
                        <p className="text-xs text-text-muted">Replied</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-emerald-400">{c.totalLinks}</p>
                        <p className="text-xs text-text-muted">Links</p>
                      </div>
                      <Badge variant={c.status === "active" ? "success" : "warning"}>
                        {c.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant={c.status === "active" ? "outline" : "default"}
                      onClick={() => void updateCampaignStatus(c.id, c.status === "active" ? "paused" : "active")}
                    >
                      {c.status === "active" ? "Pause" : "Resume"}
                    </Button>
                    <div className="h-2 flex-1 rounded-full bg-surface-hover">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${Math.min(c.totalProspects > 0 ? (c.totalLinks / c.totalProspects) * 100 : 0, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-text-muted">
                      {c.totalProspects > 0 ? Math.round((c.totalLinks / c.totalProspects) * 100) : 0}% link conversion
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prospect Table */}
      {prospects.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <h2 className="text-lg font-semibold text-text-primary">
                Prospects ({filteredProspects.length})
              </h2>
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="relative min-w-[220px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  <Input
                    value={prospectQuery}
                    onChange={(e) => setProspectQuery(e.target.value)}
                    placeholder="Search domain or contact"
                    className="pl-9"
                  />
                </div>
                <Select value={stageFilter} onValueChange={setStageFilter}>
                  <SelectTrigger className="min-w-[180px]">
                    <Filter className="mr-2 h-4 w-4 text-text-muted" />
                    <SelectValue placeholder="Filter stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All stages</SelectItem>
                    {Object.entries(STAGE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-text-muted">
                    <th className="text-left py-2 px-3">Domain</th>
                    <th className="text-left py-2 px-3">Stage</th>
                    <th className="text-left py-2 px-3">Quality</th>
                    <th className="text-left py-2 px-3">Relevance</th>
                    <th className="text-left py-2 px-3">Spam Risk</th>
                    <th className="text-left py-2 px-3">Contact</th>
                    <th className="text-left py-2 px-3">Email Subject</th>
                    <th className="text-left py-2 px-3">Link</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProspects.slice(0, 50).map((p) => (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-surface-hover">
                      <td className="py-2 px-3">
                        <div>
                          <span className="text-text-primary font-medium">{p.domain}</span>
                          <p className="text-xs text-text-muted">{new Date(p.createdAt).toLocaleDateString()}</p>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <Badge
                          variant={
                            p.stage === "completed" || p.stage === "replied"
                              ? "success"
                              : p.stage === "failed" || p.stage === "rejected"
                                ? "destructive"
                                : "default"
                          }
                        >
                          {STAGE_LABELS[p.stage] || p.stage}
                        </Badge>
                      </td>
                      <td className="py-2 px-3">
                        {p.qualityScore !== null ? (
                          <span className={p.qualityScore >= 70 ? "text-green-400" : p.qualityScore >= 40 ? "text-amber-400" : "text-red-400"}>
                            {p.qualityScore}/100
                          </span>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-text-secondary">
                        {p.relevanceScore !== null && p.relevanceScore !== undefined ? `${p.relevanceScore}/10` : "—"}
                      </td>
                      <td className="py-2 px-3">
                        {(p.qualifyData?.redFlags?.length || 0) > 0 || (p.stageError || "").toLowerCase().includes("spam") ? (
                          <Badge variant="destructive">
                            {p.qualifyData?.redFlags?.[0] || "Flagged"}
                          </Badge>
                        ) : (
                          <Badge variant="success">Low risk</Badge>
                        )}
                      </td>
                      <td className="py-2 px-3 text-text-secondary">
                        {p.contactEmail || "—"}
                      </td>
                      <td className="py-2 px-3 text-text-secondary truncate max-w-[200px]">
                        {p.emailSubject || "—"}
                      </td>
                      <td className="py-2 px-3">
                        {p.linkAcquired ? (
                          <a
                            href={p.linkUrl || p.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300"
                          >
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-xs">Live</span>
                          </a>
                        ) : (
                          <XCircle className="h-4 w-4 text-text-muted" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agent Configuration */}
      {config && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Agent Configuration
            </h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <ToggleSwitch
                label="Auto Discover"
                description="Find new prospects automatically"
                checked={config.autoDiscover}
                onChange={(v) => toggleConfigField("autoDiscover", v)}
              />
              <ToggleSwitch
                label="Auto Qualify"
                description="Score and filter prospects"
                checked={config.autoQualify}
                onChange={(v) => toggleConfigField("autoQualify", v)}
              />
              <ToggleSwitch
                label="Auto Contact"
                description="Find email addresses"
                checked={config.autoContact}
                onChange={(v) => toggleConfigField("autoContact", v)}
              />
              <ToggleSwitch
                label="Auto Draft"
                description="Generate personalized emails"
                checked={config.autoDraft}
                onChange={(v) => toggleConfigField("autoDraft", v)}
              />
              <ToggleSwitch
                label="Auto Send"
                description="Actually send outreach emails"
                checked={config.autoSend}
                onChange={(v) => toggleConfigField("autoSend", v)}
              />
              <ToggleSwitch
                label="Auto Follow-Up"
                description="Send scheduled follow-ups"
                checked={config.autoFollowUp}
                onChange={(v) => toggleConfigField("autoFollowUp", v)}
              />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-[220px_1fr]">
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-sm font-medium text-text-primary">Worker Automation Interval</p>
                <p className="text-xs text-text-muted mt-1">How often `pnpm jobs:drain` should enqueue a new backlink cycle for this user.</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <label className="block text-xs font-medium uppercase tracking-[0.2em] text-text-muted mb-2">
                  Cycle every
                </label>
                <Select
                  value={String(config.cycleIntervalMinutes)}
                  onValueChange={updateCycleInterval}
                >
                  <SelectTrigger className="max-w-[220px]">
                    <SelectValue placeholder="Select interval" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 minutes</SelectItem>
                    <SelectItem value="10">10 minutes</SelectItem>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                    <SelectItem value="120">120 minutes</SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-3 text-xs text-text-muted">
                  Last autonomous run: {config.lastHeartbeatAt ? new Date(config.lastHeartbeatAt).toLocaleString() : "Not yet"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Log */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Recent Agent Activity
          </h2>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <p className="text-text-muted text-sm py-4 text-center">
              No agent activity yet. Start the agent and create a campaign.
            </p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {runs.slice(0, 20).map((run) => (
                <div key={run.id} className="rounded-lg border border-border/50 bg-background p-3">
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant={run.status === "completed" ? "success" : run.status === "failed" ? "destructive" : "default"}>
                      {run.status}
                    </Badge>
                    <span className="text-xs text-text-muted">
                      {new Date(run.createdAt).toLocaleString()} ·{" "}
                      {run.durationMs ? `${(run.durationMs / 1000).toFixed(1)}s` : "—"}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary">
                    Processed: {run.itemsProcessed} | Success: {run.itemsSucceeded} | Failed: {run.itemsFailed}
                  </p>
                  {run.log.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {run.log.slice(0, 5).map((entry, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          {entry.success ? (
                            <CheckCircle className="h-3 w-3 text-green-400 mt-0.5 shrink-0" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-400 mt-0.5 shrink-0" />
                          )}
                          <span className="text-text-muted">{entry.action}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Sub-Components ───

function KPICard({ label, value, icon: Icon, color }: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-text-muted">{label}</p>
            <p className="text-2xl font-bold text-text-primary mt-1">{value}</p>
          </div>
          <Icon className={`h-8 w-8 ${color} opacity-60`} />
        </div>
      </CardContent>
    </Card>
  );
}

function ToggleSwitch({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      className="flex items-center justify-between rounded-lg border border-border bg-background p-3 cursor-pointer hover:bg-surface-hover"
      onClick={() => onChange(!checked)}
    >
      <div>
        <p className="text-sm font-medium text-text-primary">{label}</p>
        <p className="text-xs text-text-muted">{description}</p>
      </div>
      <div
        className={`relative w-10 h-5 rounded-full transition-colors ${checked ? "bg-primary" : "bg-border"}`}
      >
        <div
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`}
        />
      </div>
    </button>
  );
}

function NewCampaignForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: "",
    targetUrl: "https://www.techgeekstudio.com",
    industry: "Technology",
    targetCountry: "Global",
    competitorUrls: "",
  });
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const competitors = formData.competitorUrls
        .split("\n")
        .map((u) => u.trim())
        .filter((u) => u.startsWith("http"));

      const res = await fetch("/api/agent/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          targetUrl: formData.targetUrl,
          industry: formData.industry,
          targetCountry: formData.targetCountry,
          competitorUrls: competitors.length > 0 ? competitors : undefined,
        }),
      });

      if (res.ok) {
        toast.success("Campaign created!");
        onCreated();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to create campaign");
      }
    } catch {
      toast.error("Failed to create campaign");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-text-primary">New Backlink Campaign</h2>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Campaign Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Q1 2026 Link Building"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Target URL</label>
              <Input
                value={formData.targetUrl}
                onChange={(e) => setFormData({ ...formData, targetUrl: e.target.value })}
                placeholder="https://your-site.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Industry</label>
              <Select
                value={formData.industry}
                onValueChange={(value) => setFormData({ ...formData, industry: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Technology">Technology</SelectItem>
                  <SelectItem value="SaaS">SaaS</SelectItem>
                  <SelectItem value="Digital Marketing">Digital Marketing</SelectItem>
                  <SelectItem value="AI & Machine Learning">AI & Machine Learning</SelectItem>
                  <SelectItem value="Web Development">Web Development</SelectItem>
                  <SelectItem value="E-commerce">E-commerce</SelectItem>
                  <SelectItem value="Cybersecurity">Cybersecurity</SelectItem>
                  <SelectItem value="Cloud Computing">Cloud Computing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Target Country</label>
              <Select
                value={formData.targetCountry}
                onValueChange={(value) => setFormData({ ...formData, targetCountry: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Global">Global</SelectItem>
                  <SelectItem value="United States">United States</SelectItem>
                  <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                  <SelectItem value="India">India</SelectItem>
                  <SelectItem value="Australia">Australia</SelectItem>
                  <SelectItem value="Canada">Canada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Competitor URLs (one per line, optional)
            </label>
            <textarea
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-primary focus:outline-none resize-none"
              rows={3}
              value={formData.competitorUrls}
              onChange={(e) => setFormData({ ...formData, competitorUrls: e.target.value })}
              placeholder="https://competitor1.com&#10;https://competitor2.com"
            />
          </div>
          <div className="flex gap-3">
            <Button type="submit" disabled={creating || !formData.name}>
              {creating ? "Creating..." : "Create Campaign"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
