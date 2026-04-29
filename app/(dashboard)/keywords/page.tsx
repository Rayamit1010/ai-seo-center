"use client";

import { useState } from "react";
import { Loader2, Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { KeywordResearchResult } from "@/types";

export default function KeywordsPage() {
  const [form, setForm] = useState({
    seedKeyword: "",
    targetCountry: "USA",
    industry: "SaaS",
    targetAudience: "SMEs",
    competitorDomains: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<KeywordResearchResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.seedKeyword.trim()) {
      toast.error("Enter a seed keyword");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.data);
        toast.success("Keyword research complete!");
      } else {
        toast.error(data.error || "Research failed");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!result) return;
    const rows = [["Keyword", "Intent", "Volume", "Difficulty", "Priority"]];
    result.primary.forEach((kw) => rows.push([kw.keyword, kw.intent, kw.volume, kw.difficulty, kw.priority]));
    result.longTail.forEach((kw) => rows.push([kw.keyword, kw.intent, kw.volume, "", kw.opportunity]));
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `keywords-${form.seedKeyword}.csv`;
    a.click();
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-heading text-2xl font-bold text-text-primary">Keyword Research</h2>
        <p className="mt-1 text-text-secondary">AI-powered keyword discovery and content ideas</p>
      </div>

      {/* Input Form */}
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-text-primary">Seed Keyword</label>
              <Input
                placeholder="e.g., AI software development"
                value={form.seedKeyword}
                onChange={(e) => setForm((p) => ({ ...p, seedKeyword: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">Target Country</label>
              <Select value={form.targetCountry} onValueChange={(v) => setForm((p) => ({ ...p, targetCountry: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["USA", "UK", "Canada", "Australia", "UAE", "Germany"].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">Industry</label>
              <Select value={form.industry} onValueChange={(v) => setForm((p) => ({ ...p, industry: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["SaaS", "AI", "Software Dev", "Digital Marketing", "FinTech", "Other"].map((i) => (
                    <SelectItem key={i} value={i}>{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">Target Audience</label>
              <Select value={form.targetAudience} onValueChange={(v) => setForm((p) => ({ ...p, targetAudience: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Startups", "SMEs", "Enterprise"].map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">Competitors <span className="text-text-muted">(optional)</span></label>
              <Input
                placeholder="site1.com, site2.com"
                value={form.competitorDomains}
                onChange={(e) => setForm((p) => ({ ...p, competitorDomains: e.target.value }))}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={loading} className="w-full gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {loading ? "Researching..." : "Research Keywords"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-lg font-semibold text-text-primary">Results</h3>
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>

          {/* Primary Keywords Table */}
          <Card>
            <CardHeader><CardTitle>Primary Keywords</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-2 text-left text-xs text-text-muted">Keyword</th>
                      <th className="pb-2 text-left text-xs text-text-muted">Intent</th>
                      <th className="pb-2 text-left text-xs text-text-muted">Volume</th>
                      <th className="pb-2 text-left text-xs text-text-muted">Difficulty</th>
                      <th className="pb-2 text-left text-xs text-text-muted">Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.primary.map((kw, i) => (
                      <tr key={i} className="border-b border-border hover:bg-surface-hover">
                        <td className="py-2.5 font-mono text-text-primary">{kw.keyword}</td>
                        <td className="py-2.5"><Badge variant="outline">{kw.intent}</Badge></td>
                        <td className="py-2.5 text-text-secondary">{kw.volume}</td>
                        <td className="py-2.5 text-text-secondary">{kw.difficulty}</td>
                        <td className="py-2.5"><Badge variant={kw.priority === "high" ? "success" : "secondary"}>{kw.priority}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Long-Tail Keywords */}
          <Card>
            <CardHeader><CardTitle>Long-Tail Keywords</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {result.longTail.map((kw, i) => (
                  <div key={i} className="rounded-lg bg-background p-3">
                    <p className="text-sm text-text-primary">{kw.keyword}</p>
                    <div className="mt-1 flex gap-1">
                      <Badge variant="outline" className="text-xs">{kw.intent}</Badge>
                      <Badge variant={kw.opportunity === "high" ? "success" : "secondary"} className="text-xs">{kw.opportunity}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Content Ideas */}
          <Card>
            <CardHeader><CardTitle>Content Ideas</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {result.contentIdeas.map((idea, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-background p-3">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{idea.title}</p>
                    <p className="text-xs text-text-muted">Target: {idea.targetKeyword} · {idea.wordCount} words</p>
                  </div>
                  <Badge variant={idea.priority === "high" ? "success" : "secondary"}>{idea.priority}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Topic Cluster */}
          {result.topicCluster && (
            <Card>
              <CardHeader><CardTitle>Topic Cluster</CardTitle></CardHeader>
              <CardContent>
                <div className="rounded-lg border border-primary/30 bg-primary-light p-4 text-center">
                  <p className="font-semibold text-primary">Pillar: {result.topicCluster.pillar}</p>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {result.topicCluster.supporting.map((s, i) => (
                    <div key={i} className="rounded-lg bg-background p-3 text-sm text-text-secondary">
                      → {s}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
