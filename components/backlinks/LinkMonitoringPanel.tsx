"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { RefreshCw, Link2Off, Link2, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MonitoredLink {
  id: string;
  domain: string;
  linkUrl: string | null;
  anchorText: string | null;
  linkDofollow: boolean | null;
  linkStatus: string | null;
  lastLinkCheckAt: string | null;
  campaign: { id: string; name: string; targetUrl: string } | null;
}

interface Summary {
  total: number;
  live: number;
  lost: number;
  dofollow: number;
  unchecked: number;
}

function statusBadge(status: string | null) {
  if (status === "live") return <Badge variant="success">Live</Badge>;
  if (status === "lost") return <Badge variant="destructive">Lost</Badge>;
  return <Badge variant="secondary">Not checked</Badge>;
}

function dofollowBadge(status: string | null, dofollow: boolean | null) {
  if (status !== "live" || dofollow === null) return null;
  return <Badge variant={dofollow ? "outline" : "warning"}>{dofollow ? "Dofollow" : "Nofollow"}</Badge>;
}

export function LinkMonitoringPanel() {
  const [links, setLinks] = useState<MonitoredLink[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [rechecking, setRechecking] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/link-monitoring");
      const json = (await res.json()) as { success?: boolean; data?: { links: MonitoredLink[]; summary: Summary }; error?: string };
      if (json.success && json.data) {
        setLinks(json.data.links);
        setSummary(json.data.summary);
      } else {
        toast.error(json.error ?? "Failed to load monitored links");
      }
    } catch {
      toast.error("Failed to load monitored links");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const handleRecheck = async (id: string) => {
    setRechecking(id);
    try {
      const res = await fetch(`/api/link-monitoring/${id}/recheck`, { method: "POST" });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { linkStatus: string | null; linkDofollow: boolean | null; anchorText: string | null; lastLinkCheckAt: string | null };
        error?: string;
      };
      if (res.ok && json.success && json.data) {
        const updated = json.data;
        setLinks((prev) =>
          prev.map((link) =>
            link.id === id
              ? { ...link, linkStatus: updated.linkStatus, linkDofollow: updated.linkDofollow, anchorText: updated.anchorText, lastLinkCheckAt: updated.lastLinkCheckAt }
              : link
          )
        );
        void loadData();
        toast.success("Link re-checked");
      } else {
        toast.error(json.error ?? "Failed to recheck link");
      }
    } catch {
      toast.error("Failed to recheck link");
    } finally {
      setRechecking(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card><CardContent className="p-4"><p className="text-xs text-text-muted">Total Acquired Links</p><p className="mt-1 text-2xl font-bold text-text-primary">{summary.total}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-text-muted">Live</p><p className="mt-1 text-2xl font-bold text-success">{summary.live}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-text-muted">Lost</p><p className="mt-1 text-2xl font-bold text-error">{summary.lost}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-text-muted">Dofollow</p><p className="mt-1 text-2xl font-bold text-text-primary">{summary.dofollow}</p></CardContent></Card>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {links.length === 0 ? (
            <div className="p-12 text-center">
              <Link2 className="mx-auto mb-4 h-12 w-12 text-text-muted" />
              <p className="text-text-secondary">No acquired backlinks to monitor yet.</p>
              <p className="mt-1 text-xs text-text-muted">Once a prospect is marked as link-acquired in a campaign, it&apos;ll show up here for ongoing monitoring.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {links.map((link) => (
                <li key={link.id} className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      {statusBadge(link.linkStatus)}
                      {dofollowBadge(link.linkStatus, link.linkDofollow)}
                      {link.campaign && <Badge variant="outline">{link.campaign.name}</Badge>}
                    </div>
                    <p className="truncate text-sm font-medium text-text-primary">{link.domain}</p>
                    {link.linkUrl && (
                      <a href={link.linkUrl} target="_blank" rel="noopener noreferrer" className="block truncate text-xs text-primary hover:underline">
                        {link.linkUrl}
                      </a>
                    )}
                    <p className="mt-1 flex items-center gap-1 text-xs text-text-muted">
                      {link.anchorText ? (
                        <>Anchor: &ldquo;{link.anchorText}&rdquo;</>
                      ) : (
                        <span className="flex items-center gap-1"><HelpCircle className="h-3 w-3" /> Anchor text unknown</span>
                      )}
                    </p>
                    <p className="text-xs text-text-muted">
                      {link.lastLinkCheckAt
                        ? `Last checked ${new Date(link.lastLinkCheckAt).toLocaleString()}`
                        : "Not checked yet — checks run automatically"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    title="Re-check now"
                    disabled={rechecking === link.id}
                    onClick={() => handleRecheck(link.id)}
                  >
                    {rechecking === link.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : link.linkStatus === "lost" ? (
                      <Link2Off className="h-4 w-4 text-error" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
