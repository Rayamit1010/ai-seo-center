"use client";

import { useState } from "react";
import { Loader2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function AuthorityPage() {
  const [roadmapForm, setRoadmapForm] = useState({ currentDR: "10", monthlyTraffic: "1000", revenueGoal: "$100,000", teamSize: "3" });
  const [prForm, setPrForm] = useState({ industry: "Technology", targetAudience: "B2B decision makers", quarter: "Q1" });
  const [brandForm, setBrandForm] = useState({ founderName: "", expertiseAreas: "", targetAudience: "Tech startups" });
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const callApi = async (action: string, payload: Record<string, unknown>) => {
    setLoading(action);
    setResult(null);
    try {
      const res = await fetch("/api/authority", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await res.json();
      if (data.success) { setResult(data.data); toast.success("Generated!"); }
      else toast.error(data.error);
    } catch { toast.error("Failed"); }
    finally { setLoading(null); }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-heading text-2xl font-bold text-text-primary">Authority Building</h2>
        <p className="mt-1 text-text-secondary">Build domain authority with AI-powered roadmaps</p>
      </div>

      <Tabs defaultValue="roadmap">
        <TabsList className="border border-border">
          <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
          <TabsTrigger value="pr">Digital PR</TabsTrigger>
          <TabsTrigger value="brand">Founder Brand</TabsTrigger>
        </TabsList>

        <TabsContent value="roadmap">
          <Card>
            <CardContent className="p-6 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">Current DR</label>
                <Input type="number" value={roadmapForm.currentDR} onChange={(e) => setRoadmapForm(p => ({ ...p, currentDR: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">Monthly Organic Traffic</label>
                <Input type="number" value={roadmapForm.monthlyTraffic} onChange={(e) => setRoadmapForm(p => ({ ...p, monthlyTraffic: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">12-Month Revenue Goal</label>
                <Input value={roadmapForm.revenueGoal} onChange={(e) => setRoadmapForm(p => ({ ...p, revenueGoal: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">Team Size</label>
                <Input type="number" value={roadmapForm.teamSize} onChange={(e) => setRoadmapForm(p => ({ ...p, teamSize: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <Button onClick={() => callApi("roadmap", { currentDR: parseInt(roadmapForm.currentDR), monthlyTraffic: parseInt(roadmapForm.monthlyTraffic), revenueGoal: roadmapForm.revenueGoal, teamSize: parseInt(roadmapForm.teamSize) })} disabled={loading === "roadmap"} className="gap-2">
                  {loading === "roadmap" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
                  Generate Roadmap
                </Button>
              </div>
            </CardContent>
          </Card>

          {result && Array.isArray((result as Record<string, unknown>).milestones) && (
            <div className="mt-6 space-y-4">
              {(result as { summary?: string }).summary && (
                <Card><CardContent className="p-6"><p className="text-sm text-text-secondary">{(result as { summary: string }).summary}</p></CardContent></Card>
              )}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {((result as { milestones: Array<Record<string, unknown>> }).milestones).map((m, i) => (
                  <Card key={i}>
                    <CardHeader><CardTitle className="text-primary">{m.quarter as string}</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded bg-background p-2"><span className="text-text-muted">DR Target</span><p className="font-mono font-bold text-text-primary">{m.drTarget as number}</p></div>
                        <div className="rounded bg-background p-2"><span className="text-text-muted">Traffic</span><p className="font-mono font-bold text-text-primary">{(m.trafficTarget as number).toLocaleString()}</p></div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-text-muted">Tactics:</p>
                        {(m.tactics as string[]).map((t, j) => <p key={j} className="text-xs text-text-secondary">• {t}</p>)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="pr">
          <Card>
            <CardContent className="p-6 grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">Industry</label>
                <Input value={prForm.industry} onChange={(e) => setPrForm(p => ({ ...p, industry: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">Target Audience</label>
                <Input value={prForm.targetAudience} onChange={(e) => setPrForm(p => ({ ...p, targetAudience: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">Quarter</label>
                <Select value={prForm.quarter} onValueChange={(v) => setPrForm(p => ({ ...p, quarter: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Q1", "Q2", "Q3", "Q4"].map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-3">
                <Button onClick={() => callApi("pr_campaign", prForm)} disabled={loading === "pr_campaign"} className="gap-2">
                  {loading === "pr_campaign" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Generate PR Campaigns
                </Button>
              </div>
            </CardContent>
          </Card>

          {result && Array.isArray((result as Record<string, unknown>).campaigns) && (
            <div className="mt-6 space-y-4">
              {((result as { campaigns: Array<Record<string, string | string[]>> }).campaigns).map((c, i) => (
                <Card key={i}>
                  <CardHeader><CardTitle>{c.title as string}</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-text-secondary"><strong>Hook:</strong> {c.hook as string}</p>
                    <Badge variant="outline">{c.assetType as string}</Badge>
                    <p className="text-xs text-text-muted">Expected links: {c.expectedLinks as string}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="brand">
          <Card>
            <CardContent className="p-6 grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">Founder Name</label>
                <Input value={brandForm.founderName} onChange={(e) => setBrandForm(p => ({ ...p, founderName: e.target.value }))} placeholder="Your name" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">Expertise Areas</label>
                <Input value={brandForm.expertiseAreas} onChange={(e) => setBrandForm(p => ({ ...p, expertiseAreas: e.target.value }))} placeholder="SEO, AI, SaaS" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">Target Audience</label>
                <Input value={brandForm.targetAudience} onChange={(e) => setBrandForm(p => ({ ...p, targetAudience: e.target.value }))} />
              </div>
              <div className="md:col-span-3">
                <Button onClick={() => callApi("founder_brand", brandForm)} disabled={loading === "founder_brand"} className="gap-2">
                  {loading === "founder_brand" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Generate Brand Strategy
                </Button>
              </div>
            </CardContent>
          </Card>

          {result && Array.isArray((result as Record<string, unknown>).linkedInCalendar) && (
            <div className="mt-6 space-y-4">
              <Card>
                <CardHeader><CardTitle>30-Day LinkedIn Calendar</CardTitle></CardHeader>
                <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {((result as { linkedInCalendar: Array<Record<string, string | number>> }).linkedInCalendar).slice(0, 10).map((post, i) => (
                    <div key={i} className="rounded-lg bg-background p-3">
                      <p className="text-xs text-primary font-medium">Day {post.day}</p>
                      <p className="text-sm text-text-primary mt-1">{post.topic}</p>
                      <p className="text-xs text-text-muted mt-1 italic">&quot;{post.hook}&quot;</p>
                      <Badge variant="outline" className="mt-1 text-xs">{post.format}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
