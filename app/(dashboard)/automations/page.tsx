"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Zap, Trash2, ToggleLeft, ToggleRight, Plus, CheckCircle, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Workflow {
  id: string;
  name: string;
  type: string;
  configJson: string;
  enabled: boolean;
  frequency: string;
  nextRunAt: string;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  lastRunSummary: string | null;
}

const WORKFLOW_TEMPLATES = [
  {
    type: "rank-summary",
    label: "Keyword Rank Summary",
    description: "Email a summary of keyword position changes — improvements, drops, and top-10 count.",
    icon: "📊",
    requiresUrl: false,
  },
  {
    type: "backlink-health",
    label: "Backlink Health Report",
    description: "Email a health summary of your acquired backlinks — live vs. lost vs. dofollow count.",
    icon: "🔗",
    requiresUrl: false,
  },
  {
    type: "citation-health",
    label: "Citation Consistency Report",
    description: "Email a NAP consistency report across all tracked business directories.",
    icon: "📍",
    requiresUrl: false,
  },
  {
    type: "weekly-site-audit",
    label: "Site Audit Summary",
    description: "Email the latest audit scores and highlights for a target URL.",
    icon: "🔍",
    requiresUrl: true,
  },
];

const FREQUENCY_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

function statusIcon(status: string | null) {
  if (status === "success") return <CheckCircle className="h-4 w-4 text-success" />;
  if (status === "error") return <XCircle className="h-4 w-4 text-error" />;
  return <Clock className="h-4 w-4 text-text-muted" />;
}

export default function AutomationsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState<string | null>(null);

  const [form, setForm] = useState({ name: "", recipientEmail: "", targetUrl: "", frequency: "weekly" });

  const loadWorkflows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/automations");
      const json = (await res.json()) as { success?: boolean; data?: Workflow[] };
      if (json.success && json.data) setWorkflows(json.data);
    } catch { toast.error("Failed to load workflows"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadWorkflows(); }, [loadWorkflows]);

  const createWorkflow = async (type: string, requiresUrl: boolean) => {
    if (!form.name.trim()) { toast.error("Workflow name required"); return; }
    if (!form.recipientEmail.trim()) { toast.error("Recipient email required"); return; }
    if (requiresUrl && !form.targetUrl.trim()) { toast.error("Target URL required for this automation"); return; }

    setCreating(type);
    try {
      const res = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          type,
          frequency: form.frequency,
          config: { recipientEmail: form.recipientEmail, ...(requiresUrl ? { targetUrl: form.targetUrl } : {}) },
        }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (json.success) {
        toast.success("Automation created!");
        setShowCreate(null);
        setForm({ name: "", recipientEmail: "", targetUrl: "", frequency: "weekly" });
        void loadWorkflows();
      } else toast.error(json.error ?? "Failed to create");
    } catch { toast.error("Failed to create automation"); }
    finally { setCreating(null); }
  };

  const toggleWorkflow = async (id: string, enabled: boolean) => {
    setTogglingId(id);
    try {
      await fetch(`/api/automations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !enabled }),
      });
      setWorkflows((prev) => prev.map((w) => w.id === id ? { ...w, enabled: !enabled } : w));
    } catch { toast.error("Failed to toggle workflow"); }
    finally { setTogglingId(null); }
  };

  const deleteWorkflow = async (id: string) => {
    setDeletingId(id);
    try {
      await fetch(`/api/automations/${id}`, { method: "DELETE" });
      setWorkflows((prev) => prev.filter((w) => w.id !== id));
      toast.success("Automation deleted");
    } catch { toast.error("Failed to delete"); }
    finally { setDeletingId(null); }
  };

  const activeCount = workflows.filter((w) => w.enabled).length;
  const successCount = workflows.filter((w) => w.lastRunStatus === "success").length;
  const errorCount = workflows.filter((w) => w.lastRunStatus === "error").length;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-heading text-2xl font-bold text-text-primary">Automation Workflows</h2>
        <p className="mt-1 text-text-secondary">Scheduled email digests for rank tracking, backlink health, citation monitoring, and site audits</p>
      </div>

      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-xs text-text-muted">Active Automations</p><p className="mt-1 text-2xl font-bold text-primary">{activeCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-text-muted">Last Run: Success</p><p className="mt-1 text-2xl font-bold text-success">{successCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-text-muted">Last Run: Error</p><p className="mt-1 text-2xl font-bold text-error">{errorCount}</p></CardContent></Card>
      </div>

      {/* Templates */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-text-primary">Add Automation</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {WORKFLOW_TEMPLATES.map((t) => (
            <button
              key={t.type}
              onClick={() => setShowCreate(showCreate === t.type ? null : t.type)}
              className={`rounded-xl border p-4 text-left transition-colors hover:border-primary ${showCreate === t.type ? "border-primary bg-primary/5" : "border-border bg-surface"}`}
            >
              <div className="mb-2 text-2xl">{t.icon}</div>
              <p className="text-sm font-medium text-text-primary">{t.label}</p>
              <p className="mt-1 text-xs text-text-muted">{t.description}</p>
            </button>
          ))}
        </div>

        {showCreate && (() => {
          const template = WORKFLOW_TEMPLATES.find((t) => t.type === showCreate)!;
          return (
            <Card className="mt-4">
              <CardHeader><CardTitle className="text-base">Configure: {template.label}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-text-primary">Automation Name *</label>
                    <Input placeholder={`My ${template.label}`} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-text-primary">Recipient Email *</label>
                    <Input type="email" placeholder="you@example.com" value={form.recipientEmail} onChange={(e) => setForm((p) => ({ ...p, recipientEmail: e.target.value }))} />
                  </div>
                  {template.requiresUrl && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-text-primary">Target URL *</label>
                      <Input placeholder="https://yoursite.com" value={form.targetUrl} onChange={(e) => setForm((p) => ({ ...p, targetUrl: e.target.value }))} />
                    </div>
                  )}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-text-primary">Frequency</label>
                    <Select value={form.frequency} onValueChange={(v) => setForm((p) => ({ ...p, frequency: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily (8:00 AM UTC)</SelectItem>
                        <SelectItem value="weekly">Weekly (Mon 8:00 AM UTC)</SelectItem>
                        <SelectItem value="monthly">Monthly (1st at 8:00 AM UTC)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="gap-2" disabled={creating === showCreate} onClick={() => void createWorkflow(showCreate, template.requiresUrl)}>
                    {creating === showCreate ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Create Automation
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowCreate(null)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          );
        })()}
      </div>

      {/* Workflow list */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-text-primary">My Automations</h3>
        {loading ? (
          <div className="flex h-24 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : workflows.length === 0 ? (
          <Card><CardContent className="p-12 text-center">
            <Zap className="mx-auto mb-4 h-12 w-12 text-text-muted" />
            <p className="text-text-secondary">No automations yet. Pick a template above to get started.</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-2">
            {workflows.map((wf) => {
              const template = WORKFLOW_TEMPLATES.find((t) => t.type === wf.type);
              const config = JSON.parse(wf.configJson) as { recipientEmail?: string; targetUrl?: string };
              return (
                <Card key={wf.id}>
                  <CardContent className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        {statusIcon(wf.lastRunStatus)}
                        <span className="font-medium text-sm text-text-primary">{wf.name}</span>
                        <Badge variant={wf.enabled ? "success" : "secondary"} className="text-xs">
                          {wf.enabled ? "Active" : "Paused"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">{FREQUENCY_LABELS[wf.frequency] ?? wf.frequency}</Badge>
                      </div>
                      <p className="text-xs text-text-muted">{template?.icon} {template?.label ?? wf.type}</p>
                      <p className="text-xs text-text-muted">→ {config.recipientEmail ?? "—"}{config.targetUrl ? ` · ${config.targetUrl}` : ""}</p>
                      <p className="mt-1 text-xs text-text-muted">
                        {wf.lastRunAt ? `Last run ${new Date(wf.lastRunAt).toLocaleString()}` : "Never run"}{wf.lastRunSummary ? ` — ${wf.lastRunSummary}` : ""}
                      </p>
                      <p className="text-xs text-text-muted">Next: {new Date(wf.nextRunAt).toLocaleString()}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        title={wf.enabled ? "Pause" : "Activate"}
                        disabled={togglingId === wf.id}
                        onClick={() => void toggleWorkflow(wf.id, wf.enabled)}
                      >
                        {togglingId === wf.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : wf.enabled
                            ? <ToggleRight className="h-5 w-5 text-primary" />
                            : <ToggleLeft className="h-5 w-5 text-text-muted" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-error hover:text-error" disabled={deletingId === wf.id} onClick={() => void deleteWorkflow(wf.id)}>
                        {deletingId === wf.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
