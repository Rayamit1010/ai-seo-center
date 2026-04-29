"use client";

import { useState } from "react";
import { Loader2, LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function BacklinksPage() {
  const [strategyForm, setStrategyForm] = useState({ targetUrl: "", industry: "SaaS", targetCountry: "USA", currentDR: "10" });
  const [qualifyForm, setQualifyForm] = useState({ domains: "", niche: "" });
  const [strategyResult, setStrategyResult] = useState<Record<string, unknown> | null>(null);
  const [qualifyResult, setQualifyResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const runStrategy = async () => {
    if (!strategyForm.targetUrl) { toast.error("Enter a target URL"); return; }
    setLoading("strategy");
    try {
      const res = await fetch("/api/backlinks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "strategy", ...strategyForm, currentDR: parseInt(strategyForm.currentDR) }),
      });
      const data = await res.json();
      if (data.success) { setStrategyResult(data.data); toast.success("Strategy generated!"); }
      else toast.error(data.error);
    } catch { toast.error("Failed"); }
    finally { setLoading(null); }
  };

  const runQualify = async () => {
    if (!qualifyForm.domains || !qualifyForm.niche) { toast.error("Enter domains and niche"); return; }
    setLoading("qualify");
    try {
      const domains = qualifyForm.domains.split("\n").map(d => d.trim()).filter(Boolean);
      const res = await fetch("/api/backlinks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "qualify", domains, niche: qualifyForm.niche }),
      });
      const data = await res.json();
      if (data.success) { setQualifyResult(data.data); toast.success("Domains evaluated!"); }
      else toast.error(data.error);
    } catch { toast.error("Failed"); }
    finally { setLoading(null); }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-heading text-2xl font-bold text-text-primary">Backlink Strategy</h2>
        <p className="mt-1 text-text-secondary">AI-powered white-hat link acquisition planning</p>
      </div>

      <Tabs defaultValue="strategy">
        <TabsList className="border border-border">
          <TabsTrigger value="strategy">Strategy Generator</TabsTrigger>
          <TabsTrigger value="qualify">Domain Qualifier</TabsTrigger>
          <TabsTrigger value="monitor">Link Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="strategy">
          <Card>
            <CardContent className="p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">Target URL</label>
                  <Input placeholder="https://yoursite.com" value={strategyForm.targetUrl} onChange={(e) => setStrategyForm(p => ({ ...p, targetUrl: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">Industry</label>
                  <Select value={strategyForm.industry} onValueChange={(v) => setStrategyForm(p => ({ ...p, industry: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["SaaS", "AI", "Software Dev", "Digital Marketing", "FinTech"].map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">Target Country</label>
                  <Select value={strategyForm.targetCountry} onValueChange={(v) => setStrategyForm(p => ({ ...p, targetCountry: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["USA", "UK", "Canada", "Australia", "UAE"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">Current DR (estimated)</label>
                  <Input type="number" min="0" max="100" value={strategyForm.currentDR} onChange={(e) => setStrategyForm(p => ({ ...p, currentDR: e.target.value }))} />
                </div>
              </div>
              <Button onClick={runStrategy} disabled={loading === "strategy"} className="mt-4 gap-2">
                {loading === "strategy" ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
                Generate Strategy
              </Button>
            </CardContent>
          </Card>

          {strategyResult && (
            <div className="mt-6 space-y-4">
              {/* 30-Day Plan */}
              {(strategyResult as Record<string, Record<string, string[]>>).thirtyDayPlan && (
                <Card>
                  <CardHeader><CardTitle>30-Day Quick Win Plan</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {Object.entries((strategyResult as Record<string, Record<string, string[]>>).thirtyDayPlan).map(([week, actions]) => (
                        <div key={week} className="rounded-lg bg-background p-4">
                          <p className="mb-2 text-sm font-semibold capitalize text-primary">{week}</p>
                          {(actions as string[]).map((a: string, i: number) => (
                            <p key={i} className="text-xs text-text-secondary">• {a}</p>
                          ))}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tactics */}
              {Array.isArray((strategyResult as Record<string, unknown[]>).tactics) && (
                <Card>
                  <CardHeader><CardTitle>Link Acquisition Tactics</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {((strategyResult as Record<string, Array<Record<string, string>>>).tactics).map((t, i) => (
                      <div key={i} className="flex items-start justify-between rounded-lg bg-background p-3">
                        <div>
                          <p className="text-sm font-medium text-text-primary">{t.tactic}</p>
                          <p className="text-xs text-text-secondary">{t.description}</p>
                        </div>
                        <Badge variant={t.difficulty === "easy" ? "success" : t.difficulty === "medium" ? "warning" : "destructive"}>{t.difficulty}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="qualify">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">Domains (one per line, max 20)</label>
                <Textarea placeholder="example1.com&#10;example2.com&#10;example3.com" value={qualifyForm.domains} onChange={(e) => setQualifyForm(p => ({ ...p, domains: e.target.value }))} className="min-h-[120px] font-mono text-xs" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">Your Niche</label>
                <Input placeholder="e.g., AI software development" value={qualifyForm.niche} onChange={(e) => setQualifyForm(p => ({ ...p, niche: e.target.value }))} />
              </div>
              <Button onClick={runQualify} disabled={loading === "qualify"} className="gap-2">
                {loading === "qualify" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Evaluate Domains
              </Button>
            </CardContent>
          </Card>

          {qualifyResult && Array.isArray((qualifyResult as Record<string, unknown>).domains) && (
            <Card className="mt-4">
              <CardHeader><CardTitle>Domain Evaluation</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {((qualifyResult as Record<string, Array<Record<string, unknown>>>).domains).map((d, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-background p-3">
                    <div>
                      <p className="font-mono text-sm text-text-primary">{d.domain as string}</p>
                      <p className="text-xs text-text-secondary">{d.reasoning as string}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Relevance: {d.nicheRelevance as number}/10</Badge>
                      <Badge variant={d.qualityTier === "Tier 1" ? "success" : d.qualityTier === "Tier 2" ? "warning" : "secondary"}>{d.qualityTier as string}</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="monitor">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-text-secondary mb-4">
                Use this Google Sheets template to track your backlinks:
              </p>
              <div className="rounded-lg bg-background p-4 font-mono text-xs text-text-secondary overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {["URL", "Domain", "DR", "Anchor Text", "Placement Date", "Status", "Last Checked"].map(h => (
                        <th key={h} className="pb-2 pr-4 text-left text-text-muted">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {["https://...", "example.com", "45", "your keyword", "2024-01-15", "Live", "2024-02-01"].map((v, i) => (
                        <td key={i} className="py-2 pr-4">{v}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
