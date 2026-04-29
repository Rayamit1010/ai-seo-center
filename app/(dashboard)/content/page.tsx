"use client";

import { useEffect, useState } from "react";
import { Loader2, Copy, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScoreRing } from "@/components/audit/ScoreRing";
import { toast } from "sonner";
import type { ContentAnalysisResult, MetaTagResult, SchemaGeneratorResult } from "@/types";

interface ProjectOption {
  id: string;
  name: string;
  cmsProvider: "none" | "wordpress" | "webhook";
  cmsPublishStatus: "draft" | "publish";
}

type PublishFeedback =
  | {
      tone: "success" | "error";
      message: string;
    }
  | null;

export default function ContentPage() {
  const [analyzeUrl, setAnalyzeUrl] = useState("");
  const [analyzeHtml, setAnalyzeHtml] = useState("");
  const [metaForm, setMetaForm] = useState({ topic: "", targetKeyword: "", targetAudience: "B2B tech", tone: "professional" });
  const [schemaForm, setSchemaForm] = useState({ pageType: "Homepage", details: {} as Record<string, string> });
  const [contentResult, setContentResult] = useState<ContentAnalysisResult | null>(null);
  const [metaResult, setMetaResult] = useState<MetaTagResult | null>(null);
  const [schemaResult, setSchemaResult] = useState<SchemaGeneratorResult | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [publishFeedback, setPublishFeedback] = useState<PublishFeedback>(null);
  const [publishForm, setPublishForm] = useState({
    projectId: "",
    title: "",
    slug: "",
    excerpt: "",
    html: "",
    status: "draft" as "draft" | "publish",
  });

  useEffect(() => {
    void loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await fetch("/api/projects");
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.reason || payload.error || "Projects could not be loaded.");
      }
      const connectedProjects = (Array.isArray(payload.data) ? payload.data : []).filter(
        (project: ProjectOption) => project.cmsProvider !== "none"
      );
      setProjects(connectedProjects);
      setPublishFeedback(null);
      setPublishForm((current) => ({
        ...current,
        projectId: current.projectId || connectedProjects[0]?.id || "",
        status: connectedProjects[0]?.cmsPublishStatus || current.status,
      }));
    } catch (error) {
      console.error("Load CMS projects error:", error);
    }
  };

  const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success("Copied!"); };

  const analyzeContent = async () => {
    if (!analyzeUrl && !analyzeHtml) { toast.error("Enter URL or paste HTML"); return; }
    setLoading("analyze");
    try {
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analyze", url: analyzeUrl || undefined, html: analyzeHtml || undefined }),
      });
      const data = await res.json();
      if (data.success) { setContentResult(data.data); toast.success("Analysis complete!"); }
      else toast.error(data.error);
    } catch { toast.error("Failed"); }
    finally { setLoading(null); }
  };

  const generateMeta = async () => {
    if (!metaForm.topic || !metaForm.targetKeyword) { toast.error("Enter topic and keyword"); return; }
    setLoading("meta");
    try {
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "meta_tags", ...metaForm }),
      });
      const data = await res.json();
      if (data.success) { setMetaResult(data.data); toast.success("Meta tags generated!"); }
      else toast.error(data.error);
    } catch { toast.error("Failed"); }
    finally { setLoading(null); }
  };

  const generateSchema = async () => {
    setLoading("schema");
    try {
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "schema", pageType: schemaForm.pageType, details: schemaForm.details }),
      });
      const data = await res.json();
      if (data.success) { setSchemaResult(data.data); toast.success("Schema generated!"); }
      else toast.error(data.error);
    } catch { toast.error("Failed"); }
    finally { setLoading(null); }
  };

  const publishToCms = async () => {
    if (!publishForm.projectId || !publishForm.title || !publishForm.html) {
      toast.error("Choose a connected project, title, and HTML content first.");
      return;
    }
    setLoading("publish");
    setPublishFeedback(null);
    try {
      const response = await fetch("/api/content/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(publishForm),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.reason || payload.error || "CMS publishing failed.");
      }
      const successMessage =
        payload.data?.url
          ? `Published successfully. ${payload.data.url}`
          : "Content sent to the configured CMS.";
      setPublishFeedback({ tone: "success", message: successMessage });
      toast.success(successMessage);
    } catch (error) {
      const message = error instanceof Error ? error.message : "CMS publishing failed.";
      setPublishFeedback({ tone: "error", message });
      toast.error(message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-heading text-2xl font-bold text-text-primary">Content & On-Page Analyzer</h2>
        <p className="mt-1 text-text-secondary">Optimize content, meta tags, and structured data</p>
      </div>

      <Tabs defaultValue="analyze">
        <TabsList className="border border-border">
          <TabsTrigger value="analyze">Page Analyzer</TabsTrigger>
          <TabsTrigger value="meta">Meta Tag Generator</TabsTrigger>
          <TabsTrigger value="schema">Schema Generator</TabsTrigger>
          <TabsTrigger value="publish">CMS Publish</TabsTrigger>
        </TabsList>

        {/* Page Analyzer */}
        <TabsContent value="analyze">
          <Card>
            <CardContent className="p-6 space-y-4">
              <Input placeholder="https://example.com" value={analyzeUrl} onChange={(e) => setAnalyzeUrl(e.target.value)} />
              <p className="text-xs text-text-muted text-center">— or —</p>
              <Textarea placeholder="Paste HTML content..." value={analyzeHtml} onChange={(e) => setAnalyzeHtml(e.target.value)} className="font-mono text-xs min-h-[100px]" />
              <Button onClick={analyzeContent} disabled={loading === "analyze"} className="gap-2">
                {loading === "analyze" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Analyze Content
              </Button>
            </CardContent>
          </Card>

          {contentResult && (
            <div className="mt-6 space-y-4">
              <div className="flex justify-center gap-6 rounded-xl border border-border bg-surface p-6">
                <ScoreRing score={contentResult.contentScore.overall} label="Overall" size={100} />
                <ScoreRing score={contentResult.contentScore.depth} label="Depth" />
                <ScoreRing score={contentResult.contentScore.keywords} label="Keywords" />
                <ScoreRing score={contentResult.contentScore.readability} label="Readability" />
                <ScoreRing score={contentResult.contentScore.structure} label="Structure" />
              </div>

              <Card>
                <CardHeader><CardTitle>Title Optimization</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-xs text-text-muted">Current: <span className="font-mono text-text-primary">{contentResult.titleOptimizer.current}</span></p>
                  {contentResult.titleOptimizer.alternatives.map((alt, i) => (
                    <div key={i} className="mt-2 flex items-center justify-between rounded-lg bg-background p-3">
                      <span className="text-sm text-text-primary">{alt.title} <span className="text-xs text-text-muted">({alt.charCount} chars)</span></span>
                      <Button variant="ghost" size="sm" onClick={() => copy(alt.title)}><Copy className="h-3 w-3" /></Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>E-E-A-T Score</CardTitle></CardHeader>
                <CardContent>
                  <ScoreRing score={contentResult.eeatScore.score} label="E-E-A-T" />
                  {contentResult.eeatScore.improvements.map((imp, i) => (
                    <p key={i} className="mt-2 text-sm text-text-secondary">→ {imp}</p>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Meta Tag Generator */}
        <TabsContent value="meta">
          <Card>
            <CardContent className="p-6 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">Page Topic</label>
                <Input placeholder="AI Development Services" value={metaForm.topic} onChange={(e) => setMetaForm(p => ({ ...p, topic: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">Target Keyword</label>
                <Input placeholder="ai development company" value={metaForm.targetKeyword} onChange={(e) => setMetaForm(p => ({ ...p, targetKeyword: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">Target Audience</label>
                <Input value={metaForm.targetAudience} onChange={(e) => setMetaForm(p => ({ ...p, targetAudience: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">Tone</label>
                <Select value={metaForm.tone} onValueChange={(v) => setMetaForm(p => ({ ...p, tone: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["professional", "casual", "authoritative", "friendly"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Button onClick={generateMeta} disabled={loading === "meta"} className="gap-2">
                  {loading === "meta" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Generate Meta Tags
                </Button>
              </div>
            </CardContent>
          </Card>

          {metaResult && (
            <div className="mt-6 space-y-4">
              <Card>
                <CardHeader><CardTitle>Title Tags</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {metaResult.titles.map((t, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-background p-3">
                      <div>
                        <p className="text-sm text-text-primary">{t.text}</p>
                        <p className="text-xs text-text-muted">{t.charCount} chars · Keyword: {t.keywordPosition}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => copy(t.text)}><Copy className="h-3 w-3" /></Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Meta Descriptions</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {metaResult.descriptions.map((d, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-background p-3">
                      <div>
                        <p className="text-sm text-text-primary">{d.text}</p>
                        <p className="text-xs text-text-muted">{d.charCount} chars</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => copy(d.text)}><Copy className="h-3 w-3" /></Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Schema Generator */}
        <TabsContent value="schema">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">Page Type</label>
                <Select value={schemaForm.pageType} onValueChange={(v) => setSchemaForm(p => ({ ...p, pageType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Homepage", "Service", "Blog Post", "FAQ", "Local Business"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={generateSchema} disabled={loading === "schema"} className="gap-2">
                {loading === "schema" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Generate Schema
              </Button>
            </CardContent>
          </Card>

          {schemaResult && (
            <Card className="mt-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>JSON-LD: {schemaResult.type}</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => copy(schemaResult.jsonLd)} className="gap-2">
                    <Copy className="h-3 w-3" /> Copy
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="overflow-x-auto rounded-lg bg-background p-4 font-mono text-xs text-text-secondary">
                  {schemaResult.jsonLd}
                </pre>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="publish">
          <Card>
            <CardContent className="p-6 space-y-4">
              {projects.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-background p-4 text-sm text-text-secondary">
                  No CMS-connected projects yet. Add WordPress or webhook details in the Projects workspace first.
                </div>
              ) : (
                <>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-text-primary">Project</label>
                    <Select value={publishForm.projectId} onValueChange={(value) => {
                      const project = projects.find((item) => item.id === value);
                      setPublishForm((current) => ({
                        ...current,
                        projectId: value,
                        status: project?.cmsPublishStatus || current.status,
                      }));
                    }}>
                      <SelectTrigger><SelectValue placeholder="Choose a CMS-connected project" /></SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name} ({project.cmsProvider})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-text-primary">Post title</label>
                      <Input value={publishForm.title} onChange={(event) => setPublishForm((current) => ({ ...current, title: event.target.value }))} placeholder="AI SEO content workflow guide" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-text-primary">Slug</label>
                      <Input value={publishForm.slug} onChange={(event) => setPublishForm((current) => ({ ...current, slug: event.target.value }))} placeholder="ai-seo-content-workflow-guide" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-text-primary">Excerpt</label>
                    <Textarea value={publishForm.excerpt} onChange={(event) => setPublishForm((current) => ({ ...current, excerpt: event.target.value }))} rows={3} placeholder="Short summary used by the CMS excerpt field." />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-text-primary">HTML content</label>
                    <Textarea value={publishForm.html} onChange={(event) => setPublishForm((current) => ({ ...current, html: event.target.value }))} rows={12} className="font-mono text-xs" placeholder="<h1>Article title</h1><p>Content...</p>" />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-text-primary">Publish status</label>
                      <Select value={publishForm.status} onValueChange={(value: "draft" | "publish") => setPublishForm((current) => ({ ...current, status: value }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="publish">Publish immediately</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="rounded-xl border border-border bg-background p-4 text-sm text-text-secondary">
                      This uses the selected project’s WordPress or webhook connection. Secrets stay on the server and are never sent back to the browser.
                    </div>
                  </div>
                  {publishFeedback ? (
                    <div
                      data-testid="cms-publish-feedback"
                      role={publishFeedback.tone === "error" ? "alert" : "status"}
                      aria-live={publishFeedback.tone === "error" ? "assertive" : "polite"}
                      className={`rounded-xl border px-4 py-3 text-sm ${
                        publishFeedback.tone === "success"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                          : "border-rose-500/30 bg-rose-500/10 text-rose-200"
                      }`}
                    >
                      {publishFeedback.message}
                    </div>
                  ) : null}
                  <Button onClick={publishToCms} disabled={loading === "publish"} className="gap-2">
                    {loading === "publish" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Publish to CMS
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
