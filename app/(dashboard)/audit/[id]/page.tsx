"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Download, ExternalLink, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { ScoreRing } from "@/components/audit/ScoreRing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FullAuditResult, AuditScores } from "@/types";

interface AuditData {
  id: string;
  url: string;
  title: string | null;
  status: string;
  scores: AuditScores | null;
  onPage: FullAuditResult["onPage"] | null;
  technical: FullAuditResult["technical"] | null;
  offPage: FullAuditResult["offPage"] | null;
  keywords: FullAuditResult["keywords"] | null;
  checklist: FullAuditResult["checklist"] | null;
  summary: string | null;
  createdAt: string;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "good") return <CheckCircle className="h-4 w-4 text-success" />;
  if (status === "poor" || status === "missing") return <XCircle className="h-4 w-4 text-error" />;
  return <AlertTriangle className="h-4 w-4 text-warning" />;
}

export default function AuditResultPage() {
  const params = useParams();
  const [audit, setAudit] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAudit = async () => {
      try {
        const res = await fetch(`/api/audit/${params.id}`);
        const data = await res.json();
        if (data.success) {
          setAudit(data.data);
          // If still processing, poll
          if (data.data.status !== "COMPLETE" && data.data.status !== "FAILED") {
            const interval = setInterval(async () => {
              const r = await fetch(`/api/audit/${params.id}`);
              const d = await r.json();
              if (d.success) {
                setAudit(d.data);
                if (d.data.status === "COMPLETE" || d.data.status === "FAILED") {
                  clearInterval(interval);
                }
              }
            }, 3000);
            return () => clearInterval(interval);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAudit();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!audit) {
    return <p className="text-center text-text-secondary">Audit not found.</p>;
  }

  if (audit.status !== "COMPLETE") {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-text-secondary">
          {audit.status === "FAILED" ? "Audit failed. Please try again." : "Audit is processing..."}
        </p>
      </div>
    );
  }

  const scores = audit.scores;
  const onPage = audit.onPage;
  const technical = audit.technical;
  const offPage = audit.offPage;
  const keywords = audit.keywords;
  const checklist = audit.checklist;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-text-primary">
            {audit.title || "SEO Audit Report"}
          </h2>
          <a
            href={audit.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 flex items-center gap-1 font-mono text-sm text-primary hover:underline"
          >
            {audit.url} <ExternalLink className="h-3 w-3" />
          </a>
          {audit.summary && (
            <p className="mt-3 max-w-2xl text-sm text-text-secondary">{audit.summary}</p>
          )}
        </div>
        <Button variant="outline" onClick={() => window.print()} className="no-print gap-2">
          <Download className="h-4 w-4" /> Export PDF
        </Button>
      </div>

      {/* Score Dashboard */}
      {scores && (
        <div className="flex flex-wrap items-center justify-center gap-8 rounded-xl border border-border bg-surface p-8">
          <ScoreRing score={scores.overall} label="Overall" size={120} />
          <div className="flex gap-6">
            <ScoreRing score={scores.onpage} label="On-Page" />
            <ScoreRing score={scores.technical} label="Technical" />
            <ScoreRing score={scores.offpage} label="Off-Page" />
            <ScoreRing score={scores.keywords} label="Keywords" />
          </div>
        </div>
      )}

      {/* Detailed Results */}
      <Tabs defaultValue="onpage">
        <TabsList className="flex-wrap border border-border">
          <TabsTrigger value="onpage">On-Page</TabsTrigger>
          <TabsTrigger value="technical">Technical</TabsTrigger>
          <TabsTrigger value="offpage">Off-Page</TabsTrigger>
          <TabsTrigger value="keywords">Keywords</TabsTrigger>
          <TabsTrigger value="checklist">Action Plan</TabsTrigger>
        </TabsList>

        {/* On-Page Tab */}
        <TabsContent value="onpage">
          {onPage && (
            <div className="grid gap-4 md:grid-cols-2">
              {/* Title Tag */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Title Tag</CardTitle>
                    <StatusIcon status={onPage.titleTag.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="font-mono text-sm text-text-primary">&quot;{onPage.titleTag.current}&quot;</p>
                  <p className="text-xs text-text-muted">Length: {onPage.titleTag.length} chars</p>
                  <Badge variant={onPage.titleTag.status === "good" ? "success" : "warning"}>
                    {onPage.titleTag.status}
                  </Badge>
                  <p className="text-sm text-text-secondary">{onPage.titleTag.recommendation}</p>
                </CardContent>
              </Card>

              {/* Meta Description */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Meta Description</CardTitle>
                    <StatusIcon status={onPage.metaDescription.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="font-mono text-sm text-text-primary">&quot;{onPage.metaDescription.current}&quot;</p>
                  <p className="text-xs text-text-muted">Length: {onPage.metaDescription.length} chars</p>
                  <p className="text-sm text-text-secondary">{onPage.metaDescription.recommendation}</p>
                </CardContent>
              </Card>

              {/* Headings */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Headings</CardTitle>
                    <StatusIcon status={onPage.headings.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-text-muted">H1 Count: {onPage.headings.h1Count}</p>
                  {onPage.headings.h1Text.map((h1, i) => (
                    <p key={i} className="font-mono text-sm text-text-primary">H1: {h1}</p>
                  ))}
                  <p className="text-sm text-text-secondary">{onPage.headings.recommendation}</p>
                </CardContent>
              </Card>

              {/* Content */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Content Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-text-muted">Word Count: {onPage.content.wordCount}</p>
                  <p className="text-xs text-text-muted">Readability: {onPage.content.readabilityScore}/100</p>
                  <p className="text-sm text-text-secondary">{onPage.content.recommendation}</p>
                  {onPage.content.lsiKeywordsMissing.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-text-secondary">Missing LSI Keywords:</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {onPage.content.lsiKeywordsMissing.map((kw, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{kw}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Images */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Images</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-text-secondary">
                    {onPage.images.total} total, {onPage.images.missingAlt} missing alt text
                  </p>
                  <p className="mt-2 text-sm text-text-secondary">{onPage.images.recommendation}</p>
                </CardContent>
              </Card>

              {/* Internal Linking */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Internal Linking</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-text-secondary">
                    {onPage.internalLinking.internalCount} internal / {onPage.internalLinking.externalCount} external
                  </p>
                  {onPage.internalLinking.opportunities.map((opp, i) => (
                    <p key={i} className="mt-1 text-sm text-text-secondary">• {opp}</p>
                  ))}
                </CardContent>
              </Card>

              {/* Issues & Wins */}
              <Card className="md:col-span-2">
                <CardContent className="grid gap-6 p-6 md:grid-cols-2">
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-error">Issues</h4>
                    {onPage.issues.map((issue, i) => (
                      <p key={i} className="text-sm text-text-secondary">• {issue}</p>
                    ))}
                  </div>
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-success">Wins</h4>
                    {onPage.wins.map((win, i) => (
                      <p key={i} className="text-sm text-text-secondary">• {win}</p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Technical Tab */}
        <TabsContent value="technical">
          {technical && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Core Web Vitals</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(["lcp", "fid", "cls"] as const).map((metric) => (
                    <div key={metric} className="flex items-center justify-between rounded-lg bg-background p-3">
                      <div>
                        <p className="text-xs font-medium uppercase text-text-muted">{metric}</p>
                        <p className="font-mono text-sm text-text-primary">{technical.coreWebVitals[metric].value}</p>
                      </div>
                      <Badge variant={
                        technical.coreWebVitals[metric].status === "good" ? "success" :
                        technical.coreWebVitals[metric].status === "needs_improvement" ? "warning" : "destructive"
                      }>
                        {technical.coreWebVitals[metric].status}
                      </Badge>
                    </div>
                  ))}
                  <p className="text-xs text-text-muted">
                    Mobile: {technical.coreWebVitals.performanceScore.mobile}/100 | Desktop: {technical.coreWebVitals.performanceScore.desktop}/100
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Schema Markup</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-xs text-text-muted">Detected:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {technical.schema.detected.map((s, i) => (
                        <Badge key={i} variant="success" className="text-xs">{s}</Badge>
                      ))}
                      {technical.schema.detected.length === 0 && (
                        <span className="text-xs text-error">None detected</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Recommended to add:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {technical.schema.missing.map((s, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardContent className="grid gap-6 p-6 md:grid-cols-2">
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-error">Issues</h4>
                    {technical.issues.map((issue, i) => (
                      <p key={i} className="text-sm text-text-secondary">• {issue}</p>
                    ))}
                  </div>
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-success">Wins</h4>
                    {technical.wins.map((win, i) => (
                      <p key={i} className="text-sm text-text-secondary">• {win}</p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Off-Page Tab */}
        <TabsContent value="offpage">
          {offPage && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Backlink Strategy</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-text-muted">Priority Actions</p>
                    {offPage.backlinkStrategy.priorityActions.map((a, i) => (
                      <p key={i} className="mt-1 text-sm text-text-secondary">{i + 1}. {a}</p>
                    ))}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-text-muted">Quick Wins</p>
                    {offPage.backlinkStrategy.quickWins.map((w, i) => (
                      <p key={i} className="mt-1 text-sm text-success">✓ {w}</p>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Anchor Text Strategy</CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.entries(offPage.anchorTextStrategy).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                      <span className="text-sm capitalize text-text-secondary">{key.replace(/([A-Z])/g, " $1")}</span>
                      <span className="font-mono text-sm text-text-primary">{value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Keywords Tab */}
        <TabsContent value="keywords">
          {keywords && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Primary Keywords</CardTitle>
                </CardHeader>
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
                        {keywords.primary.map((kw, i) => (
                          <tr key={i} className="border-b border-border">
                            <td className="py-2 font-mono text-text-primary">{kw.keyword}</td>
                            <td className="py-2"><Badge variant="outline" className="text-xs">{kw.intent}</Badge></td>
                            <td className="py-2 text-text-secondary">{kw.volume}</td>
                            <td className="py-2 text-text-secondary">{kw.difficulty}</td>
                            <td className="py-2">
                              <Badge variant={kw.priority === "high" ? "success" : kw.priority === "medium" ? "warning" : "secondary"}>
                                {kw.priority}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Content Ideas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {keywords.contentIdeas.map((idea, i) => (
                    <div key={i} className="rounded-lg bg-background p-3">
                      <p className="text-sm font-medium text-text-primary">{idea.title}</p>
                      <p className="mt-1 text-xs text-text-muted">
                        Target: {idea.targetKeyword} · {idea.wordCount} words · Priority: {idea.priority}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Checklist Tab */}
        <TabsContent value="checklist">
          {checklist && (
            <div className="space-y-4">
              {(["critical", "high", "medium", "longTerm"] as const).map((priority) => (
                checklist[priority].length > 0 && (
                  <Card key={priority}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base capitalize">
                        <span className={
                          priority === "critical" ? "text-error" :
                          priority === "high" ? "text-warning" :
                          priority === "medium" ? "text-primary" : "text-text-secondary"
                        }>●</span>
                        {priority === "longTerm" ? "Long Term" : priority} Priority
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {checklist[priority].map((item, i) => (
                        <div key={i} className="flex items-start gap-3 rounded-lg bg-background p-3">
                          <input type="checkbox" className="mt-1 h-4 w-4 rounded border-border" />
                          <div className="flex-1">
                            <p className="text-sm text-text-primary">{item.action}</p>
                            <div className="mt-1 flex gap-2">
                              <Badge variant="outline" className="text-xs">Impact: {item.impact}</Badge>
                              <Badge variant="outline" className="text-xs">Effort: {item.effort}</Badge>
                              <Badge variant="outline" className="text-xs">{item.module}</Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
