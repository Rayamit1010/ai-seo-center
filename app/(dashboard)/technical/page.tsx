"use client";

import { useState } from "react";
import { Loader2, Download, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreRing } from "@/components/audit/ScoreRing";
import { toast } from "sonner";
import type { TechnicalSEOResult } from "@/types";

export default function TechnicalPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TechnicalSEOResult | null>(null);

  const analyze = async () => {
    if (!url.trim()) { toast.error("Enter a URL"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/technical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.success) { setResult(data.data); toast.success("Analysis complete!"); }
      else toast.error(data.error);
    } catch { toast.error("Analysis failed"); }
    finally { setLoading(false); }
  };

  const sections = result ? [
    { title: "Core Web Vitals", score: result.coreWebVitals.score },
    { title: "Crawlability", score: result.crawlability.score },
    { title: "Schema Markup", score: result.schema.score },
    { title: "Page Speed", score: Math.round((result.pageSpeed.mobileScore + result.pageSpeed.desktopScore) / 2) },
    { title: "Mobile", score: result.mobile.score },
    { title: "Security", score: result.security.score },
    { title: "HTML Quality", score: result.htmlQuality.score },
    { title: "International SEO", score: result.internationalSeo.score },
  ] : [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-heading text-2xl font-bold text-text-primary">Technical SEO Checker</h2>
        <p className="mt-1 text-text-secondary">Deep technical analysis powered by AI + PageSpeed data</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex gap-3">
            <Input placeholder="https://example.com" value={url} onChange={(e) => setUrl(e.target.value)} className="flex-1" />
            <Button onClick={analyze} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
              Analyze
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-6">
          {/* Score Overview */}
          <div className="flex flex-wrap justify-center gap-6 rounded-xl border border-border bg-surface p-6">
            {sections.map((s) => (
              <ScoreRing key={s.title} score={s.score} label={s.title} size={80} />
            ))}
          </div>

          {/* Core Web Vitals */}
          <Card>
            <CardHeader><CardTitle>Core Web Vitals</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {(["lcp", "fid", "cls"] as const).map((metric) => (
                <div key={metric} className="flex items-center justify-between rounded-lg bg-background p-4">
                  <div>
                    <p className="text-sm font-medium uppercase text-text-muted">{metric}</p>
                    <p className="font-mono text-lg text-text-primary">{result.coreWebVitals[metric].value}</p>
                    <p className="text-xs text-text-secondary">{result.coreWebVitals[metric].fix}</p>
                  </div>
                  <Badge variant={result.coreWebVitals[metric].status === "good" ? "success" : result.coreWebVitals[metric].status === "needs_improvement" ? "warning" : "destructive"}>
                    {result.coreWebVitals[metric].status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Schema */}
          <Card>
            <CardHeader><CardTitle>Schema Markup</CardTitle></CardHeader>
            <CardContent>
              <div className="mb-3">
                <p className="text-xs text-text-muted mb-1">Detected:</p>
                <div className="flex flex-wrap gap-1">
                  {result.schema.detected.map((s, i) => <Badge key={i} variant="success">{s}</Badge>)}
                  {result.schema.detected.length === 0 && <span className="text-xs text-error">None</span>}
                </div>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-1">Recommended:</p>
                <div className="flex flex-wrap gap-1">
                  {result.schema.missing.map((s, i) => <Badge key={i} variant="outline">{s}</Badge>)}
                </div>
              </div>
              {result.schema.recommendations.map((r, i) => (
                <p key={i} className="mt-2 text-sm text-text-secondary">• {r}</p>
              ))}
            </CardContent>
          </Card>

          {/* Security & HTML */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Security</CardTitle></CardHeader>
              <CardContent>
                <Badge variant={result.security.hasHttps ? "success" : "destructive"}>
                  {result.security.hasHttps ? "HTTPS Active" : "No HTTPS"}
                </Badge>
                {result.security.issues.map((issue, i) => (
                  <p key={i} className="mt-2 text-sm text-text-secondary">• {issue}</p>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>International SEO</CardTitle></CardHeader>
              <CardContent>
                {result.internationalSeo.issues.map((issue, i) => (
                  <p key={i} className="text-sm text-text-secondary">• {issue}</p>
                ))}
                {result.internationalSeo.recommendations.map((rec, i) => (
                  <p key={i} className="mt-1 text-sm text-success">→ {rec}</p>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => window.print()} className="gap-2 no-print">
              <Download className="h-4 w-4" /> Export PDF
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
