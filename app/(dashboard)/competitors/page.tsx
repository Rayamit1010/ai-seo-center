"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Globe,
  Plus,
  Trash2,
  ExternalLink,
  Zap,
  TrendingUp,
  Target,
  Link,
  FileText,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  BarChart3,
  Lightbulb,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Competitor {
  id: string;
  domain: string;
  name: string | null;
  notes: string | null;
  trackedSince: string;
  lastChecked: string | null;
}

interface ContentGap {
  topic: string;
  rationale: string;
}

interface KwOpportunity {
  keyword: string;
  intent: string;
  opportunity: string;
}

interface CompetitorAnalysis {
  id: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  contentGaps: ContentGap[];
  keywordOpportunities: KwOpportunity[];
  backlinkGaps: string[];
  quickWins: string[];
  createdAt: string;
}

interface PriorityAction {
  action: string;
  impact: string;
  effort: string;
  category: string;
}

interface QuarterlyGoal {
  goal: string;
  metric: string;
  target: string;
}

interface GrowthPlan {
  overallScore: number;
  momentumLabel: string;
  priorityActions: PriorityAction[];
  contentStrategy: string[];
  technicalFixes: string[];
  linkBuildingFocus: string[];
  quarterlyGoals: QuarterlyGoal[];
}

function parseJson<T>(raw: string | T, fallback: T): T {
  if (typeof raw !== "string") return raw ?? fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function ImpactBadge({ level }: { level: string }) {
  const cls =
    level === "high"
      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      : level === "medium"
      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
      : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  return (
    <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium capitalize", cls)}>{level}</span>
  );
}

function CategoryIcon({ category }: { category: string }) {
  const icons: Record<string, React.ReactNode> = {
    content: <FileText className="h-3.5 w-3.5" />,
    technical: <Zap className="h-3.5 w-3.5" />,
    backlinks: <Link className="h-3.5 w-3.5" />,
    keywords: <Target className="h-3.5 w-3.5" />,
  };
  return <>{icons[category] ?? <TrendingUp className="h-3.5 w-3.5" />}</>;
}

function AnalysisPanel({ analysis }: { analysis: CompetitorAnalysis }) {
  const strengths = parseJson<string[]>(analysis.strengths as unknown as string, []);
  const weaknesses = parseJson<string[]>(analysis.weaknesses as unknown as string, []);
  const contentGaps = parseJson<ContentGap[]>(analysis.contentGaps as unknown as string, []);
  const kwOps = parseJson<KwOpportunity[]>(analysis.keywordOpportunities as unknown as string, []);
  const backlinkGaps = parseJson<string[]>(analysis.backlinkGaps as unknown as string, []);
  const quickWins = parseJson<string[]>(analysis.quickWins as unknown as string, []);

  return (
    <div className="mt-3 space-y-4 rounded-xl border border-border bg-background p-4 text-sm">
      <p className="text-text-secondary leading-relaxed">{analysis.summary}</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {strengths.length > 0 && (
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-green-600">
              <CheckCircle className="h-3.5 w-3.5" /> Strengths
            </p>
            <ul className="space-y-1">
              {strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-text-secondary">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {weaknesses.length > 0 && (
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-red-600">
              <XCircle className="h-3.5 w-3.5" /> Weaknesses
            </p>
            <ul className="space-y-1">
              {weaknesses.map((w, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-text-secondary">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                  {w}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {quickWins.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Zap className="h-3.5 w-3.5" /> Quick Wins
          </p>
          <ol className="space-y-1.5 list-decimal list-inside">
            {quickWins.map((w, i) => (
              <li key={i} className="text-xs text-text-secondary">{w}</li>
            ))}
          </ol>
        </div>
      )}

      {contentGaps.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-text-primary">
            <FileText className="h-3.5 w-3.5" /> Content Gaps
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {contentGaps.map((gap, i) => (
              <div key={i} className="rounded-lg border border-border p-2.5">
                <p className="font-medium text-xs text-text-primary">{gap.topic}</p>
                <p className="mt-0.5 text-xs text-text-muted">{gap.rationale}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {kwOps.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-text-primary">
            <Target className="h-3.5 w-3.5" /> Keyword Opportunities
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-text-muted">
                  <th className="py-1.5 text-left font-medium">Keyword</th>
                  <th className="py-1.5 text-left font-medium">Intent</th>
                  <th className="py-1.5 text-left font-medium">Opportunity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {kwOps.map((kw, i) => (
                  <tr key={i}>
                    <td className="py-1.5 font-medium text-text-primary">{kw.keyword}</td>
                    <td className="py-1.5 text-text-muted capitalize">{kw.intent}</td>
                    <td className="py-1.5 text-text-secondary">{kw.opportunity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {backlinkGaps.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-text-primary">
            <Link className="h-3.5 w-3.5" /> Backlink Gap Sources
          </p>
          <div className="flex flex-wrap gap-1.5">
            {backlinkGaps.map((bg, i) => (
              <span
                key={i}
                className="rounded-full border border-border px-2.5 py-0.5 text-xs text-text-secondary"
              >
                {bg}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-text-muted">
        Analyzed {new Date(analysis.createdAt).toLocaleDateString()}
      </p>
    </div>
  );
}

export default function CompetitorsPage() {
  const [tab, setTab] = useState<"competitors" | "growth">("competitors");
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [analyses, setAnalyses] = useState<Record<string, CompetitorAnalysis | null>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [analyzing, setAnalyzing] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ domain: "", name: "", notes: "" });

  const [growthPlan, setGrowthPlan] = useState<GrowthPlan | null>(null);
  const [generatingGrowth, setGeneratingGrowth] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/competitors");
      const json = (await res.json()) as { success?: boolean; data?: Competitor[] };
      if (json.success) setCompetitors(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
      setAnalyses((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      toast.success("Competitor removed");
    } else {
      toast.error("Failed to remove competitor");
    }
  };

  const handleAnalyze = async (id: string) => {
    setAnalyzing((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/competitors/${id}/analyze`, { method: "POST" });
      const json = (await res.json()) as { success?: boolean; data?: CompetitorAnalysis; error?: string };
      if (json.success && json.data) {
        setAnalyses((prev) => ({ ...prev, [id]: json.data! }));
        setExpanded((prev) => ({ ...prev, [id]: true }));
        toast.success("Analysis complete");
      } else {
        toast.error(json.error ?? "Analysis failed");
      }
    } finally {
      setAnalyzing((prev) => ({ ...prev, [id]: false }));
    }
  };

  const loadAnalysis = async (id: string) => {
    if (id in analyses) {
      setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
      return;
    }
    const res = await fetch(`/api/competitors/${id}/analysis`);
    const json = (await res.json()) as { success?: boolean; data?: CompetitorAnalysis | null };
    if (json.success) {
      setAnalyses((prev) => ({ ...prev, [id]: json.data ?? null }));
      if (json.data) setExpanded((prev) => ({ ...prev, [id]: true }));
    }
  };

  const handleGenerateGrowth = async () => {
    setGeneratingGrowth(true);
    try {
      const res = await fetch("/api/growth/opportunities", { method: "POST" });
      const json = (await res.json()) as { success?: boolean; data?: GrowthPlan; error?: string };
      if (json.success && json.data) {
        setGrowthPlan(json.data);
        toast.success("Growth plan generated");
      } else {
        toast.error(json.error ?? "Failed to generate growth plan");
      }
    } finally {
      setGeneratingGrowth(false);
    }
  };

  const scoreColor =
    !growthPlan
      ? "text-text-muted"
      : growthPlan.overallScore >= 70
      ? "text-green-500"
      : growthPlan.overallScore >= 40
      ? "text-yellow-500"
      : "text-red-500";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Growth Mode</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Track competitors and generate AI-powered growth strategies.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-border bg-surface p-1 w-fit">
        {(["competitors", "growth"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors capitalize",
              tab === t
                ? "bg-primary text-white"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            {t === "competitors" ? "Competitors" : "Growth Opportunities"}
          </button>
        ))}
      </div>

      {tab === "competitors" && (
        <>
          {/* Add Form */}
          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-4 text-sm font-semibold text-text-primary">Add Competitor</h2>
            <form
              onSubmit={(e) => void handleAdd(e)}
              className="grid grid-cols-1 gap-3 sm:grid-cols-3"
            >
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  Domain *
                </label>
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
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  Name (optional)
                </label>
                <input
                  type="text"
                  placeholder="Competitor Inc."
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  Notes (optional)
                </label>
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
                  <div key={c.id} className="px-4 py-3">
                    <div className="flex items-center gap-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Globe className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-text-primary text-sm">
                            {c.name ?? c.domain}
                          </p>
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
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-xs text-text-muted">
                          {c.lastChecked
                            ? `Analyzed ${new Date(c.lastChecked).toLocaleDateString()}`
                            : "Not analyzed"}
                        </span>
                        <button
                          onClick={() => void handleAnalyze(c.id)}
                          disabled={analyzing[c.id]}
                          className="flex items-center gap-1.5 rounded-lg border border-primary px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 disabled:opacity-60"
                        >
                          {analyzing[c.id] ? (
                            <div className="h-3 w-3 animate-spin rounded-full border border-primary border-t-transparent" />
                          ) : (
                            <Zap className="h-3 w-3" />
                          )}
                          {analyzing[c.id] ? "Analyzing…" : "Analyze"}
                        </button>
                        {(analyses[c.id] || c.lastChecked) && (
                          <button
                            onClick={() => void loadAnalysis(c.id)}
                            className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary"
                          >
                            {expanded[c.id] ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => void handleDelete(c.id, c.domain)}
                          className="text-text-muted hover:text-red-400 transition-colors"
                          title="Remove competitor"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {expanded[c.id] && analyses[c.id] && (
                      <AnalysisPanel analysis={analyses[c.id]!} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tab === "growth" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-5">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">AI Growth Strategy</h2>
              <p className="mt-0.5 text-xs text-text-secondary">
                Generate a tailored growth plan based on your SEO data and tracked competitors.
              </p>
            </div>
            <button
              onClick={() => void handleGenerateGrowth()}
              disabled={generatingGrowth}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60"
            >
              {generatingGrowth ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Generating…
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  {growthPlan ? "Regenerate" : "Generate Growth Plan"}
                </>
              )}
            </button>
          </div>

          {growthPlan && (
            <>
              {/* Score Card */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-surface p-5 text-center">
                  <p className={cn("text-5xl font-bold", scoreColor)}>{growthPlan.overallScore}</p>
                  <p className="mt-1 text-xs text-text-muted">Growth Score</p>
                  <span className="mt-2 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    {growthPlan.momentumLabel}
                  </span>
                </div>

                <div className="sm:col-span-2 rounded-xl border border-border bg-surface p-5">
                  <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-text-primary">
                    <BarChart3 className="h-4 w-4 text-primary" /> Priority Actions
                  </h3>
                  <div className="space-y-2">
                    {growthPlan.priorityActions?.slice(0, 5).map((a, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-text-muted">
                          <CategoryIcon category={a.category} />
                        </div>
                        <p className="flex-1 text-xs text-text-secondary">{a.action}</p>
                        <div className="flex shrink-0 items-center gap-1">
                          <ImpactBadge level={a.impact} />
                          <span className="text-xs text-text-muted">/{a.effort}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Strategy Columns */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-surface p-4">
                  <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-text-primary">
                    <FileText className="h-3.5 w-3.5 text-primary" /> Content Strategy
                  </h3>
                  <ul className="space-y-2">
                    {growthPlan.contentStrategy?.map((s, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-text-secondary">
                        <ArrowUpRight className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-border bg-surface p-4">
                  <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-text-primary">
                    <Zap className="h-3.5 w-3.5 text-primary" /> Technical Fixes
                  </h3>
                  <ul className="space-y-2">
                    {growthPlan.technicalFixes?.map((f, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-text-secondary">
                        <ArrowUpRight className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-border bg-surface p-4">
                  <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-text-primary">
                    <Link className="h-3.5 w-3.5 text-primary" /> Link Building
                  </h3>
                  <ul className="space-y-2">
                    {growthPlan.linkBuildingFocus?.map((l, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-text-secondary">
                        <ArrowUpRight className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                        {l}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Quarterly Goals */}
              <div className="rounded-xl border border-border bg-surface p-5">
                <h3 className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-text-primary">
                  <Target className="h-4 w-4 text-primary" /> Quarterly Goals
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {growthPlan.quarterlyGoals?.map((g, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-border bg-background p-4"
                    >
                      <div className="mb-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                        {i + 1}
                      </div>
                      <p className="text-sm font-medium text-text-primary">{g.goal}</p>
                      <p className="mt-2 text-xs text-text-muted">{g.metric}</p>
                      <p className="mt-1 text-xs font-semibold text-primary">{g.target}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {!growthPlan && !generatingGrowth && (
            <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border py-20 text-text-muted">
              <Lightbulb className="h-10 w-10" />
              <div className="text-center">
                <p className="text-sm font-medium">No growth plan yet</p>
                <p className="mt-1 text-xs">
                  Click "Generate Growth Plan" to get AI-powered recommendations.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
