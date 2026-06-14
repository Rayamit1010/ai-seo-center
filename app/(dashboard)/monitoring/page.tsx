"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Plus, Radar, ListChecks, Pause, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScoreRing } from "@/components/audit/ScoreRing";

interface MonitorRow {
  id: string;
  name: string;
  url: string;
  frequency: string;
  isActive: boolean;
  nextRunAt: string;
  lastRunAt: string | null;
  latestAudit: {
    id: string;
    status: string;
    scores: { overall: number } | null;
    createdAt: string;
  } | null;
  openTaskCount: number;
}

export default function MonitoringPage() {
  const [monitors, setMonitors] = useState<MonitorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "weekly">("weekly");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/monitoring");
      const json = (await res.json()) as { success?: boolean; data?: MonitorRow[]; error?: string };
      if (json.success) setMonitors(json.data ?? []);
      else toast.error(json.error ?? "Failed to load monitors");
    } catch {
      toast.error("Failed to load monitors");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const handleCreate = async () => {
    if (!name.trim() || !url.trim()) {
      toast.error("Name and URL are required");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url, frequency }),
      });
      const json = (await res.json()) as { success?: boolean; data?: MonitorRow; error?: string };
      if (json.success && json.data) {
        setMonitors((prev) => [{ ...json.data!, latestAudit: null, openTaskCount: 0 }, ...prev]);
        setName("");
        setUrl("");
        toast.success("Monitor added — first scan will run shortly.");
      } else {
        toast.error(json.error ?? "Failed to add monitor");
      }
    } catch {
      toast.error("Failed to add monitor");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (monitor: MonitorRow) => {
    try {
      const res = await fetch(`/api/monitoring/${monitor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !monitor.isActive }),
      });
      const json = (await res.json()) as { success?: boolean };
      if (json.success) {
        setMonitors((prev) => prev.map((m) => (m.id === monitor.id ? { ...m, isActive: !m.isActive } : m)));
      }
    } catch {
      toast.error("Failed to update monitor");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/monitoring/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMonitors((prev) => prev.filter((m) => m.id !== id));
        toast.success("Monitor removed");
      }
    } catch {
      toast.error("Failed to remove monitor");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Site Monitoring</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Continuous technical SEO health checks with auto-generated, trackable fix tasks.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Radar className="h-4 w-4 text-primary" /> Add a Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input placeholder="Name (e.g. Main Site)" value={name} onChange={(e) => setName(e.target.value)} className="sm:w-48" />
            <Input placeholder="https://example.com" value={url} onChange={(e) => setUrl(e.target.value)} className="flex-1" />
            <Select value={frequency} onValueChange={(v) => setFrequency(v as "daily" | "weekly")}>
              <SelectTrigger className="sm:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleCreate} disabled={creating} className="gap-2">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add Monitor
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : monitors.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center">
          <Radar className="mx-auto mb-4 h-12 w-12 text-text-muted" />
          <p className="text-text-secondary">No sites monitored yet. Add one above to start continuous SEO health checks.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {monitors.map((monitor) => (
            <Card key={monitor.id} className="relative">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/monitoring/${monitor.id}`} className="font-semibold text-text-primary hover:text-primary">
                      {monitor.name}
                    </Link>
                    <p className="truncate text-xs text-text-muted">{monitor.url}</p>
                  </div>
                  {monitor.latestAudit?.scores && (
                    <ScoreRing score={monitor.latestAudit.scores.overall} label="" size={56} animated={false} />
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={monitor.isActive ? "success" : "secondary"}>
                    {monitor.isActive ? "Active" : "Paused"}
                  </Badge>
                  <Badge variant="outline">{monitor.frequency === "daily" ? "Daily" : "Weekly"}</Badge>
                  {monitor.openTaskCount > 0 && (
                    <Badge variant="warning" className="gap-1">
                      <ListChecks className="h-3 w-3" /> {monitor.openTaskCount} open
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-text-muted">
                  {monitor.lastRunAt
                    ? `Last checked ${new Date(monitor.lastRunAt).toLocaleDateString()}`
                    : "Not yet scanned"}
                  {" · "}
                  Next: {new Date(monitor.nextRunAt).toLocaleDateString()}
                </p>

                <div className="flex items-center justify-between pt-1">
                  <Link href={`/monitoring/${monitor.id}`} className="text-xs font-medium text-primary hover:underline">
                    View details & tasks →
                  </Link>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggleActive(monitor)} title={monitor.isActive ? "Pause" : "Resume"}>
                      {monitor.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-error hover:text-error" onClick={() => handleDelete(monitor.id)} title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
