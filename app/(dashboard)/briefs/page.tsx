"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { BookOpen, Trash2 } from "lucide-react";
import { BriefGenerator } from "@/components/brief/BriefGenerator";

interface BriefSummary {
  id: string;
  keyword: string;
  searchIntent: string | null;
  wordCount: number | null;
  status: string;
  createdAt: string;
}

const INTENT_COLORS: Record<string, string> = {
  informational: "bg-blue-500/20 text-blue-400",
  commercial: "bg-green-500/20 text-green-400",
  transactional: "bg-orange-500/20 text-orange-400",
  navigational: "bg-purple-500/20 text-purple-400",
};

export default function BriefsPage() {
  const [briefs, setBriefs] = useState<BriefSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/briefs");
      const json = (await res.json()) as { success?: boolean; data?: BriefSummary[] };
      if (json.success) setBriefs(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this brief?")) return;
    const res = await fetch(`/api/brief/${id}`, { method: "DELETE" });
    if (res.ok) {
      setBriefs((prev) => prev.filter((b) => b.id !== id));
      toast.success("Brief deleted");
    } else {
      toast.error("Failed to delete brief");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Content Briefs</h1>
        <p className="mt-1 text-sm text-text-secondary">AI-powered content outlines with SERP analysis and LSI keywords.</p>
      </div>

      <BriefGenerator />

      <div>
        <h2 className="mb-3 text-sm font-semibold text-text-primary">Recent Briefs</h2>
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : briefs.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-10 text-center">
            <BookOpen className="mx-auto mb-3 h-10 w-10 text-text-muted" />
            <p className="text-sm text-text-secondary">No briefs generated yet. Generate your first brief above.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted">Keyword</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted">Intent</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted">Word Count</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {briefs.map((brief) => (
                  <tr key={brief.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                    <td className="px-4 py-3 font-medium text-text-primary">{brief.keyword}</td>
                    <td className="px-4 py-3">
                      {brief.searchIntent ? (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${INTENT_COLORS[brief.searchIntent] ?? "bg-gray-500/20 text-gray-400"}`}>
                          {brief.searchIntent}
                        </span>
                      ) : "–"}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{brief.wordCount?.toLocaleString() ?? "–"}</td>
                    <td className="px-4 py-3 text-text-muted">{new Date(brief.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(brief.id)} className="text-text-muted hover:text-red-400" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
