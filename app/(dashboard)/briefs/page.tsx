"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { BookOpen, Trash2, FileText, Wand2, Eye } from "lucide-react";
import { BriefGenerator } from "@/components/brief/BriefGenerator";

type Tab = "briefs" | "articles";

interface BriefSummary {
  id: string;
  keyword: string;
  searchIntent: string | null;
  wordCount: number | null;
  status: string;
  createdAt: string;
}

interface DraftSummary {
  id: string;
  keyword: string;
  title: string;
  wordCount: number;
  tone: string;
  status: string;
  createdAt: string;
  briefId: string | null;
}

const INTENT_COLORS: Record<string, string> = {
  informational: "bg-blue-500/20 text-blue-400",
  commercial: "bg-green-500/20 text-green-400",
  transactional: "bg-orange-500/20 text-orange-400",
  navigational: "bg-purple-500/20 text-purple-400",
};

function ArticleGeneratorPanel({ briefs }: { briefs: BriefSummary[] }) {
  const [form, setForm] = useState({
    keyword: "",
    briefId: "",
    tone: "professional" as "professional" | "conversational" | "educational" | "persuasive",
  });
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<{ title: string; wordCount: number } | null>(null);

  const handleGenerate = async () => {
    if (!form.keyword.trim()) {
      toast.error("Keyword is required");
      return;
    }
    setGenerating(true);
    setGenerated(null);
    try {
      const res = await fetch("/api/content-drafts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { draft: { title: string; wordCount: number } };
        error?: string;
      };
      if (json.success && json.data) {
        setGenerated(json.data.draft);
        toast.success("Article generated and saved!");
      } else {
        toast.error(json.error ?? "Generation failed");
      }
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-center gap-2">
        <Wand2 className="h-5 w-5 text-primary" />
        <h2 className="text-sm font-semibold text-text-primary">Generate Full Article</h2>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">Target Keyword *</label>
          <input
            type="text"
            placeholder="e.g. best SEO tools 2025"
            value={form.keyword}
            onChange={(e) => setForm((p) => ({ ...p, keyword: e.target.value }))}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">Use Brief (optional)</label>
          <select
            value={form.briefId}
            onChange={(e) => {
              const selected = briefs.find((b) => b.id === e.target.value);
              setForm((p) => ({
                ...p,
                briefId: e.target.value,
                keyword: selected ? selected.keyword : p.keyword,
              }));
            }}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
          >
            <option value="">None — generate from keyword only</option>
            {briefs.map((b) => (
              <option key={b.id} value={b.id}>
                {b.keyword}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">Writing Tone</label>
          <select
            value={form.tone}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                tone: e.target.value as typeof form.tone,
              }))
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
          >
            <option value="professional">Professional</option>
            <option value="conversational">Conversational</option>
            <option value="educational">Educational</option>
            <option value="persuasive">Persuasive</option>
          </select>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={() => void handleGenerate()}
          disabled={generating}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60"
        >
          {generating ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Wand2 className="h-4 w-4" />
          )}
          {generating ? "Generating article…" : "Generate Full Article"}
        </button>
        {generating && (
          <p className="text-xs text-text-muted">This may take 30–60 seconds…</p>
        )}
      </div>
      {generated && (
        <div className="mt-4 rounded-lg border border-success/30 bg-success-light p-3">
          <p className="text-sm font-medium text-text-primary">{generated.title}</p>
          <p className="mt-1 text-xs text-text-secondary">
            {generated.wordCount.toLocaleString()} words · Saved to Articles tab
          </p>
        </div>
      )}
    </div>
  );
}

export default function BriefsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("briefs");
  const [briefs, setBriefs] = useState<BriefSummary[]>([]);
  const [drafts, setDrafts] = useState<DraftSummary[]>([]);
  const [briefsLoading, setBriefsLoading] = useState(true);
  const [draftsLoading, setDraftsLoading] = useState(true);
  const [viewingDraft, setViewingDraft] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState<string | null>(null);

  const loadBriefs = useCallback(async () => {
    try {
      const res = await fetch("/api/briefs");
      const json = (await res.json()) as { success?: boolean; data?: BriefSummary[] };
      if (json.success) setBriefs(json.data ?? []);
    } finally {
      setBriefsLoading(false);
    }
  }, []);

  const loadDrafts = useCallback(async () => {
    setDraftsLoading(true);
    try {
      const res = await fetch("/api/content-drafts");
      const json = (await res.json()) as { success?: boolean; data?: DraftSummary[] };
      if (json.success) setDrafts(json.data ?? []);
    } finally {
      setDraftsLoading(false);
    }
  }, []);

  useEffect(() => { void loadBriefs(); }, [loadBriefs]);
  useEffect(() => {
    if (activeTab === "articles") void loadDrafts();
  }, [activeTab, loadDrafts]);

  const handleDeleteBrief = async (id: string) => {
    if (!confirm("Delete this brief?")) return;
    const res = await fetch(`/api/brief/${id}`, { method: "DELETE" });
    if (res.ok) {
      setBriefs((prev) => prev.filter((b) => b.id !== id));
      toast.success("Brief deleted");
    } else {
      toast.error("Failed to delete brief");
    }
  };

  const handleDeleteDraft = async (id: string) => {
    if (!confirm("Delete this article draft?")) return;
    const res = await fetch(`/api/content-drafts/${id}`, { method: "DELETE" });
    if (res.ok) {
      setDrafts((prev) => prev.filter((d) => d.id !== id));
      if (viewingDraft === id) { setViewingDraft(null); setDraftContent(null); }
      toast.success("Draft deleted");
    } else {
      toast.error("Failed to delete draft");
    }
  };

  const handleViewDraft = async (id: string) => {
    if (viewingDraft === id) { setViewingDraft(null); setDraftContent(null); return; }
    setViewingDraft(id);
    setDraftContent(null);
    const res = await fetch(`/api/content-drafts/${id}`);
    const json = (await res.json()) as { success?: boolean; data?: { content: string } };
    if (json.success && json.data) setDraftContent(json.data.content);
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "briefs", label: "Content Briefs" },
    { key: "articles", label: "Full Articles" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Content Workshop</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Generate SEO content briefs and full AI-written articles.
        </p>
      </div>

      <div className="flex gap-1 rounded-lg border border-border bg-surface p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-primary text-white"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "briefs" && (
        <>
          <BriefGenerator />

          <div>
            <h2 className="mb-3 text-sm font-semibold text-text-primary">Recent Briefs</h2>
            {briefsLoading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : briefs.length === 0 ? (
              <div className="rounded-xl border border-border bg-surface p-10 text-center">
                <BookOpen className="mx-auto mb-3 h-10 w-10 text-text-muted" />
                <p className="text-sm text-text-secondary">No briefs generated yet.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border bg-surface">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-muted">Keyword</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-muted">Intent</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-muted">Words</th>
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
                          <button onClick={() => void handleDeleteBrief(brief.id)} className="text-text-muted hover:text-red-400" title="Delete">
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
        </>
      )}

      {activeTab === "articles" && (
        <>
          <ArticleGeneratorPanel briefs={briefs} />

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary">Saved Articles</h2>
              <button
                onClick={() => void loadDrafts()}
                className="text-xs text-primary hover:underline"
              >
                Refresh
              </button>
            </div>
            {draftsLoading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : drafts.length === 0 ? (
              <div className="rounded-xl border border-border bg-surface p-10 text-center">
                <FileText className="mx-auto mb-3 h-10 w-10 text-text-muted" />
                <p className="text-sm text-text-secondary">No articles generated yet. Use the generator above.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {drafts.map((draft) => (
                  <div key={draft.id} className="rounded-xl border border-border bg-surface">
                    <div className="flex items-center gap-3 px-4 py-3 hover:bg-surface-hover">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-text-primary text-sm truncate">{draft.title}</p>
                        <p className="mt-0.5 text-xs text-text-muted">
                          {draft.keyword} · {draft.wordCount.toLocaleString()} words · {draft.tone} ·{" "}
                          {new Date(draft.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => void handleViewDraft(draft.id)}
                          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-background hover:text-primary border border-border transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {viewingDraft === draft.id ? "Hide" : "View"}
                        </button>
                        <button
                          onClick={() => void handleDeleteDraft(draft.id)}
                          className="text-text-muted hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {viewingDraft === draft.id && (
                      <div className="border-t border-border px-4 py-4">
                        {draftContent === null ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          </div>
                        ) : (
                          <div className="prose prose-sm prose-invert max-w-none">
                            <pre className="whitespace-pre-wrap text-sm text-text-secondary font-sans leading-relaxed">
                              {draftContent}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
