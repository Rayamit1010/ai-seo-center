"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Pause, Play, Trash2, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreRing } from "@/components/audit/ScoreRing";

interface SeoTask {
  id: string;
  action: string;
  module: string;
  impact: string;
  effort: string;
  severity: string;
  status: string;
  firstSeenAt: string;
  lastSeenAt: string;
}

interface AuditSnapshot {
  id: string;
  status: string;
  scores: { overall: number } | null;
  summary: string | null;
  createdAt: string;
}

interface MonitorDetails {
  id: string;
  name: string;
  url: string;
  frequency: string;
  isActive: boolean;
  nextRunAt: string;
  lastRunAt: string | null;
  audits: AuditSnapshot[];
  tasks: SeoTask[];
}

const SEVERITY_VARIANT: Record<string, "destructive" | "warning" | "secondary" | "outline"> = {
  critical: "destructive",
  high: "warning",
  medium: "secondary",
  longTerm: "outline",
};

const SEVERITY_LABEL: Record<string, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  longTerm: "Long-term",
};

export default function MonitorDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [monitor, setMonitor] = useState<MonitorDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/monitoring/${params.id}`);
      const json = (await res.json()) as { success?: boolean; data?: MonitorDetails; error?: string };
      if (json.success) setMonitor(json.data ?? null);
      else toast.error(json.error ?? "Failed to load monitor");
    } catch {
      toast.error("Failed to load monitor");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => { void loadData(); }, [loadData]);

  const handleToggleActive = async () => {
    if (!monitor) return;
    try {
      const res = await fetch(`/api/monitoring/${monitor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !monitor.isActive }),
      });
      const json = (await res.json()) as { success?: boolean; data?: MonitorDetails; error?: string };
      if (res.ok && json.success && json.data) {
        const isActive = json.data.isActive;
        setMonitor((prev) => (prev ? { ...prev, isActive } : prev));
      } else {
        toast.error(json.error ?? "Failed to update monitor");
      }
    } catch {
      toast.error("Failed to update monitor");
    }
  };

  const handleDelete = async () => {
    if (!monitor) return;
    try {
      const res = await fetch(`/api/monitoring/${monitor.id}`, { method: "DELETE" });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (res.ok && json.success) {
        toast.success("Monitor removed");
        router.push("/monitoring");
      } else {
        toast.error(json.error ?? "Failed to remove monitor");
      }
    } catch {
      toast.error("Failed to remove monitor");
    }
  };

  const handleTaskStatus = async (taskId: string, status: "open" | "resolved" | "dismissed") => {
    try {
      const res = await fetch(`/api/monitoring/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = (await res.json()) as { success?: boolean; data?: SeoTask; error?: string };
      if (res.ok && json.success && json.data) {
        const updatedStatus = json.data.status;
        setMonitor((prev) =>
          prev ? { ...prev, tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, status: updatedStatus } : t)) } : prev
        );
      } else {
        toast.error(json.error ?? "Failed to update task");
      }
    } catch {
      toast.error("Failed to update task");
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!monitor) {
    return (
      <div className="rounded-xl border border-border bg-surface p-12 text-center">
        <p className="text-text-secondary">Monitor not found.</p>
      </div>
    );
  }

  const latestAudit = monitor.audits[0] ?? null;
  const openTasks = monitor.tasks.filter((t) => t.status === "open");
  const otherTasks = monitor.tasks.filter((t) => t.status !== "open");

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="gap-1 -ml-2" onClick={() => router.push("/monitoring")}>
        <ArrowLeft className="h-4 w-4" /> Back to Monitoring
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{monitor.name}</h1>
          <p className="mt-1 text-sm text-text-secondary">{monitor.url}</p>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={monitor.isActive ? "success" : "secondary"}>{monitor.isActive ? "Active" : "Paused"}</Badge>
            <Badge variant="outline">{monitor.frequency === "daily" ? "Daily checks" : "Weekly checks"}</Badge>
            {monitor.lastRunAt && (
              <span className="text-xs text-text-muted">Last checked {new Date(monitor.lastRunAt).toLocaleString()}</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleToggleActive}>
            {monitor.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {monitor.isActive ? "Pause" : "Resume"}
          </Button>
          <Button variant="destructive" className="gap-2" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Current Score</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            {latestAudit?.scores ? (
              <ScoreRing score={latestAudit.scores.overall} label="Overall SEO" size={120} />
            ) : (
              <p className="text-sm text-text-muted">No completed scan yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Score History</CardTitle>
          </CardHeader>
          <CardContent>
            {monitor.audits.length === 0 ? (
              <p className="text-sm text-text-muted">No scans completed yet — the first one runs automatically.</p>
            ) : (
              <ul className="space-y-2">
                {monitor.audits.map((audit) => (
                  <li key={audit.id} className="flex items-center justify-between rounded-lg bg-background px-3 py-2 text-sm">
                    <span className="text-text-secondary">{new Date(audit.createdAt).toLocaleString()}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={audit.status === "COMPLETE" ? "success" : audit.status === "FAILED" ? "destructive" : "secondary"}>
                        {audit.status}
                      </Badge>
                      {audit.scores && <span className="font-mono font-semibold text-text-primary">{audit.scores.overall}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Open Tasks {openTasks.length > 0 && <span className="ml-1 text-text-muted">({openTasks.length})</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {openTasks.length === 0 ? (
            <p className="text-sm text-text-muted">No open issues — great job!</p>
          ) : (
            <ul className="space-y-2">
              {openTasks.map((task) => (
                <li key={task.id} className="flex items-start justify-between gap-3 rounded-lg bg-background p-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <Badge variant={SEVERITY_VARIANT[task.severity] ?? "outline"}>
                        {SEVERITY_LABEL[task.severity] ?? task.severity}
                      </Badge>
                      <Badge variant="outline">{task.module}</Badge>
                      <span className="text-xs text-text-muted">Effort: {task.effort}</span>
                    </div>
                    <p className="text-sm text-text-primary">{task.action}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-success hover:text-success" title="Mark resolved" onClick={() => handleTaskStatus(task.id, "resolved")}>
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-text-muted hover:text-text-primary" title="Dismiss" onClick={() => handleTaskStatus(task.id, "dismissed")}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {otherTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resolved / Dismissed</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {otherTasks.map((task) => (
                <li key={task.id} className="flex items-start justify-between gap-3 rounded-lg bg-background p-3 opacity-70">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <Badge variant={SEVERITY_VARIANT[task.severity] ?? "outline"}>
                        {SEVERITY_LABEL[task.severity] ?? task.severity}
                      </Badge>
                      <Badge variant="outline">{task.module}</Badge>
                      <Badge variant="secondary">{task.status}</Badge>
                    </div>
                    <p className="text-sm text-text-primary line-through">{task.action}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-text-muted hover:text-text-primary" title="Reopen" onClick={() => handleTaskStatus(task.id, "open")}>
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
