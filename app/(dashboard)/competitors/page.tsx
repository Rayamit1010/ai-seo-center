"use client";

import { useState, useEffect, useCallback } from "react";
import { Globe, Plus, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Competitor {
  id: string;
  domain: string;
  name: string | null;
  notes: string | null;
  trackedSince: string;
  lastChecked: string | null;
}

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ domain: "", name: "", notes: "" });

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/competitors");
      const json = (await res.json()) as { success?: boolean; data?: Competitor[] };
      if (json.success) setCompetitors(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.domain.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = (await res.json()) as { success?: boolean; data?: Competitor; error?: string };
      if (json.success && json.data) {
        setCompetitors((prev) => [json.data!, ...prev]);
        setForm({ domain: "", name: "", notes: "" });
        toast.success("Competitor added");
      } else {
        toast.error(json.error ?? "Failed to add competitor");
      }
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string, domain: string) => {
    if (!confirm(`Remove ${domain} from tracking?`)) return;
    const res = await fetch(`/api/competitors/${id}`, { method: "DELETE" });
    if (res.ok) {
      setCompetitors((prev) => prev.filter((c) => c.id !== id));
      toast.success("Competitor removed");
    } else {
      toast.error("Failed to remove competitor");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Competitor Tracking</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Monitor and track your SEO competitors to benchmark your performance.
        </p>
      </div>

      {/* Add Form */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-4 text-sm font-semibold text-text-primary">Add Competitor</h2>
        <form onSubmit={(e) => void handleAdd(e)} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">Domain *</label>
            <input
              type="text"
              placeholder="competitor.com"
              value={form.domain}
              onChange={(e) => setForm((p) => ({ ...p, domain: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">Name (optional)</label>
            <input
              type="text"
              placeholder="Competitor Inc."
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">Notes (optional)</label>
            <input
              type="text"
              placeholder="Direct competitor in SaaS SEO space"
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
            />
          </div>
          <div className="flex items-end sm:col-span-3">
            <button
              type="submit"
              disabled={adding}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60"
            >
              {adding ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Add Competitor
            </button>
          </div>
        </form>
      </div>

      {/* Competitor List */}
      <div className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-text-primary">
            Tracked Competitors
            {competitors.length > 0 && (
              <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                {competitors.length}
              </span>
            )}
          </h2>
        </div>
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : competitors.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-text-muted">
            <Globe className="h-10 w-10" />
            <p className="text-sm">No competitors tracked yet. Add your first competitor above.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {competitors.map((c) => (
              <div key={c.id} className="flex items-center gap-4 px-4 py-3 hover:bg-surface-hover">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Globe className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-text-primary text-sm">{c.name ?? c.domain}</p>
                    {c.name && (
                      <span className="text-xs text-text-muted">{c.domain}</span>
                    )}
                    <a
                      href={`https://${c.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-text-muted hover:text-primary"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                  {c.notes && (
                    <p className="mt-0.5 text-xs text-text-secondary">{c.notes}</p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-text-muted">
                    Since {new Date(c.trackedSince).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => void handleDelete(c.id, c.domain)}
                  className="shrink-0 text-text-muted hover:text-red-400 transition-colors"
                  title="Remove competitor"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
